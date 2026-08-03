import type { ExecutionHostId } from '../../../../shared/execution-host'

export type MonacoTsserverEligibilityArgs = {
  language: string
  filePath: string
  rootPath: string | null
  executionHostId: ExecutionHostId | null
  runtimeEnvironmentId?: string | null
  externalSshTargetId?: string
}

export function getMonacoTsserverRoot(args: MonacoTsserverEligibilityArgs): string | null {
  if (
    (args.language !== 'typescript' && args.language !== 'javascript') ||
    !args.filePath ||
    !args.rootPath ||
    args.executionHostId !== 'local' ||
    Boolean(args.runtimeEnvironmentId) ||
    Boolean(args.externalSshTargetId)
  ) {
    return null
  }
  return args.rootPath
}
