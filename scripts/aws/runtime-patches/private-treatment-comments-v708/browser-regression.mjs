import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {execFileSync} from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const require=createRequire(import.meta.url),{chromium}=require('playwright-core')
const base='http://127.0.0.1:3188',container='orimia-qa-v680-app',dir=path.dirname(fileURLToPath(import.meta.url))
const artifact=path.resolve('artifacts/private-treatment-comments-v708')
await fs.mkdir(artifact,{recursive:true})
execFileSync('docker',['cp',path.join(dir,'qa-fixture.cjs'),container+':/tmp/qa-v708.cjs'])
const fixture=action=>execFileSync('docker',['exec',container,'node','/tmp/qa-v708.cjs',action],{encoding:'utf8'})
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true})
const secret='PRIVATE_V708_非公開の薬剤記録\n次回へ申し送り <script>window.privateLeak=1</script>'
try{
  const data=JSON.parse(fixture('seed')),id=data.customerId,api='/api/admin/customers/'+id+'/visit-history'
  const salon=await browser.newContext({baseURL:base,viewport:{width:1440,height:1050},serviceWorkers:'block'})
  assert.equal((await salon.request.post('/api/auth/login',{form:{email:'demo.owner',password:'QaLocalOnly-v680!',next:'/admin/customers'},maxRedirects:0})).status(),303)
  const page=await salon.newPage(),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message))
  async function open(){await page.goto(base+'/admin/customers/'+id+'?tab=history',{waitUntil:'domcontentloaded',timeout:45000});await page.locator('[data-history-record-id="visit-qa-v708-comment-a"] [data-treatment-memo-input]').waitFor()}
  const card=()=>page.locator('[data-history-record-id="visit-qa-v708-comment-a"]')
  const editor=()=>card().locator('[data-treatment-memo-input]')
  async function save(value){await editor().fill(value);await card().getByRole('button',{name:'保存',exact:true}).click();await card().locator('[data-treatment-memo-status]').filter({hasText:value?'保存しました':'削除しました'}).waitFor()}
  await open()
  assert.equal(await card().locator('[data-treatment-memo-v565]').count(),1)
  await save(secret)
  assert.equal(await page.evaluate(()=>window.privateLeak),undefined)
  await open();assert.equal(await editor().inputValue(),secret)
  assert.equal(await page.locator('[data-history-record-id="visit-qa-v708-comment-b"] [data-treatment-memo-input]').inputValue(),'')
  await save(secret+'\n修正済み');await open();assert.match(await editor().inputValue(),/修正済み/)
  assert.equal(await card().getByRole('button',{name:'写真を追加'}).count(),1)
  await card().scrollIntoViewIfNeeded();await card().screenshot({path:path.join(artifact,'desktop.png')})
  await page.setViewportSize({width:390,height:844});await card().scrollIntoViewIfNeeded()
  assert.ok(await card().getByText('顧客非公開',{exact:true}).isVisible())
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
  await card().screenshot({path:path.join(artifact,'mobile.png')})
  const count=await page.locator('[data-treatment-memo-v565]').count()
  await page.evaluate(()=>new Promise(r=>setTimeout(r,1000)))
  assert.equal(await page.locator('[data-treatment-memo-v565]').count(),count)
  const history=await salon.request.get(api);assert.equal(history.status(),200);assert.match(history.headers()['cache-control'],/private.*no-store/)
  const historyData=await history.json()
  const sale=historyData.completed.find(x=>x.subjectKey==='SALE:qa-v708-comment-sale');assert.ok(sale)
  assert.equal((await salon.request.put(api+'/memo',{headers:{Origin:base},data:{subjectKey:sale.subjectKey,body:'PRIVATE_V708_会計履歴'}})).status(),200)
  const customer=await browser.newContext({baseURL:base})
  assert.equal((await customer.request.post('/api/customer-auth/login',{form:{loginId:'demo.hana',password:'QaLocalOnly-v680!',next:'/u/history'},maxRedirects:0})).status(),303)
  const anon=await browser.newContext({baseURL:base})
  for(const context of [customer,anon]){
    assert.equal((await context.request.get(api)).status(),401)
    assert.equal((await context.request.put(api+'/memo',{headers:{Origin:base},data:{subjectKey:'VISIT:qa-v708-comment-a',body:'unauthorized'}})).status(),401)
  }
  assert.equal((await salon.request.get('/api/admin/customers/'+data.foreignCustomerId+'/visit-history')).status(),404)
  assert.equal((await salon.request.put(api+'/memo',{headers:{Origin:base},data:{subjectKey:'VISIT:'+data.otherVisitId,body:'wrong customer'}})).status(),404)
  assert.equal((await salon.request.put(api+'/memo',{headers:{Origin:'https://evil.example'},data:{subjectKey:'VISIT:qa-v708-comment-a',body:'cross origin'}})).status(),403)
  for(const route of ['/u/history','/u/home','/u/appointments','/u/community']){
    const response=await customer.request.get(route)
    const body=await response.text();assert.ok(response.status()<400,route+' '+response.status())
    assert.ok(!body.includes('PRIVATE_V708_'),route+' leaks a private comment')
    if(route==='/u/history')assert.ok(body.includes('QA708 履歴'), 'customer history includes the visit but not the private comment')
  }
  const rsc=await customer.request.get('/u/history?_rsc=v708',{headers:{RSC:'1'}})
  assert.equal(rsc.status(),200);assert.ok(!(await rsc.text()).includes('PRIVATE_V708_'))
  await save('');await open();assert.equal(await editor().inputValue(),'')
  assert.deepEqual(errors,[])
  console.log('v708 browser PASS: save/edit/reload/clear, same-day record isolation, sale-only history, photo control, desktop/mobile, customer HTML/RSC/API privacy and cross-tenant/origin rejection')
}finally{console.log(fixture('restore'));await browser.close()}
