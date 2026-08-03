import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const builderConfig = require('../electron-builder.config.cjs')
const { chmodBundledTypeScript } = require('../typescript-language-service-packaging.cjs')

describe('TypeScript language service packaging', () => {
  it('ships TS7 native LSP and TS6 compatibility resources per platform', () => {
    const platformNames = { mac: 'darwin', linux: 'linux', win: 'win32' }
    for (const [target, platformName] of Object.entries(platformNames)) {
      expect(builderConfig[target].extraResources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            to: 'typescript-language-service/node_modules/typescript'
          }),
          expect.objectContaining({
            to: 'typescript-language-service/node_modules/typescript-api'
          }),
          expect.objectContaining({
            to: `typescript-language-service/node_modules/@typescript/typescript-${platformName}-\${arch}`
          })
        ])
      )
    }
  })

  it.skipIf(process.platform === 'win32')('marks packaged native servers executable', async () => {
    const resourcesPath = await mkdtemp(join(tmpdir(), 'orca-typescript-packaging-'))
    const executablePath = join(
      resourcesPath,
      'typescript-language-service',
      'node_modules',
      '@typescript',
      'typescript-linux-x64',
      'lib',
      'tsc'
    )
    try {
      await mkdir(dirname(executablePath), { recursive: true })
      await writeFile(executablePath, 'binary placeholder', { mode: 0o644 })

      chmodBundledTypeScript(resourcesPath, 'linux')

      expect((await stat(executablePath)).mode & 0o111).not.toBe(0)
    } finally {
      await rm(resourcesPath, { recursive: true, force: true })
    }
  })
})
