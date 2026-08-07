import { asanaRequest, getClient, type AsanaClient } from './client'
import { mapAsanaTask, TASK_FIELDS } from './tasks'
import type { AsanaProjectTasks, AsanaSection, AsanaTask } from '../../shared/asana-types'

const PROJECT_TASK_FIELDS = `${TASK_FIELDS},memberships.project.gid,memberships.section.gid,memberships.section.name`
const PAGE_LIMIT = 100
export const PROJECT_TASK_MAX = 500

type AsanaRecord = Record<string, unknown>

function readString(value: unknown, key: string): string | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const raw = (value as AsanaRecord)[key]
  return typeof raw === 'string' ? raw : null
}

// Why: a task can sit in several projects, so only the membership for the listed project names its section.
function resolveSection(raw: unknown, projectGid: string): { gid: string; name: string } | null {
  const memberships = (raw as AsanaRecord | null)?.memberships
  if (!Array.isArray(memberships)) {
    return null
  }
  for (const membership of memberships) {
    if (readString((membership as AsanaRecord)?.project, 'gid') !== projectGid) {
      continue
    }
    const section = (membership as AsanaRecord)?.section
    const gid = readString(section, 'gid')
    if (gid) {
      return { gid, name: readString(section, 'name') ?? '' }
    }
  }
  return null
}

export async function listSections(
  projectGid: string,
  workspaceGid?: string | null
): Promise<AsanaSection[]> {
  const id = projectGid.trim()
  if (!id) {
    return []
  }
  const response = await asanaRequest<{ data?: unknown[] }>(
    getClient(workspaceGid),
    `/projects/${encodeURIComponent(id)}/sections?opt_fields=gid,name&limit=${PAGE_LIMIT}`
  )
  return (response.data ?? []).flatMap((row) => {
    const gid = readString(row, 'gid')
    return gid ? [{ gid, name: readString(row, 'name') ?? '', projectGid: id }] : []
  })
}

async function fetchProjectTaskPages(
  client: AsanaClient,
  projectGid: string,
  limit: number,
  includeCompleted: boolean,
  sectionGid: string | null
): Promise<{ tasks: AsanaTask[]; hasMore: boolean }> {
  const tasks: AsanaTask[] = []
  let offset: string | null = null
  do {
    // Asana rejects project and section together, so a section read stands on its own.
    const query = new URLSearchParams({
      ...(sectionGid ? { section: sectionGid } : { project: projectGid }),
      opt_fields: PROJECT_TASK_FIELDS,
      limit: String(PAGE_LIMIT)
    })
    if (!includeCompleted) {
      query.set('completed_since', 'now')
    }
    if (offset) {
      query.set('offset', offset)
    }
    const page = await asanaRequest<{ data?: unknown[]; next_page?: { offset?: string | null } }>(
      client,
      `/tasks?${query.toString()}`
    )
    for (const row of page.data ?? []) {
      const task = mapAsanaTask(row)
      if (!task) {
        continue
      }
      const section = resolveSection(row, projectGid)
      tasks.push({ ...task, sectionGid: section?.gid ?? null, sectionName: section?.name ?? null })
    }
    offset = page.next_page?.offset ?? null
    if (tasks.length >= limit) {
      return { tasks: tasks.slice(0, limit), hasMore: offset !== null || tasks.length > limit }
    }
  } while (offset)
  return { tasks, hasMore: false }
}

export async function listProjectTasks(
  projectGid: string,
  limit = PROJECT_TASK_MAX,
  includeCompleted = false,
  workspaceGid?: string | null,
  sectionGid?: string | null
): Promise<AsanaProjectTasks> {
  const id = projectGid.trim()
  if (!id) {
    return { sections: [], tasks: [], hasMore: false }
  }
  const section = sectionGid?.trim() || null
  const bounded = Math.min(Math.max(1, Math.floor(limit)), PROJECT_TASK_MAX)
  const client = getClient(workspaceGid)
  // A section read already knows its section, so it skips the extra sections round-trip.
  const [sections, page] = await Promise.all([
    section ? Promise.resolve<AsanaSection[]>([]) : listSections(id, workspaceGid),
    fetchProjectTaskPages(client, id, bounded, includeCompleted, section)
  ])
  return { sections, tasks: page.tasks, hasMore: page.hasMore }
}
