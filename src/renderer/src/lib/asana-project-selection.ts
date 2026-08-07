const STORAGE_KEY = 'orca.asana.selected-project'
const MAX_REMEMBERED_SCOPES = 20

function scopeId(contextKey: string, workspaceGid: string | null): string {
  return `${contextKey}|${workspaceGid ?? 'all'}`
}

function readAll(): Record<string, string> {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string'
      )
    )
  } catch {
    return {}
  }
}

export function readAsanaProjectSelection(
  contextKey: string,
  workspaceGid: string | null
): string | null {
  return readAll()[scopeId(contextKey, workspaceGid)] ?? null
}

export function writeAsanaProjectSelection(
  contextKey: string,
  workspaceGid: string | null,
  projectGid: string | null
): void {
  const id = scopeId(contextKey, workspaceGid)
  const current = readAll()
  delete current[id]
  const next = projectGid ? { ...current, [id]: projectGid } : current
  // Oldest-inserted scopes drop first; an evicted scope just falls back to "My tasks".
  const keys = Object.keys(next)
  const kept = keys.slice(Math.max(0, keys.length - MAX_REMEMBERED_SCOPES))
  try {
    globalThis.localStorage?.setItem(
      STORAGE_KEY,
      JSON.stringify(Object.fromEntries(kept.map((key) => [key, next[key]])))
    )
  } catch {
    // Storage is unavailable or full; the picker simply forgets the choice.
  }
}
