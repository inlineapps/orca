import type { TaskPageComposerActionsModel } from '../../use-task-page-composer-actions'
import { AsanaConnectDialog } from '@/components/asana-connect-dialog'

export function TaskPageAsanaConnectDialog({
  model
}: {
  model: TaskPageComposerActionsModel
}): React.JSX.Element | null {
  const { asanaConnectOpen, setAsanaConnectOpen } = model
  return <AsanaConnectDialog open={asanaConnectOpen} onOpenChange={setAsanaConnectOpen} />
}
