import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { AsanaProject, AsanaViewer, AsanaWorkspace } from '../../shared/asana-types'

const STATE_FILE = 'asana-state.json'

export type AsanaConnectionState = {
  version: 1
  viewer: AsanaViewer | null
  workspaces: AsanaWorkspace[]
  projects: AsanaProject[]
  activeWorkspaceGid: string | null
}

function getStatePath(): string {
  return join(homedir(), '.orca', STATE_FILE)
}

function ensureOrcaDir(): void {
  const dir = join(homedir(), '.orca')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

export function emptyAsanaConnectionState(): AsanaConnectionState {
  return { version: 1, viewer: null, workspaces: [], projects: [], activeWorkspaceGid: null }
}

export function normalizeAsanaViewer(value: unknown): AsanaViewer | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const raw = value as Record<string, unknown>
  if (typeof raw.gid !== 'string' || typeof raw.name !== 'string') {
    return null
  }
  return {
    gid: raw.gid,
    name: raw.name,
    email: typeof raw.email === 'string' ? raw.email : null,
    ...(typeof raw.photoUrl === 'string' ? { photoUrl: raw.photoUrl } : {})
  }
}

export function normalizeAsanaWorkspace(value: unknown): AsanaWorkspace | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const raw = value as Record<string, unknown>
  if (typeof raw.gid !== 'string' || typeof raw.name !== 'string') {
    return null
  }
  return {
    gid: raw.gid,
    name: raw.name,
    ...(typeof raw.resourceType === 'string'
      ? { resourceType: raw.resourceType }
      : typeof raw.resource_type === 'string'
        ? { resourceType: raw.resource_type }
        : {})
  }
}

export function normalizeAsanaProject(value: unknown): AsanaProject | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const raw = value as Record<string, unknown>
  const workspace = raw.workspace && typeof raw.workspace === 'object' ? raw.workspace : null
  const workspaceRecord = workspace as Record<string, unknown> | null
  const workspaceGid =
    typeof raw.workspaceGid === 'string'
      ? raw.workspaceGid
      : typeof workspaceRecord?.gid === 'string'
        ? workspaceRecord.gid
        : null
  if (typeof raw.gid !== 'string' || typeof raw.name !== 'string' || !workspaceGid) {
    return null
  }
  const workspaceName =
    typeof raw.workspaceName === 'string'
      ? raw.workspaceName
      : typeof workspaceRecord?.name === 'string'
        ? workspaceRecord.name
        : null
  return {
    gid: raw.gid,
    name: raw.name,
    workspaceGid,
    ...(workspaceName ? { workspaceName } : {}),
    ...(typeof raw.archived === 'boolean' ? { archived: raw.archived } : {}),
    ...(typeof raw.permalinkUrl === 'string'
      ? { permalinkUrl: raw.permalinkUrl }
      : typeof raw.permalink_url === 'string'
        ? { permalinkUrl: raw.permalink_url }
        : {})
  }
}

function normalizeAsanaConnectionState(value: unknown): AsanaConnectionState {
  if (!value || typeof value !== 'object') {
    return emptyAsanaConnectionState()
  }
  const raw = value as Record<string, unknown>
  const workspaces = Array.isArray(raw.workspaces)
    ? raw.workspaces
        .map(normalizeAsanaWorkspace)
        .filter((workspace): workspace is AsanaWorkspace => workspace !== null)
    : []
  const projects = Array.isArray(raw.projects)
    ? raw.projects
        .map(normalizeAsanaProject)
        .filter((project): project is AsanaProject => project !== null)
    : []
  const activeWorkspaceGid =
    typeof raw.activeWorkspaceGid === 'string' &&
    workspaces.some((workspace) => workspace.gid === raw.activeWorkspaceGid)
      ? raw.activeWorkspaceGid
      : (workspaces[0]?.gid ?? null)
  return {
    version: 1,
    viewer: normalizeAsanaViewer(raw.viewer),
    workspaces,
    projects,
    activeWorkspaceGid
  }
}

let cachedState: AsanaConnectionState | null = null
let stateLoaded = false

export function readAsanaConnectionState(): AsanaConnectionState {
  if (!stateLoaded || !cachedState) {
    if (!existsSync(getStatePath())) {
      cachedState = emptyAsanaConnectionState()
    } else {
      try {
        cachedState = normalizeAsanaConnectionState(
          JSON.parse(readFileSync(getStatePath(), 'utf8'))
        )
      } catch {
        cachedState = emptyAsanaConnectionState()
      }
    }
    stateLoaded = true
  }
  return cachedState
}

export function writeAsanaConnectionState(state: AsanaConnectionState): void {
  ensureOrcaDir()
  cachedState = normalizeAsanaConnectionState(state)
  stateLoaded = true
  writeFileSync(getStatePath(), JSON.stringify(cachedState, null, 2), {
    encoding: 'utf8',
    mode: 0o600
  })
}
