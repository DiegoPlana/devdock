import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { existsSync, mkdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { Store, validId } from './store'
import { snapshot, checked, exec, gitDetails, githubStatus, githubRepos, detectTools, builtins } from './cli'
import type { Command } from '../shared/types'

const __dirname=dirname(fileURLToPath(import.meta.url))
let win:BrowserWindow|null=null
let store:Store
function authorized(event:IpcMainInvokeEvent):void{
  if(!win||event.sender!==win.webContents)throw new Error('Ventana no autorizada')
}
function pathFor(id:unknown):string{
  const path=store.project(id).rootPath
  if(!existsSync(path)||!statSync(path).isDirectory())throw new Error('La carpeta ya no existe')
  return path
}
async function openEditor(path:string):Promise<void>{
  const editor=store.editor()
  if(editor==='system'){const error=await shell.openPath(path);if(error)throw new Error(error);return}
  let executable=editor==='vscode'?'code':'cursor'
  let args=[path]
  if(process.platform==='win32'){
    const local=process.env.LOCALAPPDATA||''
    const pf=process.env.ProgramFiles||''
    const choices=editor==='vscode'
      ?[join(local,'Programs','Microsoft VS Code','Code.exe'),join(pf,'Microsoft VS Code','Code.exe')]
      :[join(local,'Programs','cursor','Cursor.exe'),join(local,'Programs','Cursor','Cursor.exe')]
    const match=choices.find(existsSync)
    if(!match)throw new Error('Editor no encontrado. Selecciona Explorador en Ajustes o instala el editor.')
    executable=match
  }else if(process.platform==='darwin'){
    executable='open';args=['-a',editor==='vscode'?'Visual Studio Code':'Cursor',path]
  }
  await new Promise<void>((resolve,reject)=>{
    const child=spawn(executable,args,{detached:true,stdio:'ignore',windowsHide:true})
    child.once('error',reject)
    child.once('spawn',()=>{child.unref();resolve()})
  })
}
function handlers():void{
  ipcMain.handle('projects:list',async event=>{
    authorized(event)
    return Promise.all(store.projects().map(snapshot))
  })
  ipcMain.handle('projects:add',async event=>{
    authorized(event);if(!win)return null
    const res=await dialog.showOpenDialog(win,{title:'Seleccionar carpeta del proyecto',properties:['openDirectory']})
    return res.canceled||!res.filePaths[0]?null:store.addProject(res.filePaths[0])
  })
  ipcMain.handle('projects:update',(event,id:unknown,changes:unknown)=>{authorized(event);store.updateProject(id,changes)})
  ipcMain.handle('projects:remove',(event,id:unknown)=>{authorized(event);store.removeProject(id)})
  ipcMain.handle('projects:open',async(event,id:unknown,inEditor:unknown)=>{
    authorized(event);if(typeof inEditor!=='boolean')throw new Error('Opción no válida')
    const path=pathFor(id)
    if(inEditor)await openEditor(path)
    else{const error=await shell.openPath(path);if(error)throw new Error(error)}
    store.markOpen(id)
  })
  ipcMain.handle('settings:editor',event=>{authorized(event);return store.editor()})
  ipcMain.handle('settings:set-editor',(event,value:unknown)=>{authorized(event);store.setEditor(value)})
  ipcMain.handle('git:details',(event,id:unknown)=>{authorized(event);return gitDetails(pathFor(id))})
  ipcMain.handle('git:action',async(event,id:unknown,action:unknown,message:unknown)=>{
    authorized(event)
    if(typeof action!=='string'||!['fetch','pull','push','stage','commit'].includes(action))throw new Error('Acción no permitida')
    const cwd=pathFor(id)
    const args:Record<string,string[]>={fetch:['fetch','--prune'],pull:['pull','--ff-only'],push:['push'],stage:['add','-A']}
    if(action==='commit'){
      if(typeof message!=='string'||!message.trim()||message.trim().length>200)throw new Error('Introduce un mensaje de commit válido')
      return exec('git',['-C',cwd,'commit','-m',message.trim()],undefined,90000)
    }
    return exec('git',['-C',cwd,...args[action]!],undefined,90000)
  })
  ipcMain.handle('github:status',event=>{authorized(event);return githubStatus()})
  ipcMain.handle('github:repos',event=>{authorized(event);return githubRepos()})
  ipcMain.handle('github:clone',async(event,name:unknown)=>{
    authorized(event)
    if(typeof name!=='string'||!/^[-A-Za-z0-9_.]+\/[-A-Za-z0-9_.]+$/.test(name))throw new Error('Nombre de repositorio inválido')
    const remoteRepos=await githubRepos()
    if(!remoteRepos.some(r=>r.nameWithOwner.toLowerCase()===name.toLowerCase()))throw new Error('Repositorio no disponible en tu lista')
    if(!win)return null
    const selected=await dialog.showOpenDialog(win,{title:'Seleccionar ubicación para clonar',properties:['openDirectory']})
    if(selected.canceled||!selected.filePaths[0])return null
    const destination=join(selected.filePaths[0],name.split('/')[1]!)
    if(existsSync(destination))throw new Error('La carpeta destino ya existe. Selecciona otra ubicación.')
    await checked('gh',['repo','clone',name,destination],undefined,120000)
    return store.addProject(destination)
  })
  ipcMain.handle('commands:list',event=>{authorized(event);return[...builtins,...store.commands()]})
  ipcMain.handle('commands:add',(event,input:unknown)=>{authorized(event);store.addCommand(input)})
  ipcMain.handle('commands:delete',(event,id:unknown)=>{authorized(event);store.deleteCommand(validId(id))})
  ipcMain.handle('commands:run',(event,projectId:unknown,commandId:unknown)=>{
    authorized(event);const cwd=pathFor(projectId)
    if(typeof commandId!=='string')throw new Error('Comando inválido')
    const command:Command|undefined=[...builtins,...store.commands()].find(c=>c.id===commandId)
    if(!command)throw new Error('Comando no encontrado')
    return exec(command.executable,command.args,cwd,90000)
  })
  ipcMain.handle('resources:list',event=>{authorized(event);return store.resources()})
  ipcMain.handle('resources:save',(event,input:unknown)=>{authorized(event);store.saveResource(input)})
  ipcMain.handle('resources:delete',(event,id:unknown)=>{authorized(event);store.deleteResource(id)})
  ipcMain.handle('tools:list',event=>{authorized(event);return detectTools()})
}
function windowCreate():void{
  win=new BrowserWindow({
    title:'DEVDОCK',width:1420,height:850,minWidth:970,minHeight:640,
    backgroundColor:'#0b1420',autoHideMenuBar:true,
    webPreferences:{
      preload:join(__dirname,'../preload/index.cjs'),
      contextIsolation:true,nodeIntegration:false,sandbox:true
    }
  })
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}))
  win.webContents.on('will-navigate',e=>e.preventDefault())
  if(process.env.ELECTRON_RENDERER_URL)void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void win.loadFile(join(__dirname,'../renderer/index.html'))
}
app.whenReady().then(()=>{
  app.setName('DEVDОCK')
  const folder=app.getPath('userData');mkdirSync(folder,{recursive:true})
  store=new Store(join(folder,'devdock.sqlite'))
  handlers();windowCreate()
  app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)windowCreate()})
}).catch(error=>{dialog.showErrorBox('DEVDОCK',String(error));app.quit()})
app.on('before-quit',()=>{store?.close()})
app.on('window-all-closed',()=>app.quit())
