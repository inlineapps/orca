import type { AsanaTask } from './asana-types'

export type AsanaTaskCompletionFilter = 'incomplete' | 'completed' | 'all'
export type AsanaTaskDueFilter = 'any' | 'thisWeek' | 'nextWeek'

export type AsanaTaskFilter = {
  completion: AsanaTaskCompletionFilter
  onlyMine: boolean
  due: AsanaTaskDueFilter
}

export const DEFAULT_ASANA_TASK_FILTER: AsanaTaskFilter = {
  completion: 'incomplete',
  onlyMine: false,
  due: 'any'
}

export function isDefaultAsanaTaskFilter(filter: AsanaTaskFilter): boolean {
  return (
    filter.completion === DEFAULT_ASANA_TASK_FILTER.completion &&
    filter.onlyMine === DEFAULT_ASANA_TASK_FILTER.onlyMine &&
    filter.due === DEFAULT_ASANA_TASK_FILTER.due
  )
}

export function countActiveAsanaTaskFilters(filter: AsanaTaskFilter): number {
  return (
    (filter.completion === DEFAULT_ASANA_TASK_FILTER.completion ? 0 : 1) +
    (filter.onlyMine ? 1 : 0) +
    (filter.due === 'any' ? 0 : 1)
  )
}

/** True when the filter needs completed tasks the incomplete-only fetch would drop. */
export function asanaFilterNeedsCompletedTasks(filter: AsanaTaskFilter): boolean {
  return filter.completion !== 'incomplete'
}

function toLocalDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

// Why: Asana's own quick filters treat the week as Sunday-to-Saturday in local time.
export function asanaWeekRange(now: Date, weekOffset: number): { start: string; end: string } {
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - now.getDay() + weekOffset * 7
  )
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
  return { start: toLocalDateKey(start), end: toLocalDateKey(end) }
}

export function asanaTaskDueDateKey(task: AsanaTask): string | null {
  if (task.dueOn) {
    return task.dueOn
  }
  if (!task.dueAt) {
    return null
  }
  const parsed = new Date(task.dueAt)
  return Number.isNaN(parsed.getTime()) ? null : toLocalDateKey(parsed)
}

function matchesCompletion(task: AsanaTask, completion: AsanaTaskCompletionFilter): boolean {
  if (completion === 'all') {
    return true
  }
  return completion === 'completed' ? task.completed : !task.completed
}

function matchesDue(task: AsanaTask, due: AsanaTaskDueFilter, now: Date): boolean {
  if (due === 'any') {
    return true
  }
  const dueKey = asanaTaskDueDateKey(task)
  if (!dueKey) {
    return false
  }
  const range = asanaWeekRange(now, due === 'thisWeek' ? 0 : 1)
  return dueKey >= range.start && dueKey <= range.end
}

export function filterAsanaTasks(
  tasks: readonly AsanaTask[],
  filter: AsanaTaskFilter,
  options: { viewerGid?: string | null; now?: Date } = {}
): AsanaTask[] {
  const now = options.now ?? new Date()
  return tasks.filter((task) => {
    if (!matchesCompletion(task, filter.completion)) {
      return false
    }
    if (filter.onlyMine && task.assignee?.gid !== options.viewerGid) {
      return false
    }
    return matchesDue(task, filter.due, now)
  })
}

export function searchAsanaTasksByText(tasks: readonly AsanaTask[], query: string): AsanaTask[] {
  const text = query.trim().toLocaleLowerCase()
  if (!text) {
    return [...tasks]
  }
  return tasks.filter((task) => `${task.name}\n${task.notes}`.toLocaleLowerCase().includes(text))
}
