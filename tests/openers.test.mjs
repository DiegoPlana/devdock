import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,writeFileSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {classifyProject,planOpen,assertEditorChoice} from '../src/main/openers.ts'

test('detecta proyectos por archivos reales',()=>{
  const root=mkdtempSync(join(tmpdir(),'devdock-open-'))
  try {
    writeFileSync(join(root,'package.json'),'{}')
    assert.equal(classifyProject(root),'web')
    rmSync(join(root,'package.json'))
    writeFileSync(join(root,'pom.xml'),'<project/>')
    assert.equal(classifyProject(root),'java')
    rmSync(join(root,'pom.xml'))
    writeFileSync(join(root,'gradle.properties'),'minecraft_version=1.21.8')
    assert.equal(classifyProject(root),'minecraft')
    rmSync(join(root,'gradle.properties'))
    writeFileSync(join(root,'requirements.txt'),'pytest')
    assert.equal(classifyProject(root),'python')
  } finally {rmSync(root,{recursive:true,force:true})}
})
test('solicita editor para proyectos sin elección y rechaza ejecutables inseguros',()=>{
  const root=mkdtempSync(join(tmpdir(),'devdock-open-'))
  try{
    const plan=planOpen(root,null)
    assert.equal(plan.kind,'general')
    assert.equal(plan.saved,null)
    assert.equal(assertEditorChoice('files'),'files')
    assert.throws(()=>assertEditorChoice('custom:../fake'))
    assert.throws(()=>assertEditorChoice('bad; rm -rf /'))
  }finally{rmSync(root,{recursive:true,force:true})}
})
