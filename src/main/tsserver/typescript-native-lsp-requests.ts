import {
  completionEditRange,
  completionInsertText,
  completionKindName,
  completionLabel,
  completionSource,
  fromLspRange,
  locationToTsserverSpan,
  markupText,
  normalizeLocations,
  splitHoverContents,
  toLspPosition,
  toLspUri,
  type LspCompletionItem,
  type LspCompletionList,
  type LspLocation,
  type LspLocationLink,
  type LspMarkedString,
  type LspMarkupContent,
  type LspRange
} from './typescript-native-lsp-mapping'

type FileRequestArgs = { file: string; line: number; offset: number; [key: string]: unknown }
type LspHover = {
  contents: LspMarkedString | LspMarkedString[] | LspMarkupContent
  range?: LspRange
}
type LocationResult = LspLocation | LspLocation[] | LspLocationLink[] | null
type SendRequest = (method: string, params: unknown) => Promise<unknown>
type SendNotification = (method: string, params: unknown) => void

export class TypeScriptNativeLspRequests {
  private readonly versions = new Map<string, number>()

  constructor(
    private readonly sendRequest: SendRequest,
    private readonly sendNotification: SendNotification
  ) {}

  notify(command: string, args: Record<string, unknown>): void {
    const file = String(args.file)
    const uri = toLspUri(file)
    if (command === 'open') {
      this.versions.set(file, 1)
      this.sendNotification('textDocument/didOpen', {
        textDocument: {
          uri,
          languageId: languageId(String(args.scriptKindName)),
          version: 1,
          text: String(args.fileContent ?? '')
        }
      })
      return
    }
    if (command === 'change') {
      const version = (this.versions.get(file) ?? 1) + 1
      this.versions.set(file, version)
      this.sendNotification('textDocument/didChange', {
        textDocument: { uri, version },
        contentChanges: [
          {
            range: {
              start: toLspPosition(Number(args.line), Number(args.offset)),
              end: toLspPosition(Number(args.endLine), Number(args.endOffset))
            },
            text: String(args.insertString ?? '')
          }
        ]
      })
      return
    }
    if (command === 'close') {
      this.versions.delete(file)
      this.sendNotification('textDocument/didClose', { textDocument: { uri } })
    }
  }

  async request(command: string, rawArgs: unknown): Promise<unknown> {
    const args = rawArgs as FileRequestArgs
    const textDocument = { uri: toLspUri(args.file) }
    const position = toLspPosition(args.line, args.offset)
    if (command === 'definitionAndBoundSpan') {
      const result = await this.sendRequest('textDocument/definition', { textDocument, position })
      return {
        definitions: normalizeLocations(result as LocationResult).map(locationToTsserverSpan)
      }
    }
    if (command === 'references') {
      return this.references(textDocument, position)
    }
    if (command === 'quickinfo') {
      return this.quickInfo(textDocument, position)
    }
    if (command === 'completionInfo') {
      return this.completions(textDocument, position, args)
    }
    if (command === 'completionEntryDetails') {
      return this.completionDetails(args)
    }
    throw new Error(`Unsupported TypeScript LSP command: ${command}`)
  }

  private async references(
    textDocument: { uri: string },
    position: { line: number; character: number }
  ): Promise<unknown> {
    const [referenceResult, definitionResult] = await Promise.all([
      this.sendRequest('textDocument/references', {
        textDocument,
        position,
        context: { includeDeclaration: true }
      }),
      this.sendRequest('textDocument/definition', { textDocument, position })
    ])
    const definitionKeys = new Set(
      normalizeLocations(definitionResult as LocationResult).map(locationKey)
    )
    return {
      refs: normalizeLocations(referenceResult as LocationResult).map((location) => ({
        ...locationToTsserverSpan(location),
        isDefinition: definitionKeys.has(locationKey(location))
      }))
    }
  }

  private async quickInfo(
    textDocument: { uri: string },
    position: { line: number; character: number }
  ): Promise<unknown> {
    const hover = (await this.sendRequest('textDocument/hover', {
      textDocument,
      position
    })) as LspHover | null
    if (!hover) {
      return undefined
    }
    const contents = splitHoverContents(hover.contents)
    const range = hover.range ?? { start: position, end: position }
    return { ...fromLspRange(range), ...contents }
  }

  private async completions(
    textDocument: { uri: string },
    position: { line: number; character: number },
    args: FileRequestArgs
  ): Promise<unknown> {
    const result = (await this.sendRequest('textDocument/completion', {
      textDocument,
      position,
      context: {
        triggerKind: args.triggerKind ?? 1,
        triggerCharacter: args.triggerCharacter
      }
    })) as LspCompletionItem[] | LspCompletionList | null
    if (!result) {
      return undefined
    }
    const list: LspCompletionList = Array.isArray(result) ? { items: result } : result
    return {
      isMemberCompletion: false,
      isNewIdentifierLocation: false,
      isIncomplete: list.isIncomplete,
      entries: list.items.map((item) => {
        const range = completionEditRange(item, list.itemDefaults)
        return {
          name: completionLabel(item),
          kind: completionKindName(item.kind),
          kindModifiers: item.tags?.includes(1) ? 'deprecated' : undefined,
          sortText: item.sortText ?? completionLabel(item),
          insertText: completionInsertText(item),
          filterText: item.filterText,
          isSnippet: item.insertTextFormat === 2,
          source: completionSource(item),
          hasAction: Boolean(item.additionalTextEdits?.length || item.data),
          data: { lspItem: item },
          replacementSpan: range ? fromLspRange(range) : undefined
        }
      })
    }
  }

  private async completionDetails(args: FileRequestArgs): Promise<unknown> {
    const item = (args.data as { lspItem?: LspCompletionItem } | undefined)?.lspItem
    if (!item) {
      return undefined
    }
    const response = (await this.sendRequest('completionItem/resolve', item)) as LspCompletionItem
    const resolved = response ?? item
    const edits = resolved.additionalTextEdits ?? item.additionalTextEdits ?? []
    return [
      {
        displayParts: [{ text: resolved.detail ?? item.detail ?? completionLabel(resolved) }],
        documentation: markupText(resolved.documentation ?? item.documentation),
        codeActions: edits.length
          ? [
              {
                description: 'Apply completion edits',
                changes: [
                  {
                    fileName: args.file,
                    textChanges: edits.map((edit) => ({
                      ...fromLspRange(edit.range),
                      newText: edit.newText
                    }))
                  }
                ]
              }
            ]
          : []
      }
    ]
  }
}

function languageId(scriptKindName: string): string {
  return scriptKindName === 'TSX'
    ? 'typescriptreact'
    : scriptKindName === 'JSX'
      ? 'javascriptreact'
      : scriptKindName === 'JS'
        ? 'javascript'
        : 'typescript'
}

function locationKey(location: LspLocation | LspLocationLink): string {
  const span = locationToTsserverSpan(location)
  return `${span.file}:${span.start.line}:${span.start.offset}:${span.end.line}:${span.end.offset}`
}
