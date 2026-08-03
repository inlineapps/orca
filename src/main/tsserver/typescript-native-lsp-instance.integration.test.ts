import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { TypeScriptNativeLspInstance } from './typescript-native-lsp-instance'

const requireFromTest = createRequire(import.meta.url)
const nativePackageName = `@typescript/typescript-${process.platform}-${process.arch}`
const nativePackagePath = requireFromTest.resolve(`${nativePackageName}/package.json`)
const nativeEntry = join(
  dirname(nativePackagePath),
  'lib',
  process.platform === 'win32' ? 'tsc.exe' : 'tsc'
)
const temporaryRoots: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((rootPath) => rm(rootPath, { recursive: true, force: true }))
  )
})

describe('TypeScriptNativeLspInstance integration', () => {
  it('resolves TypeScript and JavaScript definitions through the real TS7 LSP', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'orca-typescript-lsp-'))
    temporaryRoots.push(rootPath)
    const valuesFile = join(rootPath, 'values.ts')
    const capacityFile = join(rootPath, 'capacity.ts')
    const appFile = join(rootPath, 'app.ts')
    const legacyValuesFile = join(rootPath, 'legacy-values.js')
    const legacyAppFile = join(rootPath, 'legacy-app.js')
    const appContent = "import { total } from './values'\nexport const result = total + 23\ncapa\n"
    const legacyAppContent =
      "const values = require('./legacy-values')\nconsole.log(values.label)\n"
    await Promise.all([
      writeFile(join(rootPath, 'tsconfig.json'), '{"compilerOptions":{"allowJs":true}}\n'),
      writeFile(valuesFile, 'export const total = 37\n'),
      writeFile(capacityFile, 'export const capacity = 61\n'),
      writeFile(appFile, appContent),
      writeFile(legacyValuesFile, 'exports.label = "orca"\n'),
      writeFile(legacyAppFile, legacyAppContent)
    ])

    let resolveExit!: () => void
    const exited = new Promise<void>((resolve) => {
      resolveExit = resolve
    })
    const instance = new TypeScriptNativeLspInstance(rootPath, nativeEntry, resolveExit)
    try {
      instance.notify('open', {
        file: appFile,
        fileContent: appContent,
        scriptKindName: 'TS'
      })
      instance.notify('open', {
        file: legacyAppFile,
        fileContent: legacyAppContent,
        scriptKindName: 'JS'
      })

      const typeScriptDefinition = await instance.request<{
        definitions: { file: string; start: { line: number; offset: number } }[]
      }>('definitionAndBoundSpan', { file: appFile, line: 2, offset: 24 })
      const javaScriptDefinition = await instance.request<{
        definitions: { file: string }[]
      }>('definitionAndBoundSpan', { file: legacyAppFile, line: 2, offset: 20 })
      const references = await instance.request<{
        refs: { file: string; isDefinition?: boolean }[]
      }>('references', { file: appFile, line: 2, offset: 24 })
      const hover = await instance.request<{ displayString: string }>('quickinfo', {
        file: appFile,
        line: 2,
        offset: 24
      })
      const completions = await instance.request<{
        entries: { name: string; data?: unknown }[]
      }>('completionInfo', { file: appFile, line: 3, offset: 5, triggerKind: 1 })

      expect(typeScriptDefinition.definitions).toContainEqual(
        expect.objectContaining({
          file: valuesFile,
          start: { line: 1, offset: 14 }
        })
      )
      expect(javaScriptDefinition.definitions).toContainEqual(
        expect.objectContaining({ file: legacyValuesFile })
      )
      expect(references.refs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ file: valuesFile, isDefinition: true }),
          expect.objectContaining({ file: appFile })
        ])
      )
      expect(hover.displayString).toContain('total')
      const capacityCompletion = completions.entries.find((entry) => entry.name === 'capacity')
      expect(capacityCompletion).toBeDefined()
      const details = await instance.request<
        { codeActions: { changes: { fileName: string }[] }[] }[]
      >('completionEntryDetails', {
        file: appFile,
        line: 3,
        offset: 5,
        entryName: 'capacity',
        data: capacityCompletion?.data
      })
      expect(details[0]?.codeActions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            changes: expect.arrayContaining([expect.objectContaining({ fileName: appFile })])
          })
        ])
      )
      instance.notify('change', {
        file: appFile,
        line: 3,
        offset: 1,
        endLine: 3,
        endOffset: 5,
        insertString: 'capacity'
      })
      instance.notify('change', {
        file: appFile,
        line: 1,
        offset: 1,
        endLine: 1,
        endOffset: 1,
        insertString: "import { capacity } from './capacity'\n"
      })
      const changedDefinition = await instance.request<{
        definitions: { file: string }[]
      }>('definitionAndBoundSpan', { file: appFile, line: 4, offset: 3 })
      expect(changedDefinition.definitions).toContainEqual(
        expect.objectContaining({ file: capacityFile })
      )
    } finally {
      instance.dispose()
      await exited
    }
  })
})
