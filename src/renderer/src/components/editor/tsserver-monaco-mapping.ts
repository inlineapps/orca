import type { editor, IRange, languages } from 'monaco-editor'
import type {
  TsserverContentEdit,
  TsserverPosition,
  TsserverScriptKindName,
  TsserverSpan
} from '../../../../shared/tsserver-language-service'

type CompletionKindValues = typeof languages.CompletionItemKind

const COMPLETION_KIND_NAMES = new Map<string, keyof CompletionKindValues>([
  ['alias', 'Reference'],
  ['call', 'Method'],
  ['class', 'Class'],
  ['const', 'Constant'],
  ['constructor', 'Constructor'],
  ['enum', 'Enum'],
  ['enum member', 'EnumMember'],
  ['external module name', 'Module'],
  ['function', 'Function'],
  ['getter', 'Property'],
  ['index', 'Property'],
  ['interface', 'Interface'],
  ['jsx attribute', 'Property'],
  ['keyword', 'Keyword'],
  ['let', 'Variable'],
  ['local function', 'Function'],
  ['local var', 'Variable'],
  ['method', 'Method'],
  ['module', 'Module'],
  ['parameter', 'Variable'],
  ['primitive', 'Keyword'],
  ['primitive type', 'Keyword'],
  ['property', 'Property'],
  ['script', 'File'],
  ['setter', 'Property'],
  ['string', 'Text'],
  ['type', 'Class'],
  ['type parameter', 'TypeParameter'],
  ['variable', 'Variable'],
  ['var', 'Variable']
])

export function toTsserverPosition(position: {
  lineNumber: number
  column: number
}): TsserverPosition {
  return { line: position.lineNumber, offset: position.column }
}

export function toMonacoRange(span: TsserverSpan): IRange {
  return {
    startLineNumber: span.start.line,
    startColumn: span.start.offset,
    endLineNumber: span.end.line,
    endColumn: span.end.offset
  }
}

export function toTsserverContentEdits(
  changes: readonly editor.IModelContentChange[]
): TsserverContentEdit[] {
  return changes.map((change) => ({
    start: { line: change.range.startLineNumber, offset: change.range.startColumn },
    end: { line: change.range.endLineNumber, offset: change.range.endColumn },
    insertString: change.text
  }))
}

export function toTsserverScriptKind(
  filePath: string,
  language: string
): TsserverScriptKindName | null {
  const normalized = filePath.toLowerCase()
  if (normalized.endsWith('.tsx')) {
    return 'TSX'
  }
  if (normalized.endsWith('.jsx')) {
    return 'JSX'
  }
  if (language === 'typescript') {
    return 'TS'
  }
  if (language === 'javascript') {
    return 'JS'
  }
  return null
}

export function toMonacoCompletionKind(
  tsserverKind: string,
  kinds: CompletionKindValues
): languages.CompletionItemKind {
  return kinds[COMPLETION_KIND_NAMES.get(tsserverKind) ?? 'Text']
}
