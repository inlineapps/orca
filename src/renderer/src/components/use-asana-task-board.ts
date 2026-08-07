import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AsanaSection, AsanaTask } from '../../../shared/types'
import {
  asanaFilterNeedsCompletedTasks,
  type AsanaTaskFilter
} from '../../../shared/asana-task-filter'
import {
  ASANA_UNSECTIONED_GID,
  buildAsanaTaskBoardGroups,
  type AsanaTaskBoardGroup
} from '@/components/asana-task-board-groups'
import { useAsanaSectionTasks } from '@/components/use-asana-section-tasks'
import {
  asanaAssignedTasksCacheKey,
  asanaSectionsCacheKey,
  isAsanaCacheUsable
} from '@/store/slices/asana-task-cache'
import {
  asanaListAssignedTasks,
  asanaListSections,
  asanaSearchTasks,
  type RuntimeAsanaSettings
} from '@/runtime/runtime-asana-client'
import { useAppStore } from '@/store'

const ASSIGNED_TASK_LIMIT = 50

export type { AsanaTaskBoardGroup } from '@/components/asana-task-board-groups'

export type AsanaTaskBoard = {
  groups: AsanaTaskBoardGroup[]
  tasks: AsanaTask[]
  loading: boolean
  error: string | null
  hasMore: boolean
  toggleSection: (gid: string) => void
}

type UseAsanaTaskBoardOptions = {
  enabled: boolean
  source: RuntimeAsanaSettings
  contextKey: string
  workspaceGid: string | null
  projectGid: string | null
  filter: AsanaTaskFilter
  viewerGid: string | null
  appliedSearch: string
  localSearch: string
  refreshNonce: number
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function useAsanaTaskBoard(options: UseAsanaTaskBoardOptions): AsanaTaskBoard {
  const {
    enabled,
    source,
    contextKey,
    workspaceGid,
    projectGid,
    filter,
    viewerGid,
    appliedSearch,
    localSearch,
    refreshNonce
  } = options
  const includeCompleted = asanaFilterNeedsCompletedTasks(filter)
  const readSectionsCache = useAppStore((s) => s.readAsanaSectionsCache)
  const writeSectionsCache = useAppStore((s) => s.writeAsanaSectionsCache)
  const readTaskCache = useAppStore((s) => s.readAsanaTaskCache)
  const writeTaskCache = useAppStore((s) => s.writeAsanaTaskCache)

  // Why: the refresh button must beat the TTL, so anything cached before the press is unusable.
  const nonceRef = useRef(refreshNonce)
  const [invalidatedAt, setInvalidatedAt] = useState(0)
  if (nonceRef.current !== refreshNonce) {
    nonceRef.current = refreshNonce
    setInvalidatedAt(Date.now())
  }

  const [sections, setSections] = useState<AsanaSection[]>([])
  const [sectionsLoaded, setSectionsLoaded] = useState(false)
  const [scopeLoading, setScopeLoading] = useState(false)
  const [scopeError, setScopeError] = useState<string | null>(null)
  const [assignedTasks, setAssignedTasks] = useState<AsanaTask[]>([])
  const [expandedGids, setExpandedGids] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    setExpandedGids(new Set())
  }, [contextKey, projectGid, workspaceGid])

  useEffect(() => {
    if (!enabled) {
      setSections([])
      setSectionsLoaded(false)
      setAssignedTasks([])
      setScopeError(null)
      setScopeLoading(false)
      return
    }
    let cancelled = false
    setScopeError(null)
    if (!projectGid) {
      setSections([])
      setSectionsLoaded(false)
      const query = appliedSearch.trim()
      const key = asanaAssignedTasksCacheKey(contextKey, workspaceGid, includeCompleted, query)
      const entry = readTaskCache(key)
      if (entry) {
        setAssignedTasks(entry.data)
      }
      if (isAsanaCacheUsable(entry, invalidatedAt)) {
        setScopeLoading(false)
        return
      }
      setScopeLoading(true)
      const request = query
        ? asanaSearchTasks(source, query, ASSIGNED_TASK_LIMIT, workspaceGid)
        : asanaListAssignedTasks(source, ASSIGNED_TASK_LIMIT, workspaceGid, includeCompleted)
      void request
        .then((tasks) => {
          writeTaskCache(key, tasks)
          if (!cancelled) {
            setAssignedTasks(tasks)
            setScopeLoading(false)
          }
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setAssignedTasks([])
            setScopeLoading(false)
            setScopeError(errorMessage(error))
          }
        })
      return () => {
        cancelled = true
      }
    }
    setAssignedTasks([])
    const key = asanaSectionsCacheKey(contextKey, projectGid)
    const entry = readSectionsCache(key)
    if (entry) {
      setSections(entry.data)
      setSectionsLoaded(true)
    }
    if (isAsanaCacheUsable(entry, invalidatedAt)) {
      setScopeLoading(false)
      return
    }
    setScopeLoading(true)
    void asanaListSections(source, projectGid, workspaceGid)
      .then((next) => {
        writeSectionsCache(key, next)
        if (!cancelled) {
          setSections(next)
          setSectionsLoaded(true)
          setScopeLoading(false)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSections([])
          setSectionsLoaded(true)
          setScopeLoading(false)
          setScopeError(errorMessage(error))
        }
      })
    return () => {
      cancelled = true
    }
  }, [
    appliedSearch,
    contextKey,
    enabled,
    includeCompleted,
    invalidatedAt,
    projectGid,
    readSectionsCache,
    readTaskCache,
    source,
    workspaceGid,
    writeSectionsCache,
    writeTaskCache
  ])

  const boardGids = useMemo(() => {
    if (!projectGid || !sectionsLoaded) {
      return []
    }
    return sections.length > 0 ? sections.map((section) => section.gid) : [ASANA_UNSECTIONED_GID]
  }, [projectGid, sections, sectionsLoaded])

  useEffect(() => {
    if (boardGids.length === 0) {
      return
    }
    setExpandedGids((current) => (current.size > 0 ? current : new Set([boardGids[0]])))
  }, [boardGids])

  // Why: a local project search can only match sections already fetched, so searching loads them all.
  useEffect(() => {
    if (!localSearch.trim() || boardGids.length === 0) {
      return
    }
    setExpandedGids((current) => (current.size === boardGids.length ? current : new Set(boardGids)))
  }, [boardGids, localSearch])

  const sectionTasks = useAsanaSectionTasks({
    enabled,
    source,
    contextKey,
    projectGid,
    workspaceGid,
    includeCompleted,
    boardGids,
    expandedGids,
    invalidatedAt
  })

  const toggleSection = useCallback((gid: string): void => {
    setExpandedGids((current) => {
      const next = new Set(current)
      if (!next.delete(gid)) {
        next.add(gid)
      }
      return next
    })
  }, [])

  const groups = useMemo(
    () =>
      buildAsanaTaskBoardGroups({
        projectGid,
        sections,
        boardGids,
        sectionTasks,
        expandedGids,
        assignedTasks,
        assignedLoading: scopeLoading,
        filter,
        viewerGid,
        localSearch
      }),
    [
      assignedTasks,
      boardGids,
      expandedGids,
      filter,
      localSearch,
      projectGid,
      scopeLoading,
      sectionTasks,
      sections,
      viewerGid
    ]
  )

  const tasks = useMemo(() => groups.flatMap((group) => group.tasks), [groups])
  const hasMore = useMemo(
    () => Object.values(sectionTasks).some((state) => state.hasMore),
    [sectionTasks]
  )

  return { groups, tasks, loading: scopeLoading, error: scopeError, hasMore, toggleSection }
}
