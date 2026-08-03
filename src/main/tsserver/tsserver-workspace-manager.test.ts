import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  TSSERVER_CRASH_BACKOFF_MS,
  TSSERVER_IDLE_SHUTDOWN_MS,
  TSSERVER_RESOLVE_RETRY_INTERVAL_MS,
  TsserverWorkspaceManager
} from './tsserver-workspace-manager'
import {
  listWorkspaceBackgroundServices,
  resetWorkspaceBackgroundServicesForTests
} from '../memory/workspace-background-service-registry'

const mocks = vi.hoisted(() => ({
  instances: [] as {
    kind: 'native-lsp' | 'legacy-tsserver'
    rootPath: string
    pid: number
    isAlive: boolean
    openFiles: Set<string>
    notify: ReturnType<typeof vi.fn>
    request: ReturnType<typeof vi.fn>
    dispose: ReturnType<typeof vi.fn>
    crash: () => void
  }[],
  resolveEntries: vi.fn()
}))

vi.mock('./typescript-language-service-entry-resolution', () => ({
  resolveTypeScriptLanguageServiceEntries: mocks.resolveEntries
}))

vi.mock('./tsserver-instance', () => ({
  TsserverInstance: class {
    readonly kind = 'legacy-tsserver' as const
    readonly pid = 137 + mocks.instances.length * 19
    readonly openFiles = new Set<string>()
    readonly notify = vi.fn()
    readonly request = vi.fn()
    readonly dispose = vi.fn(() => {
      this.isAlive = false
      this.onExit({ rootPath: this.rootPath, expected: true })
    })
    isAlive = true

    constructor(
      readonly rootPath: string,
      _entryPath: string,
      private readonly onExit: (info: { rootPath: string; expected: boolean }) => void
    ) {
      mocks.instances.push(this)
    }

    crash = (): void => {
      this.isAlive = false
      this.onExit({ rootPath: this.rootPath, expected: false })
    }
  }
}))

vi.mock('./typescript-native-lsp-instance', () => ({
  TypeScriptNativeLspInstance: class {
    readonly kind = 'native-lsp' as const
    readonly pid = 173 + mocks.instances.length * 23
    readonly openFiles = new Set<string>()
    readonly notify = vi.fn()
    readonly request = vi.fn()
    readonly dispose = vi.fn(() => {
      this.isAlive = false
      this.onExit({ rootPath: this.rootPath, expected: true })
    })
    isAlive = true

    constructor(
      readonly rootPath: string,
      _entryPath: string,
      private readonly onExit: (info: { rootPath: string; expected: boolean }) => void
    ) {
      mocks.instances.push(this)
    }

    crash = (): void => {
      this.isAlive = false
      this.onExit({ rootPath: this.rootPath, expected: false })
    }
  }
}))

