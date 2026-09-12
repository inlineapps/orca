import { z } from 'zod'
import { OptionalFiniteNumber, OptionalString, requiredString } from './rpc-param-primitives'

export const Connect = z.object({
  token: requiredString('Personal access token is required')
})

export const SelectWorkspace = z.object({
  workspaceGid: requiredString('Workspace GID is required')
})

export const WorkspaceSelection = z
  .object({
    workspaceGid: OptionalString
  })
  .optional()

export const ListAssignedTasks = z
  .object({
    limit: OptionalFiniteNumber,
    workspaceGid: OptionalString,
    includeCompleted: z.boolean().optional()
  })
  .optional()

export const ListSections = z.object({
  projectGid: requiredString('Project GID is required'),
  workspaceGid: OptionalString
})

export const ListProjectTasks = z.object({
  projectGid: requiredString('Project GID is required'),
  limit: OptionalFiniteNumber,
  includeCompleted: z.boolean().optional(),
  workspaceGid: OptionalString,
  sectionGid: OptionalString
})

export const ListSubtasks = z.object({
  gid: requiredString('Task GID is required'),
  workspaceGid: OptionalString
})

export const SearchTasks = z.object({
  query: z.unknown().transform((value) => (typeof value === 'string' ? value : '')),
  limit: OptionalFiniteNumber,
  workspaceGid: OptionalString
})

export const GetTask = z.object({ gid: requiredString('Task GID is required') })
