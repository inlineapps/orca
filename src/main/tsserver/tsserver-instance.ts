import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { TsserverMessageReader } from './tsserver-message-reader'

const REQUEST_TIMEOUT_MS = 10_000

type PendingRequest = {
  resolve: (body: unknown) => void
  reject: (error: Error) => void
  timer: NodeJS.Timeout
}

type TsserverResponseMessage = {
  type?: string
  request_seq?: number
  success?: boolean
  message?: string
  body?: unknown
}

export type TsserverInstanceExitInfo = { rootPath: string; expected: boolean }

export class TsserverInstance {
  readonly openFiles = new Set<string>()
  private readonly child: ChildProcessWithoutNullStreams
  private readonly reader = new TsserverMessageReader()
  private readonly pending = new Map<number, PendingRequest>()
  private seq = 0
  private exited = false
  private disposed = false

  constructor(
    readonly rootPath: string,
    entryPath: string,
    private readonly onExit: (info: TsserverInstanceExitInfo) => void
  ) {
    this.child = spawn(process.execPath, [entryPath, '--disableAutomaticTypingAcquisition'], {
      cwd: rootPath,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: ['pipe', 'pipe', 'pipe'],
      ...(process.platform === 'win32' ? { windowsHide: true } : {})
    })
    this.child.stdout.on('data', (chunk: Buffer) => this.handleStdout(chunk))
    this.child.stderr.on('data', (chunk: Buffer) => {
      console.error('[tsserver]', String(chunk).trim())
    })
    this.child.on('error', () => this.handleExit())
    this.child.on('exit', () => this.handleExit())
    this.notify('configure', {
      hostInfo: 'orca',
      preferences: {
        includeCompletionsForModuleExports: true,
        includeCompletionsWithInsertText: true
      }
    })
  }

  get isAlive(): boolean {
    return !this.exited
  }

  get pid(): number | null {
    return this.child.pid ?? null
  }

  /** Fire-and-forget command (open/change/close/configure emit no useful response). */
  notify(command: string, args: unknown): void {
    this.write({ seq: ++this.seq, type: 'request', command, arguments: args })
  }

  request<T>(command: string, args: unknown): Promise<T> {
    if (this.exited) {
      return Promise.reject(new Error('tsserver exited'))
    }
    const requestSeq = ++this.seq
    this.write({ seq: requestSeq, type: 'request', command, arguments: args })
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestSeq)
        reject(new Error(`tsserver ${command} timed out`))
      }, REQUEST_TIMEOUT_MS)
      this.pending.set(requestSeq, {
        resolve: resolve as (body: unknown) => void,
        reject,
        timer
      })
    })
  }

  dispose(): void {
    if (this.disposed || this.exited) {
      this.disposed = true
      return
    }
    this.disposed = true
    this.notify('exit', undefined)
    // Why: give tsserver one tick to exit cleanly, then force-kill.
    setTimeout(() => this.child.kill(), 1_000).unref?.()
  }

  private write(message: unknown): void {
    if (this.exited) {
      return
    }
    try {
      this.child.stdin.write(`${JSON.stringify(message)}\n`)
    } catch {
      // stdin already closed; exit handler owns cleanup.
    }
  }

  private handleStdout(chunk: Buffer): void {
    for (const message of this.reader.append(chunk)) {
      const response = message as TsserverResponseMessage
      if (response?.type !== 'response' || typeof response.request_seq !== 'number') {
        continue
      }
      const pendingRequest = this.pending.get(response.request_seq)
      if (!pendingRequest) {
        continue
      }
      this.pending.delete(response.request_seq)
      clearTimeout(pendingRequest.timer)
      if (response.success) {
        pendingRequest.resolve(response.body)
      } else {
        // Why: success:false is tsserver's normal "no result here" (e.g. hover on
        // whitespace), not a crash — callers map the rejection to an empty result.
        pendingRequest.reject(new Error(response.message ?? 'tsserver request failed'))
      }
    }
  }

  private handleExit(): void {
    if (this.exited) {
      return
    }
    this.exited = true
    for (const pendingRequest of this.pending.values()) {
      clearTimeout(pendingRequest.timer)
      pendingRequest.reject(new Error('tsserver exited'))
    }
    this.pending.clear()
    this.onExit({ rootPath: this.rootPath, expected: this.disposed })
  }
}
