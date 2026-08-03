import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { resolveTypeScriptLanguageServiceEntries } from './typescript-language-service-entry-resolution'

describe('TypeScript language service entry resolution', () => {
  it('prefers Orca TS7 and retains the bundled TS6 fallback', () => {
    const entries = resolveTypeScriptLanguageServiceEntries('/missing/orca/resources')

    expect(entries.map((entry) => entry.kind)).toEqual(['native-lsp', 'legacy-tsserver'])
    expect(entries[0]?.entryPath).toMatch(/@typescript.*[/\\]lib[/\\]tsc(?:\.exe)?$/)
    expect(entries[1]?.entryPath).toMatch(/typescript@6\.0\.3.*[/\\]lib[/\\]tsserver\.js$/)
  })

  it('uses packaged Orca resources before development dependencies', async () => {
    const resourcesPath = await mkdtemp(join(tmpdir(), 'orca-typescript-resources-'))
    const nativeEntry = join(
      resourcesPath,
      'typescript-language-service',
      'node_modules',
      '@typescript',
      `typescript-${process.platform}-${process.arch}`,
      'lib',
      process.platform === 'win32' ? 'tsc.exe' : 'tsc'
    )
    const legacyEntry = join(
      resourcesPath,
      'typescript-language-service',
      'node_modules',
      'typescript-api',
      'lib',
      'tsserver.js'
    )
    try {
      await Promise.all([
        mkdir(dirname(nativeEntry), { recursive: true }),
        mkdir(dirname(legacyEntry), { recursive: true })
      ])
      await Promise.all([
        writeFile(nativeEntry, 'native'),
        writeFile(legacyEntry, 'legacy'),
        writeFile(join(dirname(dirname(nativeEntry)), 'package.json'), '{"version":"7.4.2"}'),
        writeFile(join(dirname(dirname(legacyEntry)), 'package.json'), '{"version":"6.5.3"}')
      ])

      expect(resolveTypeScriptLanguageServiceEntries(resourcesPath)).toEqual([
        { kind: 'native-lsp', entryPath: nativeEntry, version: '7.4.2' },
        { kind: 'legacy-tsserver', entryPath: legacyEntry, version: '6.5.3' }
      ])
    } finally {
      await rm(resourcesPath, { recursive: true, force: true })
    }
  })
})
