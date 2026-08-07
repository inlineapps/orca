import { useState } from 'react'
import { AlertCircle, CheckCircle2, LoaderCircle, Unlink } from 'lucide-react'
import { AsanaIcon } from '@/components/icons/AsanaIcon'
import { AsanaConnectDialog } from '@/components/asana-connect-dialog'
import { Button } from '@/components/ui/button'
import { useMountedRef } from '@/hooks/useMountedRef'
import {
  getProviderRuntimeContextKey,
  hasRemoteProviderRuntime
} from '@/lib/provider-runtime-context'
import { useAppStore } from '@/store'
import { IntegrationCardDetails, IntegrationCardShell } from './integration-card-shell'
import { useIntegrationSubordinateRowClass } from './integration-card-presentation'
import { getProviderAccountScope } from './provider-account-scope'
import { ProviderHostScopeControl } from './ProviderHostScopeControl'
import { ASANA_INTEGRATION_SECTION_ID } from './task-provider-integration-section-ids'
import { translate } from '@/i18n/i18n'

type VerificationResult = { state: 'ok' | 'error'; error?: string }

export function AsanaIntegrationCard(): React.JSX.Element {
  const status = useAppStore((state) => state.asanaStatus)
  const checked = useAppStore((state) => state.asanaStatusChecked)
  const contextKey = useAppStore((state) => state.asanaStatusContextKey)
  const settings = useAppStore((state) => state.settings)
  const checkConnection = useAppStore((state) => state.checkAsanaConnection)
  const disconnect = useAppStore((state) => state.disconnectAsana)
  const selectWorkspace = useAppStore((state) => state.selectAsanaWorkspace)
  const testConnection = useAppStore((state) => state.testAsanaConnection)
  const mountedRef = useMountedRef()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [testing, setTesting] = useState(false)
  const [verification, setVerification] = useState<VerificationResult | null>(null)
  const contextMatches = contextKey === getProviderRuntimeContextKey(settings)
  const checking = !contextMatches || !checked
  const connected = contextMatches && status.connected
  const accountScope = getProviderAccountScope(settings)
  const rowClass = useIntegrationSubordinateRowClass('flex items-center gap-3')
  const scopeRowClass = useIntegrationSubordinateRowClass('text-xs')

  const verify = async (): Promise<void> => {
    setTesting(true)
    setVerification(null)
    let result: Awaited<ReturnType<typeof testConnection>>
    try {
      result = await testConnection()
    } catch (error) {
      result = { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
    if (!mountedRef.current) {
      return
    }
    setTesting(false)
    setVerification(result.ok ? { state: 'ok' } : { state: 'error', error: result.error })
  }

  return (
    <IntegrationCardShell
      settingsSectionId={ASANA_INTEGRATION_SECTION_ID}
      icon={<AsanaIcon className="size-5" />}
      name="Asana"
      description={
        connected
          ? translate(
              'auto.components.settings.AsanaIntegrationCard.workspaceCountWithPlural',
              '{{value0}} workspace{{value1}} connected',
              {
                value0: status.workspaces.length,
                value1: status.workspaces.length === 1 ? '' : 's'
              }
            )
          : checking
            ? translate(
                'auto.components.settings.AsanaIntegrationCard.checking',
                'Checking Asana access before showing setup actions.'
              )
            : translate(
                'auto.components.settings.AsanaIntegrationCard.notConnectedDescription',
                'Add Asana access to browse and link tasks.'
              )
      }
      checking={checking}
      statusTone={connected ? 'connected' : 'attention'}
      statusLabel={
        connected
          ? translate('auto.components.settings.AsanaIntegrationCard.connected', 'Connected')
          : translate('auto.components.settings.AsanaIntegrationCard.notConnected', 'Not connected')
      }
      actions={
        !checking ? (
          <Button
            variant={connected ? 'outline' : 'default'}
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            {connected
              ? translate(
                  'auto.components.settings.AsanaIntegrationCard.updateAccess',
                  'Update access'
                )
              : translate(
                  'auto.components.settings.AsanaIntegrationCard.addAccess',
                  'Add Asana access'
                )}
          </Button>
        ) : null
      }
    >
      <IntegrationCardDetails>
        <ProviderHostScopeControl
          labelPrefix={translate(
            'auto.components.settings.AsanaIntegrationCard.accountScope',
            'Account scope'
          )}
          scope={accountScope}
          className={scopeRowClass}
        />
        {connected ? (
          <div className="space-y-2">
            {status.workspaces.map((workspace) => (
              <div key={workspace.gid} className={rowClass}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{workspace.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {
                      status.projects.filter((project) => project.workspaceGid === workspace.gid)
                        .length
                    }{' '}
                    {translate(
                      'auto.components.settings.AsanaIntegrationCard.projects',
                      'projects'
                    )}
                  </p>
                </div>
                {status.activeWorkspaceGid === workspace.gid ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-status-success">
                    <CheckCircle2 className="size-3.5" />{' '}
                    {translate('auto.components.settings.AsanaIntegrationCard.active', 'Active')}
                  </span>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void selectWorkspace(workspace.gid)}
                  >
                    {translate('auto.components.settings.AsanaIntegrationCard.use', 'Use')}
                  </Button>
                )}
              </div>
            ))}
            <div className="flex items-center gap-2">
              {verification?.state === 'ok' ? (
                <span className="text-xs text-status-success">
                  {translate('auto.components.settings.AsanaIntegrationCard.verified', 'Verified')}
                </span>
              ) : null}
              {verification?.state === 'error' ? (
                <span className="flex min-w-0 max-w-[220px] items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span className="truncate">{verification.error}</span>
                </span>
              ) : null}
              <Button variant="outline" size="sm" onClick={() => void verify()} disabled={testing}>
                {testing ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  translate('auto.components.settings.AsanaIntegrationCard.test', 'Test')
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void disconnect()}>
                <Unlink className="mr-1.5 size-3.5" />{' '}
                {translate(
                  'auto.components.settings.AsanaIntegrationCard.disconnect',
                  'Disconnect'
                )}
              </Button>
            </div>
          </div>
        ) : !checking ? (
          <>
            <p className="text-xs text-muted-foreground">
              {hasRemoteProviderRuntime(settings)
                ? translate(
                    'auto.components.settings.AsanaIntegrationCard.remoteStorage',
                    'Your token is sent to the selected runtime and stored with runtime-supported encryption.'
                  )
                : translate(
                    'auto.components.settings.AsanaIntegrationCard.localStorage',
                    'Your token is stored locally with runtime-supported encryption.'
                  )}
            </p>
            <Button variant="ghost" size="sm" onClick={() => void checkConnection(true)}>
              {translate('auto.components.settings.AsanaIntegrationCard.recheck', 'Re-check')}
            </Button>
          </>
        ) : null}
      </IntegrationCardDetails>
      <AsanaConnectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConnected={() => setVerification(null)}
      />
    </IntegrationCardShell>
  )
}
