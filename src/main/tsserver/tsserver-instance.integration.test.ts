import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { TsserverInstance } from './tsserver-instance'

const requireFromTest = createRequire(import.meta.url)
const tsserverEntry = requireFromTest.resolve('typescript-api/lib/tsserver.js')
const temporaryRoots: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((rootPath) => rm(rootPath, { recursive: true, force: true }))
  )
})

describe('TsserverInstance integration', () => {
  it('resolves TypeScript and JavaScript definitions through the real protocol', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'orca-tsserver-'))
    temporaryRoots.push(rootPath)
    const valuesFile = join(rootPath, 'values.ts')
    const appFile = join(rootPath, 'app.ts')
    const legacyValuesFile = join(rootPath, 'legacy-values.js')
    const legacyAppFile = join(rootPath, 'legacy-app.js')
    await Promise.all([
      writeFile(valuesFile, 'export const total = 37\n'),
      writeFile(appFile, "import { total } from './values'\nexport const result = total + 23\n"),
      writeFile(legacyValuesFile, 'exports.label = "orca"\n'),
      writeFile(
        legacyAppFile,
        "const values = require('./legacy-values')\nconsole.log(values.label)\n"
      )
    ])

    let resolveExit!: () => void
    const exited = new Promise<void>((resolve) => {
      resolveExit = resolve
    })
    const instance = new TsserverInstance(rootPath, tsserverEntry, resolveExit)
    try {
      instance.notify('open', {
        file: appFile,
        fileContent: "import { total } from './values'\nexport const result = total + 23\n",
        scriptKindName: 'TS',
        projectRootPath: rootPath
      })
      instance.notify('open', {
        file: legacyAppFile,
        fileContent: "const values = require('./legacy-values')\nconsole.log(values.label)\n",
        scriptKindName: 'JS',
        projectRootPath: rootPath
      })

      const typeScriptDefinition = await instance.request<{
        definitions: { file: string; start: { line: number; offset: number } }[]
      }>('definitionAndBoundSpan', { file: appFile, line: 2, offset: 24 })
      const javaScriptDefinition = await instance.request<{
        definitions: { file: string; start: { line: number; offset: number } }[]
      }>('definitionAndBoundSpan', { file: legacyAppFile, line: 2, offset: 20 })

      expect(typeScriptDefinition.definitions).toContainEqual(
        expect.objectContaining({
          file: valuesFile,
          start: { line: 1, offset: 14 }
        })
      )
      expect(javaScriptDefinition.definitions).toContainEqual(
        expect.objectContaining({ file: legacyValuesFile })
      )
    } finally {
      instance.dispose()
      await exited
    }
  })
})
