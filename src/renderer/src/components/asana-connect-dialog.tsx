import { useId, useLayoutEffect, useState } from 'react'
import { LoaderCircle, Lock } from 'lucide-react'
import { useAppStore } from '@/store'
import { useMountedRef } from '@/hooks/useMountedRef'
import { hasRemoteProviderRuntime } from '@/lib/provider-runtime-context'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { translate } from '@/i18n/i18n'

type AsanaConnectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConnected?: () => void
}

export function AsanaConnectDialog({
  open,
  onOpenChange,
  onConnected
}: AsanaConnectDialogProps): React.JSX.Element {
  const connectAsana = useAppStore((state) => state.connectAsana)
  const settings = useAppStore((state) => state.settings)
  const mountedRef = useMountedRef()
  const tokenId = useId()
  const errorId = useId()
  const [token, setToken] = useState('')
  const [state, setState] = useState<'idle' | 'connecting' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  useLayoutEffect(() => {
    if (open) {
      setToken('')
      setState('idle')
      setError(null)
    }
  }, [open])

  const submit = async (): Promise<void> => {
    const value = token.trim()
    if (!value || state === 'connecting') {
      return
    }
    setState('connecting')
    setError(null)
    try {
      const result = await connectAsana(value)
      if (!mountedRef.current) {
        return
      }
      if (!result.ok) {
        setState('error')
        setError(result.error)
        return
      }
      onOpenChange(false)
      onConnected?.()
    } catch (cause) {
      if (mountedRef.current) {
        setState('error')
        setError(
          cause instanceof Error
            ? cause.message
            : translate('auto.components.AsanaConnectDialog.connectionFailed', 'Connection failed')
        )
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => state !== 'connecting' && onOpenChange(nextOpen)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {translate('auto.components.AsanaConnectDialog.title', 'Connect Asana')}
          </DialogTitle>
          <DialogDescription>
            {translate(
              'auto.components.AsanaConnectDialog.description',
              'Use an Asana personal access token to browse assigned tasks and start workspaces.'
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor={tokenId}>
              {translate('auto.components.AsanaConnectDialog.tokenLabel', 'Personal access token')}
            </Label>
            <Input
              id={tokenId}
              type="password"
              value={token}
              autoComplete="off"
              aria-invalid={state === 'error'}
              aria-describedby={error ? errorId : undefined}
              onChange={(event) => {
                setToken(event.target.value)
                if (state === 'error') {
                  setState('idle')
                  setError(null)
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void submit()
                }
              }}
            />
            {error ? (
              <p id={errorId} className="text-xs text-destructive">
                {error}
              </p>
            ) : null}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5" />
            {hasRemoteProviderRuntime(settings)
              ? translate(
                  'auto.components.AsanaConnectDialog.remoteStorage',
                  'Stored on the selected runtime and encrypted when supported.'
                )
              : translate(
                  'auto.components.AsanaConnectDialog.localStorage',
                  'Stored locally and encrypted when supported.'
                )}
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={state === 'connecting'}
          >
            {translate('auto.components.AsanaConnectDialog.cancel', 'Cancel')}
          </Button>
          <Button onClick={() => void submit()} disabled={!token.trim() || state === 'connecting'}>
            {state === 'connecting' ? (
              <>
                <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />
                {translate('auto.components.AsanaConnectDialog.connecting', 'Connecting...')}
              </>
            ) : (
              translate('auto.components.AsanaConnectDialog.connect', 'Connect')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
