import type {
  AsanaConnectResult,
  AsanaConnectionStatus,
  AsanaProject,
  AsanaProjectTasks,
  AsanaSection,
  AsanaTask
} from '../../../shared/asana-types'
import { callRuntimeRpc, RuntimeRpcCallError } from './runtime-rpc-client'
import { getAsanaRuntimeTarget, type RuntimeAsanaSettings } from './runtime-asana-target'
import { ASANA_TASK_PROVIDER_UPDATE_REQUIRED_MESSAGE } from '../../../shared/protocol-version'

export type { RuntimeAsanaSettings } from './runtime-asana-target'

async function callAsana<T>(
  settings: RuntimeAsanaSettings,
  method: string,
  args?: unknown,
  timeoutMs = 30_000
): Promise<T> {
  const target = getAsanaRuntimeTarget(settings)
  if (target.kind === 'environment') {
    try {
      return await callRuntimeRpc<T>(target, method, args, { timeoutMs })
    } catch (error) {
      if (isLegacyRuntimeMethodError(error)) {
        throw new Error(ASANA_TASK_PROVIDER_UPDATE_REQUIRED_MESSAGE)
      }
      throw error
    }
  }
  throw new Error('Asana runtime target is not local')
}

function isLegacyRuntimeMethodError(error: unknown): boolean {
  return error instanceof RuntimeRpcCallError && error.code === 'method_not_found'
}

export async function asanaStatus(settings: RuntimeAsanaSettings): Promise<AsanaConnectionStatus> {
  const target = getAsanaRuntimeTarget(settings)
  if (target.kind === 'environment') {
    try {
      return await callRuntimeRpc<AsanaConnectionStatus>(target, 'asana.status', undefined, {
        timeoutMs: 15_000
      })
    } catch (error) {
      if (isLegacyRuntimeMethodError(error)) {
        return { connected: false, viewer: null, workspaces: [], projects: [] }
      }
      throw error
    }
  }
  return window.api.asana.status()
}

export async function asanaReadStatus(
  settings: RuntimeAsanaSettings
): Promise<AsanaConnectionStatus> {
  const target = getAsanaRuntimeTarget(settings)
  return target.kind === 'environment'
    ? callAsana<AsanaConnectionStatus>(settings, 'asana.readStatus', undefined, 15_000)
    : window.api.asana.readStatus()
}

export async function asanaConnect(
  settings: RuntimeAsanaSettings,
  token: string
): Promise<AsanaConnectResult> {
  const target = getAsanaRuntimeTarget(settings)
  return target.kind === 'environment'
    ? callAsana<AsanaConnectResult>(settings, 'asana.connect', { token })
    : window.api.asana.connect({ token })
}

export async function asanaDisconnect(settings: RuntimeAsanaSettings): Promise<void> {
  const target = getAsanaRuntimeTarget(settings)
  if (target.kind === 'environment') {
    await callAsana<{ ok: true }>(settings, 'asana.disconnect', undefined, 15_000)
    return
  }
  await window.api.asana.disconnect()
}

export async function asanaSelectWorkspace(
  settings: RuntimeAsanaSettings,
  workspaceGid: string
): Promise<AsanaConnectionStatus> {
  const target = getAsanaRuntimeTarget(settings)
  return target.kind === 'environment'
    ? callAsana<AsanaConnectionStatus>(settings, 'asana.selectWorkspace', { workspaceGid }, 15_000)
    : window.api.asana.selectWorkspace({ workspaceGid })
}

export async function asanaTestConnection(
  settings: RuntimeAsanaSettings
): Promise<AsanaConnectResult> {
  const target = getAsanaRuntimeTarget(settings)
  return target.kind === 'environment'
    ? callAsana<AsanaConnectResult>(settings, 'asana.testConnection')
    : window.api.asana.testConnection()
}

