import { afterEach, describe, expect, it, vi } from 'vitest'
import { isAutoUpdateEnabled } from './updater-build-availability'

describe('updater build availability', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('keeps updater enabled for upstream and development builds', () => {
    expect(isAutoUpdateEnabled()).toBe(true)
  })

  it('disables updater when the build flag is false', () => {
    vi.stubGlobal('ORCA_AUTO_UPDATE_ENABLED', false)

    expect(isAutoUpdateEnabled()).toBe(false)
  })
})
