import {
  asanaRequest,
  AsanaApiError,
  getAsanaProjects,
  getStatus,
  getClient,
  type AsanaClient
} from './client'
import type { AsanaProject, AsanaTask, AsanaWorkspace } from '../../shared/asana-types'

export const TASK_FIELDS = [
  'gid',
  'name',
  'notes',
  'completed',
  'completed_at',
  'due_on',
  'due_at',
  'created_at',
  'modified_at',
  'permalink_url',
  'assignee.gid',
  'assignee.name',
  'assignee.email',
  'workspace.gid',
  'workspace.name',
  'projects.gid',
  'projects.name',
  'projects.workspace.gid',
  'projects.workspace.name',
  'projects.permalink_url',
  'parent.gid',
  'parent.name',
  'parent.permalink_url'
].join(',')

type AsanaRecord = Record<string, unknown>

function mapWorkspace(value: unknown): AsanaWorkspace | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const raw = value as AsanaRecord
  return typeof raw.gid === 'string' && typeof raw.name === 'string'
    ? { gid: raw.gid, name: raw.name }
    : null
}

function mapProject(value: unknown): AsanaProject | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const raw = value as AsanaRecord
  const workspace = mapWorkspace(raw.workspace)
  if (typeof raw.gid !== 'string' || typeof raw.name !== 'string' || !workspace) {
    return null
  }
  return {
    gid: raw.gid,
    name: raw.name,
    workspaceGid: workspace.gid,
    workspaceName: workspace.name,
    ...(typeof raw.permalink_url === 'string' ? { permalinkUrl: raw.permalink_url } : {})
  }
}

export function mapAsanaTask(value: unknown): AsanaTask | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const raw = value as AsanaRecord
  if (
    typeof raw.gid !== 'string' ||
    typeof raw.name !== 'string' ||
    typeof raw.completed !== 'boolean' ||
    typeof raw.permalink_url !== 'string'
  ) {
    return null
  }
  const assignee =
    raw.assignee &&
    typeof raw.assignee === 'object' &&
    typeof (raw.assignee as AsanaRecord).gid === 'string'
      ? {
          gid: (raw.assignee as AsanaRecord).gid as string,
          name:
            typeof (raw.assignee as AsanaRecord).name === 'string'
              ? ((raw.assignee as AsanaRecord).name as string)
              : '',
          ...((raw.assignee as AsanaRecord).email === null ||
          typeof (raw.assignee as AsanaRecord).email === 'string'
            ? { email: (raw.assignee as AsanaRecord).email as string | null }
            : {})
        }
      : null
  const workspace = mapWorkspace(raw.workspace)
  const projects = Array.isArray(raw.projects)
    ? raw.projects.map(mapProject).filter((project): project is AsanaProject => project !== null)
    : []
  const parent =
    raw.parent &&
    typeof raw.parent === 'object' &&
    typeof (raw.parent as AsanaRecord).gid === 'string'
      ? {
          gid: (raw.parent as AsanaRecord).gid as string,
          name:
            typeof (raw.parent as AsanaRecord).name === 'string'
              ? ((raw.parent as AsanaRecord).name as string)
              : '',
          ...((raw.parent as AsanaRecord).permalink_url
            ? { permalinkUrl: (raw.parent as AsanaRecord).permalink_url as string }
            : {})
        }
      : null
  return {
    gid: raw.gid,
    name: raw.name,
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    completed: raw.completed,
    completedAt: typeof raw.completed_at === 'string' ? raw.completed_at : null,
    dueOn: typeof raw.due_on === 'string' ? raw.due_on : null,
    dueAt: typeof raw.due_at === 'string' ? raw.due_at : null,
    ...(typeof raw.created_at === 'string' ? { createdAt: raw.created_at } : {}),
    ...(typeof raw.modified_at === 'string' ? { modifiedAt: raw.modified_at } : {}),
    permalinkUrl: raw.permalink_url,
    assignee,
    workspace,
    projects,
    parent
  }
}

async function listTaskPage(client: AsanaClient, path: string): Promise<AsanaTask[]> {
  const params = new URLSearchParams({ limit: '100', opt_fields: TASK_FIELDS })
  const separator = path.includes('?') ? '&' : '?'
  const response = await asanaRequest<{ data?: unknown[] }>(
    client,
    `${path}${separator}${params.toString()}`
  )
  return (response.data ?? []).map(mapAsanaTask).filter((task): task is AsanaTask => task !== null)
}

function resolveWorkspaceIds(workspaceGid?: string | null): string[] {
  if (workspaceGid && workspaceGid !== 'all') {
    return [workspaceGid]
  }
  const status = getStatus()
  return status.workspaces.map((workspace) => workspace.gid)
}

export function listProjects(workspaceGid?: string | null): AsanaProject[] {
  return getAsanaProjects(workspaceGid)
}

export async function listAssignedTasks(
  limit = 50,
  workspaceGid?: string | null,
  includeCompleted = false
): Promise<AsanaTask[]> {
  const ids = resolveWorkspaceIds(workspaceGid)
  if (ids.length === 0) {
    return []
  }
  const completedSince = includeCompleted ? '' : '&completed_since=now'
  const results = await Promise.all(
    ids.map((gid) =>
      listTaskPage(
        getClient(gid),
        `/tasks?assignee=me&workspace=${encodeURIComponent(gid)}${completedSince}`
      )
    )
  )
  return results.flat().slice(0, Math.min(Math.max(1, limit), 100))
}

export async function searchTasks(
  query: string,
  limit = 50,
  workspaceGid?: string | null
): Promise<AsanaTask[]> {
  const text = query.trim()
  if (!text) {
    return listAssignedTasks(limit, workspaceGid)
  }
  const ids = resolveWorkspaceIds(workspaceGid)
  try {
    const results = await Promise.all(
      ids.map((gid) =>
        listTaskPage(
          getClient(gid),
          `/workspaces/${encodeURIComponent(gid)}/tasks/search?text=${encodeURIComponent(text)}`
        )
      )
    )
    return results.flat().slice(0, Math.min(Math.max(1, limit), 100))
  } catch (error) {
    if (!(error instanceof AsanaApiError) || error.status !== 402) {
      throw error
    }
    const normalizedQuery = text.toLocaleLowerCase()
    const assignedTasks = await listAssignedTasks(100, workspaceGid)
    return assignedTasks
      .filter((task) => `${task.name}\n${task.notes}`.toLocaleLowerCase().includes(normalizedQuery))
      .slice(0, Math.min(Math.max(1, limit), 100))
  }
}

export async function getTask(gid: string): Promise<AsanaTask | null> {
  const id = gid.trim()
  if (!id) {
    return null
  }
  const params = new URLSearchParams({ opt_fields: TASK_FIELDS })
  try {
    const response = await asanaRequest<{ data?: unknown }>(
      getClient(),
      `/tasks/${encodeURIComponent(id)}?${params.toString()}`
    )
    return mapAsanaTask(response.data)
  } catch (error) {
    if (error instanceof AsanaApiError && error.status === 404) {
      return null
    }
    throw error
  }
}
