import {
  connect as connectAsana,
  disconnect as disconnectAsana,
  getStatus as getAsanaStatus,
  refreshProjects as refreshAsanaProjects,
  selectWorkspace as selectAsanaWorkspace,
  testConnection as testAsanaConnection
} from '../asana/client'
import {
  listProjectTasks as listAsanaProjectTasks,
  listSections as listAsanaSections,
  PROJECT_TASK_MAX as ASANA_PROJECT_TASK_MAX
} from '../asana/project-tasks'
import {
  getTask as getAsanaTask,
  listAssignedTasks as listAsanaAssignedTasks,
  listProjects as listAsanaProjects,
  searchTasks as searchAsanaTasks
} from '../asana/tasks'

export class RuntimeAsanaCommands {
  asanaConnect(token: string): ReturnType<typeof connectAsana> {
    return connectAsana(token)
  }

  asanaDisconnect(): { ok: true } {
    disconnectAsana()
    return { ok: true }
  }

  asanaSelectWorkspace(workspaceGid: string): ReturnType<typeof selectAsanaWorkspace> {
    return selectAsanaWorkspace(workspaceGid)
  }

  asanaStatus(): ReturnType<typeof getAsanaStatus> {
    return getAsanaStatus()
  }

  asanaReadStatus(): ReturnType<typeof getAsanaStatus> {
    return getAsanaStatus()
  }

  asanaTestConnection(): ReturnType<typeof testAsanaConnection> {
    return testAsanaConnection()
  }

  asanaListProjects(workspaceGid?: string): ReturnType<typeof listAsanaProjects> {
    return listAsanaProjects(workspaceGid)
  }

  asanaListAssignedTasks(
    limit = 50,
    workspaceGid?: string,
    includeCompleted = false
  ): ReturnType<typeof listAsanaAssignedTasks> {
    return listAsanaAssignedTasks(Math.min(Math.max(1, limit), 100), workspaceGid, includeCompleted)
  }

  asanaRefreshProjects(workspaceGid?: string): ReturnType<typeof refreshAsanaProjects> {
    return refreshAsanaProjects(workspaceGid)
  }

  asanaListSections(
    projectGid: string,
    workspaceGid?: string
  ): ReturnType<typeof listAsanaSections> {
    return listAsanaSections(projectGid, workspaceGid)
  }

  asanaListProjectTasks(
    projectGid: string,
    limit = ASANA_PROJECT_TASK_MAX,
    includeCompleted = false,
    workspaceGid?: string
  ): ReturnType<typeof listAsanaProjectTasks> {
    return listAsanaProjectTasks(
      projectGid,
      Math.min(Math.max(1, limit), ASANA_PROJECT_TASK_MAX),
      includeCompleted,
      workspaceGid
    )
  }

  asanaSearchTasks(
    query: string,
    limit = 50,
    workspaceGid?: string
  ): ReturnType<typeof searchAsanaTasks> {
    return searchAsanaTasks(query, Math.min(Math.max(1, limit), 100), workspaceGid)
  }

  asanaGetTask(gid: string): ReturnType<typeof getAsanaTask> {
    return getAsanaTask(gid)
  }
}
