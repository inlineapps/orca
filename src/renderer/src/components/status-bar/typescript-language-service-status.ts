import type { TsserverRootAvailability } from '../../../../shared/tsserver-language-service'

export type TypeScriptLanguageServiceStatus = {
  kind: 'native' | 'fallback' | 'starting' | 'unavailable'
  majorVersion?: string
}

/** Diff tabs attach their modified side to tsserver too, so the segment reports on them as well. */
export function reportsTypeScriptLanguageService(mode: string | undefined): boolean {
  return mode === 'edit' || mode === 'diff'
}

export function getTypeScriptLanguageServiceStatus(
  availability: TsserverRootAvailability | null
): TypeScriptLanguageServiceStatus {
  if (availability === null || (availability.available && !availability.ready)) {
    return { kind: 'starting' }
  }
  if (!availability.available) {
    return { kind: 'unavailable' }
  }
  return {
    kind: availability.backend === 'legacy-tsserver' ? 'fallback' : 'native',
    majorVersion: availability.version?.split('.')[0]
  }
}
