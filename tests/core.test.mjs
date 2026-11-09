import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Store,parseArgs } from '../src/main/store.ts'
import { exec,builtins } from '../src/main/cli.ts'
test('parsea argumentos literales',()=>{assert.deepEqual(parseArgs('status --short "hola mundo"'),['status','--short','hola mundo']);assert.throws(()=>parseArgs('"incompleto'))})
test('SQLite: proyectos, biblioteca y comandos persisten',()=>{
  const dir=mkdtempSync(join(tmpdir(),'devdock-'));const projectDir=join(dir,'repo');mkdirSync(projectDir)
  let db
  try{
    db=new Store(join(dir,'local.sqlite'));const p=db.addProject(projectDir);assert.equal(db.addProject(projectDir).id,p.id)
    db.updateProject(p.id,{favorite:true});db.addCommand({name:'Status',executable:'git',args:'status --short',category:'Git'})
    db.saveResource({title:'Nota',kind:'note',category:'General',content:'Hola'})
    assert.equal(db.projects()[0].favorite,true);db.close()
    db=new Store(join(dir,'local.sqlite'));assert.equal(db.commands().length,1);assert.equal(db.resources().length,1)
    db.removeProject(p.id);assert.equal(db.projects().length,0);assert.ok(existsSync(projectDir))
  }finally{db?.close();rmSync(dir,{recursive:true,force:true})}
})
test('procesos sin shell',async()=>{const r=await exec(process.execPath,['--version']);assert.equal(r.exitCode,0);assert.match(r.stdout,/v\d+/);assert.ok(builtins.length>=3)})
