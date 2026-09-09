import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com'
const output = process.env.SCREENSHOT_DIR || path.resolve('artifacts/admin-chat-search-v589/browser')
fs.mkdirSync(output,{recursive:true})
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true})
let inspectionPage
try {
  const context=await browser.newContext({viewport:{width:1440,height:1000}})
  const ready=await context.request.get(base+'/api/health/ready')
  assert.equal(ready.headers()['x-lien-admin-chat-search'],'v589')
  const login=await context.request.post(base+'/api/auth/login',{headers:{Origin:base},form:{email:'demo.owner',password:'LienDemo2026!',next:'/admin/customers/messages/chat'}})
  assert.ok(login.ok(),'Demo login failed '+login.status())
  if(process.env.SMOKE_DEBUG) console.log(JSON.stringify({loginUrl:login.url(),cookies:(await context.cookies()).map(c=>({name:c.name,secure:c.secure,domain:c.domain}))}))
  const api=await context.request.get(base+'/api/admin/chat/inbox')
  assert.ok(api.ok(),'Search API failed '+api.status())
  const data=await api.json()
  assert.ok(data.total>0,'Demo conversations required')
  const page=await context.newPage()
  inspectionPage=page
  const settled=async()=>{
    await page.waitForLoadState('domcontentloaded')
    await page.waitForFunction(()=>document.documentElement.dataset.orimiaUiReady==='v516')
  }
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  if(process.env.SMOKE_DEBUG) page.on('response',r=>{if(r.url().includes('/api/admin/chat/inbox?'))console.log(r.status()+' '+r.url())})
  // Do not send, edit, or delete production messages during verification.
  await page.route('**/api/lien-chat**',route=>route.request().method()==='GET'?route.continue():route.abort())
  await page.goto(base+'/admin/customers/messages/chat',{waitUntil:'domcontentloaded'})
  await settled()
  await page.locator('[data-inbox-enhanced="true"]').waitFor({timeout:30000})
  await page.screenshot({path:path.join(output,'desktop-list.png'),fullPage:true})
  const staffSelect=page.locator('#inbox-staff')
  const staffKey=await staffSelect.locator('option').nth(1).getAttribute('value')
  await staffSelect.selectOption(staffKey)
  await page.waitForFunction(key=>new URLSearchParams(location.search).get('staff')===key,staffKey)
  await staffSelect.selectOption('')
  await page.waitForFunction(()=>!new URLSearchParams(location.search).has('staff'))
  if(data.total>25) {
    const first=await page.locator('[data-inbox-thread]').first().getAttribute('data-inbox-thread')
    await page.getByRole('link',{name:'次の25件',exact:true}).click()
    await page.waitForFunction(()=>new URLSearchParams(location.search).get('page')==='2')
    assert.notEqual(await page.locator('[data-inbox-thread]').first().getAttribute('data-inbox-thread'),first)
    await page.getByRole('link',{name:'前の25件',exact:true}).click()
    await page.waitForFunction(()=>!new URLSearchParams(location.search).has('page'))
    assert.equal(await page.locator('[data-inbox-thread]').first().getAttribute('data-inbox-thread'),first)
  }
  const thread=await page.locator('[data-inbox-thread]').first().getAttribute('data-inbox-thread')
  const selectedName=(await page.locator('.inbox-row-top strong').first().textContent()).trim()
  assert.ok(selectedName.length>0,'Selected conversation must have a name')
  await page.locator('[data-inbox-thread]').first().click()
  await settled()
  await page.locator('.inbox-conversation-heading').waitFor()
  await page.locator('[data-inbox-enhanced="true"]').waitFor()
  const composer=page.locator('.admin-chat-conversation textarea[name="body"]')
  await composer.fill('未送信の下書きテスト')
  const query=page.getByRole('searchbox',{name:'顧客名・電話番号'})
  await query.fill('該当しない顧客v589')
  await page.locator('.inbox-empty').waitFor()
  assert.equal(await composer.inputValue(),'未送信の下書きテスト')
  assert.ok(page.url().includes('threadId='+thread))
  await page.locator('[data-inbox-reset]').click()
  await page.locator('[data-inbox-thread]').first().waitFor()
  await query.fill(selectedName.replace(/[\s　]/g,''))
  await page.waitForFunction(()=>new URLSearchParams(location.search).has('q'))
  assert.ok(await page.locator('[data-inbox-thread]').count()>0)
  await page.screenshot({path:path.join(output,'desktop-search.png'),fullPage:true})
  await query.fill('不一致v589')
  await query.fill(selectedName)
  await page.waitForFunction(name=>new URLSearchParams(location.search).get('q')===name,selectedName)
  assert.equal(await composer.inputValue(),'未送信の下書きテスト')
  await page.locator('[data-inbox-clear]').click()
  await page.waitForFunction(()=>!new URLSearchParams(location.search).has('q'))
  await page.locator('.inbox-filters label').nth(1).click()
  await page.waitForFunction(()=>new URLSearchParams(location.search).get('unread')==='1')
  assert.ok(await page.locator('.inbox-row:not(.is-unread)').count()===0)
  await page.locator('.inbox-filters label').first().click()
  await page.waitForFunction(()=>!new URLSearchParams(location.search).has('unread'))
  // Error recovery and IME input must not submit or destroy the conversation.
  let fail=true
  await page.route('**/api/admin/chat/inbox?**',route=>fail?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'検索できませんでした。'})}):route.continue())
  await query.fill('再試行')
  await page.locator('.inbox-error').waitFor({state:'visible'})
  fail=false
  await query.fill(selectedName)
  await page.getByRole('button',{name:'再試行',exact:true}).click()
  await page.locator('.inbox-error').waitFor({state:'hidden'})
  await page.waitForFunction(name=>new URLSearchParams(location.search).get('q')===name,selectedName)
  await page.unroute('**/api/admin/chat/inbox?**')
  let calls=0
  const track=req=>{if(req.url().includes('/api/admin/chat/inbox?'))calls++}
  page.on('request',track)
  await query.dispatchEvent('compositionstart')
  await query.fill('石')
  await page.waitForTimeout(500)
  assert.equal(calls,0,'Search must wait for IME composition')
  await query.fill(selectedName)
  await query.dispatchEvent('compositionend')
  await page.waitForResponse(r=>r.url().includes('/api/admin/chat/inbox?'))
  page.off('request',track)
  await composer.fill('')
  for(const width of [1024,768,390,320]) {
    await page.setViewportSize({width,height:900})
    await page.waitForTimeout(250)
    const layout=await page.locator('.admin-chat-layout-v589').boundingBox()
    await page.screenshot({path:path.join(output,'layout-'+width+'.png'),fullPage:true})
    if(process.env.SMOKE_DEBUG) console.log(JSON.stringify({width,layout,ancestors:await page.locator('.admin-chat-layout-v589').evaluate(el=>{const rows=[];while(el){const r=el.getBoundingClientRect(),s=getComputedStyle(el);rows.push({tag:el.tagName,class:el.className,x:r.x,width:r.width,minWidth:s.minWidth,display:s.display});el=el.parentElement}return rows})}))
    assert.ok(layout.x>=0 && layout.x+layout.width<=width+1,'Layout overflow at '+width)
    if(width<1000) {
      assert.ok(await page.locator('.admin-chat-mobile-back').isVisible())
      if(process.env.SMOKE_DEBUG) console.log(JSON.stringify({beforeBack:page.url(),backHref:await page.locator('.admin-chat-mobile-back').getAttribute('href')}))
      await page.locator('.admin-chat-mobile-back').click()
      await settled()
      await query.waitFor({state:'visible'})
      await page.locator('[data-inbox-enhanced="true"]').waitFor()
      assert.equal(await query.inputValue(),selectedName)
      await page.screenshot({path:path.join(output,'list-'+width+'.png'),fullPage:true})
      await page.locator('[data-inbox-thread]').first().click()
      await settled()
      await page.locator('[data-inbox-enhanced="true"]').waitFor({state:'attached'})
      await page.locator('.inbox-conversation-heading').waitFor({state:'visible'})
      await composer.waitFor({state:'visible'})
    }
    await page.screenshot({path:path.join(output,'conversation-'+width+'.png'),fullPage:true})
  }
  // Enter through another admin page as well as a full document navigation.
  await page.setViewportSize({width:1440,height:1000})
  await page.goto(base+'/admin/customers',{waitUntil:'domcontentloaded'})
  await settled()
  assert.equal(await page.locator('[data-inbox-v589]').count(),0)
  const chatLink=page.locator('a[href="/admin/customers/messages/chat"]').first()
  if(await chatLink.count()) await chatLink.click()
  else await page.goto(base+'/admin/customers/messages/chat')
  await settled()
  await page.locator('[data-inbox-enhanced="true"]').waitFor({timeout:30000})
  assert.deepEqual(errors.filter(message=>!/^Minified React error #(418|423);/.test(message)),[],'Unexpected browser errors')
  console.log(JSON.stringify({release:'admin-chat-search-v589',total:data.total,desktop:true,mobile:true,search:true,unread:true,draftPreserved:true,errorRecovery:true,ime:true,routeLifecycle:true,existingHydrationWarnings:errors.length}))
} catch(error) {
  if(inspectionPage) {
    await inspectionPage.screenshot({path:path.join(output,'failure.png'),fullPage:true})
    console.log(JSON.stringify(await inspectionPage.evaluate(()=>({url:location.href,query:document.querySelector('#inbox-query')?.value,error:document.querySelector('.inbox-error')?.textContent,enhanced:document.querySelector('[data-inbox-v589]')?.dataset.inboxEnhanced}))))
  }
  throw error
} finally {await browser.close()}
