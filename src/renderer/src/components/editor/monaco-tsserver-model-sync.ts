import type * as Monaco from 'monaco-editor'
import type {
  TsserverFileLocationArgs,
  TsserverIpcResult,
  TsserverScriptKindName
} from '../../../../shared/tsserver-language-service'
import { normalizeRuntimePathForComparison } from '../../../../shared/cross-platform-path'
import { toTsserverContentEdits } from './tsserver-monaco-mapping'

/** Which surface owns the buffer: a file editor tab or a diff pane's modified side. */
export type TsserverRegistrationKind = 'file' | 'diff'

export type TsserverModelRegistration = {
  key: string
  kind: TsserverRegistrationKind
  model: Monaco.editor.ITextModel
  rootPath: string
  filePath: string
  worktreeId: string
  scriptKindName: TsserverScriptKindName
  refCount: number
  disposed: boolean
  available: boolean
  syncQueue: Promise<boolean>
  contentSubscription: Monaco.IDisposable | null
}

type FeatureRequest<T> = (args: TsserverFileLocationArgs) => Promise<TsserverIpcResult<T>>

const registrations = new Map<string, TsserverModelRegistration>()
let availabilityChanged: (() => void) | null = null

export function onTsserverAvailabilityChanged(callback: () => void): void {
  availabilityChanged = callback
}

export function hasAvailableTsserverModels(): boolean {
  return [...registrations.values()].some((registration) => registration.available)
}

export function registerTsserverModel(args: {
  model: Monaco.editor.ITextModel
  rootPath: string
  filePath: string
  worktreeId: string
  scriptKindName: TsserverScriptKindName
  kind: TsserverRegistrationKind
}): () => void {
  const key = args.model.uri.toString()
  const existing = registrations.get(key)
  if (existing) {
    existing.refCount += 1
    return () => releaseRegistration(existing)
  }

  // Why: tsserver holds one buffer per path, so a second model for the same file would clobber the
  // first one's edits. The file editor always wins; a diff pane only attaches to an unclaimed path.
  const owner = findRegistrationForPath(pathOwnershipKey(args.rootPath, args.filePath))
  if (owner && (args.kind === 'diff' || owner.kind === 'file')) {
    return () => undefined
  }
  const evicted = owner ? disposeRegistration(owner) : null

  const registration: TsserverModelRegistration = {
    ...args,
    key,
    refCount: 1,
    disposed: false,
    available: false,
    // Why: chain past the evicted registration's closeFile, else its close lands after this open.
    syncQueue: (evicted ? evicted.then(() => openModel(args)) : openModel(args)).catch(() => false),
    contentSubscription: null
  }
  registration.contentSubscription = args.model.onDidChangeContent((event) => {
    registration.syncQueue = registration.syncQueue
      .then(async (ready) => {
        if (!ready || registration.disposed) {
          return false
        }
        const updated = await window.api.tsserver.updateFile({
          rootPath: registration.rootPath,
          file: registration.filePath,
          edits: toTsserverContentEdits(event.changes)
        })
        const available = updated || (await reopenModel(registration))
        setRegistrationAvailability(registration, available)
        return available
      })
      .catch(() => {
        setRegistrationAvailability(registration, false)
        return false
      })
  })
  registrations.set(key, registration)
  registration.syncQueue.then((available) => {
    if (!registration.disposed) {
      setRegistrationAvailability(registration, available)
    }
  })
  return () => releaseRegistration(registration)
}

export async function requestTsserverModel<T>(
  model: Monaco.editor.ITextModel,
  line: number,
  offset: number,
  request: FeatureRequest<T>
): Promise<T | null> {
  const registration = registrations.get(model.uri.toString())
  return registration ? requestTsserverRegistration(registration, line, offset, request) : null
}

export async function requestTsserverRegistration<T>(
  registration: TsserverModelRegistration,
  line: number,
  offset: number,
  request: FeatureRequest<T>
): Promise<T | null> {
  let ready = await registration.syncQueue
  if (!ready && !registration.disposed) {
    ready = await reopenModel(registration).catch(() => false)
    registration.syncQueue = Promise.resolve(ready)
    setRegistrationAvailability(registration, ready)
  }
  if (!ready || registration.disposed) {
    return null
  }
  const args = {
    rootPath: registration.rootPath,
    file: registration.filePath,
    line,
    offset
  }
  let result = await invokeFeatureRequest(request, args)
  if (!result) {
    return null
  }
  if (!result.ok && result.reason === 'file-not-open') {
    const reopened = await reopenModel(registration).catch(() => false)
    setRegistrationAvailability(registration, reopened)
    if (reopened) {
      const retry = await invokeFeatureRequest(request, args)
      if (!retry) {
        return null
      }
      result = retry
    }
  }
  return result.ok ? result.body : null
}

async function invokeFeatureRequest<T>(
  request: FeatureRequest<T>,
  args: TsserverFileLocationArgs
): Promise<TsserverIpcResult<T> | null> {
  try {
    return await request(args)
  } catch {
    return null
  }
}

export function getTsserverRegistration(
  model: Monaco.editor.ITextModel
): TsserverModelRegistration | null {
  return registrations.get(model.uri.toString()) ?? null
}

async function openModel(args: {
  model: Monaco.editor.ITextModel
  rootPath: string
  filePath: string
  worktreeId: string
  scriptKindName: TsserverScriptKindName
}): Promise<boolean> {
  const availability = await window.api.tsserver.probeRoot({ rootPath: args.rootPath })
  if (!availability.available) {
    return false
  }
  return window.api.tsserver.openFile({
    rootPath: args.rootPath,
    worktreeId: args.worktreeId,
    file: args.filePath,
    fileContent: args.model.getValue(),
    scriptKindName: args.scriptKindName
  })
}

function reopenModel(registration: TsserverModelRegistration): Promise<boolean> {
  return window.api.tsserver.openFile({
    rootPath: registration.rootPath,
    worktreeId: registration.worktreeId,
    file: registration.filePath,
    fileContent: registration.model.getValue(),
    scriptKindName: registration.scriptKindName
  })
}

function releaseRegistration(registration: TsserverModelRegistration): void {
  registration.refCount -= 1
  if (registration.refCount > 0 || registration.disposed) {
    return
  }
  void disposeRegistration(registration)
}

function disposeRegistration(registration: TsserverModelRegistration): Promise<void> {
  registration.disposed = true
  registration.contentSubscription?.dispose()
  registrations.delete(registration.key)
  const closed = registration.syncQueue
    .finally(() =>
      window.api.tsserver.closeFile({
        rootPath: registration.rootPath,
        file: registration.filePath
      })
    )
    .then(() => undefined)
    .catch(() => undefined)
  if (registration.available) {
    registration.available = false
    availabilityChanged?.()
  }
  return closed
}

function pathOwnershipKey(rootPath: string, filePath: string): string {
  return JSON.stringify([
    normalizeRuntimePathForComparison(rootPath),
    normalizeRuntimePathForComparison(filePath)
  ])
}

function findRegistrationForPath(pathKey: string): TsserverModelRegistration | null {
  for (const registration of registrations.values()) {
    if (pathOwnershipKey(registration.rootPath, registration.filePath) === pathKey) {
      return registration
    }
  }
  return null
}

function setRegistrationAvailability(
  registration: TsserverModelRegistration,
  available: boolean
): void {
  if (registration.available === available) {
    return
  }
  registration.available = available
  availabilityChanged?.()
}
