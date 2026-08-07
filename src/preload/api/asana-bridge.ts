import { ipcRenderer } from 'electron'
import type { PreloadApi } from '../api-types'

export const asanaApi = {
  connect: (args) => ipcRenderer.invoke('asana:connect', args),
  disconnect: () => ipcRenderer.invoke('asana:disconnect'),
  selectWorkspace: (args) => ipcRenderer.invoke('asana:selectWorkspace', args),
  status: () => ipcRenderer.invoke('asana:status'),
  readStatus: () => ipcRenderer.invoke('asana:readStatus'),
  testConnection: () => ipcRenderer.invoke('asana:testConnection'),
  listProjects: (args) => ipcRenderer.invoke('asana:listProjects', args),
  listAssignedTasks: (args) => ipcRenderer.invoke('asana:listAssignedTasks', args),
  refreshProjects: (args) => ipcRenderer.invoke('asana:refreshProjects', args),
  listSections: (args) => ipcRenderer.invoke('asana:listSections', args),
  listProjectTasks: (args) => ipcRenderer.invoke('asana:listProjectTasks', args),
  searchTasks: (args) => ipcRenderer.invoke('asana:searchTasks', args),
  getTask: (args) => ipcRenderer.invoke('asana:getTask', args)
} satisfies PreloadApi['asana']
