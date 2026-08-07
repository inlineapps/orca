import type { AsanaSection, AsanaTask } from './asana-types'

export type AsanaTaskSectionGroup = {
  /** Null for tasks outside every known section, or for ungrouped list modes. */
  section: AsanaSection | null
  tasks: AsanaTask[]
}

export function groupAsanaTasksBySection(
  tasks: readonly AsanaTask[],
  sections: readonly AsanaSection[]
): AsanaTaskSectionGroup[] {
  const bySectionGid = new Map<string, AsanaTask[]>()
  const ungrouped: AsanaTask[] = []
  const known = new Set(sections.map((section) => section.gid))
  for (const task of tasks) {
    const gid = task.sectionGid
    if (!gid || !known.has(gid)) {
      ungrouped.push(task)
      continue
    }
    const bucket = bySectionGid.get(gid)
    if (bucket) {
      bucket.push(task)
    } else {
      bySectionGid.set(gid, [task])
    }
  }
  const groups: AsanaTaskSectionGroup[] = sections
    .map((section) => ({ section, tasks: bySectionGid.get(section.gid) ?? [] }))
    .filter((group) => group.tasks.length > 0)
  if (ungrouped.length > 0) {
    groups.push({ section: null, tasks: ungrouped })
  }
  return groups
}
