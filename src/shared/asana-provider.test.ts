import { describe, expect, it } from 'vitest'
import { normalizeTaskProviderIdentity } from './task-provider-identity'
import { normalizeTaskSourceContext } from './task-source-context'
import {
  buildAsanaWorkspaceSource,
  buildWorkspaceSourceSelection,
  getWorkspaceSourceProvider
} from './new-workspace/workspace-source'
import { isWorkspaceLinkedItemSourceContextMatch } from './workspace-linked-item-source-context'

const task = {
  gid: '12089284',
  name: 'Reconcile importer edge cases',
  permalinkUrl: 'https://app.asana.com/0/12077/12089284',
  workspace: { gid: '12077', name: 'Studio 9284' }
}

describe('Asana provider identity and workspace source', () => {
  it('builds an Asana source with a stable task identity', () => {
    const source = buildAsanaWorkspaceSource(task)
    expect(source).toMatchObject({
      provider: 'asana',
      type: 'issue',
      number: 0,
      asanaIdentifier: '12089284',
      asanaWorkspaceGid: '12077'
    })
    expect(getWorkspaceSourceProvider(source)).toBe('asana')
    expect(buildWorkspaceSourceSelection({ linkedWorkItem: source })).toMatchObject({
      kind: 'asana',
      label: 'Reconcile importer edge cases'
    })
  })

  it('matches task source context only for the same workspace and task', () => {
    const providerIdentity = normalizeTaskProviderIdentity('asana', {
      provider: 'asana',
      workspaceGid: '12077',
      workspaceName: 'Studio 9284'
    })
    const context = normalizeTaskSourceContext({
      provider: 'asana',
      projectId: 'project-9284',
      hostId: 'ssh:box-17',
      providerIdentity
    })
    expect(isWorkspaceLinkedItemSourceContextMatch(sourceWithTask(task), context)).toBe(true)
    expect(
      isWorkspaceLinkedItemSourceContextMatch(
        sourceWithTask({
          ...task,
          workspace: { gid: '12088', name: 'Studio 9288' },
          permalinkUrl: 'https://app.asana.com/0/12088/12089284'
        }),
        context
      )
    ).toBe(false)
    const sourceWithoutWorkspace = sourceWithTask(task)
    delete sourceWithoutWorkspace.asanaWorkspaceGid
    expect(isWorkspaceLinkedItemSourceContextMatch(sourceWithoutWorkspace, context)).toBe(false)
  })
})

function sourceWithTask(input: typeof task) {
  return {
    ...input,
    provider: 'asana' as const,
    type: 'issue' as const,
    number: 0,
    title: input.name,
    url: input.permalinkUrl,
    asanaIdentifier: input.gid,
    ...(input.workspace?.gid ? { asanaWorkspaceGid: input.workspace.gid } : {})
  }
}
