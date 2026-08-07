import React from 'react'
import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { AsanaProjectPicker } from '@/components/asana-project-picker'
import { AsanaTaskFilterMenu } from '@/components/asana-task-filter-menu'
import { translate } from '@/i18n/i18n'
import type { AsanaProject } from '../../../../../shared/asana-types'
import type { AsanaTaskFilter } from '../../../../../shared/asana-task-filter'

export type TaskPageAsanaFiltersProps = {
  asanaProjectOptions: AsanaProject[]
  selectedAsanaProjectGid: string | null
  handleSelectAsanaProject: (projectGid: string | null) => void
  asanaFilter: AsanaTaskFilter
  setAsanaFilter: (filter: AsanaTaskFilter) => void
  asanaSearchInput: string
  setAsanaSearchInput: (value: string) => void
  setAppliedAsanaSearch: (value: string) => void
}

export function TaskPageAsanaFilters({
  asanaProjectOptions,
  selectedAsanaProjectGid,
  handleSelectAsanaProject,
  asanaFilter,
  setAsanaFilter,
  asanaSearchInput,
  setAsanaSearchInput,
  setAppliedAsanaSearch
}: TaskPageAsanaFiltersProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <AsanaProjectPicker
        projects={asanaProjectOptions}
        selectedProjectGid={selectedAsanaProjectGid}
        onChange={handleSelectAsanaProject}
      />
      <AsanaTaskFilterMenu filter={asanaFilter} onChange={setAsanaFilter} />
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={asanaSearchInput}
          onChange={(e) => setAsanaSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault()
              setAppliedAsanaSearch(asanaSearchInput.trim())
            }
          }}
          placeholder={
            selectedAsanaProjectGid
              ? translate(
                  'auto.components.TaskPage.filterTasksInProject',
                  'Filter tasks in project...'
                )
              : translate(
                  'auto.components.TaskPage.searchTasksPlaceholder',
                  'Search assigned tasks...'
                )
          }
          className="h-8 w-full rounded-md border-border/50 bg-muted/50 pl-8 text-xs font-medium shadow-sm transition placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
    </div>
  )
}
