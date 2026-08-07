import type { TaskPageComposerActionsModel } from '../../use-task-page-composer-actions'
import { AsanaViewsHost } from './asana-views-host'

export function TaskPageAsanaContent({
  model
}: {
  model: TaskPageComposerActionsModel
}): React.JSX.Element | null {
  const {
    asanaStatusReady,
    asanaConnected,
    setAsanaConnectOpen,
    hideTaskSource,
    selectedAsanaTask,
    handleUseAsanaTask,
    openAsanaDetailPage,
    closeTaskDetailPage,
    asanaError,
    asanaTaskGroups
  } = model
  if (model.taskSource !== 'asana') {
    return null
  }
  return (
    <AsanaViewsHost
      asanaStatusReady={asanaStatusReady}
      asanaConnected={asanaConnected}
      setAsanaConnectOpen={setAsanaConnectOpen}
      hideTaskSource={hideTaskSource}
      selectedAsanaTask={selectedAsanaTask}
      handleUseAsanaTask={handleUseAsanaTask}
      openAsanaDetailPage={openAsanaDetailPage}
      closeTaskDetailPage={closeTaskDetailPage}
      asanaError={asanaError}
      asanaTaskGroups={asanaTaskGroups}
    />
  )
}
