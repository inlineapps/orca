import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { editor, IDisposable, Uri } from 'monaco-editor'
import {
  getTsserverRegistration,
  registerTsserverModel,
  requestTsserverModel
} from './monaco-tsserver-model-sync'

type ContentChangeListener = (event: editor.IModelContentChangedEvent) => void

const api = {
  probeRoot: vi.fn(),
  openFile: vi.fn(),
  updateFile: vi.fn(),
  closeFile: vi.fn(),
  definition: vi.fn()
}
const releases: (() => void)[] = []

function createModel(
  uri: string,
  content: string
): {
  model: editor.ITextModel
  emitChange: (changes: editor.IModelContentChange[]) => void
} {
  let listener: ContentChangeListener | null = null
  const model = {
    uri: { toString: () => uri } as Uri,
    getValue: () => content,
    onDidChangeContent: (nextListener: ContentChangeListener): IDisposable => {
      listener = nextListener
      return { dispose: () => (listener = null) }
    }
  } as unknown as editor.ITextModel
  return {
    model,
    emitChange: (changes) =>
      listener?.({
        changes,
        eol: '\n',
        versionId: 9,
        isUndoing: false,
        isRedoing: false,
        isFlush: false,
        isEolChange: false,
        detailedReasonsChangeLengths: []
      })
  }
}

describe('Monaco tsserver model sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.probeRoot.mockResolvedValue({ available: true })
    api.openFile.mockResolvedValue(true)
    api.updateFile.mockResolvedValue(true)
    api.closeFile.mockResolvedValue(undefined)
    vi.stubGlobal('window', { api: { tsserver: api } })
  })

  afterEach(async () => {
    releases.splice(0).forEach((release) => release())
    await vi.waitFor(() => expect(api.closeFile).toHaveBeenCalled())
    vi.unstubAllGlobals()
  })

  it('opens, updates in Monaco order, and closes one retained model', async () => {
    const { model, emitChange } = createModel('file:///workspace/src/app.ts', 'const port = 37')
    const release = registerTsserverModel({
      model,
      rootPath: '/workspace',
      filePath: '/workspace/src/app.ts',
      worktreeId: 'repo::/workspace',
      kind: 'file',
      scriptKindName: 'TS'
    })
    releases.push(release)
    await getTsserverRegistration(model)!.syncQueue

    expect(api.openFile).toHaveBeenCalledWith({
      rootPath: '/workspace',
      worktreeId: 'repo::/workspace',
      file: '/workspace/src/app.ts',
      fileContent: 'const port = 37',
      scriptKindName: 'TS'
    })

    emitChange([
      {
        range: { startLineNumber: 8, startColumn: 14, endLineNumber: 8, endColumn: 19 },
        rangeOffset: 73,
        rangeLength: 5,
        text: 'later'
      },
      {
        range: { startLineNumber: 3, startColumn: 7, endLineNumber: 4, endColumn: 12 },
        rangeOffset: 21,
        rangeLength: 16,
        text: 'earlier'
      }
    ])
    await getTsserverRegistration(model)!.syncQueue

    expect(api.updateFile).toHaveBeenCalledWith({
      rootPath: '/workspace',
      file: '/workspace/src/app.ts',
      edits: [
        {
          start: { line: 8, offset: 14 },
          end: { line: 8, offset: 19 },
          insertString: 'later'
        },
        {
          start: { line: 3, offset: 7 },
          end: { line: 4, offset: 12 },
          insertString: 'earlier'
        }
      ]
    })
  })

  it('leaves a path claimed by the file editor untouched by a diff pane', async () => {
    const { model: fileModel } = createModel('file:///workspace/src/queue.ts', 'const retries = 4')
    const { model: diffModel } = createModel(
      'file:///workspace/src/queue.ts?diff=modified',
      'const retries = 7'
    )
    releases.push(
      registerTsserverModel({
        model: fileModel,
        rootPath: '/workspace',
        filePath: '/workspace/src/queue.ts',
        worktreeId: 'repo::/workspace',
        scriptKindName: 'TS',
        kind: 'file'
      })
    )
    await getTsserverRegistration(fileModel)!.syncQueue

    releases.push(
      registerTsserverModel({
        model: diffModel,
        rootPath: '/workspace/',
        filePath: '/workspace/src/queue.ts',
        worktreeId: 'repo::/workspace',
        scriptKindName: 'TS',
        kind: 'diff'
      })
    )

    expect(getTsserverRegistration(diffModel)).toBeNull()
    expect(await requestTsserverModel(diffModel, 3, 9, api.definition)).toBeNull()
    expect(api.openFile).toHaveBeenCalledTimes(1)
    expect(api.openFile).toHaveBeenCalledWith(
      expect.objectContaining({ fileContent: 'const retries = 4' })
    )
  })

  it('evicts a diff registration when the file editor claims the same path', async () => {
    const { model: diffModel } = createModel(
      'file:///workspace/src/report.ts?diff=modified',
      'const rows = 26'
    )
    const { model: fileModel } = createModel('file:///workspace/src/report.ts', 'const rows = 31')
    releases.push(
      registerTsserverModel({
        model: diffModel,
        rootPath: '/workspace',
        filePath: '/workspace/src/report.ts',
        worktreeId: 'repo::/workspace',
        scriptKindName: 'TS',
        kind: 'diff'
      })
    )
    await getTsserverRegistration(diffModel)!.syncQueue

    releases.push(
      registerTsserverModel({
        model: fileModel,
        rootPath: '/workspace',
        filePath: '/workspace/src/report.ts',
        worktreeId: 'repo::/workspace',
        scriptKindName: 'TS',
        kind: 'file'
      })
    )
    expect(getTsserverRegistration(diffModel)).toBeNull()
    await getTsserverRegistration(fileModel)!.syncQueue

    expect(api.closeFile).toHaveBeenCalledWith({
      rootPath: '/workspace',
      file: '/workspace/src/report.ts'
    })
    expect(api.openFile).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ fileContent: 'const rows = 31' })
    )
    // Why: a close landing after the reopen would leave tsserver with no buffer for the path.
    expect(api.closeFile.mock.invocationCallOrder[0]).toBeLessThan(
      api.openFile.mock.invocationCallOrder[1]
    )
  })

  it('reopens a model once when a crash lost open-file state', async () => {
    const { model } = createModel('file:///workspace/src/service.js', 'export const port = 53')
    api.definition
      .mockResolvedValueOnce({ ok: false, reason: 'file-not-open' })
      .mockResolvedValueOnce({
        ok: true,
        body: [
          {
            file: '/workspace/src/config.js',
            start: { line: 5, offset: 11 },
            end: { line: 5, offset: 17 }
          }
        ]
      })
    const release = registerTsserverModel({
      model,
      rootPath: '/workspace',
      filePath: '/workspace/src/service.js',
      worktreeId: 'repo::/workspace',
      kind: 'file',
      scriptKindName: 'JS'
    })
    releases.push(release)

    const result = await requestTsserverModel(model, 7, 23, api.definition)

    expect(result).toEqual([
      {
        file: '/workspace/src/config.js',
        start: { line: 5, offset: 11 },
        end: { line: 5, offset: 17 }
      }
    ])
    expect(api.openFile).toHaveBeenCalledTimes(2)
    expect(api.definition).toHaveBeenNthCalledWith(2, {
      rootPath: '/workspace',
      file: '/workspace/src/service.js',
      line: 7,
      offset: 23
    })
  })
})
