import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE||path.resolve('../node_modules/playwright-core/package.json'))
const {chromium}=require('playwright-core'),base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3200'
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname),'Isolated fixture only')
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const out='artifacts/dealer-cascading-filters-v695';fs.mkdirSync(out,{recursive:true})
const errors=[]
try{
 const context=await browser.newContext({locale:'ja-JP'}),p=await context.newPage()
 p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message))
 await p.goto(base+'/dealer/login');await p.locator('[name=loginId]').fill('erp-owner-a');await p.locator('[name=password]').fill('FixtureOnly-v678!')
 await p.locator('button[type=submit]').click();await p.waitForURL('**/dealer/orders')
 for(const width of [1440,390,320])for(const [view,prefix] of [['products','product'],['pricing','pricing']]){
  await p.setViewportSize({width,height:900})
  await p.goto(base+'/dealer/'+view)
  const maker=p.locator('#dealer-'+prefix+'-manufacturer-filter'),category=p.locator('#dealer-'+prefix+'-category-filter'),search=p.locator('#dealer-'+prefix+'-search')
  const section=p.locator(view==='products'?'.wo-product-management':'.wo-pricing-management')
  await maker.waitFor()
  const options=()=>category.locator('option').evaluateAll(es=>es.map(e=>e.value))
  const settle=()=>p.waitForFunction(sel=>!document.querySelector(sel)?.hasAttribute('aria-busy'),view==='products'?'.wo-product-management':'.wo-pricing-management')
  async function select(field,value){
   const response=p.waitForResponse(r=>r.url().includes('/api/dealer/bootstrap?'))
   await field.selectOption(value);assert.equal((await response).status(),200);await settle()
  }
  assert.ok((await options()).includes('GM(ﾂｰﾙ)'))
  assert.ok(!(await options()).includes('非公開種別'))
  await select(category,'GM(ﾂｰﾙ)')
  if(view==='pricing'){
   await p.locator('[data-product-id="milbon-tool"] [data-pricing-selected]').check()
   await p.locator('[data-product-id="milbon-tool"] [data-pricing-enabled]').check()
   await p.locator('[data-product-id="milbon-tool"] [data-pricing-rate]').fill('25')
  }
  const searchNode=await search.elementHandle(),categoryNode=await category.elementHandle()
  if(view==='products'){await p.locator('.dw-product-create summary').click();await p.locator('#dealer-product-form [name=name]').fill('入力途中の商品')}
  await select(maker,'中野製薬')
  assert.deepEqual(await options(),['','スタイリング','ヘアケア'])
  assert.equal(await category.inputValue(),'')
  assert.equal(new URL(p.url()).searchParams.has(prefix+'Category'),false)
  assert.equal(await searchNode.evaluate(e=>e===document.querySelector('#'+e.id)),true,'Search remains mounted')
  assert.equal(await categoryNode.evaluate(e=>e===document.querySelector('#'+e.id)),true,'Select remains mounted')
  if(view==='products')assert.equal(await p.locator('#dealer-product-form [name=name]').inputValue(),'入力途中の商品')
  await category.scrollIntoViewIfNeeded()
  await category.evaluate(e=>window.scrollTo(0,Math.max(0,e.getBoundingClientRect().top+scrollY-180)))
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)
  await p.screenshot({path:out+'/'+view+'-'+width+'.png'})
  await select(category,'ヘアケア');await select(maker,'ミルボン')
  assert.equal(await category.inputValue(),'ヘアケア','Shared category is retained')
  assert.ok((await options()).includes('GM(ﾂｰﾙ)'));assert.ok(!(await options()).includes('スタイリング'))
  await select(maker,'');assert.equal(await category.inputValue(),'ヘアケア')
  await select(category,'')
  if(view==='pricing'){
   assert.equal(await p.locator('[data-product-id="milbon-tool"] [data-pricing-selected]').isChecked(),true)
   assert.equal(await p.locator('[data-product-id="milbon-tool"] [data-pricing-rate]').inputValue(),'25','Unsaved price draft survives manufacturer changes')
  }
  await select(maker,'中野製薬')
  const next=p.locator('[data-action="dealer-'+prefix+'-page"][data-page="2"]')
  const paged=p.waitForResponse(r=>r.url().includes('/api/dealer/bootstrap?'));await next.click();await paged
  await p.waitForFunction(key=>new URL(location.href).searchParams.get(key)==='2',prefix+'Page')
  assert.deepEqual(await options(),['','スタイリング','ヘアケア'])
  await select(maker,'ミルボン');assert.equal(new URL(p.url()).searchParams.has(prefix+'Page'),false)
  await select(maker,'種別なしメーカー');assert.deepEqual(await options(),[''])
  const reset=p.locator('[data-action="reset-'+prefix+'-filters"]')
  assert.equal(await reset.isEnabled(),true)
  const resetResponse=p.waitForResponse(r=>r.url().includes('/api/dealer/bootstrap?'));await reset.click();await resetResponse
  await p.waitForFunction(id=>document.getElementById(id)?.value==='', 'dealer-'+prefix+'-manufacturer-filter')
  assert.ok((await options()).includes('GM(ﾂｰﾙ)'))
  await select(maker,'中野製薬')
  await p.route('**/api/dealer/bootstrap?*',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'通信を再試行してください'})}),{times:1})
  const failed=p.waitForResponse(r=>r.status()===503&&r.url().includes('/api/dealer/bootstrap?'))
  await maker.selectOption('ミルボン');await failed;await settle()
  assert.equal(await maker.inputValue(),'中野製薬','Failed filter restores the displayed result scope')
  assert.deepEqual(await options(),['','スタイリング','ヘアケア'])
  if(width===1440){
   await select(maker,'ミルボン')
   let release,requested;const pending=new Promise(r=>release=r),seen=new Promise(r=>requested=r)
   const oldResponse=p.waitForResponse(r=>new URL(r.url()).searchParams.get(prefix+'Manufacturer')==='中野製薬'&&r.url().includes('/api/dealer/bootstrap?'))
   await p.route('**/api/dealer/bootstrap?*',async route=>{requested();await pending;await route.continue()},{times:1})
   await maker.selectOption('中野製薬');await seen
   await select(maker,'ミルボン');release();await oldResponse;await settle()
   assert.equal(await maker.inputValue(),'ミルボン');assert.ok(!(await options()).includes('スタイリング'))
   const handle=await search.elementHandle()
   await search.dispatchEvent('compositionstart')
   await search.fill('オルディーブ')
   const searched=p.waitForResponse(r=>new URL(r.url()).searchParams.get(prefix+'Search')==='オルディーブ')
   await search.dispatchEvent('compositionend');await searched;await settle()
   assert.equal(await handle.evaluate(e=>e===document.querySelector('#'+e.id)),true)
   assert.match(await section.innerText(),/ｵﾙﾃﾞｨｰﾌﾞ/)
  }
  const stale=new URL(base+'/dealer/'+view);stale.searchParams.set(prefix+'Manufacturer','中野製薬');stale.searchParams.set(prefix+'Category','GM(ﾂｰﾙ)')
  await p.goto(stale.href);await maker.waitFor();assert.equal(await category.inputValue(),'');assert.deepEqual(await options(),['','スタイリング','ヘアケア'])
 }
 assert.deepEqual(errors,[])
 console.log('v695 browser PASS: both pages at 1440/390/320, dependent categories, valid/invalid selections, reset/pagination/URL, no field remount, draft retention, network rollback, stale-response race, IME search')
}finally{await browser.close()}
