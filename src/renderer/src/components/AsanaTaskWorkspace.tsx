import { ArrowLeft, ExternalLink } from 'lucide-react'
import type { AsanaTask } from '../../../shared/asana-types'
import { AsanaIcon } from '@/components/icons/AsanaIcon'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'

type AsanaTaskWorkspaceProps = {
  task: AsanaTask
  onUse: (task: AsanaTask) => void
  onClose: () => void
}

export default function AsanaTaskWorkspace({
  task,
  onUse,
  onClose
}: AsanaTaskWorkspaceProps): React.JSX.Element {
  return (
    <div className="flex min-h-0 max-h-full flex-col overflow-hidden rounded-md border border-border/50 bg-background shadow-sm">
      <div className="flex h-10 flex-none items-center justify-between gap-3 border-b border-border/50 bg-muted/35 px-3">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="mr-1.5 size-3.5" />
          {translate('auto.components.AsanaTaskWorkspace.asanaTasks', 'Asana tasks')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void window.api.shell.openUrl(task.permalinkUrl)}
        >
          <ExternalLink className="mr-1.5 size-3.5" />
          {translate('auto.components.AsanaTaskWorkspace.openInAsana', 'Open in Asana')}
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 scrollbar-sleek">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <AsanaIcon className="size-4" />
          <span>{task.projects[0]?.name ?? task.workspace?.name ?? 'Asana'}</span>
          <span>·</span>
          <span>
            {task.completed
              ? translate('auto.components.AsanaTaskWorkspace.completed', 'Completed')
              : translate('auto.components.AsanaTaskWorkspace.open', 'Open')}
          </span>
        </div>
        <h1 className="mt-3 text-xl font-semibold text-foreground">{task.name}</h1>
        {task.notes ? (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {task.notes}
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            {translate('auto.components.AsanaTaskWorkspace.noDescription', 'No task description.')}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {task.assignee?.name ? (
            <span>
              {translate(
                'auto.components.AsanaTaskWorkspace.assignedTo',
                'Assigned to {{value0}}',
                {
                  value0: task.assignee.name
                }
              )}
            </span>
          ) : null}
          {task.dueOn ? (
            <span>
              {translate('auto.components.AsanaTaskWorkspace.due', 'Due {{value0}}', {
                value0: task.dueOn
              })}
            </span>
          ) : null}
          {task.projects.length > 0 ? (
            <span>
              {translate('auto.components.AsanaTaskWorkspace.projectCount', '{{value0}} projects', {
                value0: task.projects.length
              })}
            </span>
          ) : null}
        </div>
        <Button className="mt-7" onClick={() => onUse(task)}>
          {translate('auto.components.AsanaTaskWorkspace.startWorkspace', 'Start workspace')}
        </Button>
      </div>
    </div>
  )
}
