import { describe, expect, it } from 'vitest'
import {
  createPackagingEnvironment,
  getReleaseAssetPaths,
  parseReleaseArguments
} from './release-inlineapps-macos.mjs'

describe('inlineapps macOS local release', () => {
  it('parses signed and unsigned release modes', () => {
    expect(parseReleaseArguments(['v2.7.19-inline.42'])).toMatchObject({
      tag: 'v2.7.19-inline.42',
      version: '2.7.19-inline.42',
      unsigned: false,
      uploadOnly: false
    })
    expect(
      parseReleaseArguments(['v8.3.25-inline.73', '--unsigned', '--upload-only'])
    ).toMatchObject({ unsigned: true, uploadOnly: true })
  })

  it.each(['v2.7.19', '2.7.19-inline.42', 'v2.7.19-inline.0.extra'])(
    'rejects invalid tag %s',
    (tag) => {
      expect(() => parseReleaseArguments([tag])).toThrow('Tag must match vX.Y.Z-inline.N')
    }
  )

  it('uses release-versioned artifacts for both architectures', () => {
    expect(getReleaseAssetPaths('6.14.29-inline.53')).toEqual([
      'dist/orca-macos-x64.dmg',
      'dist/orca-macos-arm64.dmg',
      'dist/Orca-6.14.29-inline.53-mac.zip',
      'dist/Orca-6.14.29-inline.53-arm64-mac.zip'
    ])
  })

  it('forces updater off in signed and unsigned packages', () => {
    expect(createPackagingEnvironment({}, '3.8.21-inline.34', false)).toMatchObject({
      ORCA_DISABLE_AUTO_UPDATE: '1',
      ORCA_INLINEAPPS_BUILD_VERSION: '3.8.21-inline.34',
      ORCA_MAC_RELEASE: '1'
    })
    expect(
      createPackagingEnvironment(
        { ORCA_MAC_RELEASE: '1', ORCA_MAC_HOURLY: '1', CSC_LINK: 'certificate' },
        '4.9.27-inline.61',
        true
      )
    ).toEqual({
      ORCA_DISABLE_AUTO_UPDATE: '1',
      ORCA_INLINEAPPS_BUILD_VERSION: '4.9.27-inline.61',
      CSC_IDENTITY_AUTO_DISCOVERY: 'false'
    })
  })
})
