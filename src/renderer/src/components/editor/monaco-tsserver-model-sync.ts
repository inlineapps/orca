import type * as Monaco from 'monaco-editor'
import type {
  TsserverFileLocationArgs,
  TsserverIpcResult,
  TsserverScriptKindName
} from '../../../../shared/tsserver-language-service'
import { toTsserverContentEdits } from './tsserver-monaco-mapping'

export type TsserverModelRegistration = {
  key: string
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
}): () => void {
  const key = args.model.uri.toString()
  const existing = registrations.get(key)
  if (existing) {
    existing.refCount += 1
    return () => releaseRegistration(existing)
  }

  const registration: TsserverModelRegistration = {
    ...args,
    key,
    refCount: 1,
    disposed: false,
    available: false,
    syncQueue: openModel(args).catch(() => false),
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
  registration.disposed = true
  registration.contentSubscription?.dispose()
  registrations.delete(registration.key)
  void registration.syncQueue
    .finally(() =>
      window.api.tsserver.closeFile({
        rootPath: registration.rootPath,
        file: registration.filePath
      })
    )
    .catch(() => undefined)
  if (registration.available) {
    availabilityChanged?.()
  }
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
