import type {
  TsserverCompletionDetails,
  TsserverCompletions,
  TsserverFileSpan,
  TsserverPosition,
  TsserverQuickInfo,
  TsserverReferenceSpan,
  TsserverSpan
} from '../../shared/tsserver-language-service'

type RawSpan = { start: TsserverPosition; end: TsserverPosition }
type RawFileSpan = RawSpan & { file: string }
type RawReference = RawFileSpan & { isDefinition?: boolean; isWriteAccess?: boolean }
type RawSymbolDisplayPart = { text: string }
type RawCompletionEntry = TsserverCompletions['entries'][number]

const toSpan = (raw: RawSpan): TsserverSpan => ({ start: raw.start, end: raw.end })

export function mapDefinitionBody(body: unknown): TsserverFileSpan[] {
  const definitions = (body as { definitions?: RawFileSpan[] } | undefined)?.definitions ?? []
  return definitions.map((definition) => ({ file: definition.file, ...toSpan(definition) }))
}

export function mapReferencesBody(body: unknown): TsserverReferenceSpan[] {
  const refs = (body as { refs?: RawReference[] } | undefined)?.refs ?? []
  return refs.map((ref) => ({
    file: ref.file,
    ...toSpan(ref),
    isDefinition: ref.isDefinition,
    isWriteAccess: ref.isWriteAccess
  }))
}

export function mapQuickInfoBody(body: unknown): TsserverQuickInfo | null {
  const raw = body as
    | (RawSpan & { displayString?: string; documentation?: string | RawSymbolDisplayPart[] })
    | undefined
  if (!raw?.displayString) {
    return null
  }
  return {
    ...toSpan(raw),
    displayString: raw.displayString,
    documentation: joinDisplayParts(raw.documentation)
  }
}

export function mapCompletionsBody(body: unknown): TsserverCompletions | null {
  const raw = body as
    | {
        entries?: RawCompletionEntry[]
        isMemberCompletion?: boolean
        isNewIdentifierLocation?: boolean
        isIncomplete?: boolean
        optionalReplacementSpan?: RawSpan
      }
    | undefined
  if (!raw?.entries) {
    return null
  }
  return {
    isMemberCompletion: raw.isMemberCompletion ?? false,
    isNewIdentifierLocation: raw.isNewIdentifierLocation ?? false,
    isIncomplete: raw.isIncomplete,
    optionalReplacementSpan: raw.optionalReplacementSpan
      ? toSpan(raw.optionalReplacementSpan)
      : undefined,
    entries: raw.entries.map((entry) => ({
      name: entry.name,
      kind: entry.kind,
      kindModifiers: entry.kindModifiers,
      sortText: entry.sortText,
      insertText: entry.insertText,
      filterText: entry.filterText,
      isSnippet: entry.isSnippet,
      source: entry.source,
      hasAction: entry.hasAction,
      data: entry.data,
      replacementSpan: entry.replacementSpan ? toSpan(entry.replacementSpan) : undefined
    }))
  }
}

type RawCompletionDetails = {
  displayParts?: RawSymbolDisplayPart[]
  documentation?: string | RawSymbolDisplayPart[]
  codeActions?: {
    description: string
    changes: { fileName: string; textChanges: (RawSpan & { newText: string })[] }[]
  }[]
}

export function mapCompletionDetailsBody(body: unknown): TsserverCompletionDetails | null {
  const raw = (body as RawCompletionDetails[] | undefined)?.[0]
  if (!raw) {
    return null
  }
  return {
    displayString: joinDisplayParts(raw.displayParts),
    documentation: joinDisplayParts(raw.documentation),
    codeActions: (raw.codeActions ?? []).map((action) => ({
      description: action.description,
      changes: action.changes.map((change) => ({
        fileName: change.fileName,
        textChanges: change.textChanges.map((textChange) => ({
          ...toSpan(textChange),
          newText: textChange.newText
        }))
      }))
    }))
  }
}

function joinDisplayParts(parts: string | RawSymbolDisplayPart[] | undefined): string {
  if (!parts) {
    return ''
  }
  return typeof parts === 'string' ? parts : parts.map((part) => part.text).join('')
}
