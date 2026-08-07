import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AsanaTask } from '../../../shared/types'
import { asanaSubtasksCacheKey, isAsanaCacheFresh } from '@/store/slices/asana-task-cache'
import { asanaListSubtasks, type RuntimeAsanaSettings } from '@/runtime/runtime-asana-client'
import { useAppStore } from '@/store'

export type AsanaSubtaskEntry = {
  tasks: AsanaTask[]
  loading: boolean
  error: string | null
}

export type AsanaSubtaskController = {
  expandedGids: ReadonlySet<string>
  entries: Record<string, AsanaSubtaskEntry>
  toggle: (task: AsanaTask) => void
  ensure: (task: AsanaTask) => void
}

/** Hosts that predate subtask reads omit numSubtasks, which is why undefined means "don't offer". */
export function hasAsanaSubtasks(task: AsanaTask): boolean {
  return (task.numSubtasks ?? 0) > 0
}

type UseAsanaSubtasksOptions = {
  source: RuntimeAsanaSettings
  contextKey: string
  workspaceGid: string | null
  refreshNonce: number
}

export function useAsanaSubtasks(options: UseAsanaSubtasksOptions): AsanaSubtaskController {
  const { source, contextKey, workspaceGid, refreshNonce } = options
  const readTaskCache = useAppStore((s) => s.readAsanaTaskCache)
  const writeTaskCache = useAppStore((s) => s.writeAsanaTaskCache)
  const [expandedGids, setExpandedGids] = useState<ReadonlySet<string>>(new Set())
  const [entries, setEntries] = useState<Record<string, AsanaSubtaskEntry>>({})
  const mountedRef = useRef(true)
  const requestedGidsRef = useRef(new Set<string>())

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    requestedGidsRef.current = new Set()
    setEntries({})
    setExpandedGids(new Set())
  }, [contextKey, refreshNonce, workspaceGid])

  const ensure = useCallback(
    (task: AsanaTask): void => {
      if (!hasAsanaSubtasks(task) || requestedGidsRef.current.has(task.gid)) {
        return
      }
      requestedGidsRef.current.add(task.gid)
      const key = asanaSubtasksCacheKey(contextKey, task.gid)
      const cached = readTaskCache(key)
      if (isAsanaCacheFresh(cached)) {
        setEntries((current) => ({
          ...current,
          [task.gid]: { tasks: cached?.data ?? [], loading: false, error: null }
        }))
        return
      }
      setEntries((current) => ({
        ...current,
        [task.gid]: { tasks: cached?.data ?? [], loading: true, error: null }
      }))
      void asanaListSubtasks(source, task.gid, workspaceGid)
        .then((subtasks) => {
          writeTaskCache(key, subtasks)
          if (mountedRef.current) {
            setEntries((current) => ({
              ...current,
              [task.gid]: { tasks: subtasks, loading: false, error: null }
            }))
          }
        })
        .catch((error: unknown) => {
          if (mountedRef.current) {
            setEntries((current) => ({
              ...current,
              [task.gid]: {
                tasks: [],
                loading: false,
                error: error instanceof Error ? error.message : String(error)
              }
            }))
          }
        })
    },
    [contextKey, readTaskCache, source, workspaceGid, writeTaskCache]
  )

  const toggle = useCallback(
    (task: AsanaTask): void => {
      setExpandedGids((current) => {
        const next = new Set(current)
        if (!next.delete(task.gid)) {
          next.add(task.gid)
        }
        return next
      })
      ensure(task)
    },
    [ensure]
  )

  return useMemo(
    () => ({ expandedGids, entries, toggle, ensure }),
    [ensure, entries, expandedGids, toggle]
  )
}
