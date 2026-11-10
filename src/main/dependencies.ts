import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { delimiter, isAbsolute, join } from 'node:path'
import { homedir } from 'node:os'
import { promisify } from 'node:util'
import type { DependencyInfo, DependencyInstallResult } from '../shared/types'

const run = promisify(execFile)

export type DependencyId = 'git'|'gh'|'docker'|'node'|'python'|'java'|'maven'
type Definition = {id:DependencyId;name:string;purpose:string;cmd:string;args:string[];winId:string|null;apt:string|null;recommended:boolean}
export const definitions:readonly Definition[] = [
 {id:'git',name:'Git',purpose:'Versiones, ramas y repositorios locales',cmd:'git',args:['--version'],winId:'Git.Git',apt:'git',recommended:true},
 {id:'gh',name:'GitHub CLI',purpose:'Conexión con tu cuenta y clonación en GitHub',cmd:'gh',args:['--version'],winId:'GitHub.cli',apt:'gh',recommended:true},
 {id:'docker',name:'Docker Desktop',purpose:'Contenedores y Docker Compose (opcional)',cmd:'docker',args:['--version'],winId:'Docker.DockerDesktop',apt:null,recommended:false},
 {id:'node',name:'Node.js',purpose:'Proyectos JavaScript y npm (no es necesario para abrir DEVDОCK)',cmd:'node',args:['--version'],winId:'OpenJS.NodeJS.LTS',apt:null,recommended:false},
 {id:'python',name:'Python',purpose:'Scripts y desarrollo Python (opcional)',cmd:process.platform==='win32'?'python':'python3',args:['--version'],winId:'Python.Python.3.13',apt:'python3',recommended:false},
 {id:'java',name:'Java JDK 21',purpose:'Proyectos Java y Minecraft (opcional)',cmd:'java',args:['-version'],winId:'EclipseAdoptium.Temurin.21.JDK',apt:'default-jdk',recommended:false},
 {id:'maven',name:'Maven',purpose:'Compilación de proyectos Java (opcional)',cmd:'mvn',args:['--version'],winId:null,apt:'maven',recommended:false}
]
export function findCommand(cmd:string):string {
  if(process.platform!=='win32'){
    if(isAbsolute(cmd))return cmd
    const home=homedir()
    const local=join(home,'.local','bin',cmd)
    const toolbox=join(home,'.local','share','JetBrains','Toolbox','scripts',cmd)
    if(existsSync(local))return local
    if(existsSync(toolbox))return toolbox
    // The AppImage may have been launched from the graphical menu with a minimal PATH.
    const segments=(process.env.PATH||'').split(delimiter)
    for(const base of segments){
      if(base&&existsSync(join(base,cmd)))return join(base,cmd)
    }
    return cmd
  }
  const programFiles=process.env.ProgramFiles||'C:\\Program Files'
  const local=process.env.LOCALAPPDATA||''
  const candidates:Record<string,string[]>={
    gh:[join(programFiles,'GitHub CLI','gh.exe'),join(local,'Programs','GitHub CLI','gh.exe')],
    git:[join(programFiles,'Git','cmd','git.exe'),join(programFiles,'Git','bin','git.exe')],
    docker:[join(programFiles,'Docker','Docker','resources','bin','docker.exe')],
    node:[join(programFiles,'nodejs','node.exe')],
    java:process.env.JAVA_HOME?[join(process.env.JAVA_HOME,'bin','java.exe')]:[]
  }
  return (candidates[cmd]||[]).find(existsSync)||cmd
}
async function probe(exe:string,args:string[],timeout=6000):Promise<{installed:boolean;version:string}>{
  try {
    const result=await run(findCommand(exe),args,{windowsHide:true,timeout,maxBuffer:128*1024})
    return {installed:true,version:(result.stdout||result.stderr||'Disponible').split(/\r?\n/).find(Boolean)?.slice(0,120)||'Disponible'}
  }catch{return{installed:false,version:'No detectado'}}
}
export function guideFor(id:DependencyId,platform:string):string{
  const entry=definitions.find(x=>x.id===id)!
  if(platform==='win32'){
    return entry.winId?('winget install --exact --id '+entry.winId+' --source winget'):'Instala Maven desde https://maven.apache.org/install.html'
  }
  if(platform==='linux'&&entry.apt)return 'sudo apt-get install '+entry.apt
  const urls:Record<DependencyId,string>={git:'https://git-scm.com/downloads',gh:'https://cli.github.com/',docker:'https://docs.docker.com/get-docker/',node:'https://nodejs.org/',python:'https://www.python.org/downloads/',java:'https://adoptium.net/',maven:'https://maven.apache.org/'}
  return urls[id]
}
export async function listDependencies():Promise<DependencyInfo[]>{
  const platform=process.platform
  const winget=platform==='win32'?(await probe('winget',['--version'],8000)).installed:false
  const linuxApt=platform==='linux'&&existsSync('/usr/bin/apt-get')&&(await probe('pkexec',['--version'])).installed
  return Promise.all(definitions.map(async d=>{
    const found=await probe(d.cmd,d.args)
    return {...d, installed:found.installed,version:found.version,
      installable:(!found.installed)&&((platform==='win32'&&winget&&!!d.winId)||(platform==='linux'&&linuxApt&&!!d.apt)),
      instructions:guideFor(d.id,platform)}
  }))
}
export function installSpec(id:unknown,platform:string):{executable:string;args:string[];label:string}{
  const entry=definitions.find(d=>d.id===id)
  if(!entry)throw new Error('Dependencia no permitida')
  if(platform==='win32'&&entry.winId)return {executable:'winget',args:['install','--exact','--id',entry.winId,'--source','winget','--accept-source-agreements','--accept-package-agreements'],label:entry.name}
  if(platform==='linux'&&entry.apt&&existsSync('/usr/bin/apt-get'))return {executable:'pkexec',args:['apt-get','install','-y',entry.apt],label:entry.name}
  throw new Error('Instalación automática no disponible en este sistema. Consulta las instrucciones de DEVDОCK.')
}
export async function installDependency(id:unknown):Promise<DependencyInstallResult>{
  const spec=installSpec(id,process.platform)
  const detected=definitions.find(d=>d.id===id)!
  if((await probe(detected.cmd,detected.args)).installed)return {ok:true,details:spec.label+' ya está instalado.'}
  try{
    const r=await run(spec.executable,spec.args,{windowsHide:true,timeout:10*60*1000,maxBuffer:1024*1024})
    return {ok:true,details:(r.stdout+'\n'+r.stderr).trim().slice(-2800)||'Instalación finalizada. Puede que debas reiniciar la aplicación.'}
  }catch(error){
    const e=error as Error &{stdout?:string;stderr?:string}
    return {ok:false,details:(e.stderr||e.stdout||e.message).slice(-2800)}
  }
}
