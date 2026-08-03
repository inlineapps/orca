import { ipcMain } from 'electron'
import type { Store } from '../persistence'
import type {
  TsserverCompletionDetails,
  TsserverCompletionRequestArgs,
  TsserverCompletions,
  TsserverContentEdit,
  TsserverFileLocationArgs,
  TsserverFileSpan,
  TsserverIpcResult,
  TsserverQuickInfo,
  TsserverReferenceSpan,
  TsserverRootAvailability,
  TsserverScriptKindName
} from '../../shared/tsserver-language-service'
import { isPathAllowed, PATH_ACCESS_DENIED_MESSAGE } from './filesystem-auth'
import { TsserverWorkspaceManager } from '../tsserver/tsserver-workspace-manager'
import {
  mapCompletionDetailsBody,
  mapCompletionsBody,
  mapDefinitionBody,
  mapQuickInfoBody,
  mapReferencesBody
} from '../tsserver/tsserver-response-mapping'

let manager: TsserverWorkspaceManager | null = null

function getManager(): TsserverWorkspaceManager {
  manager ??= new TsserverWorkspaceManager()
  return manager
}

export function disposeAllTsservers(): Promise<void> {
  const active = manager
  manager = null
  return active ? active.disposeAll() : Promise.resolve()
}

export function registerTsserverHandlers(store: Store): void {
  function assertAllowed(rootPath: string, file?: string): void {
    if (!isPathAllowed(rootPath, store) || (file !== undefined && !isPathAllowed(file, store))) {
      throw new Error(PATH_ACCESS_DENIED_MESSAGE)
    }
  }

  async function featureRequest<T>(
    args: TsserverFileLocationArgs,
    command: string,
    mapBody: (body: unknown) => T,
    extraArgs: Record<string, unknown> = {}
  ): Promise<TsserverIpcResult<T>> {
    assertAllowed(args.rootPath, args.file)
    const result = await getManager().requestForFile<unknown>(args.rootPath, args.file, command, {
      line: args.line,
      offset: args.offset,
      ...extraArgs
    })
    return result.ok ? { ok: true, body: mapBody(result.body) } : result
  }

  ipcMain.handle(
    'tsserver:probeRoot',
    (_event, args: { rootPath: string }): TsserverRootAvailability => {
      assertAllowed(args.rootPath)
      return getManager().probeRoot(args.rootPath)
    }
  )

  ipcMain.handle(
    'tsserver:openFile',
    (
      _event,
      args: {
        rootPath: string
        worktreeId: string
        file: string
        fileContent: string
        scriptKindName: TsserverScriptKindName
      }
    ): boolean => {
      assertAllowed(args.rootPath, args.file)
      return getManager().openFile(
        args.rootPath,
        args.worktreeId,
        args.file,
        args.fileContent,
        args.scriptKindName
      )
    }
  )

  ipcMain.handle(
    'tsserver:updateFile',
    (_event, args: { rootPath: string; file: string; edits: TsserverContentEdit[] }): boolean => {
      assertAllowed(args.rootPath, args.file)
      return getManager().changeFile(args.rootPath, args.file, args.edits)
    }
  )

  ipcMain.handle('tsserver:closeFile', (_event, args: { rootPath: string; file: string }): void => {
    assertAllowed(args.rootPath, args.file)
    getManager().closeFile(args.rootPath, args.file)
  })

  ipcMain.handle(
    'tsserver:definition',
    (_event, args: TsserverFileLocationArgs): Promise<TsserverIpcResult<TsserverFileSpan[]>> =>
      featureRequest(args, 'definitionAndBoundSpan', mapDefinitionBody)
  )

  ipcMain.handle(
    'tsserver:references',
    (_event, args: TsserverFileLocationArgs): Promise<TsserverIpcResult<TsserverReferenceSpan[]>> =>
      featureRequest(args, 'references', mapReferencesBody)
  )

  ipcMain.handle(
    'tsserver:quickinfo',
    (
      _event,
      args: TsserverFileLocationArgs
    ): Promise<TsserverIpcResult<TsserverQuickInfo | null>> =>
      featureRequest(args, 'quickinfo', mapQuickInfoBody)
  )

  ipcMain.handle(
    'tsserver:completions',
    (
      _event,
      args: TsserverCompletionRequestArgs
    ): Promise<TsserverIpcResult<TsserverCompletions | null>> =>
      featureRequest(
        args,
        'completionInfo',
        mapCompletionsBody,
        args.triggerCharacter === undefined
          ? { triggerKind: args.triggerKind }
          : { triggerCharacter: args.triggerCharacter, triggerKind: args.triggerKind }
      )
  )

  ipcMain.handle(
    'tsserver:completionDetails',
    (
      _event,
      args: TsserverFileLocationArgs & { entryName: string; source?: string; data?: unknown }
    ): Promise<TsserverIpcResult<TsserverCompletionDetails | null>> =>
      featureRequest(args, 'completionEntryDetails', mapCompletionDetailsBody, {
        entryNames: [
          args.source === undefined && args.data === undefined
            ? args.entryName
            : { name: args.entryName, source: args.source, data: args.data }
        ]
      })
  )
}
