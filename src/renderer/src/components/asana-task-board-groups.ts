import type { AsanaSection, AsanaTask } from '../../../shared/types'
import {
  filterAsanaTasks,
  searchAsanaTasksByText,
  type AsanaTaskFilter
} from '../../../shared/asana-task-filter'

/** Stands in for a project whose tasks Asana reports without any section. */
export const ASANA_UNSECTIONED_GID = '__unsectioned__'

export type AsanaSectionTaskState = {
  tasks: AsanaTask[]
  loading: boolean
  loaded: boolean
  error: string | null
  hasMore: boolean
}

export type AsanaTaskBoardGroup = {
  key: string
  section: AsanaSection | null
  tasks: AsanaTask[]
  collapsed: boolean
  loading: boolean
  error: string | null
  /** Null while a lazily loaded section has never been fetched, so no count can be claimed. */
  count: number | null
}

type BuildGroupsInput = {
  projectGid: string | null
  sections: AsanaSection[]
  boardGids: string[]
  sectionTasks: Record<string, AsanaSectionTaskState>
  expandedGids: ReadonlySet<string>
  assignedTasks: AsanaTask[]
  assignedLoading: boolean
  filter: AsanaTaskFilter
  viewerGid: string | null
  localSearch: string
}

export function buildAsanaTaskBoardGroups(input: BuildGroupsInput): AsanaTaskBoardGroup[] {
  const { filter, viewerGid } = input
  if (!input.projectGid) {
    const visible = filterAsanaTasks(input.assignedTasks, filter, { viewerGid })
    return [
      {
        key: 'assigned',
        section: null,
        tasks: visible,
        collapsed: false,
        loading: input.assignedLoading,
        error: null,
        count: visible.length
      }
    ]
  }
  const sectionByGid = new Map(input.sections.map((section) => [section.gid, section]))
  return input.boardGids.map((gid) => {
    const state = input.sectionTasks[gid]
    const collapsed = !input.expandedGids.has(gid)
    const visible = searchAsanaTasksByText(
      filterAsanaTasks(state?.tasks ?? [], filter, { viewerGid }),
      input.localSearch
    )
    return {
      key: gid,
      section: sectionByGid.get(gid) ?? null,
      tasks: collapsed ? [] : visible,
      collapsed,
      loading: state?.loading ?? false,
      error: state?.error ?? null,
      count: state?.loaded ? visible.length : null
    }
  })
}
