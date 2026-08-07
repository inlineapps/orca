import { describe, expect, it } from 'vitest'
import type { AsanaSection, AsanaTask } from '../../../shared/types'
import { DEFAULT_ASANA_TASK_FILTER } from '../../../shared/asana-task-filter'
import {
  ASANA_UNSECTIONED_GID,
  buildAsanaTaskBoardGroups,
  type AsanaSectionTaskState
} from './asana-task-board-groups'

const PROJECT_GID = '1204001885551979'
const VIEWER_GID = '1207734'

function section(gid: string, name: string): AsanaSection {
  return { gid, name, projectGid: PROJECT_GID }
}

function task(gid: string, overrides: Partial<AsanaTask> = {}): AsanaTask {
  return {
    gid,
    name: `Task ${gid}`,
    notes: '',
    completed: false,
    permalinkUrl: `https://app.asana.com/0/${PROJECT_GID}/${gid}`,
    projects: [],
    ...overrides
  }
}

function loaded(tasks: AsanaTask[]): AsanaSectionTaskState {
  return { tasks, loading: false, loaded: true, error: null, hasMore: false }
}

const BASE = {
  sections: [] as AsanaSection[],
  boardGids: [] as string[],
  sectionTasks: {} as Record<string, AsanaSectionTaskState>,
  expandedGids: new Set<string>(),
  assignedTasks: [] as AsanaTask[],
  assignedLoading: false,
  filter: DEFAULT_ASANA_TASK_FILTER,
  viewerGid: VIEWER_GID,
  localSearch: ''
}

describe('buildAsanaTaskBoardGroups', () => {
  it('reports an unfetched section as collapsed with an unknown count', () => {
    const groups = buildAsanaTaskBoardGroups({
      ...BASE,
      projectGid: PROJECT_GID,
      sections: [section('3374', 'SP 60'), section('4485', 'Sprint Story')],
      boardGids: ['3374', '4485'],
      sectionTasks: { '3374': loaded([task('7712'), task('8823')]) },
      expandedGids: new Set(['3374'])
    })

    expect(groups.map((group) => [group.key, group.collapsed, group.count])).toEqual([
      ['3374', false, 2],
      ['4485', true, null]
    ])
    expect(groups[1].tasks).toEqual([])
  })

  it('drops tasks of an expanded section that the filter and search exclude', () => {
    const groups = buildAsanaTaskBoardGroups({
      ...BASE,
      projectGid: PROJECT_GID,
      sections: [section('4485', 'Sprint Story')],
      boardGids: ['4485'],
      sectionTasks: {
        '4485': loaded([
          task('7712', { name: 'Reconcile importer retries' }),
          task('8823', { name: 'Importer smoke test', completed: true }),
          task('9934', { name: 'Rotate credentials' })
        ])
      },
      expandedGids: new Set(['4485']),
      localSearch: 'importer'
    })

    expect(groups[0].tasks.map((entry) => entry.gid)).toEqual(['7712'])
    expect(groups[0].count).toBe(1)
  })

  it('renders a headerless group for a project Asana reports without sections', () => {
    const groups = buildAsanaTaskBoardGroups({
      ...BASE,
      projectGid: PROJECT_GID,
      boardGids: [ASANA_UNSECTIONED_GID],
      sectionTasks: { [ASANA_UNSECTIONED_GID]: loaded([task('7712')]) },
      expandedGids: new Set([ASANA_UNSECTIONED_GID])
    })

    expect(groups).toHaveLength(1)
    expect(groups[0].section).toBeNull()
    expect(groups[0].tasks.map((entry) => entry.gid)).toEqual(['7712'])
  })

  it('keeps the assigned scope as a single always-open group', () => {
    const groups = buildAsanaTaskBoardGroups({
      ...BASE,
      projectGid: null,
      assignedTasks: [
        task('5528', { assignee: { gid: VIEWER_GID, name: 'Mina Chen' } }),
        task('6613', { assignee: { gid: '1209981', name: 'Ravi Patel' } })
      ],
      assignedLoading: true,
      filter: { ...DEFAULT_ASANA_TASK_FILTER, onlyMine: true }
    })

    expect(groups).toEqual([
      expect.objectContaining({ key: 'assigned', section: null, collapsed: false, loading: true })
    ])
    expect(groups[0].tasks.map((entry) => entry.gid)).toEqual(['5528'])
  })
})
