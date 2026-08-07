import type {
  AsanaConnectResult,
  AsanaConnectionStatus,
  AsanaProject,
  AsanaProjectTasks,
  AsanaSection,
  AsanaTask
} from '../../shared/asana-types'

export type AsanaApi = {
  connect: (args: { token: string }) => Promise<AsanaConnectResult>
  disconnect: () => Promise<void>
  selectWorkspace: (args: { workspaceGid: string }) => Promise<AsanaConnectionStatus>
  status: () => Promise<AsanaConnectionStatus>
  readStatus: () => Promise<AsanaConnectionStatus>
  testConnection: () => Promise<AsanaConnectResult>
  listProjects: (args?: { workspaceGid?: string }) => Promise<AsanaProject[]>
  listAssignedTasks: (args?: {
    limit?: number
    workspaceGid?: string
    includeCompleted?: boolean
  }) => Promise<AsanaTask[]>
  refreshProjects: (args?: { workspaceGid?: string }) => Promise<AsanaConnectionStatus>
  listSections: (args: { projectGid: string; workspaceGid?: string }) => Promise<AsanaSection[]>
  listProjectTasks: (args: {
    projectGid: string
    limit?: number
    includeCompleted?: boolean
    workspaceGid?: string
    sectionGid?: string
  }) => Promise<AsanaProjectTasks>
  listSubtasks: (args: { gid: string; workspaceGid?: string }) => Promise<AsanaTask[]>
  searchTasks: (args: {
    query: string
    limit?: number
    workspaceGid?: string
  }) => Promise<AsanaTask[]>
  getTask: (args: { gid: string }) => Promise<AsanaTask | null>
}
