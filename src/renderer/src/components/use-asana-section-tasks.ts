import { useEffect, useRef, useState } from 'react'
import {
  ASANA_UNSECTIONED_GID,
  type AsanaSectionTaskState
} from '@/components/asana-task-board-groups'
import { asanaSectionTasksCacheKey, isAsanaCacheUsable } from '@/store/slices/asana-task-cache'
import { asanaListProjectTasks, type RuntimeAsanaSettings } from '@/runtime/runtime-asana-client'
import { useAppStore } from '@/store'

type UseAsanaSectionTasksOptions = {
  enabled: boolean
  source: RuntimeAsanaSettings
  contextKey: string
  projectGid: string | null
  workspaceGid: string | null
  includeCompleted: boolean
  boardGids: string[]
  expandedGids: ReadonlySet<string>
  invalidatedAt: number
}

const PENDING: AsanaSectionTaskState = {
  tasks: [],
  loading: true,
  loaded: false,
  error: null,
  hasMore: false
}

export function useAsanaSectionTasks(
  options: UseAsanaSectionTasksOptions
): Record<string, AsanaSectionTaskState> {
  const {
    enabled,
    source,
    contextKey,
    projectGid,
    workspaceGid,
    includeCompleted,
    boardGids,
    expandedGids,
    invalidatedAt
  } = options
  const readTaskCache = useAppStore((s) => s.readAsanaTaskCache)
  const writeTaskCache = useAppStore((s) => s.writeAsanaTaskCache)
  const [sectionTasks, setSectionTasks] = useState<Record<string, AsanaSectionTaskState>>({})
  // Why: in-flight reads outlive the render that started them, so staleness is tracked by scope
  // generation rather than effect cleanup — cleanup would abandon every request it just issued.
  const requestedGidsRef = useRef(new Set<string>())
  const generationRef = useRef(0)

  useEffect(() => {
    generationRef.current += 1
    requestedGidsRef.current = new Set()
    setSectionTasks({})
  }, [contextKey, includeCompleted, invalidatedAt, projectGid, workspaceGid])

  useEffect(() => {
    if (!enabled || !projectGid) {
      return
    }
    const pending = boardGids.filter(
      (gid) => expandedGids.has(gid) && !requestedGidsRef.current.has(gid)
    )
    if (pending.length === 0) {
      return
    }
    const generation = generationRef.current
    const patch = (gid: string, state: AsanaSectionTaskState): void => {
      if (generationRef.current === generation) {
        setSectionTasks((current) => ({ ...current, [gid]: state }))
      }
    }
    for (const gid of pending) {
      requestedGidsRef.current.add(gid)
    }
    setSectionTasks((current) => {
      const next = { ...current }
      for (const gid of pending) {
        next[gid] = PENDING
      }
      return next
    })
    for (const gid of pending) {
      const key = asanaSectionTasksCacheKey(contextKey, projectGid, gid, includeCompleted)
      const entry = readTaskCache(key)
      if (isAsanaCacheUsable(entry, invalidatedAt)) {
        patch(gid, {
          tasks: entry?.data ?? [],
          loading: false,
          loaded: true,
          error: null,
          hasMore: false
        })
        continue
      }
      if (entry) {
        patch(gid, { ...PENDING, tasks: entry.data })
      }
      void asanaListProjectTasks(
        source,
        projectGid,
        undefined,
        includeCompleted,
        workspaceGid,
        gid === ASANA_UNSECTIONED_GID ? null : gid
      )
        .then((result) => {
          writeTaskCache(key, result.tasks)
          patch(gid, {
            tasks: result.tasks,
            loading: false,
            loaded: true,
            error: null,
            hasMore: result.hasMore
          })
        })
        .catch((error: unknown) => {
          patch(gid, {
            tasks: [],
            loading: false,
            loaded: true,
            error: error instanceof Error ? error.message : String(error),
            hasMore: false
          })
        })
    }
  }, [
    boardGids,
    contextKey,
    enabled,
    expandedGids,
    includeCompleted,
    invalidatedAt,
    projectGid,
    readTaskCache,
    source,
    workspaceGid,
    writeTaskCache
  ])

  return sectionTasks
}
