import { accessSync, constants, existsSync, statSync, readFileSync } from 'node:fs'
import { basename, delimiter, extname, isAbsolute, join } from 'node:path'
import { homedir } from 'node:os'
import { spawn } from 'node:child_process'
import { findCommand } from './dependencies.ts'

export type ProjectKind = 'minecraft'|'java'|'web'|'python'|'rust'|'general'
export type EditorOption = {id:string;name:string;installed:boolean}
export type OpenPlan = {kind:ProjectKind;label:string;suggested:string|null;saved:string|null;options:EditorOption[]}

const editors = [
  {id:'idea',name:'IntelliJ IDEA',commands:['idea','idea.sh']},
  {id:'webstorm',name:'WebStorm',commands:['webstorm','webstorm.sh']},
  {id:'pycharm',name:'PyCharm',commands:['pycharm','pycharm.sh']},
  {id:'code',name:'Visual Studio Code',commands:['code']},
  {id:'codium',name:'VSCodium',commands:['codium']},
  {id:'cursor',name:'Cursor',commands:['cursor']}
] as const

export function executablePath(command:string):string|null {
  const found=findCommand(command)
  const paths=isAbsolute(found)?[found]:[
    ...(process.env.PATH||'').split(delimiter).filter(Boolean).map(d=>join(d,found)),
    join(homedir(),'.local','bin',found),
    join(homedir(),'.local','share','JetBrains','Toolbox','scripts',found),
    '/snap/bin/'+found
  ]
  for(const candidate of paths) {
    try {
      if(existsSync(candidate)&&statSync(candidate).isFile()){
        if(process.platform!=='win32')accessSync(candidate,constants.X_OK)
        return candidate
      }
    }catch{/* continue */}
  }
  return null
}
export function classifyProject(root:string):ProjectKind {
  const has=(...files:string[])=>files.some(f=>existsSync(join(root,f)))
  if(has('src/main/resources/fabric.mod.json','src/main/resources/quilt.mod.json','src/main/resources/META-INF/mods.toml'))return 'minecraft'
  if(has('gradle.properties')){
    try{
      const content=readFileSync(join(root,'gradle.properties'),'utf8').slice(0,16000)
      if(/^(?:minecraft_version|fabric_version|yarn_mappings)\s*=/m.test(content))return 'minecraft'
    }catch{/* continue */}
  }
  if(has('pom.xml','build.gradle','build.gradle.kts','gradlew','settings.gradle','settings.gradle.kts'))return 'java'
  if(has('pyproject.toml','requirements.txt','Pipfile','setup.py'))return 'python'
  if(has('Cargo.toml'))return 'rust'
  if(has('package.json','vite.config.ts','vite.config.js','angular.json','index.html'))return 'web'
  return 'general'
}
const preferred:Record<ProjectKind,readonly string[]>={
  minecraft:['idea','code','codium'],
  java:['idea','code','codium'],
  web:['webstorm','code','codium','cursor','idea'],
  python:['pycharm','code','codium'],
  rust:['code','codium','idea'],
  general:['code','codium','cursor','idea','webstorm','pycharm']
}
const names:Record<ProjectKind,string>={minecraft:'Minecraft / Fabric',java:'Java / Maven / Gradle',web:'Web / JavaScript',python:'Python',rust:'Rust',general:'Proyecto general'}
export function editorExecutable(id:string):string|null {
  const editor=editors.find(e=>e.id===id)
  if(!editor)return null
  for(const cmd of editor.commands){const found=executablePath(cmd);if(found)return found}
  return null
}
export function planOpen(root:string,saved:string|null):OpenPlan {
  const kind=classifyProject(root)
  const options:EditorOption[]=[...editors].map(e=>({id:e.id,name:e.name,installed:!!editorExecutable(e.id)}))
  const recommended=preferred[kind].find(id=>options.some(e=>e.id===id&&e.installed))||null
  const availableSaved=saved==='files'||saved?.startsWith('custom:')||
    options.some(o=>o.id===saved&&o.installed)
  return {kind,label:names[kind],suggested:recommended,saved:availableSaved?(saved||null):null,options}
}
export function assertEditorChoice(choice:unknown):string {
  if(typeof choice!=='string'||choice.length>2048||choice.includes('\0'))throw new Error('Aplicación inválida')
  if(choice==='files')return choice
  if(editors.some(e=>e.id===choice)) {
    if(!editorExecutable(choice))throw new Error('El editor no está instalado o no se encuentra. Puedes seleccionar su ejecutable manualmente.')
    return choice
  }
  if(choice.startsWith('custom:')) {
    const path=choice.slice(7)
    if(!isAbsolute(path)||!executablePath(path))throw new Error('El ejecutable seleccionado no existe o no tiene permiso de ejecución')
    return choice
  }
  throw new Error('Aplicación no permitida')
}
export async function launchEditor(root:string,choice:string):Promise<void> {
  const value=assertEditorChoice(choice)
  if(value==='files')throw new Error('La apertura con el explorador debe realizarse desde Electron')
  const exe=value.startsWith('custom:')?value.slice(7):editorExecutable(value)!
  const args=process.platform==='darwin'&&extname(exe)==='.app'?['-a',exe,root]:[root]
  const executable=process.platform==='darwin'&&extname(exe)==='.app'?'open':exe
  await new Promise<void>((resolve,reject)=>{
    const child=spawn(executable,args,{detached:true,stdio:'ignore',windowsHide:true,shell:false})
    child.once('error',reject)
    child.once('spawn',()=>{child.unref();resolve()})
  })
}
export function displayEditor(choice:string):string {
  if(choice==='files')return 'Explorador de archivos'
  if(choice.startsWith('custom:'))return basename(choice.slice(7))
  return editors.find(e=>e.id===choice)?.name||'Aplicación'
}