export async function asanaListProjects(
  settings: RuntimeAsanaSettings,
  workspaceGid?: string | null
): Promise<AsanaProject[]> {
  const target = getAsanaRuntimeTarget(settings)
  const args = workspaceGid ? { workspaceGid } : undefined
  return target.kind === 'environment'
    ? callAsana<AsanaProject[]>(settings, 'asana.listProjects', args)
    : window.api.asana.listProjects(args)
}

export async function asanaListAssignedTasks(
  settings: RuntimeAsanaSettings,
  limit = 50,
  workspaceGid?: string | null,
  includeCompleted = false
): Promise<AsanaTask[]> {
  const target = getAsanaRuntimeTarget(settings)
  const args = { limit, workspaceGid: workspaceGid ?? undefined, includeCompleted }
  return target.kind === 'environment'
    ? callAsana<AsanaTask[]>(settings, 'asana.listAssignedTasks', args)
    : window.api.asana.listAssignedTasks(args)
}

export async function asanaRefreshProjects(
  settings: RuntimeAsanaSettings,
  workspaceGid?: string | null
): Promise<AsanaConnectionStatus> {
  const target = getAsanaRuntimeTarget(settings)
  const args = workspaceGid ? { workspaceGid } : undefined
  return target.kind === 'environment'
    ? callAsana<AsanaConnectionStatus>(settings, 'asana.refreshProjects', args)
    : window.api.asana.refreshProjects(args)
}

export async function asanaListSections(
  settings: RuntimeAsanaSettings,
  projectGid: string,
  workspaceGid?: string | null
): Promise<AsanaSection[]> {
  const target = getAsanaRuntimeTarget(settings)
  const args = { projectGid, workspaceGid: workspaceGid ?? undefined }
  return target.kind === 'environment'
    ? callAsana<AsanaSection[]>(settings, 'asana.listSections', args)
    : window.api.asana.listSections(args)
}

export async function asanaListProjectTasks(
  settings: RuntimeAsanaSettings,
  projectGid: string,
  limit?: number,
  includeCompleted = false,
  workspaceGid?: string | null,
  sectionGid?: string | null
): Promise<AsanaProjectTasks> {
  const target = getAsanaRuntimeTarget(settings)
  const args = {
    projectGid,
    limit,
    includeCompleted,
    workspaceGid: workspaceGid ?? undefined,
    sectionGid: sectionGid ?? undefined
  }
  const result =
    target.kind === 'environment'
      ? await callAsana<AsanaProjectTasks>(settings, 'asana.listProjectTasks', args, 45_000)
      : await window.api.asana.listProjectTasks(args)
  if (!sectionGid) {
    return result
  }
  // Why: a host that predates section reads ignores sectionGid and answers with the whole project.
  return { ...result, tasks: result.tasks.filter((task) => task.sectionGid === sectionGid) }
}

export async function asanaListSubtasks(
  settings: RuntimeAsanaSettings,
  gid: string,
  workspaceGid?: string | null
): Promise<AsanaTask[]> {
  const target = getAsanaRuntimeTarget(settings)
  const args = { gid, workspaceGid: workspaceGid ?? undefined }
  return target.kind === 'environment'
    ? callAsana<AsanaTask[]>(settings, 'asana.listSubtasks', args)
    : window.api.asana.listSubtasks(args)
}

export async function asanaSearchTasks(
  settings: RuntimeAsanaSettings,
  query: string,
  limit = 50,
  workspaceGid?: string | null
): Promise<AsanaTask[]> {
  const target = getAsanaRuntimeTarget(settings)
  const args = { query, limit, workspaceGid: workspaceGid ?? undefined }
  return target.kind === 'environment'
    ? callAsana<AsanaTask[]>(settings, 'asana.searchTasks', args)
    : window.api.asana.searchTasks(args)
}

export async function asanaGetTask(
  settings: RuntimeAsanaSettings,
  gid: string
): Promise<AsanaTask | null> {
  const target = getAsanaRuntimeTarget(settings)
  return target.kind === 'environment'
    ? callAsana<AsanaTask | null>(settings, 'asana.getTask', { gid })
    : window.api.asana.getTask({ gid })
}
