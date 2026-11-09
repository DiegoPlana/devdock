import { execFile } from 'node:child_process'
import { findCommand } from './dependencies'
import type { Command, GitDetails, GithubStatus, Project, RemoteRepo, RunResult, ToolInfo } from '../shared/types'

export const builtins:Command[]=[
  {id:'git-status',name:'Git Status',executable:'git',args:['status','--short','--branch'],category:'Git',dangerous:false,builtin:true},
  {id:'git-log',name:'Últimos commits',executable:'git',args:['log','-10','--oneline'],category:'Git',dangerous:false,builtin:true},
  {id:'git-diff',name:'Resumen de diferencias',executable:'git',args:['diff','--stat'],category:'Git',dangerous:false,builtin:true},
  {id:'docker-ps',name:'Docker PS',executable:'docker',args:['ps'],category:'Docker',dangerous:false,builtin:true},
  {id:'docker-up',name:'Docker Compose Up',executable:'docker',args:['compose','up','-d'],category:'Docker',dangerous:true,builtin:true},
  {id:'docker-down',name:'Docker Compose Down',executable:'docker',args:['compose','down'],category:'Docker',dangerous:true,builtin:true},
  {id:'node-version',name:'Node Version',executable:'node',args:['--version'],category:'Sistema',dangerous:false,builtin:true}
]
export function exec(executable:string,args:string[],cwd?:string,timeout=20000):Promise<RunResult>{
  return new Promise(resolve=>{
    execFile(findCommand(executable),args,{
      cwd,shell:false,windowsHide:true,timeout,maxBuffer:2*1024*1024,
      env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never'}
    },(error,stdout,stderr)=>{
      const err=error as (Error &{code?:number|string;killed?:boolean})|null
      const code=err?(typeof err.code==='number'?err.code:null):0
      resolve({command:[executable,...args].join(' '),stdout:String(stdout).slice(0,200000),
        stderr:(String(stderr)|| (err?.message??'')).slice(0,200000),exitCode:code})
    })
  })
}
export async function checked(exe:string,args:string[],cwd?:string,timeout=20000):Promise<string>{
  const r=await exec(exe,args,cwd,timeout)
  if(r.exitCode!==0)throw new Error((r.stderr||r.stdout||'Error ejecutando comando').slice(0,700))
  return r.stdout.trim()
}
export async function snapshot(project:Project):Promise<Project>{
  try{
    if(await checked('git',['-C',project.rootPath,'rev-parse','--is-inside-work-tree'])!=='true')return project
    const [branch,status]=await Promise.all([
      checked('git',['-C',project.rootPath,'branch','--show-current']),
      checked('git',['-C',project.rootPath,'status','--porcelain=v1','--untracked-files=normal'])
    ])
    let modified=0,untracked=0
    for(const line of status.split(/\r?\n/).filter(Boolean)){if(line.startsWith('??'))untracked++;else modified++}
    return {...project,git:{isRepository:true,branch:branch||'(HEAD separado)',modified,untracked}}
  }catch{return project}
}
export async function gitDetails(path:string):Promise<GitDetails>{
  if(await checked('git',['-C',path,'rev-parse','--is-inside-work-tree'])!=='true')throw new Error('No es un repositorio Git')
  const opt=async(args:string[])=>{try{return await checked('git',['-C',path,...args])}catch{return''}}
  const [branch,status,log,remote]=await Promise.all([
    opt(['branch','--show-current']),opt(['status','--short']),opt(['log','-10','--format=%h%x09%s%x09%cr']),opt(['remote','get-url','origin'])
  ])
  return {branch,remote,changes:status?status.split(/\r?\n/).slice(0,100):[],
    commits:log?log.split(/\r?\n/).map(line=>{const [hash='',subject='',relativeTime='']=line.split('\t');return{hash,subject,relativeTime}}):[]}
}
export async function githubStatus():Promise<GithubStatus>{
  const gh=await exec('gh',['--version'],undefined,4000)
  if(gh.exitCode!==0)return{installed:false,connected:false,username:null,hint:'Instala GitHub CLI (gh): https://cli.github.com/'}
  const auth=await exec('gh',['api','user','--jq','.login'],undefined,8000)
  if(auth.exitCode!==0)return{installed:true,connected:false,username:null,hint:'Ejecuta gh auth login en PowerShell o la terminal y después gh auth setup-git'}
  return{installed:true,connected:true,username:auth.stdout.trim(),hint:'Sesión de GitHub CLI activa'}
}
export async function githubRepos():Promise<RemoteRepo[]>{
  const status=await githubStatus()
  if(!status.connected)throw new Error(status.hint)
  const json=await checked('gh',['repo','list','--limit','100','--json','nameWithOwner,description,isPrivate,url,updatedAt,isFork'],undefined,30000)
  const parsed:unknown=JSON.parse(json)
  if(!Array.isArray(parsed))throw new Error('Respuesta de GitHub inesperada')
  return parsed.map(item=>{
    const r=item as Record<string,unknown>
    return{nameWithOwner:String(r.nameWithOwner),description:typeof r.description==='string'?r.description:'',
      isPrivate:!!r.isPrivate,url:String(r.url),updatedAt:String(r.updatedAt),isFork:!!r.isFork}
  })
}
export async function detectTools():Promise<ToolInfo[]>{
  const items:[string,string,string[]][]=[['Git','git',['--version']],['GitHub CLI','gh',['--version']],
    ['Docker','docker',['--version']],['Node.js','node',['--version']],
    ['Python',process.platform==='win32'?'python':'python3',['--version']],['Java','java',['-version']],
    ['Maven','mvn',['--version']]]
  return Promise.all(items.map(async([name,exe,args])=>{
    const result=await exec(exe,args,undefined,4000)
    return{name,installed:result.exitCode===0,version:result.exitCode===0?
      (result.stdout||result.stderr).split(/\r?\n/).find(Boolean)?.slice(0,120)||'Detectado':'No encontrado en PATH'}
  }))
}
