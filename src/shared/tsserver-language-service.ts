// Positions use tsserver's 1-based UTF-16 coordinates.

export type TsserverPosition = { line: number; offset: number }

export type TsserverSpan = { start: TsserverPosition; end: TsserverPosition }

export type TsserverFileSpan = TsserverSpan & { file: string }

export type TsserverReferenceSpan = TsserverFileSpan & {
  isDefinition?: boolean
  isWriteAccess?: boolean
}

export type TsserverQuickInfo = TsserverSpan & {
  displayString: string
  documentation: string
}

export type TsserverCompletionEntry = {
  name: string
  kind: string
  kindModifiers?: string
  sortText: string
  insertText?: string
  filterText?: string
  isSnippet?: boolean
  source?: string
  hasAction?: boolean
  data?: unknown
  replacementSpan?: TsserverSpan
}

export type TsserverCompletions = {
  isMemberCompletion: boolean
  isNewIdentifierLocation: boolean
  isIncomplete?: boolean
  optionalReplacementSpan?: TsserverSpan
  entries: TsserverCompletionEntry[]
}

export type TsserverTextChange = TsserverSpan & { newText: string }

export type TsserverFileCodeEdits = {
  fileName: string
  textChanges: TsserverTextChange[]
}

export type TsserverCompletionDetails = {
  displayString: string
  documentation: string
  codeActions: { description: string; changes: TsserverFileCodeEdits[] }[]
}

export type TsserverContentEdit = TsserverSpan & { insertString: string }

export type TsserverScriptKindName = 'TS' | 'TSX' | 'JS' | 'JSX'

export type TypeScriptLanguageServiceBackend = 'native-lsp' | 'legacy-tsserver'

export type TsserverRootAvailability = {
  available: boolean
  reason?: 'no-tsserver' | 'spawn-failed'
  backend?: TypeScriptLanguageServiceBackend
  version?: string
  ready?: boolean
}

export type TsserverFileLocationArgs = {
  rootPath: string
  file: string
  line: number
  offset: number
}

export type TsserverCompletionRequestArgs = TsserverFileLocationArgs & {
  triggerCharacter?: string
  triggerKind?: 1 | 2 | 3
}

export type TsserverIpcResult<T> =
  | { ok: true; body: T }
  | { ok: false; reason: 'unavailable' | 'file-not-open' | 'request-failed' }
