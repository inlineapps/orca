import type * as Monaco from 'monaco-editor'
import { typescript as monacoTypeScript } from 'monaco-editor'
import type {
  TsserverCompletionDetails,
  TsserverCompletionEntry,
  TsserverCompletions,
  TsserverFileSpan,
  TsserverQuickInfo,
  TsserverReferenceSpan
} from '../../../../shared/tsserver-language-service'
import { normalizeRuntimePathForComparison } from '../../../../shared/cross-platform-path'
import {
  getTsserverRegistration,
  hasAvailableTsserverModels,
  onTsserverAvailabilityChanged,
  requestTsserverModel,
  requestTsserverRegistration,
  type TsserverModelRegistration
} from './monaco-tsserver-model-sync'
import {
  installTsserverTargetOpener,
  primeTsserverTargetModels
} from './monaco-tsserver-target-navigation'
import { toMonacoCompletionKind, toMonacoRange } from './tsserver-monaco-mapping'

type TsserverCompletionItem = Monaco.languages.CompletionItem & {
  tsserver?: {
    entry: TsserverCompletionEntry
    line: number
    offset: number
    registration: TsserverModelRegistration
  }
}

let installed = false

export function installMonacoTsserverProviders(monaco: typeof Monaco): void {
  if (installed) {
    return
  }
  installed = true
  installTsserverTargetOpener(monaco)
  installModeSwitch()
  for (const language of ['typescript', 'javascript']) {
    monaco.languages.registerDefinitionProvider(language, definitionProvider(monaco))
    monaco.languages.registerReferenceProvider(language, referenceProvider(monaco))
    monaco.languages.registerHoverProvider(language, hoverProvider())
    monaco.languages.registerCompletionItemProvider(language, completionProvider(monaco))
  }
}

function definitionProvider(monaco: typeof Monaco): Monaco.languages.DefinitionProvider {
  return {
    provideDefinition: async (model, position, token) => {
      const registration = getTsserverRegistration(model)
      if (!registration) {
        return null
      }
      const spans = await requestTsserverModel(
        model,
        position.lineNumber,
        position.column,
        (args) => window.api.tsserver.definition(args)
      )
      if (!spans || token.isCancellationRequested) {
        return null
      }
      await primeTargets(monaco, registration, spans)
      return spans.map((span) => ({
        uri: monaco.Uri.parse(span.file),
        range: toMonacoRange(span)
      }))
    }
  }
}

function referenceProvider(monaco: typeof Monaco): Monaco.languages.ReferenceProvider {
  return {
    provideReferences: async (model, position, context, token) => {
      const registration = getTsserverRegistration(model)
      if (!registration) {
        return null
      }
      let spans = await requestTsserverModel(model, position.lineNumber, position.column, (args) =>
        window.api.tsserver.references(args)
      )
      if (!spans || token.isCancellationRequested) {
        return null
      }
      if (!context.includeDeclaration) {
        spans = spans.filter((span) => !span.isDefinition)
      }
      await primeTargets(monaco, registration, spans)
      return spans.map((span) => ({
        uri: monaco.Uri.parse(span.file),
        range: toMonacoRange(span)
      }))
    }
  }
}

function hoverProvider(): Monaco.languages.HoverProvider {
  return {
    provideHover: async (model, position, token) => {
      const info = await requestTsserverModel(model, position.lineNumber, position.column, (args) =>
        window.api.tsserver.quickinfo(args)
      )
      if (!info || token.isCancellationRequested) {
        return null
      }
      return toMonacoHover(info)
    }
  }
}

