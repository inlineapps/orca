import { fileURLToPath, pathToFileURL } from 'node:url'
import type { TsserverPosition, TsserverSpan } from '../../shared/tsserver-language-service'

export type LspPosition = { line: number; character: number }
export type LspRange = { start: LspPosition; end: LspPosition }
export type LspLocation = { uri: string; range: LspRange }
export type LspLocationLink = {
  targetUri: string
  targetRange: LspRange
  targetSelectionRange?: LspRange
}
export type LspTextEdit = { range: LspRange; newText: string }
export type LspInsertReplaceEdit = { insert: LspRange; replace: LspRange; newText: string }
export type LspMarkupContent = { kind: string; value: string }
export type LspMarkedString = string | { language: string; value: string }
export type LspCompletionItem = {
  label: string | { label: string; detail?: string; description?: string }
  kind?: number
  tags?: number[]
  detail?: string
  documentation?: string | LspMarkupContent
  sortText?: string
  filterText?: string
  insertText?: string
  insertTextFormat?: number
  textEdit?: LspTextEdit | LspInsertReplaceEdit
  textEditText?: string
  additionalTextEdits?: LspTextEdit[]
  data?: unknown
}
export type LspCompletionList = {
  isIncomplete?: boolean
  items: LspCompletionItem[]
  itemDefaults?: { editRange?: LspRange | { insert: LspRange; replace: LspRange } }
}

const COMPLETION_KIND = [
  'text',
  'method',
  'function',
  'constructor',
  'property',
  'field',
  'variable',
  'class',
  'interface',
  'module',
  'property',
  'unit',
  'value',
  'enum',
  'keyword',
  'snippet',
  'color',
  'script',
  'file',
  'reference',
  'folder',
  'enum member',
  'const',
  'structure',
  'event',
  'operator',
  'type parameter'
]

export const toLspUri = (filePath: string): string => pathToFileURL(filePath).href
export const fromLspUri = (uri: string): string => fileURLToPath(uri)

export function toLspPosition(line: number, offset: number): LspPosition {
  return { line: line - 1, character: offset - 1 }
}

export function fromLspPosition(position: LspPosition): TsserverPosition {
  return { line: position.line + 1, offset: position.character + 1 }
}

export function fromLspRange(range: LspRange): TsserverSpan {
  return { start: fromLspPosition(range.start), end: fromLspPosition(range.end) }
}

export function locationToTsserverSpan(location: LspLocation | LspLocationLink): {
  file: string
  start: TsserverPosition
  end: TsserverPosition
} {
  const uri = 'uri' in location ? location.uri : location.targetUri
  const range =
    'range' in location ? location.range : (location.targetSelectionRange ?? location.targetRange)
  return { file: fromLspUri(uri), ...fromLspRange(range) }
}

export function normalizeLocations(
  value: LspLocation | LspLocation[] | LspLocationLink[] | null
): (LspLocation | LspLocationLink)[] {
  if (!value) {
    return []
  }
  return Array.isArray(value) ? value : [value]
}

export function completionKindName(kind: number | undefined): string {
  return kind ? (COMPLETION_KIND[kind - 1] ?? 'text') : 'text'
}

export function completionLabel(item: LspCompletionItem): string {
  return typeof item.label === 'string' ? item.label : item.label.label
}

export function completionSource(item: LspCompletionItem): string | undefined {
  if (typeof item.label === 'string') {
    return undefined
  }
  return item.label.description ?? item.label.detail
}

export function completionEditRange(
  item: LspCompletionItem,
  defaults?: LspCompletionList['itemDefaults']
): LspRange | undefined {
  const edit = item.textEdit
  if (edit) {
    return 'range' in edit ? edit.range : edit.replace
  }
  const defaultRange = defaults?.editRange
  if (!defaultRange) {
    return undefined
  }
  return 'start' in defaultRange ? defaultRange : defaultRange.replace
}

export function completionInsertText(item: LspCompletionItem): string | undefined {
  return item.textEdit?.newText ?? item.textEditText ?? item.insertText
}

export function markupText(value: string | LspMarkupContent | undefined): string {
  return typeof value === 'string' ? value : (value?.value ?? '')
}

export function splitHoverContents(
  contents: LspMarkedString | LspMarkedString[] | LspMarkupContent
): { displayString: string; documentation: string } {
  const values = Array.isArray(contents) ? contents : [contents]
  const text = values
    .map((value) => (typeof value === 'string' ? value : value.value))
    .filter(Boolean)
  const first = text[0] ?? ''
  const fenced = /^```[^\n]*\n([\s\S]*?)\n```(?:\n\n?)?([\s\S]*)$/.exec(first)
  if (fenced) {
    return {
      displayString: fenced[1] ?? '',
      documentation: [fenced[2], ...text.slice(1)].filter(Boolean).join('\n\n')
    }
  }
  const firstValue = values[0]
  if (firstValue && typeof firstValue !== 'string' && 'language' in firstValue) {
    return { displayString: first, documentation: text.slice(1).join('\n\n') }
  }
  return { displayString: first, documentation: text.slice(1).join('\n\n') }
}
