import type React from 'react'
import { useEffect, useState } from 'react'
import { AlertCircle, Braces, Loader2 } from 'lucide-react'
import type { TsserverRootAvailability } from '../../../../shared/tsserver-language-service'
import { useAppStore } from '@/store'
import { getResolvedExecutionHostIdForWorktree } from '@/lib/resolved-worktree-execution-host'
import { getMonacoTsserverRoot } from '@/components/editor/monaco-tsserver-eligibility'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import {
  getTypeScriptLanguageServiceStatus,
  reportsTypeScriptLanguageService
} from './typescript-language-service-status'

const STATUS_REFRESH_MS = 2_000

export function TypeScriptLanguageServiceStatusSegment({
  iconOnly
}: {
  iconOnly: boolean
}): React.JSX.Element | null {
  const activeFile = useAppStore(
    (state) => state.openFiles.find((file) => file.id === state.activeFileId) ?? null
  )
  const rootPath = useAppStore((state) => {
    if (!activeFile || !reportsTypeScriptLanguageService(activeFile.mode)) {
      return null
    }
    const executionHostId = getResolvedExecutionHostIdForWorktree(state, activeFile.worktreeId)
    const workspacePath =
      executionHostId === 'local'
        ? (state.getKnownWorktreeById(activeFile.worktreeId, executionHostId)?.path ?? null)
        : null
    return getMonacoTsserverRoot({
      language: activeFile.language,
      filePath: activeFile.filePath,
      rootPath: workspacePath,
      executionHostId,
      runtimeEnvironmentId: activeFile.runtimeEnvironmentId,
      externalSshTargetId: activeFile.externalSshTargetId
    })
  })
  const [availability, setAvailability] = useState<TsserverRootAvailability | null>(null)

  useEffect(() => {
    if (!rootPath) {
      setAvailability(null)
      return
    }
    let active = true
    const refresh = async (): Promise<void> => {
      try {
        const next = await window.api.tsserver.probeRoot({ rootPath })
        if (active) {
          setAvailability(next)
        }
      } catch {
        if (active) {
          setAvailability({ available: false, reason: 'spawn-failed' })
        }
      }
    }
    setAvailability(null)
    void refresh()
    const timer = window.setInterval(() => void refresh(), STATUS_REFRESH_MS)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [rootPath])

  if (!rootPath) {
    return null
  }

  const status = getTypeScriptLanguageServiceStatus(availability)
  const label = getLabel(status)
  const tooltip = getTooltip(status.kind, availability?.version)
  const icon =
    status.kind === 'starting' ? (
      <Loader2 className="size-3 animate-spin text-muted-foreground" />
    ) : status.kind === 'unavailable' ? (
      <AlertCircle className="size-3 text-destructive" />
    ) : (
      <Braces className="size-3 text-muted-foreground" />
    )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="status"
          tabIndex={0}
          className="inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-muted-foreground"
          aria-label={tooltip}
        >
          {icon}
          {!iconOnly ? <span className="text-[11px] tabular-nums">{label}</span> : null}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

function getLabel(status: ReturnType<typeof getTypeScriptLanguageServiceStatus>): string {
  if (status.kind === 'starting') {
    return translate(
      'auto.components.status.bar.TypeScriptLanguageServiceStatusSegment.startingLabel',
      'TS …'
    )
  }
  if (status.kind === 'unavailable') {
    return translate(
      'auto.components.status.bar.TypeScriptLanguageServiceStatusSegment.unavailableLabel',
      'TS !'
    )
  }
  return status.majorVersion
    ? translate(
        'auto.components.status.bar.TypeScriptLanguageServiceStatusSegment.versionLabel',
        'TS {{value0}}',
        { value0: status.majorVersion }
      )
    : translate(
        'auto.components.status.bar.TypeScriptLanguageServiceStatusSegment.defaultLabel',
        'TS'
      )
}

function getTooltip(
  kind: ReturnType<typeof getTypeScriptLanguageServiceStatus>['kind'],
  version?: string
): string {
  if (kind === 'starting') {
    return translate(
      'auto.components.status.bar.TypeScriptLanguageServiceStatusSegment.starting',
      'Starting TypeScript language server…'
    )
  }
  if (kind === 'unavailable') {
    return translate(
      'auto.components.status.bar.TypeScriptLanguageServiceStatusSegment.unavailable',
      'TypeScript language server unavailable'
    )
  }
  if (kind === 'fallback') {
    return translate(
      'auto.components.status.bar.TypeScriptLanguageServiceStatusSegment.fallback',
      'TypeScript {{value0}} compatibility server',
      { value0: version ?? '6' }
    )
  }
  return translate(
    'auto.components.status.bar.TypeScriptLanguageServiceStatusSegment.native',
    'TypeScript {{value0}} native LSP',
    { value0: version ?? '7' }
  )
}
