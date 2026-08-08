import type { TaskSourceContext } from '../../../../shared/task-source-context'

export function getAutomationSourceProviderLabel(provider: TaskSourceContext['provider']): string {
  switch (provider) {
    case 'github':
      return 'GitHub'
    case 'gitlab':
      return 'GitLab'
    case 'linear':
      return 'Linear'
    case 'jira':
      return 'Jira'
    case 'asana':
      return 'Asana'
  }
}
