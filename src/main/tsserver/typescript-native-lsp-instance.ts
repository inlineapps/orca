import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { basename } from 'node:path'
import { TsserverMessageReader } from './tsserver-message-reader'
import { toLspUri } from './typescript-native-lsp-mapping'
import { TypeScriptNativeLspRequests } from './typescript-native-lsp-requests'

const REQUEST_TIMEOUT_MS = 10_000

type PendingRequest = {
  resolve: (result: unknown) => void
  reject: (error: Error) => void
  timer: NodeJS.Timeout
}

type JsonRpcMessage = {
  id?: number | string
  method?: string
  result?: unknown
  error?: { message?: string }
  params?: unknown
}

export class TypeScriptNativeLspInstance {
  readonly openFiles = new Set<string>()
  private readonly child: ChildProcessWithoutNullStreams
  private readonly reader = new TsserverMessageReader()
  private readonly pending = new Map<number | string, PendingRequest>()
  private readonly requests: TypeScriptNativeLspRequests
  private readonly ready: Promise<void>
  private nextId = 0
  private exited = false
  private disposed = false
  private initialized = false

  constructor(
    readonly rootPath: string,
    entryPath: string,
    private readonly onExit: (info: { rootPath: string; expected: boolean }) => void
  ) {
    this.child = spawn(entryPath, ['--lsp', '--stdio'], {
      cwd: rootPath,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
      ...(process.platform === 'win32' ? { windowsHide: true } : {})
    })
    this.child.stdout.on('data', (chunk: Buffer) => this.handleStdout(chunk))
    this.child.stderr.on('data', (chunk: Buffer) => {
      const message = String(chunk).trim()
      if (!this.disposed && message) {
        console.error('[typescript-lsp]', message)
      }
    })
    this.child.on('error', () => this.handleExit())
    this.child.on('exit', () => this.handleExit())
    this.requests = new TypeScriptNativeLspRequests(
      (method, params) => this.sendRequest(method, params),
      (method, params) => this.sendNotification(method, params)
    )
    this.ready = this.initialize()
      .then(() => {
        this.initialized = true
      })
      .catch((error) => {
        this.child.kill()
        throw error
      })
  }

  get isAlive(): boolean {
    return !this.exited
  }

  get isReady(): boolean {
    return this.initialized && !this.exited
  }

  get pid(): number | null {
    return this.child.pid ?? null
  }

  notify(command: string, args: unknown): void {
    if (command === 'configure') {
      return
    }
    void this.ready
      .then(() => this.requests.notify(command, args as Record<string, unknown>))
      .catch(() => undefined)
  }

  request<T>(command: string, args: unknown): Promise<T> {
    return this.ready.then(() => this.requests.request(command, args)) as Promise<T>
  }

  dispose(): void {
    if (this.disposed || this.exited) {
      this.disposed = true
      return
    }
    this.disposed = true
    void this.ready
      .then(() => this.sendRequest('shutdown', null))
      .catch(() => undefined)
      .finally(() => {
        this.sendNotification('exit', null)
        setTimeout(() => this.child.kill(), 1_000).unref?.()
      })
  }

  private async initialize(): Promise<void> {
    await this.sendRequest('initialize', {
      processId: process.pid,
      clientInfo: { name: 'Orca' },
      rootPath: this.rootPath,
      rootUri: toLspUri(this.rootPath),
      workspaceFolders: [{ uri: toLspUri(this.rootPath), name: basename(this.rootPath) }],
      capabilities: {
        workspace: { configuration: true, workspaceFolders: true },
        textDocument: {
          definition: { linkSupport: true },
          hover: { contentFormat: ['markdown', 'plaintext'] },
          completion: {
            completionItem: {
              snippetSupport: true,
              insertReplaceSupport: true,
              documentationFormat: ['markdown', 'plaintext'],
              resolveSupport: {
                properties: ['detail', 'documentation', 'additionalTextEdits']
              }
            }
          }
        }
      }
    })
    this.sendNotification('initialized', {})
    this.sendNotification('workspace/didChangeConfiguration', { settings: {} })
  }

  private sendRequest(method: string, params: unknown): Promise<unknown> {
    if (this.exited) {
      return Promise.reject(new Error('TypeScript LSP exited'))
    }
    const id = ++this.nextId
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`TypeScript LSP ${method} timed out`))
      }, REQUEST_TIMEOUT_MS)
      this.pending.set(id, { resolve, reject, timer })
      this.write({ jsonrpc: '2.0', id, method, params })
    })
  }

  private sendNotification(method: string, params: unknown): void {
    this.write({ jsonrpc: '2.0', method, params })
  }

  private write(message: unknown): void {
    if (this.exited) {
      return
    }
    const body = JSON.stringify(message)
    try {
      this.child.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`)
    } catch {
      // Exit handler owns cleanup.
    }
  }

  private handleStdout(chunk: Buffer): void {
    for (const rawMessage of this.reader.append(chunk)) {
      const message = rawMessage as JsonRpcMessage
      if (message.method && message.id !== undefined) {
        this.handleServerRequest(message)
        continue
      }
      if (message.id === undefined) {
        continue
      }
      const pending = this.pending.get(message.id)
      if (!pending) {
        continue
      }
      this.pending.delete(message.id)
      clearTimeout(pending.timer)
      if (message.error) {
        pending.reject(new Error(message.error.message ?? 'TypeScript LSP request failed'))
      } else {
        pending.resolve(message.result)
      }
    }
  }

  private handleServerRequest(message: JsonRpcMessage): void {
    const result =
      message.method === 'workspace/workspaceFolders'
        ? [{ uri: toLspUri(this.rootPath), name: basename(this.rootPath) }]
        : message.method === 'workspace/configuration'
          ? Array((message.params as { items?: unknown[] } | undefined)?.items?.length ?? 0).fill(
              null
            )
          : message.method === 'workspace/applyEdit'
            ? { applied: false }
            : null
    this.write({ jsonrpc: '2.0', id: message.id, result })
  }

  private handleExit(): void {
    if (this.exited) {
      return
    }
    this.exited = true
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer)
      pending.reject(new Error('TypeScript LSP exited'))
    }
    this.pending.clear()
    this.onExit({ rootPath: this.rootPath, expected: this.disposed })
  }
}
