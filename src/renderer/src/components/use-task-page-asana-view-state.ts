import { useCallback, useMemo, useState } from 'react'
import { DEFAULT_ASANA_TASK_FILTER, type AsanaTaskFilter } from '../../../shared/asana-task-filter'
import { groupAsanaTasksBySection } from '../../../shared/asana-task-sections'
import type { AsanaTask } from '../../../shared/asana-types'
import type { TaskPageJiraListEffectsModel } from './use-task-page-jira-list-effects'

export function useTaskPageAsanaViewState(model: TaskPageJiraListEffectsModel) {
  const {
    asanaStatus,
    asanaStatusReady,
    asanaConnected,
    pageData,
    selectedAsanaTaskFallback,
    setSelectedAsanaTask
  } = model
  const [asanaConnectOpen, setAsanaConnectOpen] = useState(false)
  const [asanaSearchInput, setAsanaSearchInput] = useState('')
  const [appliedAsanaSearch, setAppliedAsanaSearch] = useState('')
  const [selectedAsanaProjectGid, setSelectedAsanaProjectGid] = useState<string | null>(null)
  const [asanaFilter, setAsanaFilter] = useState<AsanaTaskFilter>(DEFAULT_ASANA_TASK_FILTER)
  const asanaProjectOptions = asanaStatus.projects ?? []
  const asanaTaskGroups = useMemo(() => groupAsanaTasksBySection([], []), [])
  const selectedAsanaTask: AsanaTask | null =
    selectedAsanaTaskFallback ?? pageData.openAsanaTask ?? null
  const handleSelectAsanaProject = useCallback((projectGid: string | null) => {
    setSelectedAsanaProjectGid(projectGid)
    setSelectedAsanaTask(null)
  }, [setSelectedAsanaTask])
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
    asanaTaskGroups: typeof asanaTaskGroups
    asanaError: null
    asanaLoading: false
    selectedAsanaTask: typeof selectedAsanaTask
    asanaStatusReady: typeof asanaStatusReady
    asanaConnected: typeof asanaConnected
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
  nextModel.asanaTaskGroups = asanaTaskGroups
  nextModel.asanaError = null
  nextModel.asanaLoading = false
  nextModel.selectedAsanaTask = selectedAsanaTask
  nextModel.asanaStatusReady = asanaStatusReady
  nextModel.asanaConnected = asanaConnected
  return nextModel
}
export type TaskPageAsanaViewStateModel = ReturnType<typeof useTaskPageAsanaViewState>
