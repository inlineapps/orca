import { useState } from 'react'
import { Check, ChevronsUpDown, FolderKanban, UserRound } from 'lucide-react'
import type { AsanaProject } from '../../../shared/asana-types'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'

export const ASANA_ASSIGNED_SCOPE = 'assigned'

type AsanaProjectPickerProps = {
  projects: AsanaProject[]
  /** Null selects the assigned-to-me scope instead of a project. */
  selectedProjectGid: string | null
  onChange: (projectGid: string | null) => void
}

export function AsanaProjectPicker({
  projects,
  selectedProjectGid,
  onChange
}: AsanaProjectPickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const assignedLabel = translate('auto.components.AsanaProjectPicker.assigned', 'My tasks')
  const selectedProject = selectedProjectGid
    ? (projects.find((project) => project.gid === selectedProjectGid) ?? null)
    : null

  const select = (gid: string | null): void => {
    setOpen(false)
    onChange(gid)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-[220px] justify-between rounded-md border-border/50 bg-muted/50 px-2.5 text-xs font-medium shadow-sm"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {selectedProject ? (
              <FolderKanban className="size-3.5 flex-none text-muted-foreground" />
            ) : (
              <UserRound className="size-3.5 flex-none text-muted-foreground" />
            )}
            <span className="truncate">{selectedProject?.name ?? assignedLabel}</span>
          </span>
          <ChevronsUpDown className="size-3.5 flex-none opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] p-0">
        <Command>
          <CommandInput
            placeholder={translate(
              'auto.components.AsanaProjectPicker.searchPlaceholder',
              'Search projects...'
            )}
          />
          <CommandList>
            <CommandEmpty>
              {translate('auto.components.AsanaProjectPicker.empty', 'No projects found.')}
            </CommandEmpty>
            <CommandGroup>
              <CommandItem value={ASANA_ASSIGNED_SCOPE} onSelect={() => select(null)}>
                <UserRound className="mr-2 size-3.5 text-muted-foreground" />
                <span className="truncate">{assignedLabel}</span>
                <Check
                  className={cn('ml-auto size-3.5', selectedProject ? 'opacity-0' : 'opacity-100')}
                />
              </CommandItem>
            </CommandGroup>
            <CommandGroup
              heading={translate('auto.components.AsanaProjectPicker.projects', 'Projects')}
            >
              {projects.map((project) => (
                <CommandItem
                  key={project.gid}
                  value={`${project.name} ${project.gid}`}
                  onSelect={() => select(project.gid)}
                >
                  <FolderKanban className="mr-2 size-3.5 text-muted-foreground" />
                  <span className="truncate">{project.name}</span>
                  <Check
                    className={cn(
                      'ml-auto size-3.5',
                      selectedProjectGid === project.gid ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