function completionProvider(monaco: typeof Monaco): Monaco.languages.CompletionItemProvider {
  return {
    triggerCharacters: ['.', '"', "'", '`', '/', '@', '<', '#'],
    provideCompletionItems: async (model, position, context, token) => {
      const registration = getTsserverRegistration(model)
      if (!registration) {
        return null
      }
      const completions = await requestTsserverModel(
        model,
        position.lineNumber,
        position.column,
        (args) =>
          window.api.tsserver.completions({
            ...args,
            triggerCharacter: context.triggerCharacter,
            triggerKind: (context.triggerKind + 1) as 1 | 2 | 3
          })
      )
      if (!completions || token.isCancellationRequested) {
        return null
      }
      return {
        incomplete: completions.isIncomplete,
        suggestions: completions.entries.map((entry) =>
          toCompletionItem(monaco, model, position, completions, entry, registration)
        )
      }
    },
    resolveCompletionItem: async (item, token) => {
      const metadata = (item as TsserverCompletionItem).tsserver
      if (!metadata) {
        return item
      }
      const details = await requestTsserverRegistration(
        metadata.registration,
        metadata.line,
        metadata.offset,
        (args) =>
          window.api.tsserver.completionDetails({
            ...args,
            entryName: metadata.entry.name,
            source: metadata.entry.source,
            data: metadata.entry.data
          })
      )
      if (!details || token.isCancellationRequested) {
        return item
      }
      return applyCompletionDetails(item, details, metadata.registration.filePath)
    }
  }
}

function toCompletionItem(
  monaco: typeof Monaco,
  model: Monaco.editor.ITextModel,
  position: Monaco.Position,
  completions: TsserverCompletions,
  entry: TsserverCompletionEntry,
  registration: TsserverModelRegistration
): TsserverCompletionItem {
  const word = model.getWordUntilPosition(position)
  const span = entry.replacementSpan ?? completions.optionalReplacementSpan
  const range =
    span && span.start.line === span.end.line
      ? toMonacoRange(span)
      : {
          startLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: word.endColumn
        }
  return {
    label: entry.source ? { label: entry.name, description: entry.source } : entry.name,
    kind: toMonacoCompletionKind(entry.kind, monaco.languages.CompletionItemKind),
    tags: entry.kindModifiers?.includes('deprecated')
      ? [monaco.languages.CompletionItemTag.Deprecated]
      : undefined,
    sortText: entry.sortText,
    filterText: entry.filterText,
    insertText: entry.insertText ?? entry.name,
    insertTextRules: entry.isSnippet
      ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      : undefined,
    range,
    tsserver: {
      entry,
      line: position.lineNumber,
      offset: position.column,
      registration
    }
  }
}

function applyCompletionDetails(
  item: Monaco.languages.CompletionItem,
  details: TsserverCompletionDetails,
  filePath: string
): Monaco.languages.CompletionItem {
  item.detail = details.displayString
  item.documentation = details.documentation
  item.additionalTextEdits = details.codeActions.flatMap((action) =>
    action.changes
      .filter(
        (change) =>
          normalizeRuntimePathForComparison(change.fileName) ===
          normalizeRuntimePathForComparison(filePath)
      )
      .flatMap((change) =>
        change.textChanges.map((textChange) => ({
          range: toMonacoRange(textChange),
          text: textChange.newText
        }))
      )
  )
  return item
}

function toMonacoHover(info: TsserverQuickInfo): Monaco.languages.Hover {
  const contents: Monaco.IMarkdownString[] = [
    { value: `\`\`\`typescript\n${info.displayString}\n\`\`\`` }
  ]
  if (info.documentation) {
    contents.push({ value: info.documentation })
  }
  return { range: toMonacoRange(info), contents }
}

function primeTargets(
  monaco: typeof Monaco,
  registration: TsserverModelRegistration,
  spans: readonly (TsserverFileSpan | TsserverReferenceSpan)[]
): Promise<void> {
  return primeTsserverTargetModels(
    monaco,
    { rootPath: registration.rootPath, worktreeId: registration.worktreeId },
    spans.map((span) => span.file)
  )
}

function installModeSwitch(): void {
  const originalTs = { ...monacoTypeScript.typescriptDefaults.modeConfiguration }
  const originalJs = { ...monacoTypeScript.javascriptDefaults.modeConfiguration }
  let disabled = false
  onTsserverAvailabilityChanged(() => {
    const shouldDisable = hasAvailableTsserverModels()
    if (shouldDisable === disabled) {
      return
    }
    disabled = shouldDisable
    const override = shouldDisable
      ? { completionItems: false, hovers: false, definitions: false, references: false }
      : null
    monacoTypeScript.typescriptDefaults.setModeConfiguration({ ...originalTs, ...override })
    monacoTypeScript.javascriptDefaults.setModeConfiguration({ ...originalJs, ...override })
  })
}
