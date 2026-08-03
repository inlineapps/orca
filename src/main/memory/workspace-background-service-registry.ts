export type WorkspaceBackgroundServiceRegistration = {
  serviceId: string
  serviceKind: 'typescript-language-service'
  worktreeId: string
  pid: number
  version?: string
}

type RegisteredService = WorkspaceBackgroundServiceRegistration & { token: symbol }

const services = new Map<string, RegisteredService>()

export function registerWorkspaceBackgroundService(
  registration: WorkspaceBackgroundServiceRegistration
): () => void {
  const key = `${registration.worktreeId}\0${registration.serviceId}`
  const token = Symbol(key)
  services.set(key, { ...registration, token })
  return () => {
    if (services.get(key)?.token === token) {
      services.delete(key)
    }
  }
}

export function listWorkspaceBackgroundServices(): WorkspaceBackgroundServiceRegistration[] {
  return [...services.values()].map(({ token: _token, ...registration }) => registration)
}

export function resetWorkspaceBackgroundServicesForTests(): void {
  services.clear()
}
