export interface Project {
  id: string
  name: string
  rootPath: string
  category: string
  favorite: boolean
  createdAt: string
  lastOpenedAt: string | null
  git: { isRepository: boolean; branch: string | null; modified: number; untracked: number }
}
export interface RemoteRepo {
  nameWithOwner: string
  description: string
  isPrivate: boolean
  url: string
  updatedAt: string
  isFork: boolean
}
export interface GitDetails {
  branch: string
  remote: string
  changes: string[]
  commits: { hash: string; subject: string; relativeTime: string }[]
}
export interface Command {
  id: string
  name: string
  executable: string
  args: string[]
  category: string
  dangerous: boolean
  builtin: boolean
}
export interface RunResult {
  command: string
  stdout: string
  stderr: string
  exitCode: number | null
}
export interface Resource {
  id: string
  title: string
  kind: 'note' | 'link' | 'snippet'
  category: string
  content: string
}
export interface ToolInfo {
  name: string
  installed: boolean
  version: string
}
export interface GithubStatus {
  installed: boolean
  connected: boolean
  username: string | null
  hint: string
}
export interface DependencyInfo {
  id: string
  name: string
  purpose: string
  installed: boolean
  version: string
  recommended: boolean
  installable: boolean
  instructions: string
}
export interface DependencyInstallResult {
  ok: boolean
  details: string
}
export interface DevdockAPI {
  projects(): Promise<Project[]>
  addProject(): Promise<Project | null>
  updateProject(id: string, changes: {name?:string;category?:string;favorite?:boolean}): Promise<void>
  removeProject(id: string): Promise<void>
  openProject(id: string, inEditor: boolean): Promise<void>
  editor(): Promise<string>
  setEditor(editor: string): Promise<void>
  gitDetails(id: string): Promise<GitDetails>
  gitAction(id: string, action: 'fetch'|'pull'|'push'|'stage'|'commit', message?: string): Promise<RunResult>
  githubStatus(): Promise<GithubStatus>
  githubRepos(): Promise<RemoteRepo[]>
  githubClone(repo: string): Promise<Project | null>
  commands(): Promise<Command[]>
  addCommand(input: {name:string;executable:string;args:string;category:string}): Promise<void>
  deleteCommand(id:string): Promise<void>
  runCommand(projectId:string,commandId:string): Promise<RunResult>
  resources(): Promise<Resource[]>
  saveResource(resource: {id?:string;title:string;kind:'note'|'link'|'snippet';category:string;content:string}): Promise<void>
  deleteResource(id:string): Promise<void>
  tools(): Promise<ToolInfo[]>
  dependencies(): Promise<DependencyInfo[]>
  installDependency(id: string): Promise<DependencyInstallResult>
  setupComplete(): Promise<boolean>
  completeSetup(): Promise<void>
  createDesktopShortcut(): Promise<void>
}
