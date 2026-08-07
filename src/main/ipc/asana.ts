import { ipcMain } from 'electron'
import {
  connect,
  disconnect,
  getStatus,
  refreshProjects,
  selectWorkspace,
  testConnection
} from '../asana/client'
import { getTask, listAssignedTasks, listProjects, listSubtasks, searchTasks } from '../asana/tasks'
import { listProjectTasks, listSections, PROJECT_TASK_MAX } from '../asana/project-tasks'
import type { AsanaWorkspace } from '../../shared/asana-types'

function normalizeWorkspaceGid(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function clampLimit(value: unknown): number {
  const limit = typeof value === 'number' && Number.isFinite(value) ? value : 50
  return Math.min(Math.max(1, Math.floor(limit)), 100)
}

function clampProjectTaskLimit(value: unknown): number {
  const limit =
    typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : PROJECT_TASK_MAX
  return Math.min(Math.max(1, limit), PROJECT_TASK_MAX)
}

export function registerAsanaHandlers(): void {
  ipcMain.handle('asana:connect', async (_event, args: { token: string }) => {
    if (typeof args?.token !== 'string') {
      return { ok: false, error: 'Personal access token is required.' }
    }
    return connect(args.token)
  })

  ipcMain.handle('asana:disconnect', async () => {
    disconnect()
  })

  ipcMain.handle('asana:selectWorkspace', async (_event, args: { workspaceGid: string }) => {
    const workspaceGid = normalizeWorkspaceGid(args?.workspaceGid)
    return workspaceGid ? selectWorkspace(workspaceGid) : getStatus()
  })

  ipcMain.handle('asana:status', async () => getStatus())
  ipcMain.handle('asana:readStatus', async () => getStatus())
  ipcMain.handle('asana:testConnection', async () => testConnection())

  ipcMain.handle(
    'asana:listProjects',
    async (_event, args?: { workspaceGid?: string }): Promise<unknown[]> =>
      listProjects(normalizeWorkspaceGid(args?.workspaceGid))
  )

  ipcMain.handle(
    'asana:listAssignedTasks',
    async (_event, args?: { limit?: number; workspaceGid?: string; includeCompleted?: boolean }) =>
      listAssignedTasks(
        clampLimit(args?.limit),
        normalizeWorkspaceGid(args?.workspaceGid),
        args?.includeCompleted === true
      )
  )

  ipcMain.handle('asana:refreshProjects', async (_event, args?: { workspaceGid?: string }) =>
    refreshProjects(normalizeWorkspaceGid(args?.workspaceGid))
  )

  ipcMain.handle(
    'asana:listSections',
    async (_event, args: { projectGid: string; workspaceGid?: string }) => {
      if (typeof args?.projectGid !== 'string' || !args.projectGid.trim()) {
        return []
      }
      return listSections(args.projectGid.trim(), normalizeWorkspaceGid(args.workspaceGid))
    }
  )

  ipcMain.handle(
    'asana:listProjectTasks',
    async (
      _event,
      args: {
        projectGid: string
        limit?: number
        includeCompleted?: boolean
        workspaceGid?: string
        sectionGid?: string
      }
    ) => {
      if (typeof args?.projectGid !== 'string' || !args.projectGid.trim()) {
        return { sections: [], tasks: [], hasMore: false }
      }
      return listProjectTasks(
        args.projectGid.trim(),
        clampProjectTaskLimit(args.limit),
        args.includeCompleted === true,
        normalizeWorkspaceGid(args.workspaceGid),
        typeof args.sectionGid === 'string' ? args.sectionGid.trim() : null
      )
    }
  )

  ipcMain.handle(
    'asana:listSubtasks',
    async (_event, args: { gid: string; workspaceGid?: string }) => {
      if (typeof args?.gid !== 'string' || !args.gid.trim()) {
        return []
      }
      return listSubtasks(args.gid.trim(), normalizeWorkspaceGid(args.workspaceGid))
    }
  )

  ipcMain.handle(
    'asana:searchTasks',
    async (_event, args: { query: string; limit?: number; workspaceGid?: string }) => {
      if (typeof args?.query !== 'string') {
        return []
      }
      return searchTasks(
        args.query,
        clampLimit(args.limit),
        normalizeWorkspaceGid(args.workspaceGid)
      )
    }
  )

  ipcMain.handle('asana:getTask', async (_event, args: { gid: string }) => {
    if (typeof args?.gid !== 'string' || !args.gid.trim()) {
      return null
    }
    return getTask(args.gid.trim())
  })
}

export type AsanaWorkspaceSelection = Pick<AsanaWorkspace, 'gid'>
