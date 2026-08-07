import { beforeEach, describe, expect, it, vi } from 'vitest'

const { asanaRequestMock, getClientMock } = vi.hoisted(() => ({
  asanaRequestMock: vi.fn(),
  getClientMock: vi.fn((workspaceGid?: string | null) => ({ token: 'pat-73', workspaceGid }))
}))

vi.mock('./client', () => ({
  asanaRequest: <T>(client: { token: string }, path: string) =>
    asanaRequestMock(client, path) as Promise<T>,
  getClient: (workspaceGid?: string | null) => getClientMock(workspaceGid)
}))

import { listProjectTasks, listSections } from './project-tasks'

const PROJECT_GID = '1203019910262545'

function taskRow(gid: string, sectionGid: string | null, projectGid = PROJECT_GID): unknown {
  return {
    gid,
    name: `Task ${gid}`,
    notes: '',
    completed: false,
    permalink_url: `https://app.asana.com/0/${projectGid}/${gid}`,
    projects: [],
    memberships: sectionGid
      ? [
          {
            project: { gid: projectGid },
            section: { gid: sectionGid, name: `Section ${sectionGid}` }
          }
        ]
      : []
  }
}

describe('Asana project reads', () => {
  beforeEach(() => {
    asanaRequestMock.mockReset()
    getClientMock.mockClear()
  })

  it('lists sections scoped to the project', async () => {
    asanaRequestMock.mockResolvedValue({
      data: [
        { gid: '3374', name: 'SP 60 (Jul 27 - Aug 7)' },
        { gid: '4485', name: 'Sprint Story' },
        { name: 'Dropped: no gid' }
      ]
    })

    await expect(listSections(PROJECT_GID, 'workspace-407865308541648')).resolves.toEqual([
      { gid: '3374', name: 'SP 60 (Jul 27 - Aug 7)', projectGid: PROJECT_GID },
      { gid: '4485', name: 'Sprint Story', projectGid: PROJECT_GID }
    ])
    expect(getClientMock).toHaveBeenCalledWith('workspace-407865308541648')
    expect(asanaRequestMock).toHaveBeenCalledWith(
      expect.anything(),
      `/projects/${PROJECT_GID}/sections?opt_fields=gid,name&limit=100`
    )
  })

  it('attaches the section membership that belongs to the listed project', async () => {
    asanaRequestMock
      .mockResolvedValueOnce({ data: [{ gid: '4485', name: 'Sprint Story' }] })
      .mockResolvedValueOnce({
        data: [
          {
            ...(taskRow('7712', '4485') as Record<string, unknown>),
            memberships: [
              {
                project: { gid: '9990001' },
                section: { gid: '6628', name: 'Other project bucket' }
              },
              { project: { gid: PROJECT_GID }, section: { gid: '4485', name: 'Sprint Story' } }
            ]
          },
          taskRow('8823', null)
        ]
      })

    const result = await listProjectTasks(PROJECT_GID, 200, false, 'workspace-407865308541648')

    expect(result.tasks.map((task) => [task.gid, task.sectionGid, task.sectionName])).toEqual([
      ['7712', '4485', 'Sprint Story'],
      ['8823', null, null]
    ])
    expect(result.sections).toEqual([
      { gid: '4485', name: 'Sprint Story', projectGid: PROJECT_GID }
    ])
    expect(result.hasMore).toBe(false)
  })

  it('drops completed_since when completed tasks are requested', async () => {
    asanaRequestMock.mockResolvedValue({ data: [] })

    await listProjectTasks(PROJECT_GID, 50, true)
    const taskPath = asanaRequestMock.mock.calls
      .map(([, path]) => path as string)
      .find((path) => path.startsWith('/tasks?'))
    expect(taskPath).toContain(`project=${PROJECT_GID}`)
    expect(taskPath).not.toContain('completed_since')

    asanaRequestMock.mockClear()
    await listProjectTasks(PROJECT_GID, 50, false)
    expect(
      asanaRequestMock.mock.calls
        .map(([, path]) => path as string)
        .find((path) => path.startsWith('/tasks?'))
    ).toContain('completed_since=now')
  })

  it('follows pagination until the bound and reports more pages remain', async () => {
    asanaRequestMock.mockImplementation(async (_client: unknown, path: string) => {
      if (path.startsWith('/projects/')) {
        return { data: [] }
      }
      return path.includes('offset=page-2')
        ? { data: [taskRow('9934', null)], next_page: { offset: 'page-3' } }
        : { data: [taskRow('7712', null), taskRow('8823', null)], next_page: { offset: 'page-2' } }
    })

    const result = await listProjectTasks(PROJECT_GID, 3)

    expect(result.tasks.map((task) => task.gid)).toEqual(['7712', '8823', '9934'])
    expect(result.hasMore).toBe(true)
  })

  it('reads one section directly and skips the sections round-trip', async () => {
    asanaRequestMock.mockResolvedValue({ data: [taskRow('7712', '4485')] })

    const result = await listProjectTasks(
      PROJECT_GID,
      200,
      false,
      'workspace-407865308541648',
      '4485'
    )
    const paths = asanaRequestMock.mock.calls.map(([, path]) => path as string)

    expect(paths).toHaveLength(1)
    expect(paths[0]).toContain('section=4485')
    expect(paths[0]).not.toContain(`project=${PROJECT_GID}`)
    expect(result.sections).toEqual([])
    expect(result.tasks.map((task) => [task.gid, task.sectionGid])).toEqual([['7712', '4485']])
  })

  it('returns nothing for a blank project gid without calling Asana', async () => {
    await expect(listProjectTasks('   ')).resolves.toEqual({
      sections: [],
      tasks: [],
      hasMore: false
    })
    expect(asanaRequestMock).not.toHaveBeenCalled()
  })
})
