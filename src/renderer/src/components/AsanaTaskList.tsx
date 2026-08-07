import { useState } from 'react'
import { ArrowRight, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import type { AsanaTask } from '../../../shared/asana-types'
import type { AsanaTaskSectionGroup } from '../../../shared/asana-task-sections'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'

type AsanaTaskListProps = {
  groups: AsanaTaskSectionGroup[]
  selectedTask: AsanaTask | null
  onOpenTask: (task: AsanaTask) => void
  onStartWorkspace: (task: AsanaTask) => void
}

type AsanaTaskRowProps = {
  task: AsanaTask
  selected: boolean
  onOpenTask: (task: AsanaTask) => void
  onStartWorkspace: (task: AsanaTask) => void
}

function AsanaTaskRow({
  task,
  selected,
  onOpenTask,
  onStartWorkspace
}: AsanaTaskRowProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'group/row grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 transition hover:bg-accent',
        selected && 'bg-accent'
      )}
    >
      <button
        type="button"
        aria-current={selected ? 'true' : undefined}
        className="min-w-0 rounded-sm text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        onClick={() => onOpenTask(task)}
      >
        <h3 className="truncate text-[13px] font-medium text-foreground">{task.name}</h3>
        <div className="mt-1 flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
          <span className="truncate">
            {task.projects[0]?.name ?? task.workspace?.name ?? 'Asana'}
          </span>
          <span className={task.completed ? 'text-status-success' : ''}>
            {task.completed
              ? translate('auto.components.AsanaTaskList.completed', 'Completed')
              : translate('auto.components.AsanaTaskList.open', 'Open')}
          </span>
          {task.dueOn ? (
            <span>
              {translate('auto.components.AsanaTaskList.dueDate', 'Due {{value0}}', {
                value0: task.dueOn
              })}
            </span>
          ) : null}
        </div>
      </button>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(event) => {
            event.stopPropagation()
            onStartWorkspace(task)
          }}
          aria-label={translate('auto.components.AsanaTaskList.startWorkspace', 'Start workspace')}
        >
          <ArrowRight className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(event) => {
            event.stopPropagation()
            void window.api.shell.openUrl(task.permalinkUrl)
          }}
          aria-label={translate('auto.components.AsanaTaskList.openInAsana', 'Open in Asana')}
        >
          <ExternalLink className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

export function AsanaTaskList({
  groups,
  selectedTask,
  onOpenTask,
  onStartWorkspace
}: AsanaTaskListProps): React.JSX.Element {
  const [collapsedSectionGids, setCollapsedSectionGids] = useState<ReadonlySet<string>>(new Set())
  const toggleSection = (gid: string): void => {
    setCollapsedSectionGids((current) => {
      const next = new Set(current)
      if (!next.delete(gid)) {
        next.add(gid)
      }
      return next
    })
  }
  const ungroupedOnly = groups.length === 1 && groups[0].section === null

  return (
    <div className="divide-y divide-border/50">
      {groups.map((group) => {
        const gid = group.section?.gid ?? null
        const collapsed = gid !== null && collapsedSectionGids.has(gid)
        const showHeader = !ungroupedOnly
        return (
          <div key={gid ?? 'ungrouped'}>
            {showHeader ? (
              <button
                type="button"
                aria-expanded={!collapsed}
                onClick={() => (gid === null ? undefined : toggleSection(gid))}
                disabled={gid === null}
                className="flex w-full items-center gap-1.5 bg-muted/30 px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground transition hover:bg-muted/50 disabled:hover:bg-muted/30"
              >
                {gid === null ? (
                  <span className="size-3.5" />
                ) : collapsed ? (
                  <ChevronRight className="size-3.5" />
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
                <span className="truncate">
                  {group.section?.name ||
                    translate('auto.components.AsanaTaskList.noSection', 'No section')}
                </span>
                <span className="ml-auto tabular-nums">{group.tasks.length}</span>
              </button>
            ) : null}
            {collapsed ? null : (
              <div className="divide-y divide-border/50">
                {group.tasks.map((task) => (
                  <AsanaTaskRow
                    key={task.gid}
                    task={task}
                    selected={selectedTask?.gid === task.gid}
                    onOpenTask={onOpenTask}
                    onStartWorkspace={onStartWorkspace}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
