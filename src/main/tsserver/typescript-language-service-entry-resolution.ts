import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import type { TypeScriptLanguageServiceBackend } from '../../shared/tsserver-language-service'

export type TypeScriptLanguageServiceEntry = {
  kind: TypeScriptLanguageServiceBackend
  entryPath: string
  version?: string
}

const requireFromOrca = createRequire(import.meta.url)
const RESOURCE_ROOT = 'typescript-language-service'

export function resolveTypeScriptLanguageServiceEntries(
  resourcesPath: string | undefined = process.resourcesPath
): TypeScriptLanguageServiceEntry[] {
  const entries: TypeScriptLanguageServiceEntry[] = []
  const nativePackageName = `@typescript/typescript-${process.platform}-${process.arch}`
  const nativeExecutableName = process.platform === 'win32' ? 'tsc.exe' : 'tsc'
  const nativeEntry = firstExisting([
    resourcesPath
      ? join(
          resourcesPath,
          RESOURCE_ROOT,
          'node_modules',
          ...nativePackageName.split('/'),
          'lib',
          nativeExecutableName
        )
      : null,
    resolveDevelopmentPackageFile(nativePackageName, 'lib', nativeExecutableName)
  ])
  if (nativeEntry) {
    entries.push({
      kind: 'native-lsp',
      entryPath: nativeEntry,
      version: packageVersion(nativeEntry)
    })
  }

  const legacyEntry = firstExisting([
    resourcesPath
      ? join(resourcesPath, RESOURCE_ROOT, 'node_modules', 'typescript-api', 'lib', 'tsserver.js')
      : null,
    resolveDevelopmentPackageFile('typescript-api', 'lib', 'tsserver.js')
  ])
  if (legacyEntry) {
    entries.push({
      kind: 'legacy-tsserver',
      entryPath: legacyEntry,
      version: packageVersion(legacyEntry)
    })
  }
  return entries
}

function packageVersion(entryPath: string): string | undefined {
  try {
    const parsed = JSON.parse(
      readFileSync(join(dirname(dirname(entryPath)), 'package.json'), 'utf8')
    ) as {
      version?: unknown
    }
    return typeof parsed.version === 'string' ? parsed.version : undefined
  } catch {
    return undefined
  }
}

function resolveDevelopmentPackageFile(packageName: string, ...segments: string[]): string | null {
  try {
    const packageJsonPath = requireFromOrca.resolve(`${packageName}/package.json`)
    return join(dirname(packageJsonPath), ...segments)
  } catch {
    return null
  }
}

function firstExisting(candidates: (string | null)[]): string | null {
  return (
    candidates.find((candidate): candidate is string =>
      Boolean(candidate && existsSync(candidate))
    ) ?? null
  )
}
