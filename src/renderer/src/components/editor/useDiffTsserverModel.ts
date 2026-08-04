import { useEffect } from 'react'
import type { editor } from 'monaco-editor'
import { monaco } from '@/lib/monaco-setup'
import { useAppStore } from '@/store'
import { joinPath } from '@/lib/path'
import { getResolvedExecutionHostIdForWorktree } from '@/lib/resolved-worktree-execution-host'
import { getMonacoTsserverRoot } from './monaco-tsserver-eligibility'
import { registerTsserverModel } from './monaco-tsserver-model-sync'
import { installMonacoTsserverProviders } from './monaco-tsserver-providers'
import { toTsserverScriptKind } from './tsserver-monaco-mapping'

type DiffTsserverModelArgs = {
  modifiedEditor: editor.ICodeEditor | null
  language: string
  relativePath: string
  worktreeId?: string
  runtimeEnvironmentId?: string | null
  externalSshTargetId?: string
}

/**
 * Attaches a diff's modified side to tsserver — used by both the single-file diff tab and each
 * combined-diff section. The original side stays unattached: tsserver holds one buffer per path,
 * and the modified side is the one the reader edits and navigates from. A branch or commit diff
 * therefore parks a historical buffer under the live path until the diff closes, which the
 * file-editor-wins ownership rule in `registerTsserverModel` keeps out of the editor's way.
 */
export function useDiffTsserverModel({
  modifiedEditor,
  language,
  relativePath,
  worktreeId,
  runtimeEnvironmentId,
  externalSshTargetId
}: DiffTsserverModelArgs): void {
  const rootPath = useAppStore((state) => {
    const executionHostId = getResolvedExecutionHostIdForWorktree(state, worktreeId)
    const worktreePath =
      worktreeId && executionHostId === 'local'
        ? (state.getKnownWorktreeById(worktreeId, executionHostId)?.path ?? null)
        : null
    return getMonacoTsserverRoot({
      language,
      filePath: relativePath,
      rootPath: worktreePath,
      executionHostId,
      runtimeEnvironmentId,
      externalSshTargetId
    })
  })

  useEffect(() => {
    const scriptKindName = toTsserverScriptKind(relativePath, language)
    if (!modifiedEditor || !scriptKindName || !rootPath || !worktreeId) {
      return
    }
    const filePath = joinPath(rootPath, relativePath)
    installMonacoTsserverProviders(monaco)
    let unregister: (() => void) | null = null
    // Why: refreshed diff content swaps the modified model in place, so follow the swap instead of
    // binding once at mount.
    const attach = (): void => {
      unregister?.()
      const model = modifiedEditor.getModel()
      unregister = model
        ? registerTsserverModel({
            model,
            rootPath,
            filePath,
            worktreeId,
            scriptKindName,
            kind: 'diff'
          })
        : null
    }
    attach()
    const modelSub = modifiedEditor.onDidChangeModel(attach)
    return () => {
      modelSub.dispose()
      unregister?.()
    }
  }, [modifiedEditor, rootPath, relativePath, language, worktreeId])
}
