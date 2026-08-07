import { net } from 'electron'
import type {
  AsanaConnectionStatus,
  AsanaConnectResult,
  AsanaProject,
  AsanaViewer,
  AsanaWorkspace
} from '../../shared/asana-types'
import {
  clearAsanaToken,
  getAsanaCredentialError,
  hasStoredAsanaToken,
  loadAsanaToken,
  saveAsanaToken
} from './asana-credential-store'
import {
  emptyAsanaConnectionState,
  normalizeAsanaProject,
  normalizeAsanaViewer,
  normalizeAsanaWorkspace,
  readAsanaConnectionState,
  writeAsanaConnectionState
} from './asana-connection-state'

const ASANA_API_URL = 'https://app.asana.com/api/1.0'
const ASANA_PAGE_LIMIT = 100
const PROJECT_FIELDS = 'gid,name,archived,permalink_url,workspace.gid,workspace.name'

export type AsanaClient = {
  token: string
  workspaceGid?: string | null
}

export class AsanaApiError extends Error {
  readonly status: number | null

  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = 'AsanaApiError'
    this.status = status
  }
}

export function getStatus(): AsanaConnectionStatus {
  const state = readAsanaConnectionState()
  return {
    connected: hasStoredAsanaToken(),
    viewer: state.viewer,
    workspaces: state.workspaces,
    projects: state.projects,
    activeWorkspaceGid: state.activeWorkspaceGid,
    ...(getAsanaCredentialError() ? { credentialError: getAsanaCredentialError() } : {})
  }
}

export function getClient(workspaceGid?: string | null): AsanaClient {
  const token = loadAsanaToken({ force: true })
  if (!token) {
    throw new AsanaApiError('No Asana personal access token stored.')
  }
  const state = readAsanaConnectionState()
  return { token, workspaceGid: workspaceGid ?? state.activeWorkspaceGid }
}

export async function asanaRequest<T>(
  client: AsanaClient,
  path: string,
  init?: RequestInit
): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')
  headers.set('Authorization', `Bearer ${client.token}`)
  const response = await net.fetch(`${ASANA_API_URL}${path}`, { ...init, headers })
  if (!response.ok) {
    let message = response.statusText || `Asana request failed (${response.status})`
    try {
      const body = (await response.json()) as { errors?: { message?: string }[] }
      const detail = body.errors
        ?.map((entry) => entry.message)
        .filter(Boolean)
        .join('; ')
      if (detail) {
        message = detail
      }
    } catch {
      // Keep the HTTP status when the API does not return JSON.
    }
    throw new AsanaApiError(message, response.status)
  }
  return (await response.json()) as T
}

async function listAll<T>(client: AsanaClient, path: string): Promise<T[]> {
  const result: T[] = []
  let offset: string | null = null
  do {
    const separator = path.includes('?') ? '&' : '?'
    const query = new URLSearchParams({ limit: String(ASANA_PAGE_LIMIT) })
    if (offset) {
      query.set('offset', offset)
    }
    const page = await asanaRequest<{ data?: T[]; next_page?: { offset?: string | null } }>(
      client,
      `${path}${separator}${query.toString()}`
    )
    result.push(...(Array.isArray(page.data) ? page.data : []))
    offset = page.next_page?.offset ?? null
  } while (offset)
  return result
}

async function discover(token: string): Promise<{
  viewer: AsanaViewer
  workspaces: AsanaWorkspace[]
  projects: AsanaProject[]
}> {
  const client = { token }
  const viewerResponse = await asanaRequest<{ data?: unknown }>(client, '/users/me')
  const viewer = normalizeAsanaViewer(viewerResponse.data)
  if (!viewer) {
    throw new AsanaApiError('Asana returned an invalid viewer.')
  }
  const workspaceRows = await listAll<Record<string, unknown>>(client, '/workspaces')
  const workspaces = workspaceRows
    .map(normalizeAsanaWorkspace)
    .filter((workspace): workspace is AsanaWorkspace => workspace !== null)
  const projectRows = await Promise.all(
    workspaces.map((workspace) =>
      listAll<Record<string, unknown>>(
        client,
        `/projects?workspace=${encodeURIComponent(workspace.gid)}&archived=false&opt_fields=${PROJECT_FIELDS}`
      )
    )
  )
  const projects = projectRows
    .flat()
    .map(normalizeAsanaProject)
    .filter((project): project is AsanaProject => project !== null)
  return { viewer, workspaces, projects }
}

