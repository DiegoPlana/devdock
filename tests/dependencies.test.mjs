import test from 'node:test'
import assert from 'node:assert/strict'
import {definitions,installSpec,guideFor} from '../src/main/dependencies.ts'
test('solo admite paquetes autorizados',()=>{
  assert.deepEqual(definitions.filter(d=>d.recommended).map(d=>d.id),['git','gh'])
  assert.throws(()=>installSpec('powershell -Command evil','win32'))
  assert.throws(()=>installSpec('gh; rm -rf /','linux'))
})
test('instalación de GitHub CLI tiene argumentos fijos sin shell',()=>{
  const spec=installSpec('gh','win32')
  assert.equal(spec.executable,'winget')
  assert.ok(spec.args.includes('GitHub.cli'))
  assert.ok(!spec.args.includes('&&'))
})
test('instrucciones apt en Linux y Maven sin automatismo Windows',()=>{
  assert.equal(guideFor('git','linux'),'sudo apt-get install git')
  assert.throws(()=>installSpec('maven','win32'))
})
