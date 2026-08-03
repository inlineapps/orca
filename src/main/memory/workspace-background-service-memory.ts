import type { WorkspaceBackgroundServiceMemory } from '../../shared/process-stats-types'
import type { MemorySnapshotStore } from './collector'
import {
  createEmptyWorktreeMemoryBucket,
  resolveWorktreeMemoryNames,
  type WorktreeMemoryBucket
} from './memory-snapshot-buckets'
import { clampMemoryMetric } from './memory-snapshot-values'
import { listWorkspaceBackgroundServices } from './workspace-background-service-registry'

type ProcessIndex = {
  byPid: Map<number, { cpu: number; memory: number }>
  childrenOf: Map<number, number[]>
}

function pidsInSubtree(
  index: ProcessIndex,
  root: number,
  excludedPids: ReadonlySet<number>
): number[] {
  const result: number[] = []
  const seen = new Set<number>()
  const queue = [root]
  while (queue.length > 0) {
    const pid = queue.pop()
    if (pid === undefined) {
      break
    }
    if (seen.has(pid) || excludedPids.has(pid)) {
      continue
    }
    seen.add(pid)
    if (index.byPid.has(pid)) {
      result.push(pid)
    }
    const kids = index.childrenOf.get(pid)
    if (kids) {
      for (const kid of kids) {
        queue.push(kid)
      }
    }
  }
  return result
}

export function attributeWorkspaceBackgroundServices(
  store: MemorySnapshotStore,
  processIndex: ProcessIndex,
  claimed: Set<number>,
  worktreeBuckets: Map<string, WorktreeMemoryBucket>
): void {
  for (const service of listWorkspaceBackgroundServices()) {
    let serviceCpu = 0
    let serviceMemory = 0
    for (const pid of pidsInSubtree(processIndex, service.pid, claimed)) {
      const row = processIndex.byPid.get(pid)
      if (!row) {
        continue
      }
      claimed.add(pid)
      serviceCpu += row.cpu
      serviceMemory += row.memory
    }
    const names = resolveWorktreeMemoryNames(service.worktreeId, store)
    let bucket = worktreeBuckets.get(service.worktreeId)
    if (!bucket) {
      bucket = createEmptyWorktreeMemoryBucket(
        service.worktreeId,
        names.worktreeName,
        names.repoId,
        names.repoName
      )
      worktreeBuckets.set(service.worktreeId, bucket)
    }
    const backgroundService: WorkspaceBackgroundServiceMemory = {
      serviceId: service.serviceId,
      serviceKind: service.serviceKind,
      pid: service.pid,
      cpu: clampMemoryMetric(serviceCpu),
      memory: clampMemoryMetric(serviceMemory),
      ...(service.version ? { version: service.version } : {})
    }
    bucket.cpu += backgroundService.cpu
    bucket.memory += backgroundService.memory
    bucket.backgroundServices.push(backgroundService)
  }
}
