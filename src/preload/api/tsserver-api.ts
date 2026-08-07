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

export type TsserverApi = {
  probeRoot: (args: { rootPath: string }) => Promise<TsserverRootAvailability>
  openFile: (args: {
    rootPath: string
    worktreeId: string
    file: string
    fileContent: string
    scriptKindName: TsserverScriptKindName
  }) => Promise<boolean>
  updateFile: (args: {
    rootPath: string
    file: string
    edits: TsserverContentEdit[]
  }) => Promise<boolean>
  closeFile: (args: { rootPath: string; file: string }) => Promise<void>
  definition: (args: TsserverFileLocationArgs) => Promise<TsserverIpcResult<TsserverFileSpan[]>>
  references: (
    args: TsserverFileLocationArgs
  ) => Promise<TsserverIpcResult<TsserverReferenceSpan[]>>
  quickinfo: (
    args: TsserverFileLocationArgs
  ) => Promise<TsserverIpcResult<TsserverQuickInfo | null>>
  completions: (
    args: TsserverCompletionRequestArgs
  ) => Promise<TsserverIpcResult<TsserverCompletions | null>>
  completionDetails: (
    args: TsserverFileLocationArgs & { entryName: string; source?: string; data?: unknown }
  ) => Promise<TsserverIpcResult<TsserverCompletionDetails | null>>
}
