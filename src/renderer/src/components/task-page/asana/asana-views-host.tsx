import React from 'react'

import { Button } from '@/components/ui/button'
import AsanaTaskWorkspace from '@/components/AsanaTaskWorkspace'
import { AsanaTaskList } from '@/components/AsanaTaskList'
import { translate } from '@/i18n/i18n'
import type { AsanaTask } from '../../../../../shared/asana-types'
import type { AsanaTaskBoardGroup } from '@/components/use-asana-task-board'
import type { AsanaSubtaskController } from '@/components/use-asana-subtasks'
import type { TaskProvider } from '../../../../../shared/task-providers'

export type AsanaViewsHostProps = {
  asanaStatusReady: boolean
  asanaConnected: boolean
  setAsanaConnectOpen: (open: boolean) => void
  hideTaskSource: (provider: TaskProvider, label: string) => void
  selectedAsanaTask: AsanaTask | null
  subtasks: AsanaSubtaskController
  handleUseAsanaTask: (task: AsanaTask) => void
  openAsanaDetailPage: (task: AsanaTask) => void
  closeTaskDetailPage: () => void
  asanaLoading?: boolean
  asanaError: string | null
  asanaBoardGroups: AsanaTaskBoardGroup[]
  onToggleSection: (gid: string) => void
}

export function AsanaViewsHost({
  asanaStatusReady,
  asanaConnected,
  setAsanaConnectOpen,
  hideTaskSource,
  selectedAsanaTask,
  subtasks,
  handleUseAsanaTask,
  openAsanaDetailPage,
  closeTaskDetailPage,
  asanaError,
  asanaBoardGroups,
  onToggleSection
}: AsanaViewsHostProps): React.JSX.Element {
  if (!asanaStatusReady) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {translate('auto.components.TaskPage.loadingTasks', 'Loading tasks...')}
      </div>
    )
  }

  if (!asanaConnected) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">
          {translate(
            'auto.components.TaskPage.asanaNotConnected',
            'Connect your Asana account to view assigned tasks.'
          )}
        </p>
        <div className="flex items-center gap-2">
          <Button onClick={() => setAsanaConnectOpen(true)}>
            {translate('auto.components.TaskPage.connectAsana', 'Connect Asana')}
          </Button>
          <Button variant="outline" onClick={() => hideTaskSource('asana', 'Asana')}>
            {translate('auto.components.TaskPage.hideFromList', 'Hide from list')}
          </Button>
        </div>
      </div>
    )
  }

  if (selectedAsanaTask) {
    return (
      <AsanaTaskWorkspace
        task={selectedAsanaTask}
        subtasks={subtasks}
        onUse={handleUseAsanaTask}
        onOpenTask={openAsanaDetailPage}
        onClose={closeTaskDetailPage}
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {asanaError ? (
        <div className="mb-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
          {asanaError}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-sleek">
        <AsanaTaskList
          groups={asanaBoardGroups}
          selectedTask={selectedAsanaTask}
          subtasks={subtasks}
          onOpenTask={openAsanaDetailPage}
          onStartWorkspace={handleUseAsanaTask}
          onToggleSection={onToggleSection}
        />
      </div>
    </div>
  )
}
