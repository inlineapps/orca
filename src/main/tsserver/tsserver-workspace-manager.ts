import type {
  TsserverContentEdit,
  TsserverIpcResult,
  TsserverRootAvailability,
  TsserverScriptKindName
} from '../../shared/tsserver-language-service'
import { TsserverInstance } from './tsserver-instance'
import { TypeScriptNativeLspInstance } from './typescript-native-lsp-instance'
import {
  resolveTypeScriptLanguageServiceEntries,
  type TypeScriptLanguageServiceEntry
} from './typescript-language-service-entry-resolution'
import { registerWorkspaceBackgroundService } from '../memory/workspace-background-service-registry'

export const TSSERVER_IDLE_SHUTDOWN_MS = 5 * 60_000
export const TSSERVER_RESOLVE_RETRY_INTERVAL_MS = 60_000
export const TSSERVER_CRASH_BACKOFF_MS = 60_000
const MAX_CONSECUTIVE_CRASHES = 3
const CRASH_COUNT_RESET_UPTIME_MS = 5 * 60_000

type RootState = {
  instance: LanguageServiceInstance | null
  entries: TypeScriptLanguageServiceEntry[] | null
  entryIndex: number
  spawnedAtMs: number
  noTsserverUntilMs: number
  consecutiveCrashes: number
  crashBackoffUntilMs: number
  idleTimer: NodeJS.Timeout | null
  worktreeId: string | null
  unregisterBackgroundService: (() => void) | null
}

type LanguageServiceInstance = {
  readonly isAlive: boolean
  readonly isReady?: boolean
  readonly pid: number | null
  readonly openFiles: Set<string>
  notify: (command: string, args: unknown) => void
  request: <T>(command: string, args: unknown) => Promise<T>
  dispose: () => void
}

/** One tsserver child per workspace root, spawned lazily and reaped when idle. */
export class TsserverWorkspaceManager {
  private readonly roots = new Map<string, RootState>()

  constructor(private readonly nowMs: () => number = Date.now) {}

  probeRoot(rootPath: string): TsserverRootAvailability {
    const state = this.getRootState(rootPath)
    if (state.instance?.isAlive) {
      return this.availableStatus(state, state.instance.isReady ?? true)
    }
    if (this.nowMs() < state.crashBackoffUntilMs) {
      return { available: false, reason: 'spawn-failed' }
    }
    if (this.resolveEntries(state).length === 0) {
      return { available: false, reason: 'no-tsserver' }
    }
    return this.availableStatus(state, false)
  }

  openFile(
    rootPath: string,
    worktreeId: string,
    file: string,
    fileContent: string,
    scriptKindName: TsserverScriptKindName
  ): boolean {
    this.setWorktreeOwner(rootPath, worktreeId)
    const instance = this.ensureInstance(rootPath)
    if (!instance) {
      return false
    }
    instance.notify('open', { file, fileContent, scriptKindName, projectRootPath: rootPath })
    instance.openFiles.add(file)
    this.clearIdleTimer(this.getRootState(rootPath))
    return true
  }

  /** Returns false when the file is not open (e.g. after a crash) so the caller re-opens with full content. */
  changeFile(rootPath: string, file: string, edits: TsserverContentEdit[]): boolean {
    const instance = this.roots.get(rootPath)?.instance
    if (!instance?.isAlive || !instance.openFiles.has(file)) {
      return false
    }
    for (const edit of edits) {
      instance.notify('change', {
        file,
        line: edit.start.line,
        offset: edit.start.offset,
        endLine: edit.end.line,
        endOffset: edit.end.offset,
        insertString: edit.insertString
      })
    }
    return true
  }

  closeFile(rootPath: string, file: string): void {
    const state = this.roots.get(rootPath)
    const instance = state?.instance
    if (!state || !instance?.isAlive || !instance.openFiles.has(file)) {
      return
    }
    instance.notify('close', { file })
    instance.openFiles.delete(file)
    if (instance.openFiles.size === 0) {
      this.scheduleIdleShutdown(state)
    }
  }

  async requestForFile<T>(
    rootPath: string,
    file: string,
    command: string,
    args: Record<string, unknown>
  ): Promise<TsserverIpcResult<T>> {
    const instance = this.roots.get(rootPath)?.instance
    if (!instance?.isAlive) {
      return this.probeRoot(rootPath).available
        ? { ok: false, reason: 'file-not-open' }
        : { ok: false, reason: 'unavailable' }
    }
    if (!instance.openFiles.has(file)) {
      return { ok: false, reason: 'file-not-open' }
    }
    try {
      const body = await instance.request<T>(command, { file, ...args })
      return { ok: true, body }
    } catch {
      return { ok: false, reason: 'request-failed' }
    }
  }

  disposeAll(): Promise<void> {
    for (const [rootPath, state] of this.roots) {
      this.clearIdleTimer(state)
      this.clearBackgroundService(state)
      state.instance?.dispose()
      this.roots.delete(rootPath)
    }
    return Promise.resolve()
  }

