// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { editor } from 'monaco-editor'

const fixture = vi.hoisted(() => ({
  executionHostId: 'local' as string | null,
  registerTsserverModel: vi.fn(),
  installMonacoTsserverProviders: vi.fn()
}))

vi.mock('@/lib/monaco-setup', () => ({ monaco: {} }))
vi.mock('@/store', () => ({
  useAppStore: (selector: (state: unknown) => unknown) =>
    selector({ getKnownWorktreeById: () => ({ path: '/workspace/feature' }) })
}))
vi.mock('@/lib/resolved-worktree-execution-host', () => ({
  getResolvedExecutionHostIdForWorktree: () => fixture.executionHostId
}))
vi.mock('./monaco-tsserver-model-sync', () => ({
  registerTsserverModel: fixture.registerTsserverModel
}))
vi.mock('./monaco-tsserver-providers', () => ({
  installMonacoTsserverProviders: fixture.installMonacoTsserverProviders
}))

import { useDiffTsserverModel } from './useDiffTsserverModel'

function modifiedEditorFixture(initialModel: unknown): {
  editor: editor.ICodeEditor
  swapModel: (next: unknown) => void
} {
  let model = initialModel
  let listener: (() => void) | null = null
  return {
    editor: {
      getModel: () => model,
      onDidChangeModel: (next: () => void) => {
        listener = next
        return { dispose: () => (listener = null) }
      }
    } as unknown as editor.ICodeEditor,
    swapModel: (next) => {
      model = next
      act(() => listener?.())
    }
  }
}

const typeScriptDiff = {
  language: 'typescript',
  relativePath: 'src/pricing.ts',
  worktreeId: 'repo::/workspace/feature'
}

describe('useDiffTsserverModel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fixture.executionHostId = 'local'
    fixture.registerTsserverModel.mockImplementation(() => vi.fn())
  })

  it('attaches the modified model under its absolute path', () => {
    const modified = modifiedEditorFixture({ id: 'modified-v1' })

    renderHook(() => useDiffTsserverModel({ ...typeScriptDiff, modifiedEditor: modified.editor }))

    expect(fixture.installMonacoTsserverProviders).toHaveBeenCalledTimes(1)
    expect(fixture.registerTsserverModel).toHaveBeenCalledWith({
      model: { id: 'modified-v1' },
      rootPath: '/workspace/feature',
      filePath: '/workspace/feature/src/pricing.ts',
      worktreeId: 'repo::/workspace/feature',
      scriptKindName: 'TS',
      kind: 'diff'
    })
  })

  const skippedCases: [string, Record<string, unknown>][] = [
    ['a non-code diff', { language: 'markdown', relativePath: 'docs/CHANGELOG.md' }],
    ['a diff without a worktree', { worktreeId: undefined }],
    ['an unmounted section', { modifiedEditor: null }]
  ]

  it.each(skippedCases)('leaves %s unattached', (_label, overrides) => {
    const modified = modifiedEditorFixture({ id: 'modified-v1' })

    renderHook(() =>
      useDiffTsserverModel({
        ...typeScriptDiff,
        modifiedEditor: modified.editor,
        ...overrides
      })
    )

    expect(fixture.registerTsserverModel).not.toHaveBeenCalled()
  })

  it('leaves a non-local diff unattached', () => {
    fixture.executionHostId = 'ssh:build-box'
    const modified = modifiedEditorFixture({ id: 'modified-v1' })

    renderHook(() => useDiffTsserverModel({ ...typeScriptDiff, modifiedEditor: modified.editor }))

    expect(fixture.registerTsserverModel).not.toHaveBeenCalled()
  })

  it('follows the model swap a refreshed diff performs in place', () => {
    const releaseFirst = vi.fn()
    const releaseSecond = vi.fn()
    fixture.registerTsserverModel
      .mockReturnValueOnce(releaseFirst)
      .mockReturnValueOnce(releaseSecond)
    const modified = modifiedEditorFixture({ id: 'modified-v1' })
    const { unmount } = renderHook(() =>
      useDiffTsserverModel({ ...typeScriptDiff, modifiedEditor: modified.editor })
    )

    modified.swapModel({ id: 'modified-v2' })

    expect(releaseFirst).toHaveBeenCalledTimes(1)
    expect(fixture.registerTsserverModel).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ model: { id: 'modified-v2' }, kind: 'diff' })
    )

    unmount()
    expect(releaseSecond).toHaveBeenCalledTimes(1)
    expect(releaseFirst).toHaveBeenCalledTimes(1)
  })
})
