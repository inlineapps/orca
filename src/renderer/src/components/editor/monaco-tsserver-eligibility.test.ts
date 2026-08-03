import { describe, expect, it } from 'vitest'
import {
  getMonacoTsserverRoot,
  type MonacoTsserverEligibilityArgs
} from './monaco-tsserver-eligibility'

const localTypeScript: MonacoTsserverEligibilityArgs = {
  language: 'typescript',
  filePath: '/workspace/platform/src/router.ts',
  rootPath: '/workspace/platform',
  executionHostId: 'local'
}

describe('Monaco tsserver eligibility', () => {
  it('enables local TypeScript and JavaScript folder roots', () => {
    expect(getMonacoTsserverRoot(localTypeScript)).toBe('/workspace/platform')
    expect(
      getMonacoTsserverRoot({
        ...localTypeScript,
        language: 'javascript',
        filePath: 'D:\\workspace\\app\\server.cjs',
        rootPath: 'D:\\workspace\\app'
      })
    ).toBe('D:\\workspace\\app')
  })

  const ineligibleCases: [string, Partial<MonacoTsserverEligibilityArgs>][] = [
    ['SSH workspace', { executionHostId: 'ssh:build-box' }],
    ['runtime workspace', { executionHostId: 'runtime:dev-vm', runtimeEnvironmentId: 'dev-vm' }],
    ['external SSH file', { externalSshTargetId: 'logs-box' }],
    ['non-code model', { language: 'markdown', filePath: '/workspace/platform/README.md' }],
    ['missing root', { rootPath: null }]
  ]

  it.each(ineligibleCases)('rejects %s', (_label, overrides) => {
    expect(getMonacoTsserverRoot({ ...localTypeScript, ...overrides })).toBeNull()
  })
})
