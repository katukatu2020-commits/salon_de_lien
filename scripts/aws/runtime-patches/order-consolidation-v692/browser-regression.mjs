import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {createRequire} from 'node:module'
const require=createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE||path.resolve('../node_modules/playwright-core/package.json'))
const {chromium}=require('playwright-core'),base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3197'
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname),'Isolated fixture only')
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const out='artifacts/order-consolidation-v692';fs.mkdirSync(out,{recursive:true})
try{
 const dealer=await browser.newContext({locale:'ja-JP'}),page=await dealer.newPage()
 await page.goto(base+'/dealer/login');await page.locator('[name=loginId]').fill('erp-owner-a');await page.locator('[name=password]').fill('FixtureOnly-v678!')
 await page.locator('button[type=submit]').click();await page.waitForURL('**/dealer/orders')
 for(const width of [1440,1024,390,320]){
  await page.setViewportSize({width,height:900});await page.reload()
  await page.locator('.dw-cutoff summary').click()
  await page.locator('[data-shipping-v692] [name=freeThresholdYen]').fill('2400');await page.locator('[data-shipping-v692] [name=feeYen]').fill('500')
  await page.getByRole('button',{name:'送料を保存',exact:true}).click()
  await page.locator('[data-shipping-v692] [role=status]').filter({hasText:'保存しました'}).waitFor()
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  assert.ok((await page.locator('[data-shipping-v692] input').evaluateAll(es=>es.map(e=>e.clientWidth))).every(w=>w>=120),'Shipping values must remain legible')
  await page.screenshot({path:out+'/settings-'+width+'.png'})
  const salon=await browser.newContext({viewport:{width,height:900},locale:'ja-JP',extraHTTPHeaders:{'x-fixture-salon':'1'}}),p=await salon.newPage(),errors=[]
  p.on('pageerror',e=>errors.push(e.message))
  await p.goto(base+'/admin/products/orders')
  await p.locator('[data-action=quantity-input]').first().fill('1')
  await p.locator('[data-action=confirm-order]').first().click()
  await p.locator('[data-action=submit-order]').waitFor()
  assert.match(await p.locator('#wo-dialog').innerText(),/500円/)
  const response=p.waitForResponse(r=>r.url().endsWith('/api/admin/wholesale/orders')&&r.request().method()==='POST')
  await p.locator('[data-action=submit-order]').click();const first=await(await response).json();assert.ok(first.ok)
  await p.locator('[data-action=salon-tab][data-view=order]').click()
  await p.locator('[data-action=quantity-input]').first().fill('2')
  await p.locator('[data-action=confirm-order]').first().click();await p.locator('[data-action=submit-order]').waitFor()
  const confirmation=await p.locator('#wo-dialog').innerText()
  assert.match(confirmation,/受付済みの商品/);assert.match(confirmation,/2,640円/);assert.match(confirmation,/送料（税抜・注文ごと）\n0円/)
  const size=await p.locator('#wo-dialog').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth}));assert.ok(size.scroll<=size.width+1)
  await p.screenshot({path:out+'/merged-confirmation-'+width+'.png'})
  if(width===320){
   const extra=await salon.request.post(base+'/api/admin/wholesale/orders',{headers:{Origin:base},data:{dealerId:'dealer-a',lines:[{dealerProductId:'product-a',quantity:1}],key:crypto.randomUUID()}})
   assert.ok(extra.ok());await p.locator('[data-action=submit-order]').click();await p.locator('.oc-error').filter({hasText:'もう一度発注内容を確認'}).waitFor()
   await p.getByRole('button',{name:'最新の内容を確認',exact:true}).click();await p.locator('[data-action=submit-order]').waitFor()
   assert.match(await p.locator('#wo-dialog').innerText(),/3,520円/)
  }
  if(width===1024){
   await p.route('**/api/admin/wholesale/orders',async route=>{await route.fetch();await route.abort('failed')},{times:1})
   await p.locator('[data-action=submit-order]').click();await p.locator('.oc-error').filter({hasText:/.+/}).waitFor()
  }
  const response2=p.waitForResponse(r=>r.url().endsWith('/api/admin/wholesale/orders')&&r.request().method()==='POST')
  await p.locator('[data-action=submit-order]').click();const merged=await(await response2).json()
  assert.ok(merged.ok);assert.equal(merged.order.id,first.order.id);assert.equal(merged.order.shippingFeeYen,0)
  const detail=await dealer.request.get(base+'/api/dealer/erp/order-amendment?id='+first.order.id).then(r=>r.json())
  assert.equal(detail.lines.filter(l=>l.editableQuantity>0)[0].editableQuantity,width===320?4:3)
  await p.locator('[data-order-edit-v687="'+first.order.id+'"]').click()
  await p.locator('.oa-totals').waitFor();assert.match(await p.locator('.oa-totals').innerText(),/送料（税抜） 0円/)
  await p.screenshot({path:out+'/history-detail-'+width+'.png'})
  const cancelled=await dealer.request.post(base+'/api/dealer/erp/order-cancel',{headers:{Origin:base},data:{key:crypto.randomUUID(),orderId:first.order.id,version:detail.version}})
  assert.ok(cancelled.ok());assert.deepEqual(errors,[]);await salon.close()
 }
 await dealer.close()
}finally{await browser.close()}
console.log('v692 browser PASS: settings, 1440/1024/390/320, quote, merge/free freight, stale reconfirmation, lost-response idempotency, history totals')
