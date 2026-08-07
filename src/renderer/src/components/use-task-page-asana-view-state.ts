import { useCallback, useState } from 'react'
import { DEFAULT_ASANA_TASK_FILTER, type AsanaTaskFilter } from '../../../shared/asana-task-filter'
import type { AsanaConnectionStatus, AsanaTask } from '../../../shared/asana-types'
import { useAsanaSubtasks } from '@/components/use-asana-subtasks'
import { useAsanaTaskBoard } from '@/components/use-asana-task-board'
import type { TaskPageJiraListEffectsModel } from './use-task-page-jira-list-effects'

type AsanaViewStateInput = TaskPageJiraListEffectsModel & {
  asanaStatus: AsanaConnectionStatus
  asanaStatusReady: boolean
  asanaConnected: boolean
  selectedAsanaTaskFallback: AsanaTask | null
  setSelectedAsanaTask: (task: AsanaTask | null) => void
  asanaTaskSourceScopeKey: string
}

export function useTaskPageAsanaViewState(model: AsanaViewStateInput) {
  const {
    settings,
    asanaStatus,
    asanaStatusReady,
    asanaConnected,
    pageData,
    selectedAsanaTaskFallback,
    setSelectedAsanaTask,
    asanaTaskSourceScopeKey
  } = model
  const [asanaConnectOpen, setAsanaConnectOpen] = useState(false)
  const [asanaSearchInput, setAsanaSearchInput] = useState('')
  const [appliedAsanaSearch, setAppliedAsanaSearch] = useState('')
  const [selectedAsanaProjectGid, setSelectedAsanaProjectGid] = useState<string | null>(null)
  const [asanaFilter, setAsanaFilter] = useState<AsanaTaskFilter>(DEFAULT_ASANA_TASK_FILTER)
  const [asanaRefreshNonce, setAsanaRefreshNonce] = useState(0)
  const asanaProjectOptions = asanaStatus.projects ?? []
  const board = useAsanaTaskBoard({
    enabled: asanaConnected && asanaStatusReady,
    source: settings,
    contextKey: asanaTaskSourceScopeKey,
    workspaceGid: asanaStatus.activeWorkspaceGid ?? null,
    projectGid: selectedAsanaProjectGid,
    filter: asanaFilter,
    viewerGid: asanaStatus.viewer?.gid ?? null,
    appliedSearch: appliedAsanaSearch,
    localSearch: asanaSearchInput,
    refreshNonce: asanaRefreshNonce
  })
  const subtasks = useAsanaSubtasks({
    source: settings,
    contextKey: asanaTaskSourceScopeKey,
    workspaceGid: asanaStatus.activeWorkspaceGid ?? null,
    refreshNonce: asanaRefreshNonce
  })
  const selectedAsanaTask: AsanaTask | null =
    selectedAsanaTaskFallback ?? pageData.openAsanaTask ?? null
  const handleSelectAsanaProject = useCallback(
    (projectGid: string | null) => {
      setSelectedAsanaProjectGid(projectGid)
      setSelectedAsanaTask(null)
    },
    [setSelectedAsanaTask]
  )
  const nextModel = model as typeof model & {
    asanaConnectOpen: typeof asanaConnectOpen
    setAsanaConnectOpen: typeof setAsanaConnectOpen
    asanaSearchInput: typeof asanaSearchInput
    setAsanaSearchInput: typeof setAsanaSearchInput
    setAppliedAsanaSearch: typeof setAppliedAsanaSearch
    selectedAsanaProjectGid: typeof selectedAsanaProjectGid
    handleSelectAsanaProject: typeof handleSelectAsanaProject
    asanaFilter: typeof asanaFilter
    setAsanaFilter: typeof setAsanaFilter
    asanaProjectOptions: typeof asanaProjectOptions
    asanaBoardGroups: typeof board.groups
    asanaError: typeof board.error
    asanaLoading: typeof board.loading
    onToggleAsanaSection: typeof board.toggleSection
    asanaSubtasks: typeof subtasks
    selectedAsanaTask: typeof selectedAsanaTask
    asanaStatusReady: typeof asanaStatusReady
    asanaConnected: typeof asanaConnected
    bumpAsanaRefresh: () => void
  }
  nextModel.asanaConnectOpen = asanaConnectOpen
  nextModel.setAsanaConnectOpen = setAsanaConnectOpen
  nextModel.asanaSearchInput = asanaSearchInput
  nextModel.setAsanaSearchInput = setAsanaSearchInput
  nextModel.setAppliedAsanaSearch = setAppliedAsanaSearch
  nextModel.selectedAsanaProjectGid = selectedAsanaProjectGid
  nextModel.handleSelectAsanaProject = handleSelectAsanaProject
  nextModel.asanaFilter = asanaFilter
  nextModel.setAsanaFilter = setAsanaFilter
  nextModel.asanaProjectOptions = asanaProjectOptions
  nextModel.asanaBoardGroups = board.groups
  nextModel.asanaError = board.error
  nextModel.asanaLoading = board.loading
  nextModel.onToggleAsanaSection = board.toggleSection
  nextModel.asanaSubtasks = subtasks
  nextModel.selectedAsanaTask = selectedAsanaTask
  nextModel.asanaStatusReady = asanaStatusReady
  nextModel.asanaConnected = asanaConnected
  nextModel.bumpAsanaRefresh = () => setAsanaRefreshNonce((value) => value + 1)
  return nextModel
}
export type TaskPageAsanaViewStateModel = ReturnType<typeof useTaskPageAsanaViewState>
