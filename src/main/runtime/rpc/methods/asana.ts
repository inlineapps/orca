import { defineMethod, type RpcAnyMethod } from '../core'
import { OptionalFiniteNumber, OptionalString, requiredString } from '../schemas'
import { z } from 'zod'

const WorkspaceSelection = z
  .object({
    workspaceGid: OptionalString
  })
  .optional()

const SearchTasks = z.object({
  query: z.unknown().transform((value) => (typeof value === 'string' ? value : '')),
  limit: OptionalFiniteNumber,
  workspaceGid: OptionalString
})

const TaskGid = z.object({ gid: requiredString('Task GID is required') })

export const ASANA_METHODS: RpcAnyMethod[] = [
  defineMethod({
    name: 'asana.connect',
    params: z.object({ token: requiredString('Personal access token is required') }),
    handler: async (params, { runtime }) => runtime.asanaConnect(params.token.trim())
  }),
  defineMethod({
    name: 'asana.disconnect',
    params: null,
    handler: async (_params, { runtime }) => runtime.asanaDisconnect()
  }),
  defineMethod({
    name: 'asana.selectWorkspace',
    params: z.object({ workspaceGid: requiredString('Workspace GID is required') }),
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
    params: z
      .object({
        limit: OptionalFiniteNumber,
        workspaceGid: OptionalString,
        includeCompleted: z.boolean().optional()
      })
      .optional(),
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
    params: z.object({
      projectGid: requiredString('Project GID is required'),
      workspaceGid: OptionalString
    }),
    handler: async (params, { runtime }) =>
      runtime.asanaListSections(params.projectGid.trim(), params.workspaceGid)
  }),
  defineMethod({
    name: 'asana.listProjectTasks',
    params: z.object({
      projectGid: requiredString('Project GID is required'),
      limit: OptionalFiniteNumber,
      includeCompleted: z.boolean().optional(),
      workspaceGid: OptionalString
    }),
    handler: async (params, { runtime }) =>
      runtime.asanaListProjectTasks(
        params.projectGid.trim(),
        params.limit,
        params.includeCompleted,
        params.workspaceGid
      )
  }),
  defineMethod({
    name: 'asana.searchTasks',
    params: SearchTasks,
    handler: async (params, { runtime }) =>
      runtime.asanaSearchTasks(params.query, params.limit, params.workspaceGid)
  }),
  defineMethod({
    name: 'asana.getTask',
    params: TaskGid,
    handler: async (params, { runtime }) => runtime.asanaGetTask(params.gid.trim())
  })
]
