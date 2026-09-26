import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE||import.meta.url),{chromium}=require('playwright-core')
const base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3194',artifacts=path.resolve('artifacts/order-amendment-cutoff-v687')
fs.mkdirSync(artifacts,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'})
try{
 for(const width of [1360,390,320]){
  const salon=await browser.newContext({viewport:{width,height:900},extraHTTPHeaders:{'x-fixture-salon':'1'}}),dealer=await browser.newContext({viewport:{width,height:900}})
  const page=await salon.newPage(),sales=await dealer.newPage(),errors=[]
  for(const p of [page,sales]){p.setDefaultTimeout(12000);p.on('pageerror',e=>errors.push(e.message))}
  const response=await salon.request.post(base+'/api/admin/wholesale/orders',{headers:{Origin:base},data:{dealerId:'dealer-a',lines:[{dealerProductId:'product-a',quantity:2}]}})
  assert.equal(response.status(),201);const created=await response.json(),orderId=created.order?.id||created.id
  await page.goto(base+'/admin/products/orders?view=history');await page.locator('[data-order-edit-v687="'+orderId+'"]').click()
  const dialog=page.locator('.oa-dialog');await dialog.locator('.oa-line').waitFor()
  await dialog.getByLabel('希望納品日').fill('2026-12-20');await dialog.getByLabel('発注メモ（任意）').fill('ブラウザで編集 '+width)
  const quantity=dialog.locator('[data-row]').first();await quantity.evaluate(el=>window.oaQuantity=el);await quantity.fill('4')
  assert.equal(await quantity.evaluate(el=>el===window.oaQuantity&&document.activeElement===el),true,'quantity must not remount')
  await dialog.getByText('商品を追加',{exact:true}).click()
  const search=dialog.locator('.oa-search');await search.evaluate(el=>{window.oaSearch=el;el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}))})
  await search.fill('追加商品');await search.evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:el.value})))
  assert.equal(await search.evaluate(el=>el===window.oaSearch),true)
  await dialog.locator('[data-add="product-c"]').click();assert.equal(await dialog.locator('.oa-line').count(),2)
  assert.match(await dialog.locator('.oa-totals').innerText(),/3,190円/)
  assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'modal fits viewport')
  await page.screenshot({path:path.join(artifacts,'salon-edit-'+width+'.png'),fullPage:true})
  await page.route('**/api/admin/wholesale/erp/order-amend?*',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'テスト通信エラー'})}),{times:1})
  await dialog.getByRole('button',{name:'変更を保存'}).click();await dialog.getByText('テスト通信エラー',{exact:true}).waitFor()
  assert.equal(await dialog.getByLabel('発注メモ（任意）').inputValue(),'ブラウザで編集 '+width)
  await dialog.getByRole('button',{name:'変更を保存'}).click();await dialog.waitFor({state:'detached'})
  await page.locator('[data-order-edit-v687="'+orderId+'"]').click();await page.locator('.oa-dialog .oa-line').first().waitFor()
  assert.equal(await page.locator('.oa-dialog [data-row]').first().inputValue(),'4');await page.getByRole('button',{name:'閉じる',exact:true}).click()
  const login=await dealer.request.post(base+'/api/dealer/auth/login',{headers:{Origin:base},data:{loginId:'erp-owner-a',password:'FixtureOnly-v678!'},maxRedirects:0});assert.equal(login.status(),303)
  await sales.goto(base+'/dealer/orders');await sales.locator('.oa-settings').waitFor()
  await sales.locator('.oa-settings button[type=submit]').click();await sales.locator('[data-order-edit-v687="'+orderId+'"]').waitFor()
  await sales.locator('[data-order-edit-v687="'+orderId+'"]').click();await sales.locator('.oa-dialog .oa-line').first().waitFor()
  assert.equal(await sales.locator('.oa-dialog .oa-line').count(),2)
  await sales.locator('.oa-dialog [data-remove="1"]').click()
  assert.match(await sales.locator('.oa-totals').innerText(),/2,200円/)
  await sales.locator('.oa-dialog').getByRole('button',{name:'変更を保存'}).click();await sales.locator('.oa-dialog').waitFor({state:'detached'})
  await sales.screenshot({path:path.join(artifacts,'dealer-history-'+width+'.png'),fullPage:true})
  assert.ok(await sales.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'dealer history fits viewport')
  await sales.locator('[data-order-edit-v687="'+orderId+'"]').click();await sales.locator('.oa-dialog [data-cancel]').waitFor()
  sales.once('dialog',dialog=>dialog.accept());await sales.locator('.oa-dialog [data-cancel]').click();await sales.locator('.oa-dialog').waitFor({state:'detached'})
  await sales.locator('[data-order-edit-v687="waiting"]').click();await sales.locator('.oa-dialog .oa-lock').getByText('締切済み',{exact:false}).waitFor()
  assert.equal(await sales.locator('.oa-dialog button[type=submit],.oa-dialog [data-cancel]').count(),0)
  await sales.getByRole('button',{name:'閉じる',exact:true}).click()
  assert.deepEqual(errors,[]);await salon.close();await dealer.close()
 }
 const staff=await browser.newContext();await staff.request.post(base+'/api/dealer/auth/login',{headers:{Origin:base},data:{loginId:'erp-sales-a',password:'FixtureOnly-v678!'},maxRedirects:0})
 const staffPage=await staff.newPage();await staffPage.goto(base+'/dealer/orders');await staffPage.locator('.oa-settings').waitFor();assert.equal(await staffPage.locator('.oa-settings button[type=submit]').count(),0);await staff.close()
 console.log('v687 browser PASS: real APIs, both order histories, editing/add/remove/save/cancel, retry draft preservation, IME/input stability, readonly cutoff, admin/staff settings, desktop and 390/320px')
}finally{await browser.close()}