describe('TsserverWorkspaceManager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.instances.length = 0
    mocks.resolveEntries.mockReset()
  })

  afterEach(() => {
    resetWorkspaceBackgroundServicesForTests()
    vi.useRealTimers()
  })

  it('caches a missing workspace tsserver for the retry interval', () => {
    let now = 8_000
    mocks.resolveEntries.mockReturnValue([])
    const manager = new TsserverWorkspaceManager(() => now)

    expect(manager.probeRoot('/workspace/alpha')).toEqual({
      available: false,
      reason: 'no-tsserver'
    })
    expect(manager.probeRoot('/workspace/alpha')).toEqual({
      available: false,
      reason: 'no-tsserver'
    })
    expect(mocks.resolveEntries).toHaveBeenCalledTimes(1)

    now += TSSERVER_RESOLVE_RETRY_INTERVAL_MS
    manager.probeRoot('/workspace/alpha')
    expect(mocks.resolveEntries).toHaveBeenCalledTimes(2)
  })

  it('syncs diverse edits and disposes the last closed root after idle', () => {
    mocks.resolveEntries.mockReturnValue([
      {
        kind: 'legacy-tsserver',
        entryPath: '/orca/typescript-api/lib/tsserver.js',
        version: '6.5.3'
      }
    ])
    const manager = new TsserverWorkspaceManager()
    const file = '/workspace/alpha/src/router.ts'

    expect(manager.probeRoot('/workspace/alpha')).toEqual({
      available: true,
      backend: 'legacy-tsserver',
      version: '6.5.3',
      ready: false
    })

    expect(
      manager.openFile('/workspace/alpha', 'repo::/workspace/alpha', file, 'const route = 23', 'TS')
    ).toBe(true)
    expect(manager.probeRoot('/workspace/alpha')).toEqual({
      available: true,
      backend: 'legacy-tsserver',
      version: '6.5.3',
      ready: true
    })
    const instance = mocks.instances[0]!
    expect(instance.notify).toHaveBeenNthCalledWith(1, 'open', {
      file,
      fileContent: 'const route = 23',
      scriptKindName: 'TS',
      projectRootPath: '/workspace/alpha'
    })

    expect(
      manager.changeFile('/workspace/alpha', file, [
        {
          start: { line: 7, offset: 13 },
          end: { line: 7, offset: 18 },
          insertString: 'handler'
        },
        {
          start: { line: 3, offset: 5 },
          end: { line: 4, offset: 9 },
          insertString: 'routeMap'
        }
      ])
    ).toBe(true)
    expect(instance.notify).toHaveBeenNthCalledWith(2, 'change', {
      file,
      line: 7,
      offset: 13,
      endLine: 7,
      endOffset: 18,
      insertString: 'handler'
    })
    expect(instance.notify).toHaveBeenNthCalledWith(3, 'change', {
      file,
      line: 3,
      offset: 5,
      endLine: 4,
      endOffset: 9,
      insertString: 'routeMap'
    })

    manager.closeFile('/workspace/alpha', file)
    vi.advanceTimersByTime(TSSERVER_IDLE_SHUTDOWN_MS - 17)
    expect(instance.dispose).not.toHaveBeenCalled()
    vi.advanceTimersByTime(17)
    expect(instance.dispose).toHaveBeenCalledTimes(1)
  })

  it('backs off after three short crashes and recovers later', () => {
    let now = 15_000
    mocks.resolveEntries.mockReturnValue([
      { kind: 'legacy-tsserver', entryPath: '/orca/typescript-api/lib/tsserver.js' }
    ])
    const manager = new TsserverWorkspaceManager(() => now)
    const file = '/workspace/beta/src/worker.js'

    for (const increment of [37, 53, 71]) {
      expect(
        manager.openFile(
          '/workspace/beta',
          'repo::/workspace/beta',
          file,
          'export const worker = 47',
          'JS'
        )
      ).toBe(true)
      mocks.instances.at(-1)!.crash()
      now += increment
    }

    expect(
      manager.openFile(
        '/workspace/beta',
        'repo::/workspace/beta',
        file,
        'export const worker = 47',
        'JS'
      )
    ).toBe(false)
    expect(manager.probeRoot('/workspace/beta')).toEqual({
      available: false,
      reason: 'spawn-failed'
    })

    now += TSSERVER_CRASH_BACKOFF_MS
    expect(
      manager.openFile(
        '/workspace/beta',
        'repo::/workspace/beta',
        file,
        'export const worker = 47',
        'JS'
      )
    ).toBe(true)
    expect(mocks.instances).toHaveLength(4)
  })

  it('falls back to bundled TS6 after the native server crashes', () => {
    mocks.resolveEntries.mockReturnValue([
      { kind: 'native-lsp', entryPath: '/orca/typescript/bin/tsc' },
      { kind: 'legacy-tsserver', entryPath: '/orca/typescript-api/lib/tsserver.js' }
    ])
    const manager = new TsserverWorkspaceManager()
    const file = '/workspace/gamma/src/capacity.ts'

    expect(
      manager.openFile(
        '/workspace/gamma',
        'repo::/workspace/gamma',
        file,
        'export const capacity = 59',
        'TS'
      )
    ).toBe(true)
    expect(mocks.instances[0]?.kind).toBe('native-lsp')
    expect(listWorkspaceBackgroundServices()).toEqual([
      expect.objectContaining({
        worktreeId: 'repo::/workspace/gamma',
        pid: mocks.instances[0]?.pid
      })
    ])
    mocks.instances[0]?.crash()
    expect(listWorkspaceBackgroundServices()).toEqual([])

    expect(
      manager.openFile(
        '/workspace/gamma',
        'repo::/workspace/gamma',
        file,
        'export const capacity = 59',
        'TS'
      )
    ).toBe(true)
    expect(mocks.instances[1]?.kind).toBe('legacy-tsserver')
    expect(listWorkspaceBackgroundServices()).toEqual([
      expect.objectContaining({
        worktreeId: 'repo::/workspace/gamma',
        pid: mocks.instances[1]?.pid
      })
    ])
  })
})
