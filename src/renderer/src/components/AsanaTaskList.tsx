import { ArrowRight, ChevronDown, ChevronRight, ExternalLink, Loader2 } from 'lucide-react'
import type { AsanaTask } from '../../../shared/asana-types'
import type { AsanaTaskBoardGroup } from '@/components/use-asana-task-board'
import { hasAsanaSubtasks, type AsanaSubtaskController } from '@/components/use-asana-subtasks'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'

type AsanaTaskListProps = {
  groups: AsanaTaskBoardGroup[]
  selectedTask: AsanaTask | null
  subtasks: AsanaSubtaskController
  onOpenTask: (task: AsanaTask) => void
  onStartWorkspace: (task: AsanaTask) => void
  onToggleSection: (gid: string) => void
}

type AsanaTaskRowProps = {
  task: AsanaTask
  selected: boolean
  nested?: boolean
  expanded?: boolean
  onToggleSubtasks?: (task: AsanaTask) => void
  onOpenTask: (task: AsanaTask) => void
  onStartWorkspace: (task: AsanaTask) => void
}

function AsanaTaskRow({
  task,
  selected,
  nested = false,
  expanded = false,
  onToggleSubtasks,
  onOpenTask,
  onStartWorkspace
}: AsanaTaskRowProps): React.JSX.Element {
  const expandable = Boolean(onToggleSubtasks) && hasAsanaSubtasks(task)
  return (
    <div
      className={cn(
        'group/row grid min-h-12 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 py-2 pr-3 transition hover:bg-accent',
        nested ? 'pl-9' : 'pl-3',
        selected && 'bg-accent'
      )}
    >
      {expandable ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => onToggleSubtasks?.(task)}
          className="rounded-sm p-0.5 text-muted-foreground transition hover:text-foreground"
          aria-label={translate('auto.components.AsanaTaskList.toggleSubtasks', 'Toggle subtasks')}
        >
          {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </button>
      ) : (
        <span className="size-4" />
      )}
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
          {expandable ? (
            <span>
              {translate('auto.components.AsanaTaskList.subtaskCount', '{{value0}} subtasks', {
                value0: task.numSubtasks ?? 0
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

function AsanaStatusRow({ label }: { label: string }): React.JSX.Element {
  return <div className="px-3 py-2.5 pl-9 text-[11px] text-muted-foreground">{label}</div>
}

function AsanaSectionBody({
  group,
  selectedTask,
  subtasks,
  onOpenTask,
  onStartWorkspace
}: {
  group: AsanaTaskBoardGroup
  selectedTask: AsanaTask | null
  subtasks: AsanaSubtaskController
  onOpenTask: (task: AsanaTask) => void
  onStartWorkspace: (task: AsanaTask) => void
}): React.JSX.Element {
  if (group.error) {
    return <AsanaStatusRow label={group.error} />
  }
  if (group.loading && group.tasks.length === 0) {
    return (
      <AsanaStatusRow
        label={translate('auto.components.AsanaTaskList.loading', 'Loading tasks…')}
      />
    )
  }
  if (group.tasks.length === 0) {
    return (
      <AsanaStatusRow
        label={translate('auto.components.AsanaTaskList.emptySection', 'No matching tasks')}
      />
    )
  }
  return (
    <div className="divide-y divide-border/50">
      {group.tasks.map((task) => {
        const entry = subtasks.entries[task.gid]
        const expanded = subtasks.expandedGids.has(task.gid)
        return (
          <div key={task.gid}>
            <AsanaTaskRow
              task={task}
              selected={selectedTask?.gid === task.gid}
              expanded={expanded}
              onToggleSubtasks={subtasks.toggle}
              onOpenTask={onOpenTask}
              onStartWorkspace={onStartWorkspace}
            />
            {expanded ? (
              <div className="divide-y divide-border/50 border-t border-border/50 bg-muted/20">
                {entry?.error ? <AsanaStatusRow label={entry.error} /> : null}
                {!entry || entry.loading ? (
                  <AsanaStatusRow
                    label={translate(
                      'auto.components.AsanaTaskList.loadingSubtasks',
                      'Loading subtasks…'
                    )}
                  />
                ) : null}
                {entry?.tasks.map((subtask) => (
                  <AsanaTaskRow
                    key={subtask.gid}
                    task={subtask}
                    nested
                    selected={selectedTask?.gid === subtask.gid}
                    onOpenTask={onOpenTask}
                    onStartWorkspace={onStartWorkspace}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export function AsanaTaskList({
  groups,
  selectedTask,
  subtasks,
  onOpenTask,
  onStartWorkspace,
  onToggleSection
}: AsanaTaskListProps): React.JSX.Element {
  const ungroupedOnly = groups.length === 1 && groups[0].section === null

  return (
    <div className="divide-y divide-border/50">
      {groups.map((group) => (
        <div key={group.key}>
          {ungroupedOnly ? null : (
            <button
              type="button"
              aria-expanded={!group.collapsed}
              onClick={() => onToggleSection(group.key)}
              className="flex w-full items-center gap-1.5 bg-muted/30 px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground transition hover:bg-muted/50"
            >
              {group.collapsed ? (
                <ChevronRight className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
              <span className="truncate">
                {group.section?.name ||
                  translate('auto.components.AsanaTaskList.noSection', 'No section')}
              </span>
              {group.loading ? (
                <Loader2 className="ml-auto size-3 animate-spin" />
              ) : (
                <span className="ml-auto tabular-nums">{group.count ?? '–'}</span>
              )}
            </button>
          )}
          {group.collapsed ? null : (
            <AsanaSectionBody
              group={group}
              selectedTask={selectedTask}
              subtasks={subtasks}
              onOpenTask={onOpenTask}
              onStartWorkspace={onStartWorkspace}
            />
          )}
        </div>
      ))}
    </div>
  )
}
