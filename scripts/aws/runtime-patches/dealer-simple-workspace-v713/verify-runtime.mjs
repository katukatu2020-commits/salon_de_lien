import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import {createRequire} from 'node:module'
const root=process.env.LIEN_RUNTIME_ROOT||'/app',require=createRequire(root+'/package.json')
const read=f=>fs.readFileSync(root+'/'+f,'utf8')
const {navigation}=require(root+'/dealer-navigation-v713.cjs')
const {dealerWorkspacePage:page}=require(root+'/wholesale-ordering-v543.js')
const admin={name:'<unsafe>',role:'ADMIN'},staff={name:'Staff',role:'STAFF'}
const menu=navigation(admin),keys=menu.flatMap(g=>g.pages.map(([key])=>key))
assert.equal(menu.length,6)
assert.equal(keys.length,19)
assert.equal(new Set(keys).size,19)
assert(!navigation(staff).flatMap(g=>g.pages).some(([key])=>['team','procurement'].includes(key)))
assert(navigation({...staff,canProcure:true}).flatMap(g=>g.pages).some(([key])=>key==='procurement'))
for(const key of keys){
  const html=page(admin,key)
  assert(html.includes('dw-simple'),key)
  assert.equal((html.match(/<h1>/g)||[]).length,1,key)
  assert(!html.includes('class="dw-tabs"'),key)
  assert(!html.includes('class="dw-shortcuts"'),key)
  assert(!html.includes('/dealer-order-flow-v698/addon.js'),key)
  assert(html.includes('/dealer-simple-v713.css'),key)
  assert(!html.includes('<unsafe>'))
  assert(html.includes('aria-current="page"')||key==='operations')
}
for(const [key,group] of [['procurement','orders'],['manufacturer-report','sales'],['period-sales','sales']]){
  assert(page(admin,key).includes('data-workspace-group="'+group+'"'))
}
for(const file of ['dealer-workspace-v713.js','dealer-navigation-v713.cjs','public/dealer-orders-v713.js','public/dealer-catalog-v713.js','public/dealer-calendar-v713.js','public/dealer-erp-v713-client.js','public/dealer-readonly-v713.js','dealer-order-flow-v698/portal.cjs'])new vm.Script(read(file),{filename:file})
const orders=read('public/dealer-orders-v713.js'),catalog=read('public/dealer-catalog-v713.js')
assert(orders.includes('dw-filter-count'))
assert(orders.includes('aria-pressed'))
assert(!orders.includes('注文明細の更新、納品書・請求書の印刷、注文単位のCSV出力を行えます。'))
assert(orders.includes('mountSettings(root)'))
assert(orders.includes('data-order-edit-v687'))
assert(catalog.includes('root.innerHTML = dealerCompany()'))
assert(!catalog.includes('root.innerHTML = dealerCodePanel() + dealerCompany()'))
assert(catalog.includes('dw-salon-link'))
assert(catalog.includes('id="dealer-pricing-salon"'))
assert(catalog.includes('renderDealerProductResults'))
assert(read('public/dealer-calendar-v713.js').includes('data-calendar-date'))
assert(read('public/dealer-erp-v713-client.js').includes('売上内訳・目標の詳細'))
assert(read('server.js').includes("'X-Lien-Dealer-Simple', 'v713'"))
console.log('v713 PASS: 19 routes, one navigation, role-aware entries, existing forms, compact counts, company profile')
