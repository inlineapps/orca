import { describe, expect, it } from 'vitest'
import type { AsanaTask } from './asana-types'
import {
  asanaWeekRange,
  countActiveAsanaTaskFilters,
  DEFAULT_ASANA_TASK_FILTER,
  filterAsanaTasks,
  isDefaultAsanaTaskFilter,
  searchAsanaTasksByText
} from './asana-task-filter'

function task(overrides: Partial<AsanaTask> & Pick<AsanaTask, 'gid'>): AsanaTask {
  return {
    name: `Task ${overrides.gid}`,
    notes: '',
    completed: false,
    permalinkUrl: `https://app.asana.com/0/1204/${overrides.gid}`,
    projects: [],
    ...overrides
  }
}

const VIEWER_GID = '1207734'
const TEAMMATE_GID = '1209981'
// Wednesday 2026-09-16 local; week runs 2026-09-13 (Sun) to 2026-09-19 (Sat).
const NOW = new Date(2026, 8, 16, 14, 37)

describe('asana task filters', () => {
  it('spans the Sunday-to-Saturday week for the requested offset', () => {
    expect(asanaWeekRange(NOW, 0)).toEqual({ start: '2026-09-13', end: '2026-09-19' })
    expect(asanaWeekRange(NOW, 1)).toEqual({ start: '2026-09-20', end: '2026-09-26' })
  })

  it('keeps only incomplete tasks by default', () => {
    const tasks = [
      task({ gid: '3391', completed: false }),
      task({ gid: '4470', completed: true, completedAt: '2026-09-15T03:12:00.000Z' })
    ]

    expect(
      filterAsanaTasks(tasks, DEFAULT_ASANA_TASK_FILTER, { now: NOW }).map((t) => t.gid)
    ).toEqual(['3391'])
    expect(
      filterAsanaTasks(
        tasks,
        { ...DEFAULT_ASANA_TASK_FILTER, completion: 'completed' },
        { now: NOW }
      ).map((t) => t.gid)
    ).toEqual(['4470'])
    expect(
      filterAsanaTasks(tasks, { ...DEFAULT_ASANA_TASK_FILTER, completion: 'all' }, { now: NOW })
    ).toHaveLength(2)
  })

  it('restricts to the viewer when only-mine is on', () => {
    const tasks = [
      task({ gid: '5528', assignee: { gid: VIEWER_GID, name: 'Mina Chen' } }),
      task({ gid: '6613', assignee: { gid: TEAMMATE_GID, name: 'Ravi Patel' } }),
      task({ gid: '7742', assignee: null })
    ]

    expect(
      filterAsanaTasks(
        tasks,
        { ...DEFAULT_ASANA_TASK_FILTER, onlyMine: true },
        { viewerGid: VIEWER_GID, now: NOW }
      ).map((t) => t.gid)
    ).toEqual(['5528'])
  })

  it('matches due dates against this week and next week, including due_at instants', () => {
    const tasks = [
      task({ gid: '8814', dueOn: '2026-09-19' }),
      task({ gid: '9925', dueOn: '2026-09-24' }),
      task({ gid: '2236', dueOn: '2026-10-08' }),
      task({ gid: '3347', dueOn: null, dueAt: new Date(2026, 8, 14, 9, 5).toISOString() }),
      task({ gid: '4458' })
    ]

    expect(
      filterAsanaTasks(tasks, { ...DEFAULT_ASANA_TASK_FILTER, due: 'thisWeek' }, { now: NOW }).map(
        (t) => t.gid
      )
    ).toEqual(['8814', '3347'])
    expect(
      filterAsanaTasks(tasks, { ...DEFAULT_ASANA_TASK_FILTER, due: 'nextWeek' }, { now: NOW }).map(
        (t) => t.gid
      )
    ).toEqual(['9925'])
  })

  it('reports how many filters deviate from the default', () => {
    expect(isDefaultAsanaTaskFilter(DEFAULT_ASANA_TASK_FILTER)).toBe(true)
    expect(countActiveAsanaTaskFilters(DEFAULT_ASANA_TASK_FILTER)).toBe(0)
    expect(
      countActiveAsanaTaskFilters({ completion: 'all', onlyMine: true, due: 'nextWeek' })
    ).toBe(3)
  })

  it('matches name and notes case-insensitively', () => {
    const tasks = [
      task({ gid: '5569', name: 'Reconcile Importer edge cases' }),
      task({ gid: '6674', name: 'Launch brief', notes: 'Cover IMPORTER retries' }),
      task({ gid: '7783', name: 'Rotate credentials' })
    ]

    expect(searchAsanaTasksByText(tasks, 'importer').map((t) => t.gid)).toEqual(['5569', '6674'])
    expect(searchAsanaTasksByText(tasks, '   ')).toHaveLength(3)
  })
})
