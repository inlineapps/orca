import { ipcRenderer } from 'electron'
import type { PreloadApi } from '../api-types'

export const tsserverApi = {
  probeRoot: (args) => ipcRenderer.invoke('tsserver:probeRoot', args),
  openFile: (args) => ipcRenderer.invoke('tsserver:openFile', args),
  updateFile: (args) => ipcRenderer.invoke('tsserver:updateFile', args),
  closeFile: (args) => ipcRenderer.invoke('tsserver:closeFile', args),
  definition: (args) => ipcRenderer.invoke('tsserver:definition', args),
  references: (args) => ipcRenderer.invoke('tsserver:references', args),
  quickinfo: (args) => ipcRenderer.invoke('tsserver:quickinfo', args),
  completions: (args) => ipcRenderer.invoke('tsserver:completions', args),
  completionDetails: (args) => ipcRenderer.invoke('tsserver:completionDetails', args)
} satisfies PreloadApi['tsserver']
