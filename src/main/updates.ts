import { app, dialog, shell } from 'electron'
import { createHash, randomUUID } from 'node:crypto'
import { execFile, spawn } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { promisify } from 'node:util'
import { findCommand } from './dependencies'

const run=promisify(execFile)
const REPO='DiegoPlana/devdock'
type Asset={name:string;digest?:string|null;size:number}
type Release={tag_name:string;html_url:string;assets:Asset[]}
export type UpdateInfo={current:string;latest:string|null;available:boolean;assetName:string|null;releaseUrl:string|null;message:string}
function compareVersions(a:string,b:string):number {
  const parts=(v:string)=>v.replace(/^v/,'').split('.').slice(0,3).map(x=>Number(x))
  const aa=parts(a),bb=parts(b)
  if(aa.length!==3||bb.length!==3||[...aa,...bb].some(n=>!Number.isInteger(n)||n<0))throw new Error('Versión de actualización incorrecta')
  for(let i=0;i<3;i++)if(aa[i]!==bb[i])return (aa[i] as number)>(bb[i] as number)?1:-1
  return 0
}
function platformAsset(r:Release):Asset|undefined {
  const ending=process.platform==='linux'?'-linux-x86_64.AppImage':process.platform==='win32'?'-win-x64.exe':null
  if(!ending)return undefined
  return r.assets.find(a=>a.name.includes('DEVD')&&a.name.endsWith(ending))
}
async function release():Promise<Release> {
  const gh=findCommand('gh')
  try{
    const {stdout}=await run(gh,['api','repos/'+REPO+'/releases/latest'],{timeout:18000,windowsHide:true,maxBuffer:2*1024*1024})
    const r=JSON.parse(stdout) as Release
    if(!/^v?\d+\.\d+\.\d+$/.test(r.tag_name)||!Array.isArray(r.assets))throw new Error('Los metadatos de la versión no son válidos')
    return r
  }catch(error){
    const e=error as Error&{stderr?:string}
    const info=e.stderr||e.message
    if(/404|Not Found/.test(info))throw new Error('Todavía no hay versiones publicadas en GitHub Releases.')
    throw new Error('No se pudo consultar GitHub. Comprueba GitHub CLI (gh auth status) y la conexión.')
  }
}
export async function checkUpdates():Promise<UpdateInfo> {
  const current=app.getVersion()
  const r=await release()
  const asset=platformAsset(r)
  const available=compareVersions(r.tag_name,current)>0
  return {current,latest:r.tag_name,available,assetName:asset?.name||null,releaseUrl:r.html_url||null,
    message:!available?'Ya tienes la última versión publicada.':!asset?'Hay una versión nueva, pero no hay un instalador para este sistema.':'Actualización disponible para descargar.'}
}
export async function installUpdate():Promise<{ok:boolean;message:string}> {
  const current=app.getVersion()
  if(!app.isPackaged)throw new Error('Las actualizaciones se instalan desde la aplicación empaquetada.')
  const r=await release()
  if(compareVersions(r.tag_name,current)<=0)throw new Error('No existe una versión más reciente.')
  const asset=platformAsset(r)
  if(!asset)throw new Error('Esta versión no dispone de instalador para tu sistema.')
  if(typeof asset.digest!=='string'||!/^sha256:[a-f0-9]{64}$/i.test(asset.digest))
    throw new Error('Falta el hash SHA-256 oficial del archivo de GitHub. No se instalará una descarga sin verificar.')
  const answer=await dialog.showMessageBox({type:'question',title:'Actualizar DEVDОCK',
    message:'¿Descargar e instalar '+r.tag_name+'?',detail:'Se descargará el archivo oficial de tu repositorio de GitHub, se verificará su hash y se conservarán los proyectos y ajustes. No se necesitan permisos sudo si la aplicación está en tu carpeta personal.',
    buttons:['Cancelar','Descargar e instalar'],defaultId:0,cancelId:0,noLink:true})
  if(answer.response!==1)return {ok:false,message:'Actualización cancelada.'}
  const dir=join(app.getPath('userData'),'updates',randomUUID())
  mkdirSync(dir,{recursive:true})
  const file=join(dir,basename(asset.name))
  await run(findCommand('gh'),['release','download',r.tag_name,'--repo',REPO,'--pattern',asset.name,'--dir',dir,'--clobber'],
    {timeout:5*60*1000,maxBuffer:128*1024,windowsHide:true})
  if(!existsSync(file))throw new Error('La descarga no se completó.')
  const actual=createHash('sha256').update(readFileSync(file)).digest('hex')
  if(actual.toLowerCase()!==asset.digest.slice(7).toLowerCase())throw new Error('La verificación SHA-256 ha fallado. No se instalará este archivo.')
  if(process.platform==='linux'){
    const target=process.env.APPIMAGE
    if(!target||!existsSync(target))throw new Error('Abre DEVDОCK desde su AppImage para poder actualizarla.')
    const script=join(dir,'apply-update.sh')
    const sh=`#!/bin/sh
set -eu
target="$1"
download="$2"
pid="$3"
count=0
while kill -0 "$pid" 2>/dev/null; do
  count=$((count+1))
  if [ "$count" -ge 45 ]; then exit 1; fi
  sleep 1
done
backup="$target.previous"
if [ -e "$backup" ]; then rm -f "$backup"; fi
mv "$target" "$backup"
if cp "$download" "$target" && chmod 755 "$target"; then
  nohup "$target" >/dev/null 2>&1 </dev/null &
else
  mv "$backup" "$target"
  exit 1
fi
`
    writeFileSync(script,sh,{mode:0o700})
    chmodSync(file,0o755)
    // Linux updater runs after the current AppImage exits; no elevated permissions.
    const child=spawn('/bin/sh',[script,target,file,String(process.pid)],{detached:true,stdio:'ignore'})
    child.unref()
    setImmediate(()=>app.quit())
    return {ok:true,message:'Actualización descargada y verificada. DEVDОCK se reiniciará.'}
  }
  if(process.platform==='win32'){
    const error=await shell.openPath(file)
    if(error)throw new Error('No se pudo abrir el instalador: '+error)
    return {ok:true,message:'Instalador verificado y abierto. Completa su asistente para actualizar.'}
  }
  return {ok:false,message:'Actualización no disponible para este sistema.'}
}
