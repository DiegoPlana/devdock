import { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import { existsSync, statSync } from 'node:fs'
import { basename, isAbsolute, resolve } from 'node:path'
import type { Project, Resource, Command } from '../shared/types'

type Row = Record<string, unknown>
const idPattern = /^[0-9a-f-]{36}$/i
export function validId(id: unknown): string {
  if (typeof id !== 'string' || !idPattern.test(id)) throw new Error('ID inválido')
  return id
}
function safeText(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new Error('Texto no válido')
  return value.trim()
}
function mapProject(row: Row): Project {
  return { id:String(row.id), name:String(row.name), rootPath:String(row.root_path), category:String(row.category),
    favorite:Boolean(row.favorite), createdAt:String(row.created_at),
    lastOpenedAt:row.last_opened_at ? String(row.last_opened_at):null,
    git:{isRepository:false,branch:null,modified:0,untracked:0} }
}
export class Store {
  private db: DatabaseSync
  constructor(file: string) {
    this.db = new DatabaseSync(file)
    this.db.exec("PRAGMA journal_mode=WAL")
    this.db.exec("CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY,name TEXT NOT NULL,root_path TEXT UNIQUE NOT NULL,category TEXT NOT NULL DEFAULT 'General',favorite INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,last_opened_at TEXT)")
    this.db.exec("CREATE TABLE IF NOT EXISTS preferences (key TEXT PRIMARY KEY,value TEXT NOT NULL)")
    this.db.exec("CREATE TABLE IF NOT EXISTS commands (id TEXT PRIMARY KEY,name TEXT NOT NULL,executable TEXT NOT NULL,args TEXT NOT NULL,category TEXT NOT NULL)")
    this.db.exec("CREATE TABLE IF NOT EXISTS library (id TEXT PRIMARY KEY,title TEXT NOT NULL,kind TEXT NOT NULL,category TEXT NOT NULL,content TEXT NOT NULL,created_at TEXT NOT NULL)")
  }
  projects(): Project[] {
    const rows=this.db.prepare('SELECT * FROM projects ORDER BY favorite DESC, COALESCE(last_opened_at,created_at) DESC').all() as Row[]
    return rows.map(mapProject)
  }
  project(id: unknown): Project {
    const row=this.db.prepare('SELECT * FROM projects WHERE id=?').get(validId(id)) as Row|undefined
    if(!row) throw new Error('Proyecto no encontrado')
    return mapProject(row)
  }
  addProject(path: string): Project {
    if(!isAbsolute(path)) throw new Error('Ruta inválida')
    const root=resolve(path)
    if(!existsSync(root)||!statSync(root).isDirectory()) throw new Error('La carpeta no existe')
    const existing=this.db.prepare('SELECT id FROM projects WHERE root_path=?').get(root) as Row|undefined
    if(existing) return this.project(existing.id)
    const id=randomUUID(), now=new Date().toISOString()
    this.db.prepare('INSERT INTO projects (id,name,root_path,category,favorite,created_at,updated_at) VALUES(?,?,?, ?,0,?,?)')
      .run(id,basename(root),root,'General',now,now)
    return this.project(id)
  }
  updateProject(id:unknown, changes:unknown): void {
    const old=this.project(id)
    if(typeof changes!=='object'||!changes||Array.isArray(changes)) throw new Error('Cambios inválidos')
    const input=changes as Record<string,unknown>
    if(Object.keys(input).some(key=>!['name','category','favorite'].includes(key))) throw new Error('Campo desconocido')
    const name='name' in input?safeText(input.name,80):old.name
    const category='category' in input?safeText(input.category,80):old.category
    const favorite='favorite' in input?input.favorite:old.favorite
    if(typeof favorite!=='boolean') throw new Error('Favorito inválido')
    this.db.prepare('UPDATE projects SET name=?,category=?,favorite=?,updated_at=? WHERE id=?')
      .run(name,category,Number(favorite),new Date().toISOString(),old.id)
  }
  markOpen(id:unknown): void { this.project(id);this.db.prepare('UPDATE projects SET last_opened_at=? WHERE id=?').run(new Date().toISOString(),validId(id)) }
  removeProject(id:unknown): void {this.project(id);this.db.prepare('DELETE FROM projects WHERE id=?').run(validId(id))}
  editor(): string {
    const row=this.db.prepare("SELECT value FROM preferences WHERE key='editor'").get() as Row|undefined
    return ['system','vscode','cursor'].includes(String(row?.value))?String(row?.value):'system'
  }
  setEditor(value:unknown): void {
    if(!['system','vscode','cursor'].includes(String(value))) throw new Error('Editor no permitido')
    this.db.prepare("INSERT INTO preferences(key,value) VALUES('editor',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(String(value))
  }
  commands(): Command[] {
    return (this.db.prepare('SELECT * FROM commands ORDER BY category,name').all() as Row[]).map(row=>({
      id:String(row.id),name:String(row.name),executable:String(row.executable),
      args:JSON.parse(String(row.args)) as string[],category:String(row.category),dangerous:true,builtin:false
    }))
  }
  addCommand(input:unknown): void {
    if(typeof input!=='object'||!input||Array.isArray(input)) throw new Error('Comando no válido')
    const c=input as Record<string,unknown>
    if(Object.keys(c).some(key=>!['name','executable','args','category'].includes(key))) throw new Error('Campo desconocido')
    const name=safeText(c.name,80),executable=safeText(c.executable,200),category=safeText(c.category,80)
    if(typeof c.args!=='string'||c.args.length>500) throw new Error('Argumentos no válidos')
    if(/[\r\n\x00]/.test(executable)) throw new Error('Ejecutable no válido')
    const args=parseArgs(c.args)
    this.db.prepare('INSERT INTO commands(id,name,executable,args,category) VALUES(?,?,?,?,?)')
      .run(randomUUID(),name,executable,JSON.stringify(args),category)
  }
  deleteCommand(id:unknown): void {this.db.prepare('DELETE FROM commands WHERE id=?').run(validId(id))}
  resources(): Resource[] {
    return (this.db.prepare('SELECT * FROM library ORDER BY created_at DESC').all() as Row[]).map(row=>({
      id:String(row.id),title:String(row.title),kind:row.kind as Resource['kind'],category:String(row.category),content:String(row.content)
    }))
  }
  saveResource(input:unknown):void {
    if(typeof input!=='object'||!input||Array.isArray(input)) throw new Error('Recurso no válido')
    const r=input as Record<string,unknown>
    if(Object.keys(r).some(k=>!['id','title','kind','category','content'].includes(k))) throw new Error('Campo desconocido')
    const id=r.id===undefined?randomUUID():validId(r.id)
    const title=safeText(r.title,100),category=safeText(r.category,80),content=safeText(r.content,50000)
    if(!['note','link','snippet'].includes(String(r.kind))) throw new Error('Tipo de recurso no permitido')
    if(r.kind==='link'){let parsed:URL;try{parsed=new URL(content)}catch{throw new Error('URL incorrecta')}if(!['http:','https:'].includes(parsed.protocol))throw new Error('URL no permitida')}
    this.db.prepare('INSERT INTO library(id,title,kind,category,content,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,kind=excluded.kind,category=excluded.category,content=excluded.content')
      .run(id,title,String(r.kind),category,content,new Date().toISOString())
  }
  deleteResource(id:unknown):void {this.db.prepare('DELETE FROM library WHERE id=?').run(validId(id))}
  close():void{this.db.close()}
}
export function parseArgs(text:string):string[] {
  const parts:string[]=[];let cur='',quote:string|null=null,started=false
  for(const ch of text){if(ch==='"'||ch==="'"){if(!quote){quote=ch;started=true;continue}if(quote===ch){quote=null;continue}}
    if(/\s/.test(ch)&&!quote){if(started){parts.push(cur);cur='';started=false}}else{cur+=ch;started=true}}
  if(quote)throw new Error('Comillas sin cerrar')
  if(started)parts.push(cur)
  if(parts.length>50)throw new Error('Demasiados argumentos')
  return parts
}
