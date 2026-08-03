import { afterEach, describe, expect, it } from 'vitest'
import {
  listWorkspaceBackgroundServices,
  registerWorkspaceBackgroundService,
  resetWorkspaceBackgroundServicesForTests
} from './workspace-background-service-registry'

describe('workspace background service registry', () => {
  afterEach(resetWorkspaceBackgroundServicesForTests)

  it('tracks services by workspace and ignores stale unregister callbacks', () => {
    const first = registerWorkspaceBackgroundService({
      serviceId: 'typescript-language-service',
      serviceKind: 'typescript-language-service',
      worktreeId: 'repo::/capacity',
      pid: 37,
      version: '7.2.4'
    })
    const second = registerWorkspaceBackgroundService({
      serviceId: 'typescript-language-service',
      serviceKind: 'typescript-language-service',
      worktreeId: 'repo::/capacity',
      pid: 83,
      version: '6.4.8'
    })

    first()
    expect(listWorkspaceBackgroundServices()).toEqual([
      {
        serviceId: 'typescript-language-service',
        serviceKind: 'typescript-language-service',
        worktreeId: 'repo::/capacity',
        pid: 83,
        version: '6.4.8'
      }
    ])
    second()
    expect(listWorkspaceBackgroundServices()).toEqual([])
  })
})
