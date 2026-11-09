import { contextBridge, ipcRenderer } from 'electron'
import type { DevdockAPI } from '../shared/types'
const invoke = (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args)
const api: DevdockAPI = {
  projects: () => invoke('projects:list'),
  addProject: () => invoke('projects:add'),
  updateProject: (id, changes) => invoke('projects:update', id, changes),
  removeProject: (id) => invoke('projects:remove', id),
  openProject: (id, inEditor) => invoke('projects:open', id, inEditor),
  editor: () => invoke('settings:editor'),
  setEditor: (editor) => invoke('settings:set-editor', editor),
  gitDetails: (id) => invoke('git:details', id),
  gitAction: (id, action, message) => invoke('git:action', id, action, message),
  githubStatus: () => invoke('github:status'),
  githubRepos: () => invoke('github:repos'),
  githubClone: (repo) => invoke('github:clone', repo),
  commands: () => invoke('commands:list'),
  addCommand: (input) => invoke('commands:add', input),
  deleteCommand: (id) => invoke('commands:delete', id),
  runCommand: (projectId, commandId) => invoke('commands:run', projectId, commandId),
  resources: () => invoke('resources:list'),
  saveResource: (resource) => invoke('resources:save', resource),
  deleteResource: (id) => invoke('resources:delete', id),
  tools: () => invoke('tools:list')
}
contextBridge.exposeInMainWorld('devdock', api)
