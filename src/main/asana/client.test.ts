import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as AsanaConnectionStateModule from './asana-connection-state'
import type { AsanaConnectionState } from './asana-connection-state'

const { fetchMock, stateRef } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  stateRef: { current: null as AsanaConnectionState | null }
}))

vi.mock('electron', () => ({ net: { fetch: fetchMock } }))

vi.mock('./asana-credential-store', () => ({
  clearAsanaToken: vi.fn(),
  getAsanaCredentialError: () => undefined,
  hasStoredAsanaToken: () => true,
  loadAsanaToken: () => 'pat-5591',
  saveAsanaToken: vi.fn()
}))

vi.mock('./asana-connection-state', async (importOriginal) => {
  const actual = await importOriginal<typeof AsanaConnectionStateModule>()
  return {
    ...actual,
    readAsanaConnectionState: () => stateRef.current as AsanaConnectionState,
    writeAsanaConnectionState: (next: AsanaConnectionState) => {
      stateRef.current = next
    }
  }
})

import { refreshProjects } from './client'

const WORKSPACE_A = '407865308541648'
const WORKSPACE_B = '882714009335277'

function project(gid: string, name: string, workspaceGid: string): unknown {
  return {
    gid,
    name,
    archived: false,
    permalink_url: `https://app.asana.com/0/${gid}/list`,
    workspace: { gid: workspaceGid, name: `Workspace ${workspaceGid}` }
  }
}

function jsonResponse(data: unknown[]): unknown {
  return { ok: true, status: 200, json: async () => ({ data, next_page: null }) }
}

describe('refreshProjects', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    stateRef.current = {
      version: 1,
      viewer: { gid: '1207734', name: 'Mina Chen', email: 'mina@example.com' },
      workspaces: [
        { gid: WORKSPACE_A, name: 'Table & Meals' },
        { gid: WORKSPACE_B, name: 'Platform' }
      ],
      projects: [
        {
          gid: '1203019910262545',
          name: 'Stale sprint board',
          workspaceGid: WORKSPACE_A
        },
        { gid: '1204778812339', name: 'Platform roadmap', workspaceGid: WORKSPACE_B }
      ],
      activeWorkspaceGid: WORKSPACE_A
    }
  })

  it('replaces only the target workspace projects and keeps other workspaces intact', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        project('1203019910262545', 'Sprint board', WORKSPACE_A),
        project('1209983374412', 'Growth experiments', WORKSPACE_A)
      ])
    )

    const status = await refreshProjects(WORKSPACE_A)

    expect(status.projects.map((entry) => [entry.gid, entry.name, entry.workspaceGid])).toEqual([
      ['1204778812339', 'Platform roadmap', WORKSPACE_B],
      ['1203019910262545', 'Sprint board', WORKSPACE_A],
      ['1209983374412', 'Growth experiments', WORKSPACE_A]
    ])
    expect(String(fetchMock.mock.calls[0][0])).toContain(`workspace=${WORKSPACE_A}`)
  })

  it('falls back to the active workspace and skips the request when none is set', async () => {
    stateRef.current = { ...(stateRef.current as AsanaConnectionState), activeWorkspaceGid: null }

    await expect(refreshProjects()).resolves.toMatchObject({ connected: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
