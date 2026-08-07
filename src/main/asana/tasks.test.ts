import { beforeEach, describe, expect, it, vi } from 'vitest'

const { asanaRequestMock, getClientMock, getStatusMock, getAsanaProjectsMock } = vi.hoisted(() => ({
  asanaRequestMock: vi.fn(),
  getClientMock: vi.fn((workspaceGid?: string | null) => ({ token: 'pat-37', workspaceGid })),
  getStatusMock: vi.fn(() => ({
    connected: true,
    viewer: null,
    workspaces: [{ gid: 'workspace-9284', name: 'Studio 9284' }],
    projects: [],
    activeWorkspaceGid: 'workspace-9284'
  })),
  getAsanaProjectsMock: vi.fn()
}))

vi.mock('./client', () => ({
  AsanaApiError: class AsanaApiError extends Error {
    status: number | null
    constructor(message: string, status: number | null = null) {
      super(message)
      this.status = status
    }
  },
  asanaRequest: <T>(client: { token: string; workspaceGid?: string | null }, path: string) =>
    asanaRequestMock(client, path) as Promise<T>,
  getAsanaProjects: (workspaceGid?: string | null) => getAsanaProjectsMock(workspaceGid),
  getClient: (workspaceGid?: string | null) => getClientMock(workspaceGid),
  getStatus: () => getStatusMock()
}))

import { AsanaApiError } from './client'
import { listAssignedTasks, mapAsanaTask, searchTasks } from './tasks'

describe('Asana task mapping and reads', () => {
  beforeEach(() => {
    asanaRequestMock.mockReset()
    getClientMock.mockClear()
    getStatusMock.mockClear()
    getAsanaProjectsMock.mockClear()
  })

  it('maps diverse task metadata without identity placeholders', () => {
    const task = mapAsanaTask({
      gid: '12089284',
      name: 'Reconcile importer edge cases',
      notes: 'Preserve the source URL and parent context.',
      completed: false,
      completed_at: null,
      due_on: '2026-09-17',
      due_at: '2026-09-17T17:30:00.000Z',
      created_at: '2026-08-01T10:00:00.000Z',
      modified_at: '2026-08-05T12:00:00.000Z',
      permalink_url: 'https://app.asana.com/0/12077/12089284',
      assignee: { gid: '12055', name: 'Mina Chen', email: 'mina@example.com' },
      workspace: { gid: '12077', name: 'Studio 9284', resource_type: 'workspace' },
      projects: [
        {
          gid: '12066',
          name: 'Importer 2026',
          workspace: { gid: '12077', name: 'Studio 9284' },
          permalink_url: 'https://app.asana.com/0/12066/list'
        }
      ],
      parent: {
        gid: '12044',
        name: 'Migration epic',
        permalink_url: 'https://app.asana.com/0/12077/12044'
      }
    })

    expect(task).toMatchObject({
      gid: '12089284',
      name: 'Reconcile importer edge cases',
      dueOn: '2026-09-17',
      assignee: { gid: '12055', name: 'Mina Chen' },
      workspace: { gid: '12077', name: 'Studio 9284' },
      projects: [{ gid: '12066', workspaceGid: '12077' }],
      parent: { gid: '12044' }
    })
  })

  it('uses the search endpoint query separator and keeps assigned reads bounded', async () => {
    asanaRequestMock.mockResolvedValue({ data: [] })

    await searchTasks('billing handoff', 37, 'workspace-9284')
    expect(asanaRequestMock).toHaveBeenCalledWith(
      { token: 'pat-37', workspaceGid: 'workspace-9284' },
      expect.stringContaining('/tasks/search?text=billing%20handoff&limit=100')
    )

    await listAssignedTasks(37, 'workspace-9284')
    expect(asanaRequestMock).toHaveBeenLastCalledWith(
      { token: 'pat-37', workspaceGid: 'workspace-9284' },
      expect.stringContaining(
        '/tasks?assignee=me&workspace=workspace-9284&completed_since=now&limit=100'
      )
    )
  })

  it('falls back to assigned-task filtering when workspace search requires Premium', async () => {
    asanaRequestMock
      .mockRejectedValueOnce(new AsanaApiError('Premium required', 402))
      .mockResolvedValueOnce({
        data: [
          {
            gid: '12094731',
            name: 'Review invoice sync',
            notes: 'Cover Edge Case retries',
            completed: false,
            permalink_url: 'https://app.asana.com/0/12066/12094731',
            workspace: { gid: 'workspace-9284', name: 'Studio 9284' },
            projects: []
          },
          {
            gid: '12058372',
            name: 'Update launch brief',
            notes: 'Prepare screenshots',
            completed: false,
            permalink_url: 'https://app.asana.com/0/12066/12058372',
            workspace: { gid: 'workspace-9284', name: 'Studio 9284' },
            projects: []
          }
        ]
      })

    await expect(searchTasks('edge case', 37, 'workspace-9284')).resolves.toMatchObject([
      { gid: '12094731', name: 'Review invoice sync' }
    ])
    expect(asanaRequestMock).toHaveBeenLastCalledWith(
      { token: 'pat-37', workspaceGid: 'workspace-9284' },
      expect.stringContaining('assignee=me&workspace=workspace-9284&completed_since=now')
    )
  })
})
