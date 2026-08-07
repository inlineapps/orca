export type AsanaViewer = {
  gid: string
  name: string
  email: string | null
  photoUrl?: string | null
}

export type AsanaWorkspace = {
  gid: string
  name: string
  resourceType?: string
}

export type AsanaProject = {
  gid: string
  name: string
  workspaceGid: string
  workspaceName?: string
  archived?: boolean
  permalinkUrl?: string
}

export type AsanaSection = {
  gid: string
  name: string
  projectGid: string
}

export type AsanaTask = {
  gid: string
  name: string
  notes: string
  completed: boolean
  completedAt?: string | null
  dueOn?: string | null
  dueAt?: string | null
  createdAt?: string
  modifiedAt?: string
  permalinkUrl: string
  assignee?: { gid: string; name: string; email?: string | null } | null
  workspace?: AsanaWorkspace | null
  projects: AsanaProject[]
  parent?: { gid: string; name: string; permalinkUrl?: string } | null
  /** Section membership resolved against the project the task was listed under. */
  sectionGid?: string | null
  sectionName?: string | null
}

export type AsanaProjectTasks = {
  sections: AsanaSection[]
  tasks: AsanaTask[]
  hasMore: boolean
}

export type AsanaConnectionStatus = {
  connected: boolean
  viewer: AsanaViewer | null
  workspaces: AsanaWorkspace[]
  projects: AsanaProject[]
  activeWorkspaceGid?: string | null
  credentialError?: string
}

export type AsanaConnectResult =
  | {
      ok: true
      viewer: AsanaViewer
      workspaces: AsanaWorkspace[]
      projects: AsanaProject[]
      activeWorkspaceGid?: string | null
    }
  | { ok: false; error: string }
