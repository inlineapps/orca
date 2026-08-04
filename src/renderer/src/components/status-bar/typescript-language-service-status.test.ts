import { describe, expect, it } from 'vitest'
import {
  getTypeScriptLanguageServiceStatus,
  reportsTypeScriptLanguageService
} from './typescript-language-service-status'

describe('reportsTypeScriptLanguageService', () => {
  it('covers diff tabs alongside file editors', () => {
    expect(reportsTypeScriptLanguageService('edit')).toBe(true)
    expect(reportsTypeScriptLanguageService('diff')).toBe(true)
    expect(reportsTypeScriptLanguageService('terminal')).toBe(false)
    expect(reportsTypeScriptLanguageService(undefined)).toBe(false)
  })
})

describe('getTypeScriptLanguageServiceStatus', () => {
  it('distinguishes bundled native and compatibility backends', () => {
    expect(
      getTypeScriptLanguageServiceStatus({
        available: true,
        ready: true,
        backend: 'native-lsp',
        version: '7.3.4'
      })
    ).toEqual({ kind: 'native', majorVersion: '7' })
    expect(
      getTypeScriptLanguageServiceStatus({
        available: true,
        ready: true,
        backend: 'legacy-tsserver',
        version: '6.8.9'
      })
    ).toEqual({ kind: 'fallback', majorVersion: '6' })
  })

  it('renders startup and failure states', () => {
    expect(getTypeScriptLanguageServiceStatus(null)).toEqual({ kind: 'starting' })
    expect(
      getTypeScriptLanguageServiceStatus({
        available: true,
        ready: false,
        backend: 'native-lsp'
      })
    ).toEqual({ kind: 'starting' })
    expect(
      getTypeScriptLanguageServiceStatus({ available: false, reason: 'spawn-failed' })
    ).toEqual({ kind: 'unavailable' })
  })
})
