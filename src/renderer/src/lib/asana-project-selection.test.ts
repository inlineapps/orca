import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readAsanaProjectSelection, writeAsanaProjectSelection } from './asana-project-selection'

const STORAGE_KEY = 'orca.asana.selected-project'
const CONTEXT = 'ssh:build-box'
const WORKSPACE = '407865308541648'
const PROJECT = '1203019910262545'

let store: Record<string, string>

describe('asana project selection memory', () => {
  beforeEach(() => {
    store = {}
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
      removeItem: (key: string) => {
        delete store[key]
      }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('remembers a project per workspace and context', () => {
    writeAsanaProjectSelection(CONTEXT, WORKSPACE, PROJECT)
    writeAsanaProjectSelection(CONTEXT, '992277314455', '1204001885551979')

    expect(readAsanaProjectSelection(CONTEXT, WORKSPACE)).toBe(PROJECT)
    expect(readAsanaProjectSelection(CONTEXT, '992277314455')).toBe('1204001885551979')
    expect(readAsanaProjectSelection('local', WORKSPACE)).toBeNull()
  })

  it('clears the scope when the picker falls back to my tasks', () => {
    writeAsanaProjectSelection(CONTEXT, WORKSPACE, PROJECT)
    writeAsanaProjectSelection(CONTEXT, WORKSPACE, null)

    expect(readAsanaProjectSelection(CONTEXT, WORKSPACE)).toBeNull()
  })

  it('drops the oldest scopes once the bound is passed', () => {
    for (let index = 0; index < 23; index += 1) {
      writeAsanaProjectSelection(CONTEXT, `workspace-${index}`, `project-${index}`)
    }

    expect(readAsanaProjectSelection(CONTEXT, 'workspace-0')).toBeNull()
    expect(readAsanaProjectSelection(CONTEXT, 'workspace-22')).toBe('project-22')
    expect(Object.keys(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'))).toHaveLength(20)
  })

  it('ignores stored values that are not a string map', () => {
    localStorage.setItem(STORAGE_KEY, '["not-a-map"]')

    expect(readAsanaProjectSelection(CONTEXT, WORKSPACE)).toBeNull()
  })
})