  private getRootState(rootPath: string): RootState {
    let state = this.roots.get(rootPath)
    if (!state) {
      state = {
        instance: null,
        entries: null,
        entryIndex: 0,
        spawnedAtMs: 0,
        noTsserverUntilMs: 0,
        consecutiveCrashes: 0,
        crashBackoffUntilMs: 0,
        idleTimer: null,
        worktreeId: null,
        unregisterBackgroundService: null
      }
      this.roots.set(rootPath, state)
    }
    return state
  }

  private resolveEntries(state: RootState): TypeScriptLanguageServiceEntry[] {
    if (this.nowMs() < state.noTsserverUntilMs) {
      return []
    }
    state.entries ??= resolveTypeScriptLanguageServiceEntries()
    if (state.entries.length === 0) {
      state.noTsserverUntilMs = this.nowMs() + TSSERVER_RESOLVE_RETRY_INTERVAL_MS
      state.entries = null
    }
    return state.entries ?? []
  }

  private ensureInstance(rootPath: string): LanguageServiceInstance | null {
    const state = this.getRootState(rootPath)
    if (state.instance?.isAlive) {
      return state.instance
    }
    if (this.nowMs() < state.crashBackoffUntilMs) {
      return null
    }
    const entries = this.resolveEntries(state)
    const entry = entries[state.entryIndex]
    if (!entry) {
      return null
    }
    try {
      const onExit = (info: { rootPath: string; expected: boolean }): void =>
        this.handleInstanceExit(info.rootPath, info.expected)
      state.instance =
        entry.kind === 'native-lsp'
          ? new TypeScriptNativeLspInstance(rootPath, entry.entryPath, onExit)
          : new TsserverInstance(rootPath, entry.entryPath, onExit)
      state.spawnedAtMs = this.nowMs()
      this.registerBackgroundService(state, entry)
    } catch {
      state.instance = null
      state.crashBackoffUntilMs = this.nowMs() + TSSERVER_CRASH_BACKOFF_MS
      return null
    }
    return state.instance
  }

  private setWorktreeOwner(rootPath: string, worktreeId: string): void {
    const state = this.getRootState(rootPath)
    if (state.worktreeId === worktreeId) {
      return
    }
    state.worktreeId = worktreeId
    const entry = state.entries?.[state.entryIndex]
    if (entry && state.instance?.isAlive) {
      this.registerBackgroundService(state, entry)
    }
  }

  private registerBackgroundService(state: RootState, entry: TypeScriptLanguageServiceEntry): void {
    this.clearBackgroundService(state)
    const pid = state.instance?.pid
    if (!state.worktreeId || !pid) {
      return
    }
    state.unregisterBackgroundService = registerWorkspaceBackgroundService({
      serviceId: 'typescript-language-service',
      serviceKind: 'typescript-language-service',
      worktreeId: state.worktreeId,
      pid,
      ...(entry.version ? { version: entry.version } : {})
    })
  }

  private clearBackgroundService(state: RootState): void {
    state.unregisterBackgroundService?.()
    state.unregisterBackgroundService = null
  }

  private availableStatus(state: RootState, ready: boolean): TsserverRootAvailability {
    const entry = state.entries?.[state.entryIndex]
    return {
      available: true,
      ...(entry ? { backend: entry.kind } : {}),
      ...(entry?.version ? { version: entry.version } : {}),
      ready
    }
  }

  private handleInstanceExit(rootPath: string, expected: boolean): void {
    const state = this.roots.get(rootPath)
    if (!state) {
      return
    }
    this.clearIdleTimer(state)
    this.clearBackgroundService(state)
    state.instance = null
    if (expected) {
      this.roots.delete(rootPath)
      return
    }
    if (state.entries && state.entryIndex + 1 < state.entries.length) {
      state.entryIndex += 1
      state.consecutiveCrashes = 0
      return
    }
    const uptimeMs = this.nowMs() - state.spawnedAtMs
    state.consecutiveCrashes =
      uptimeMs >= CRASH_COUNT_RESET_UPTIME_MS ? 1 : state.consecutiveCrashes + 1
    if (state.consecutiveCrashes >= MAX_CONSECUTIVE_CRASHES) {
      state.crashBackoffUntilMs = this.nowMs() + TSSERVER_CRASH_BACKOFF_MS
      state.consecutiveCrashes = 0
    }
  }

  private scheduleIdleShutdown(state: RootState): void {
    this.clearIdleTimer(state)
    state.idleTimer = setTimeout(() => {
      state.idleTimer = null
      if (state.instance?.isAlive && state.instance.openFiles.size === 0) {
        state.instance.dispose()
      }
    }, TSSERVER_IDLE_SHUTDOWN_MS)
    state.idleTimer.unref?.()
  }

  private clearIdleTimer(state: RootState): void {
    if (state.idleTimer !== null) {
      clearTimeout(state.idleTimer)
      state.idleTimer = null
    }
  }
}
