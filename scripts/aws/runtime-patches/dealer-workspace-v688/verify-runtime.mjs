import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import {createRequire} from 'node:module'
const root=process.env.LIEN_RUNTIME_ROOT||'/app', require=createRequire(root+'/package.json')
const workspace=require(root+'/dealer-workspace-v688.js'), wholesale=require(root+'/wholesale-ordering-v543.js')
const read=file=>fs.readFileSync(root+'/'+file,'utf8')
const nav=workspace.navigation('ADMIN')
assert.equal(nav.length,6)
assert.equal(nav.flatMap(g=>g.pages).length,16)
assert.equal(new Set(nav.flatMap(g=>g.pages.map(([id])=>id))).size,16)
assert(!workspace.navigation('STAFF').flatMap(g=>g.pages).some(([id])=>id==='team'))
for(const view of nav.flatMap(g=>g.pages.map(([id])=>id==='password-change'?'password':id))){
  const html=wholesale.dealerWorkspacePage({name:'<script>unsafe</script>',role:'ADMIN'},view)
  assert(html.includes('dw-body'));assert(html.includes('dw-bottom'));assert(html.includes('dw-menu'))
  assert(!html.includes('<script>unsafe</script>'));assert(!html.includes('wo-dealer-mobile-nav'))
  assert(!html.includes('dealer-erp-v678-nav.partner-chat-v682.js'))
  assert(html.includes('aria-current="page"')||view==='operations')
  if(['operations','sales','team','messages'].includes(view))assert(html.includes('/wholesale-ordering-client-v543.js?v=678-erp1'))
}
for(const file of ['dealer-workspace-v688.js','public/dealer-workspace-v688.js','public/dealer-catalog-v688.js','public/dealer-orders-v688.js','business-account-approvals-v643.js','wholesale-ordering-v543.js'])new vm.Script(read(file),{filename:file})
const approval=read('business-account-approvals-v643.js')
const start=approval.indexOf('function dealerPasswordPortalPageV653('),end=approval.indexOf('\nfunction passwordPage(',start)
const page=vm.runInNewContext(approval.slice(start,end)+'\ndealerPasswordPortalPageV653',{require,escapeHtml:v=>String(v??''),dealerPasswordIconV653:()=>'<svg></svg>'})
for(const error of ['','current','mismatch']){
  const html=page({accountName:'fixture',loginId:'fixture',mustChangePassword:true},{error})
  assert(html.includes('dw-body'));assert(html.includes('/api/dealer/managed-password-change'))
  assert.equal((html.match(/data-password-toggle-v653 aria-label/g)||[]).length,3)
  assert(html.includes('現在のパスワード'));assert(html.includes('初回パスワード変更'))
}
assert(read('public/dealer-orders-v688.js').includes('mountSettings(root)'))
assert(read('public/dealer-orders-v688.js').includes('data-order-edit-v687'))
assert(read('public/dealer-catalog-v688.js').includes('renderDealerProductResults'))
assert(read('server.js').includes("X-Lien-Dealer-Workspace','v688"))
console.log('v688 runtime PASS: all 16 routes, roles, managed password, legacy client swaps, existing business forms preserved')
