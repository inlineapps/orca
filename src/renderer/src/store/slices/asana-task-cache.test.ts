import { describe, expect, it } from 'vitest'
import {
  asanaAssignedTasksCacheKey,
  asanaSectionTasksCacheKey,
  asanaSectionsCacheKey,
  asanaSubtasksCacheKey,
  isAsanaCacheFresh,
  withBoundedAsanaCacheEntry,
  type AsanaCacheEntry
} from './asana-task-cache'

const NOW = 1_774_000_000_000
const CONTEXT = 'ssh:build-box'

function entry(fetchedAt: number, data = ['seed']): AsanaCacheEntry<string[]> {
  return { data, fetchedAt }
}

describe('asana task cache', () => {
  it('treats an entry as stale once the ttl elapses', () => {
    expect(isAsanaCacheFresh(entry(NOW - 41_000), NOW)).toBe(true)
    expect(isAsanaCacheFresh(entry(NOW - 73_000), NOW)).toBe(false)
    expect(isAsanaCacheFresh(undefined, NOW)).toBe(false)
  })

  it('evicts the oldest entries once the cache passes its bound', () => {
    const cache: Record<string, AsanaCacheEntry<string[]>> = {
      oldest: entry(NOW - 90_000),
      middle: entry(NOW - 45_000)
    }

    const bounded = withBoundedAsanaCacheEntry(cache, 'newest', entry(NOW), 2)

    expect(Object.keys(bounded).sort()).toEqual(['middle', 'newest'])
    expect(bounded.newest.fetchedAt).toBe(NOW)
  })

  it('keeps every entry while the cache stays under its bound', () => {
    const bounded = withBoundedAsanaCacheEntry(
      { kept: entry(NOW - 12_000) },
      'added',
      entry(NOW),
      5
    )

    expect(Object.keys(bounded).sort()).toEqual(['added', 'kept'])
  })

  it('separates keys by scope, section, completion and query', () => {
    expect(asanaSectionsCacheKey(CONTEXT, '1203019910262545')).not.toEqual(
      asanaSectionsCacheKey('local', '1203019910262545')
    )
    expect(asanaSectionTasksCacheKey(CONTEXT, '1203019910262545', '4485', true)).not.toEqual(
      asanaSectionTasksCacheKey(CONTEXT, '1203019910262545', '4485', false)
    )
    expect(asanaAssignedTasksCacheKey(CONTEXT, '407865308541648', false, 'importer')).not.toEqual(
      asanaAssignedTasksCacheKey(CONTEXT, '407865308541648', false, 'rollout')
    )
    expect(asanaSubtasksCacheKey(CONTEXT, '7712')).toContain('7712')
  })
})
