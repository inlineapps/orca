import { useState } from 'react'
import {
  CalendarClock,
  CalendarRange,
  CircleCheck,
  CircleDashed,
  ListFilter,
  UserRound
} from 'lucide-react'
import {
  countActiveAsanaTaskFilters,
  DEFAULT_ASANA_TASK_FILTER,
  type AsanaTaskFilter
} from '../../../shared/asana-task-filter'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'

type AsanaTaskFilterMenuProps = {
  filter: AsanaTaskFilter
  onChange: (filter: AsanaTaskFilter) => void
}

function FilterChip({
  active,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean
  icon: typeof CircleDashed
  label: string
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition',
        active
          ? 'border-border/50 bg-foreground/90 text-background shadow-xs'
          : 'border-border/60 bg-muted/40 text-foreground hover:bg-muted/70'
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  )
}

export function AsanaTaskFilterMenu({
  filter,
  onChange
}: AsanaTaskFilterMenuProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const activeCount = countActiveAsanaTaskFilters(filter)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 gap-1.5 rounded-md border-border/50 bg-transparent px-2.5 text-xs hover:bg-muted/50',
            activeCount > 0 && 'bg-muted/60'
          )}
        >
          <ListFilter className="size-3.5" />
          {translate('auto.components.AsanaTaskFilterMenu.trigger', 'Filter')}
          {activeCount > 0 ? (
            <span className="rounded-full bg-foreground/90 px-1.5 text-[10px] font-medium text-background">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">
            {translate('auto.components.AsanaTaskFilterMenu.title', 'Filters')}
          </span>
          <button
            type="button"
            onClick={() => onChange(DEFAULT_ASANA_TASK_FILTER)}
            disabled={activeCount === 0}
            className="text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-40"
          >
            {translate('auto.components.AsanaTaskFilterMenu.clear', 'Clear')}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <FilterChip
            active={filter.completion === 'incomplete'}
            icon={CircleDashed}
            label={translate('auto.components.AsanaTaskFilterMenu.incomplete', 'Incomplete tasks')}
            onClick={() =>
              onChange({
                ...filter,
                completion: filter.completion === 'incomplete' ? 'all' : 'incomplete'
              })
            }
          />
          <FilterChip
            active={filter.completion === 'completed'}
            icon={CircleCheck}
            label={translate('auto.components.AsanaTaskFilterMenu.completed', 'Completed tasks')}
            onClick={() =>
              onChange({
                ...filter,
                completion: filter.completion === 'completed' ? 'all' : 'completed'
              })
            }
          />
          <FilterChip
            active={filter.onlyMine}
            icon={UserRound}
            label={translate('auto.components.AsanaTaskFilterMenu.onlyMine', 'Only my tasks')}
            onClick={() => onChange({ ...filter, onlyMine: !filter.onlyMine })}
          />
          <FilterChip
            active={filter.due === 'thisWeek'}
            icon={CalendarClock}
            label={translate('auto.components.AsanaTaskFilterMenu.dueThisWeek', 'Due this week')}
            onClick={() =>
              onChange({ ...filter, due: filter.due === 'thisWeek' ? 'any' : 'thisWeek' })
            }
          />
          <FilterChip
            active={filter.due === 'nextWeek'}
            icon={CalendarRange}
            label={translate('auto.components.AsanaTaskFilterMenu.dueNextWeek', 'Due next week')}
            onClick={() =>
              onChange({ ...filter, due: filter.due === 'nextWeek' ? 'any' : 'nextWeek' })
            }
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
