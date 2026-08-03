export function isAutoUpdateEnabled(): boolean {
  if (typeof ORCA_AUTO_UPDATE_ENABLED !== 'undefined') {
    return ORCA_AUTO_UPDATE_ENABLED
  }
  return (globalThis as { ORCA_AUTO_UPDATE_ENABLED?: boolean }).ORCA_AUTO_UPDATE_ENABLED ?? true
}
