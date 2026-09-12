import {
  Connect,
  GetTask,
  ListAssignedTasks,
  ListProjectTasks,
  ListSections,
  ListSubtasks,
  SearchTasks,
  SelectWorkspace,
  WorkspaceSelection
} from '../../../../shared/rpc-contract/asana-params'
import { defineMethod } from '../core'

export const ASANA_METHODS = [
  defineMethod({
    name: 'asana.connect',
    params: Connect,
    handler: async (params, { runtime }) => runtime.asanaConnect(params.token.trim())
  }),
  defineMethod({
    name: 'asana.disconnect',
    params: null,
    handler: async (_params, { runtime }) => runtime.asanaDisconnect()
  }),
  defineMethod({
    name: 'asana.selectWorkspace',
    params: SelectWorkspace,
    handler: async (params, { runtime }) => runtime.asanaSelectWorkspace(params.workspaceGid.trim())
  }),
  defineMethod({
    name: 'asana.status',
    params: null,
    handler: async (_params, { runtime }) => runtime.asanaStatus()
  }),
  defineMethod({
    name: 'asana.readStatus',
    params: null,
    handler: async (_params, { runtime }) => runtime.asanaReadStatus()
  }),
  defineMethod({
    name: 'asana.testConnection',
    params: null,
    handler: async (_params, { runtime }) => runtime.asanaTestConnection()
  }),
  defineMethod({
    name: 'asana.listProjects',
    params: WorkspaceSelection,
    handler: async (params, { runtime }) => runtime.asanaListProjects(params?.workspaceGid)
  }),
  defineMethod({
    name: 'asana.listAssignedTasks',
    params: ListAssignedTasks,
    handler: async (params, { runtime }) =>
      runtime.asanaListAssignedTasks(params?.limit, params?.workspaceGid, params?.includeCompleted)
  }),
  defineMethod({
    name: 'asana.refreshProjects',
    params: WorkspaceSelection,
    handler: async (params, { runtime }) => runtime.asanaRefreshProjects(params?.workspaceGid)
  }),
  defineMethod({
    name: 'asana.listSections',
    params: ListSections,
    handler: async (params, { runtime }) =>
      runtime.asanaListSections(params.projectGid.trim(), params.workspaceGid)
  }),
  defineMethod({
    name: 'asana.listProjectTasks',
    params: ListProjectTasks,
    handler: async (params, { runtime }) =>
      runtime.asanaListProjectTasks(
        params.projectGid.trim(),
        params.limit,
        params.includeCompleted,
        params.workspaceGid,
        params.sectionGid
      )
  }),
  defineMethod({
    name: 'asana.listSubtasks',
    params: ListSubtasks,
    handler: async (params, { runtime }) =>
      runtime.asanaListSubtasks(params.gid.trim(), params.workspaceGid)
  }),
  defineMethod({
    name: 'asana.searchTasks',
    params: SearchTasks,
    handler: async (params, { runtime }) =>
      runtime.asanaSearchTasks(params.query, params.limit, params.workspaceGid)
  }),
  defineMethod({
    name: 'asana.getTask',
    params: GetTask,
    handler: async (params, { runtime }) => runtime.asanaGetTask(params.gid.trim())
  })
]
