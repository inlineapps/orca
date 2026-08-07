import type { StateCreator } from 'zustand'
import type { AppState } from '../types'
import type {
  AsanaConnectResult,
  AsanaConnectionStatus,
  AsanaSection,
  AsanaTask
} from '../../../../shared/asana-types'
import { withBoundedAsanaCacheEntry, type AsanaCacheEntry } from '@/store/slices/asana-task-cache'
import {
  asanaConnect as connectAsanaRuntime,
  asanaDisconnect as disconnectAsanaRuntime,
  asanaListAssignedTasks,
  asanaSearchTasks,
  asanaReadStatus as readAsanaStatusRuntime,
  asanaRefreshProjects as refreshAsanaProjectsRuntime,
  asanaSelectWorkspace as selectAsanaWorkspaceRuntime,
  asanaStatus as getAsanaStatusRuntime,
  asanaTestConnection as testAsanaConnectionRuntime
} from '@/runtime/runtime-asana-client'
import { getProviderRuntimeContextKey } from '@/lib/provider-runtime-context'
import type { TaskSourceContext } from '../../../../shared/task-source-context'

const EMPTY_ASANA_STATUS: AsanaConnectionStatus = {
  connected: false,
  viewer: null,
  workspaces: [],
  projects: []
}

function asanaStatusContextMatches(
  state: Pick<AsanaSlice, 'asanaStatusContextKey'>,
  settings: AppState['settings']
): boolean {
  return state.asanaStatusContextKey === getProviderRuntimeContextKey(settings)
}

function applyAsanaStatus(
  status: AsanaConnectionStatus,
  contextKey: string
): Pick<AsanaSlice, 'asanaStatus' | 'asanaStatusChecked' | 'asanaStatusContextKey'> {
  return { asanaStatus: status, asanaStatusChecked: true, asanaStatusContextKey: contextKey }
}

export type AsanaSlice = {
  asanaStatus: AsanaConnectionStatus
  asanaStatusChecked: boolean
  asanaStatusContextKey: string | null
  asanaSectionsCache: Record<string, AsanaCacheEntry<AsanaSection[]>>
  asanaTaskCache: Record<string, AsanaCacheEntry<AsanaTask[]>>
  readAsanaSectionsCache: (key: string) => AsanaCacheEntry<AsanaSection[]> | undefined
  writeAsanaSectionsCache: (key: string, sections: AsanaSection[]) => void
  readAsanaTaskCache: (key: string) => AsanaCacheEntry<AsanaTask[]> | undefined
  writeAsanaTaskCache: (key: string, tasks: AsanaTask[]) => void
  checkAsanaConnection: (force?: boolean) => Promise<void>
  readAsanaStatus: () => Promise<AsanaConnectionStatus>
  connectAsana: (token: string) => Promise<AsanaConnectResult>
  disconnectAsana: () => Promise<void>
  selectAsanaWorkspace: (workspaceGid: string) => Promise<AsanaConnectionStatus>
  refreshAsanaProjects: (workspaceGid?: string | null) => Promise<AsanaConnectionStatus>
  testAsanaConnection: () => Promise<AsanaConnectResult>
  listAsanaTasks: (
    settings: AppState['settings'] | TaskSourceContext,
    query?: string,
    limit?: number,
    workspaceGid?: string | null
  ) => Promise<AsanaTask[]>
}

let asanaStatusReadGeneration = 0

export const createAsanaSlice: StateCreator<AppState, [], [], AsanaSlice> = (set, get) => ({
  asanaStatus: EMPTY_ASANA_STATUS,
  asanaStatusChecked: false,
  asanaStatusContextKey: null,
  asanaSectionsCache: {},
  asanaTaskCache: {},

  readAsanaSectionsCache: (key) => get().asanaSectionsCache[key],

  writeAsanaSectionsCache: (key, sections) => {
    set({
      asanaSectionsCache: withBoundedAsanaCacheEntry(get().asanaSectionsCache, key, {
        data: sections,
        fetchedAt: Date.now()
      })
    })
  },

  readAsanaTaskCache: (key) => get().asanaTaskCache[key],

  writeAsanaTaskCache: (key, tasks) => {
    set({
      asanaTaskCache: withBoundedAsanaCacheEntry(get().asanaTaskCache, key, {
        data: tasks,
        fetchedAt: Date.now()
      })
    })
  },

  checkAsanaConnection: async (force = false) => {
    const settings = get().settings
    const contextKey = getProviderRuntimeContextKey(settings)
    if (!force && asanaStatusContextMatches(get(), settings) && get().asanaStatusChecked) {
      return
    }
    const generation = (asanaStatusReadGeneration += 1)
    try {
      const status = await getAsanaStatusRuntime(settings)
      if (generation !== asanaStatusReadGeneration) {
        return
      }
      set(applyAsanaStatus(status, contextKey))
    } catch (error) {
      if (generation !== asanaStatusReadGeneration) {
        return
      }
      set(
        applyAsanaStatus(
          {
            ...EMPTY_ASANA_STATUS,
            credentialError: error instanceof Error ? error.message : String(error)
          },
          contextKey
        )
      )
    }
  },

  readAsanaStatus: async () => {
    const settings = get().settings
    const status = await readAsanaStatusRuntime(settings)
    const contextKey = getProviderRuntimeContextKey(settings)
    set(applyAsanaStatus(status, contextKey))
    return status
  },

  connectAsana: async (token) => {
    const settings = get().settings
    const result = await connectAsanaRuntime(settings, token)
    const contextKey = getProviderRuntimeContextKey(settings)
    if (result.ok) {
      set(
        applyAsanaStatus(
          {
            connected: true,
            viewer: result.viewer,
            workspaces: result.workspaces,
            projects: result.projects,
            activeWorkspaceGid: result.activeWorkspaceGid ?? result.workspaces[0]?.gid
          },
          contextKey
        )
      )
    } else {
      set(applyAsanaStatus({ ...get().asanaStatus, credentialError: result.error }, contextKey))
    }
    return result
  },

  disconnectAsana: async () => {
    const settings = get().settings
    await disconnectAsanaRuntime(settings)
    asanaStatusReadGeneration += 1
    set({
      asanaStatus: EMPTY_ASANA_STATUS,
      asanaStatusChecked: true,
      asanaStatusContextKey: getProviderRuntimeContextKey(settings),
      asanaSectionsCache: {},
      asanaTaskCache: {}
    })
  },

  selectAsanaWorkspace: async (workspaceGid) => {
    const settings = get().settings
    const status = await selectAsanaWorkspaceRuntime(settings, workspaceGid)
    set(applyAsanaStatus(status, getProviderRuntimeContextKey(settings)))
    return status
  },

  refreshAsanaProjects: async (workspaceGid) => {
    const settings = get().settings
    const status = await refreshAsanaProjectsRuntime(settings, workspaceGid)
    set(applyAsanaStatus(status, getProviderRuntimeContextKey(settings)))
    return status
  },

  testAsanaConnection: () => testAsanaConnectionRuntime(get().settings),

  listAsanaTasks: async (settings, query = '', limit = 50, workspaceGid) => {
    return query.trim()
      ? asanaSearchTasks(settings, query, limit, workspaceGid)
      : asanaListAssignedTasks(settings, limit, workspaceGid)
  }
})
