import { describe, expect, it } from 'vitest'
import type { AsanaSection, AsanaTask } from './asana-types'
import { groupAsanaTasksBySection } from './asana-task-sections'

const PROJECT_GID = '1204001885551979'

function section(gid: string, name: string): AsanaSection {
  return { gid, name, projectGid: PROJECT_GID }
}

function task(gid: string, sectionGid: string | null): AsanaTask {
  return {
    gid,
    name: `Task ${gid}`,
    notes: '',
    completed: false,
    permalinkUrl: `https://app.asana.com/0/${PROJECT_GID}/${gid}`,
    projects: [],
    sectionGid
  }
}

describe('groupAsanaTasksBySection', () => {
  it('keeps section order and drops sections with no matching tasks', () => {
    const sections = [
      section('337', 'SP 60'),
      section('448', 'Sprint Story'),
      section('559', 'Icebox')
    ]
    const tasks = [task('7712', '448'), task('8823', '337'), task('9934', '448')]

    expect(
      groupAsanaTasksBySection(tasks, sections).map((group) => [
        group.section?.name,
        group.tasks.map((entry) => entry.gid)
      ])
    ).toEqual([
      ['SP 60', ['8823']],
      ['Sprint Story', ['7712', '9934']]
    ])
  })

  it('collects tasks with missing or unknown sections into a trailing group', () => {
    const sections = [section('337', 'SP 60')]
    const tasks = [task('7712', null), task('8823', '337'), task('9934', '662')]

    expect(
      groupAsanaTasksBySection(tasks, sections).map((group) => [
        group.section,
        group.tasks.map((entry) => entry.gid)
      ])
    ).toEqual([
      [sections[0], ['8823']],
      [null, ['7712', '9934']]
    ])
  })

  it('returns nothing when there are no tasks', () => {
    expect(groupAsanaTasksBySection([], [section('337', 'SP 60')])).toEqual([])
  })
})
