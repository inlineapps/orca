import { createRequire } from 'node:module'
import { afterEach, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const configPath = require.resolve('../electron-builder.config.cjs')
const originalMacRelease = process.env.ORCA_MAC_RELEASE
const originalBuildVersion = process.env.ORCA_INLINEAPPS_BUILD_VERSION

afterEach(() => {
  if (originalMacRelease === undefined) {
    delete process.env.ORCA_MAC_RELEASE
  } else {
    process.env.ORCA_MAC_RELEASE = originalMacRelease
  }
  if (originalBuildVersion === undefined) {
    delete process.env.ORCA_INLINEAPPS_BUILD_VERSION
  } else {
    process.env.ORCA_INLINEAPPS_BUILD_VERSION = originalBuildVersion
  }
  delete require.cache[configPath]
})

describe('inlineapps electron-builder config', () => {
  it('uses the release tag version without changing app identity', () => {
    process.env.ORCA_MAC_RELEASE = '1'
    process.env.ORCA_INLINEAPPS_BUILD_VERSION = '1.4.165-inline.8'
    delete require.cache[configPath]

    const config = require('../electron-builder.config.cjs')

    expect(config.extraMetadata).toEqual({ version: '1.4.165-inline.8' })
    expect(config.appId).toBe('com.stablyai.orca')
    expect(config.productName).toBe('Orca')
  })
})
