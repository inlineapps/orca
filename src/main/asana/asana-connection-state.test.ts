import { describe, expect, it } from 'vitest'
import { normalizeAsanaProject, normalizeAsanaWorkspace } from './asana-connection-state'

describe('Asana connection state normalization', () => {
  it('normalizes API project metadata', () => {
    expect(
      normalizeAsanaProject({
        gid: '12094731',
        name: 'Importer rollout',
        archived: false,
        permalink_url: 'https://app.asana.com/0/12094731/list',
        workspace: { gid: '12058372', name: 'Studio North' }
      })
    ).toEqual({
      gid: '12094731',
      name: 'Importer rollout',
      workspaceGid: '12058372',
      workspaceName: 'Studio North',
      archived: false,
      permalinkUrl: 'https://app.asana.com/0/12094731/list'
    })
  })

  it('preserves already-normalized metadata during persistence', () => {
    expect(
      normalizeAsanaProject({
        gid: '12063849',
        name: 'Billing migration',
        workspaceGid: '12047268',
        workspaceName: 'Finance Ops',
        permalinkUrl: 'https://app.asana.com/0/12063849/list'
      })
    ).toEqual({
      gid: '12063849',
      name: 'Billing migration',
      workspaceGid: '12047268',
      workspaceName: 'Finance Ops',
      permalinkUrl: 'https://app.asana.com/0/12063849/list'
    })
    expect(
      normalizeAsanaWorkspace({
        gid: '12047268',
        name: 'Finance Ops',
        resourceType: 'workspace'
      })
    ).toEqual({ gid: '12047268', name: 'Finance Ops', resourceType: 'workspace' })
  })
})
