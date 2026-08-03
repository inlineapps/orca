import type * as Monaco from 'monaco-editor'
import { relativePathInsideRoot } from '../../../../shared/cross-platform-path'
import { detectLanguage } from '@/lib/language-detect'
import { useAppStore } from '@/store'

export type TsserverTargetContext = {
  filePath: string
  rootPath: string
  worktreeId: string
}

const MAX_PRIMED_TARGET_MODELS = 40
const MAX_CACHED_TARGET_MODELS = 100
const targetContextByUri = new Map<string, TsserverTargetContext>()
const createdTargetModels = new Map<string, Monaco.editor.ITextModel>()
let openerInstalled = false

export function installTsserverTargetOpener(monaco: typeof Monaco): void {
  if (openerInstalled) {
    return
  }
  openerInstalled = true
  monaco.editor.registerEditorOpener({
    openCodeEditor: (_source, resource, selectionOrPosition) => {
      const context = targetContextByUri.get(resource.toString())
      if (!context) {
        return false
      }
      const relativePath = relativePathInsideRoot(context.rootPath, context.filePath)
      if (relativePath === null) {
        return false
      }
      const state = useAppStore.getState()
      const fileId = state.openFile(
        {
          filePath: context.filePath,
          relativePath,
          worktreeId: context.worktreeId,
          runtimeEnvironmentId: null,
          language: detectLanguage(relativePath),
          mode: 'edit'
        },
        { suppressActiveRuntimeFallback: true }
      )
      if (selectionOrPosition) {
        const isRange = 'startLineNumber' in selectionOrPosition
        state.setPendingEditorReveal({
          filePath: context.filePath,
          fileId,
          line: isRange ? selectionOrPosition.startLineNumber : selectionOrPosition.lineNumber,
          column: isRange ? selectionOrPosition.startColumn : selectionOrPosition.column,
          matchLength: isRange
            ? Math.max(0, selectionOrPosition.endColumn - selectionOrPosition.startColumn)
            : 0
        })
      }
      return true
    }
  })
}

export async function primeTsserverTargetModels(
  monaco: typeof Monaco,
  source: Omit<TsserverTargetContext, 'filePath'>,
  filePaths: readonly string[]
): Promise<void> {
  const uniquePaths = [...new Set(filePaths)]
  for (const filePath of uniquePaths) {
    if (relativePathInsideRoot(source.rootPath, filePath) === null) {
      continue
    }
    const uri = monaco.Uri.parse(filePath)
    targetContextByUri.set(uri.toString(), { ...source, filePath })
  }

  await Promise.all(
    uniquePaths.slice(0, MAX_PRIMED_TARGET_MODELS).map(async (filePath) => {
      if (relativePathInsideRoot(source.rootPath, filePath) === null) {
        return
      }
      const uri = monaco.Uri.parse(filePath)
      if (monaco.editor.getModel(uri)) {
        return
      }
      try {
        const result = await window.api.fs.readFile({ filePath })
        if (result.isBinary || monaco.editor.getModel(uri)) {
          return
        }
        const model = monaco.editor.createModel(result.content, detectLanguage(filePath), uri)
        createdTargetModels.set(uri.toString(), model)
        pruneTargetModels()
      } catch {
        // Navigation still opens the file through Orca when a preview read fails.
      }
    })
  )
}

function pruneTargetModels(): void {
  while (createdTargetModels.size > MAX_CACHED_TARGET_MODELS) {
    const disposable = [...createdTargetModels.entries()].find(
      ([, model]) => model.isDisposed() || !model.isAttachedToEditor()
    )
    if (!disposable) {
      return
    }
    createdTargetModels.delete(disposable[0])
    if (!disposable[1].isDisposed()) {
      disposable[1].dispose()
    }
    targetContextByUri.delete(disposable[0])
  }
}
