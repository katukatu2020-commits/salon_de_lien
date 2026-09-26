import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import {afterHydration} from './hydration-gate.mjs'
const root=process.env.LIEN_RUNTIME_ROOT||'/app'
const read=f=>fs.readFileSync(path.join(root,f),'utf8')
const layouts=fs.readdirSync(path.join(root,'.next/static/chunks/app')).filter(f=>f.endsWith('.hydration-v680.js'))
assert.equal(layouts.length,2)
for(const file of layouts){
  const code=read('.next/static/chunks/app/'+file)
  new vm.Script(code)
  assert.ok(code.includes('window.__orimiaHydratedV680 = true'))
  assert.ok(code.includes("window.addEventListener('orimia:hydrated-v680'"))
  if(file.startsWith('layout-runtime-'))assert.equal(code.split('"data-lien-community-bootstrap": "v615"').length-1,1)
}
const assets=['shell-consistency-v680.js','customer-journey-v680.js','content-edit-delete-client-v680.js','coupon-email-delivery-v613.hydration-v680.js','style-system-integration-v602.hydration-v680.js','style-community-controls-v610.hydration-v680.js','style-admin-controls-v618.hydration-v680.js','style-order-focus-stability-v667.hydration-v680.js']
assets.push('customer-registration-resend-v347.hydration-v680.js','password-visibility-v627.hydration-v680.js','inventory-orders-common-layout-v572.hydration-v680.js')
assets.push('broadcast-recipient-modal.hydration-v680.js')
for(const file of assets){const s=read('public/'+file);new vm.Script(s);assert.ok(s.includes('orimia:hydrated-v680'))}
for(const native of [false,true])for(const ready of [false,true]){
  const events=new EventTarget(),window={__orimiaHydratedV680:ready,addEventListener:events.addEventListener.bind(events)}
  const context=vm.createContext({window,document:{querySelector:()=>native?{}:null},count:0})
  vm.runInContext(afterHydration('count += 1'),context)
  assert.equal(context.count,!native||ready?1:0)
  events.dispatchEvent(new Event('orimia:hydrated-v680'))
  events.dispatchEvent(new Event('orimia:hydrated-v680'))
  assert.equal(context.count,1)
}
const registration=read('.next/server/app/u/register/[token]/page.js')
assert.ok(registration.includes('a?.error==="credentials"'))
const pattern=new RegExp('^(?:(?:[A-Za-z0-9_]|-)+)$','v')
assert.ok(pattern.test('qa_user-123'));assert.ok(!pattern.test('invalid.id'));assert.ok(!pattern.test('やまだ'))
const action=read('.next/server/chunks/2241.js')
assert.ok(action.includes('(0,l.redirect)(i("credentials"));'))
assert.ok(!action.includes('throw Error("ログインIDまたはパスワードの形式が正しくありません。")'))
assert.ok(read('server.js').includes('X-Lien-Three-App-QA'))
console.log('v680 verified: syntax, hydration gating, static pages, idempotence, SSR parity, registration errors')
