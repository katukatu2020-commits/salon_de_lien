import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import {createRequire} from 'node:module'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const require=createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE||import.meta.url),{chromium}=require('playwright-core')
const dir=path.dirname(fileURLToPath(import.meta.url)),artifacts=path.resolve('artifacts/appointment-datetime-v684')
fs.mkdirSync(artifacts,{recursive:true})
const source=fs.readFileSync(path.join(dir,'appointment-datetime.js'),'utf8'),css=fs.readFileSync(path.join(dir,'appointment-datetime.css'),'utf8')
const old=fs.readFileSync(path.join(dir,'../appointment-datetime-editor-v663/appointment-datetime-editor-v663.js'),'utf8')
const card=`<section id="metric"><div><div><p>予約日時</p><div><span class="tabular-nums">2026年9月1日(火) 10:00</span></div></div></div><p data-status>予約確定</p></section>`
const html=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;padding:20px;background:#fcfaf9;color:#352e2b}#metric{max-width:360px;padding:22px;border:1px solid #eaded9;background:#fff;border-radius:8px}.tabular-nums{font-size:22px;font-weight:700}main{min-height:1100px}a{display:block;margin-top:30px}${css}</style><script src="/_next/static/chunks/main-app-fixture.js"></script></head><body><main>${card}<p>キャンセル</p><dl><dt>予約日時</dt><dd>2026年9月1日(火) 10:00</dd></dl><input id="checkout-draft" value="12000"><a href="/admin/appointments?month=2026-09">カレンダーへ戻る</a></main><img src="/hanging-image" width="1" height="1"><script>
window.AppointmentDatetimeIconsV684={CalendarClock:'',X:'X',Check:''};window.requests=[];window.mode='ok';window.snapshot={id:'fixture',scheduledAt:'2026-09-01T01:00:00.000Z',durationMinutes:75,staffName:'テスト担当',menu:'カット＋カラー',status:'予約確定',updatedAt:'2026-09-27T00:00:00.000Z'};
window.fetch=async(url,options)=>{window.requests.push({method:options.method,body:options.body?JSON.parse(options.body):null});await new Promise(r=>setTimeout(r,80));if(window.mode==='get-fail'&&options.method==='GET')return {ok:false,status:500,json:async()=>({error:'取得に失敗しました。'})};if(window.mode==='conflict'&&options.method==='PATCH')return {ok:false,status:409,json:async()=>({error:'別の端末で予約が更新されました。画面を再読み込みしてください。'})};if(options.method==='PATCH'){window.snapshot={...window.snapshot,scheduledAt:'2026-10-03T04:30:00.000Z',updatedAt:'2026-09-27T00:01:00.000Z'}}return{ok:true,status:200,json:async()=>({appointment:window.snapshot,editable:window.mode!=='locked'})}};
</script><script src="/editor.js" defer></script></body></html>`
const server=http.createServer((req,res)=>{
  if(req.url==='/hanging-image')return
  if(req.url?.includes('main-app-fixture')){res.setHeader('Content-Type','application/javascript');return res.end('')}
  if(req.url==='/editor.js'||req.url==='/old.js'){res.setHeader('Content-Type','application/javascript');return res.end(req.url==='/old.js'?old:source)}
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end(req.url?.includes('old=1')?html.replace('/editor.js','/old.js'):html)
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const base='http://127.0.0.1:'+server.address().port
let browser
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'})
  const page=await browser.newPage({viewport:{width:1360,height:900}}),errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  page.setDefaultTimeout(5000)
  await page.goto(base+'/admin/appointments/fixture?old=1',{waitUntil:'domcontentloaded'})
  await page.waitForTimeout(1200)
  assert.equal(await page.evaluate(()=>document.readyState),'interactive')
  assert.equal(await page.locator('[data-orimia-appointment-datetime-trigger-v663]').count(),0,'old editor cannot start while an image is pending')
  await page.goto(base+'/admin/appointments/fixture',{waitUntil:'domcontentloaded'})
  assert.equal(await page.locator('[data-appointment-datetime-v684]').count(),0,'do not mutate React before hydration')
  await page.evaluate(()=>{window.__orimiaHydratedV680=true;dispatchEvent(new Event('orimia:hydrated-v680'))})
  const trigger=page.locator('[data-appointment-datetime-v684]'),dialog=page.locator('.ad684-dialog')
  await trigger.waitFor({state:'visible'})
  assert.equal(await page.evaluate(()=>document.readyState),'interactive','new editor works without window.load')
  await page.locator('[data-appointment-datetime-value-v684]').press('Enter')
  await page.waitForFunction(()=>!document.querySelector('.ad684-save').disabled)
  assert.equal(await dialog.locator('[name=date]').inputValue(),'2026-09-01')
  assert.equal(await dialog.locator('[name=time]').inputValue(),'10:00')
  assert.match(await dialog.locator('.ad684-summary').textContent(),/75分/)
  await dialog.locator('[name=date]').fill('2026-10-03')
  await dialog.locator('[name=time]').fill('13:30')
  await page.evaluate(()=>{const form=document.querySelector('.ad684-dialog form');form.requestSubmit();form.requestSubmit()})
  await dialog.waitFor({state:'hidden'})
  const requests=await page.evaluate(()=>window.requests.filter(r=>r.method==='PATCH'))
  assert.equal(requests.length,1)
  assert.deepEqual(requests[0].body,{date:'2026-10-03',startMinutes:810,dateTimeOnly:true,updatedAt:'2026-09-27T00:00:00.000Z'})
  assert.match(await page.locator('.tabular-nums').textContent(),/2026年10月3日\(土\) 13:30/)
  assert.match(await page.locator('dd').textContent(),/2026年10月3日/)
  assert.equal(await page.locator('#checkout-draft').inputValue(),'12000')
  assert.match(await page.locator('a').getAttribute('href'),/month=2026-10&view=calendar&scheduleUpdated=/)
  await page.evaluate(()=>window.mode='conflict')
  await trigger.click();await page.waitForFunction(()=>!document.querySelector('.ad684-save').disabled)
  await dialog.locator('[name=date]').fill('2026-10-04');await dialog.locator('.ad684-save').click()
  await dialog.getByRole('alert').waitFor({state:'visible'})
  assert.equal(await dialog.locator('[name=date]').inputValue(),'2026-10-04')
  assert.match(await dialog.getByRole('alert').innerText(),/別の端末/)
  for(const width of [1360,390,320]){
    await page.setViewportSize({width,height:844})
    const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=845)
    assert.ok(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1))
    await page.screenshot({path:path.join(artifacts,'editor-'+width+'.png')})
  }
  await dialog.locator('.ad684-cancel').click()
  await page.evaluate(()=>window.mode='get-fail');await trigger.click()
  await dialog.locator('.ad684-retry').waitFor({state:'visible'});assert.equal(await dialog.locator('.ad684-save').isDisabled(),true)
  await page.evaluate(()=>window.mode='ok');await dialog.locator('.ad684-retry').click()
  await page.waitForFunction(()=>!document.querySelector('.ad684-save').disabled)
  await dialog.locator('.ad684-close').click()
  // Frequent DOM mutations and a card replacement must not starve enhancement.
  await page.evaluate(card=>{window.noise=setInterval(()=>{const e=document.createElement('i');document.body.append(e);e.remove()},10);document.querySelector('#metric').outerHTML=card},card)
  await trigger.waitFor({state:'visible'});assert.equal(await trigger.count(),1)
  await page.evaluate(()=>clearInterval(window.noise));await trigger.click()
  await page.waitForFunction(()=>!document.querySelector('.ad684-save').disabled)
  await dialog.locator('.ad684-close').click()
  await page.evaluate(()=>window.mode='locked');await trigger.click();await dialog.getByRole('alert').waitFor({state:'visible'})
  assert.equal(await dialog.locator('.ad684-save').isDisabled(),true);await dialog.locator('.ad684-close').click()
  await page.evaluate(()=>document.querySelector('[data-status]').textContent='会計完了')
  await trigger.waitFor({state:'detached'})
  await page.evaluate(()=>document.querySelector('a').addEventListener('click',event=>{event.preventDefault();location.href='/admin/appointments?month=2026-09'}))
  await page.locator('a').click({noWaitAfter:true})
  await page.waitForURL(url=>url.pathname==='/admin/appointments'&&url.searchParams.get('month')==='2026-10'&&url.searchParams.get('view')==='calendar',{waitUntil:'domcontentloaded'})
  assert.deepEqual(errors,[])
  console.log('v684 browser PASS: pending image reproduction, hydration, keyboard, save, duplicate submit, conflict, retry, locked status, rerender, mobile')
}finally{
  await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r))
}