function selectActiveWorkspaceGid(
  workspaces: readonly AsanaWorkspace[],
  preferredWorkspaceGid: string | null
): string | null {
  return workspaces.some((workspace) => workspace.gid === preferredWorkspaceGid)
    ? preferredWorkspaceGid
    : (workspaces[0]?.gid ?? null)
}

export async function connect(tokenInput: string): Promise<AsanaConnectResult> {
  const token = tokenInput.trim()
  if (!token) {
    return { ok: false, error: 'Personal access token is required.' }
  }
  try {
    const discovered = await discover(token)
    const activeWorkspaceGid = selectActiveWorkspaceGid(
      discovered.workspaces,
      readAsanaConnectionState().activeWorkspaceGid
    )
    saveAsanaToken(token)
    writeAsanaConnectionState({
      version: 1,
      ...discovered,
      activeWorkspaceGid
    })
    return { ok: true, ...discovered, activeWorkspaceGid }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to connect Asana.' }
  }
}

export async function testConnection(): Promise<AsanaConnectResult> {
  let token: string | null
  try {
    token = loadAsanaToken({ force: true })
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Could not read Asana token.'
    }
  }
  if (!token) {
    return { ok: false, error: 'No Asana personal access token stored.' }
  }
  try {
    const discovered = await discover(token)
    const activeWorkspaceGid = selectActiveWorkspaceGid(
      discovered.workspaces,
      readAsanaConnectionState().activeWorkspaceGid
    )
    writeAsanaConnectionState({ version: 1, ...discovered, activeWorkspaceGid })
    return { ok: true, ...discovered, activeWorkspaceGid }
  } catch (error) {
    if (error instanceof AsanaApiError && (error.status === 401 || error.status === 403)) {
      clearAsanaToken()
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to test Asana access.'
    }
  }
}

export function selectWorkspace(workspaceGid: string): AsanaConnectionStatus {
  const state = readAsanaConnectionState()
  if (!state.workspaces.some((workspace) => workspace.gid === workspaceGid)) {
    return getStatus()
  }
  writeAsanaConnectionState({ ...state, activeWorkspaceGid: workspaceGid })
  return getStatus()
}

// Why: discovery only runs on connect/test, so the picker would never see projects
// created after that without a cheap per-workspace re-list.
export async function refreshProjects(
  workspaceGid?: string | null
): Promise<AsanaConnectionStatus> {
  const state = readAsanaConnectionState()
  const target = workspaceGid ?? state.activeWorkspaceGid
  if (!target) {
    return getStatus()
  }
  const rows = await listAll<Record<string, unknown>>(
    getClient(target),
    `/projects?workspace=${encodeURIComponent(target)}&archived=false&opt_fields=${PROJECT_FIELDS}`
  )
  const refreshed = rows
    .map(normalizeAsanaProject)
    .filter((project): project is AsanaProject => project !== null)
  writeAsanaConnectionState({
    ...state,
    projects: [...state.projects.filter((project) => project.workspaceGid !== target), ...refreshed]
  })
  return getStatus()
}

export function disconnect(): void {
  clearAsanaToken()
  writeAsanaConnectionState(emptyAsanaConnectionState())
}

export function getAsanaWorkspace(workspaceGid?: string | null): AsanaWorkspace | null {
  const state = readAsanaConnectionState()
  const selected = workspaceGid ?? state.activeWorkspaceGid
  return state.workspaces.find((workspace) => workspace.gid === selected) ?? null
}

export function getAsanaProjects(workspaceGid?: string | null): AsanaProject[] {
  const state = readAsanaConnectionState()
  const selected = workspaceGid ?? state.activeWorkspaceGid
  return selected
    ? state.projects.filter((project) => project.workspaceGid === selected)
    : state.projects
}
