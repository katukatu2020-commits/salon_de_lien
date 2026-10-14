import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
import {execFileSync} from 'node:child_process'
const require=createRequire(import.meta.url),{chromium}=require('playwright-core')
const base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3188'
if(!/^http:\/\/127\.0\.0\.1:/.test(base))throw Error('Use isolated local QA only')
const artifacts=path.resolve('artifacts/dealer-salon-picker-v714')
fs.mkdirSync(artifacts,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const report=[],errors=[]
const fixtures='scripts/aws/runtime-patches/dealer-simple-workspace-v713/qa-fixture.cjs'
execFileSync('docker',['cp',fixtures,'orimia-qa-v680-app:/tmp/qa714-staff.cjs'])
const fixture=mode=>execFileSync('docker',['exec','orimia-qa-v680-app','node','/tmp/qa714-staff.cjs',mode],{encoding:'utf8'})
async function login(ctx,id='dealer.browser.v584.mtsptddu'){
  const r=await ctx.request.post(base+'/api/dealer/auth/login',{headers:{Origin:base},form:{loginId:id,password:'QaLocalOnly-v680!'},maxRedirects:0})
  assert.equal(r.status(),303);assert(!r.headers().location.includes('/login'))
}
async function popup(page,trigger=page.locator('.dsp-trigger').first()){
  await trigger.click()
  const dialog=page.locator('.dsp-dialog[open]')
  await dialog.waitFor()
  assert(await dialog.locator('input').evaluate(e=>e===document.activeElement))
  assert(await dialog.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}),'dialog fits viewport')
  return dialog
}
try{
  const ctx=await browser.newContext(),page=await ctx.newPage()
  page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message))
  await login(ctx)
  for(const width of [1440,1024,390,320]){
    await page.setViewportSize({width,height:850})
    for(const route of ['operations','fulfillment','receivables','sales','targets','pricing']){
      await page.goto(base+'/dealer/'+route,{waitUntil:'networkidle'})
      const select=page.locator('select[data-dealer-salon-picker]')
      await page.locator('.dsp-trigger').waitFor()
      assert.equal(await select.count(),1)
      assert.equal(await select.getAttribute('aria-hidden'),'true')
      const options=await select.locator('option').evaluateAll(es=>es.map(o=>({value:o.value,name:o.dataset.salonName||o.text,code:o.dataset.salonCode})))
      const target=options.find(o=>o.code==='LIEN-YOHAKU')
      assert(target,'salon code available on '+route)
      const before=await select.inputValue()
      let dialog=await popup(page)
      await dialog.locator('input').fill('存在しない店舗QA714')
      assert.equal(await dialog.locator('.dsp-results button').count(),0)
      await page.keyboard.press('Escape')
      await page.locator('.dsp-dialog').waitFor({state:'detached'})
      assert.equal(await select.inputValue(),before,'cancel does not change selection')
      assert(await page.locator('.dsp-trigger').evaluate(e=>e===document.activeElement))
      dialog=await popup(page)
      await dialog.locator('input').fill('ｌｉｅｎ－ｙｏｈａｋｕ')
      assert.equal(await dialog.locator('.dsp-results button').count(),1,'full-width code search')
      await page.screenshot({path:path.join(artifacts,route+'-'+width+'.png')})
      await dialog.locator('.dsp-results button').click()
      await page.waitForLoadState('networkidle')
      assert.equal(await select.inputValue(),target.value,'native selection '+route)
      if(route==='pricing'){
        await page.waitForFunction(()=>!document.querySelector('#dealer-pricing-salon')?.disabled)
        assert.equal(new URL(page.url()).searchParams.get('contractId'),target.value)
      }else{
        const filtered=page.waitForResponse(r=>r.url().includes('/api/dealer/')&&new URL(r.url()).searchParams.get('salon')===target.value)
        await page.locator('#erp-filter,#dst-filters').getByRole('button',{name:'絞り込む',exact:true}).click()
        assert.equal((await filtered).status(),200,'filtered request')
        await page.waitForLoadState('networkidle')
        assert.equal(await select.inputValue(),target.value,'filter stays selected')
        await page.locator('[data-reset]').click()
        await page.waitForLoadState('networkidle')
        await page.waitForFunction(()=>document.querySelector('select[data-dealer-salon-picker]')?.value==='')
        assert.equal(await select.inputValue(),'')
      }
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page fits '+route)
      report.push({route,width,result:'PASS'})
    }
    for(const kind of ['invoice','payment','activity']){
      await page.goto(base+'/dealer/'+(kind==='activity'?'activities':'receivables'),{waitUntil:'networkidle'})
      await page.locator('[data-create="'+kind+'"]').click()
      const editor=page.locator('.erp-dialog'),original=editor.locator('select[name=organizationId]')
      const retained=kind==='activity'?'title':kind==='payment'?'reference':'closingDate'
      const value=kind==='invoice'?'2026-10-15':'QA714 入力を保持'
      await editor.locator('[name='+retained+']').fill(value)
      if(kind==='invoice')await editor.locator('[name=dueDate]').fill('2000-01-01')
      const dialog=await popup(page,editor.locator('.dsp-trigger'))
      await dialog.locator('input').fill('へあさろん')
      assert.equal(await dialog.locator('.dsp-results button').count(),1,'katakana/hiragana name search')
      await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter')
      await page.locator('.dsp-dialog').waitFor({state:'detached'})
      assert.equal(await original.inputValue(),'org_showcase_yohaku')
      assert.equal(await editor.locator('[name='+retained+']').inputValue(),value)
      assert.equal(await page.locator('dialog[open]').count(),1,'parent editor stays open')
      assert.equal(await editor.locator('form').evaluate(e=>new FormData(e).get('organizationId')),'org_showcase_yohaku')
      if(kind==='invoice')assert.notEqual(await editor.locator('[name=dueDate]').inputValue(),'2000-01-01','dependent due-date handler fired')
      await popup(page,editor.locator('.dsp-trigger'))
      await page.keyboard.press('Escape')
      assert.equal(await page.locator('dialog[open]').count(),1)
      await page.keyboard.press('Escape')
      assert.equal(await page.locator('dialog[open]').count(),0)
      report.push({form:kind,width,result:'PASS'})
    }
    console.log('v714: filters and nested forms '+width+'px PASS')
  }
  // Browser-only fixture covers large accounts without adding any business records.
  await page.goto(base+'/dealer/orders',{waitUntil:'networkidle'})
  await page.evaluate(()=>{
    const form=document.createElement('form');form.id='qa714-form'
    const label=document.createElement('label');label.textContent='検証用美容室'
    const select=document.createElement('select');select.name='qaSalon';select.required=true;select.dataset.dealerSalonPicker='検証用美容室'
    select.append(new Option('選択してください',''))
    for(let i=1;i<=151;i++){
      const option=new Option(i===150?'テスト美容室 とても長い店舗名'.repeat(4):'テスト美容室 '+i,'salon-'+i)
      option.dataset.salonCode='CODE-'+String(i).padStart(3,'0');select.append(option)
    }
    const unsafe=new Option('<img src=x onerror=alert(1)>','unsafe');select.append(unsafe)
    select.options[2].disabled=true
    label.append(select);form.append(label);document.querySelector('main').append(form)
    window.qa714Events={input:0,change:0,submit:0}
    select.addEventListener('input',()=>window.qa714Events.input++)
    select.addEventListener('change',()=>window.qa714Events.change++)
    form.addEventListener('submit',e=>{e.preventDefault();window.qa714Events.submit++})
  })
  const trigger=page.locator('#qa714-form .dsp-trigger'),native=page.locator('#qa714-form select')
  let dialog=await popup(page,trigger)
  assert.equal(await dialog.locator('.dsp-results button').count(),50)
  assert.equal(await dialog.locator('.dsp-count').innerText(),'152件')
  assert(await dialog.locator('.dsp-results button').nth(1).isDisabled())
  await dialog.locator('input').evaluate(e=>{
    e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}))
    e.value='テスト CODE-150'
    e.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}))
  })
  assert.equal(await dialog.locator('.dsp-results button').count(),50,'IME intermediate text does not rerender')
  await dialog.locator('input').evaluate(e=>e.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:e.value})))
  assert.equal(await dialog.locator('.dsp-results button').count(),1)
  assert(await dialog.locator('input').evaluate(e=>e===document.activeElement),'IME focus retained')
  for(let i=0;i<8;i++){
    await page.keyboard.press('Tab')
    assert(await page.evaluate(()=>!!document.activeElement.closest('.dsp-dialog')),'focus remains in popup')
  }
  await dialog.getByRole('button',{name:'検索をクリア',exact:true}).click()
  await dialog.getByRole('button',{name:'次のページ',exact:true}).click()
  assert.equal(await dialog.locator('.dsp-pager span').innerText(),'2 / 4')
  await dialog.locator('input').fill('てすと ｃｏｄｅ－１５０')
  assert.equal(await dialog.locator('.dsp-results button').count(),1)
  assert(await dialog.locator('.dsp-results button').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'long names wrap')
  await dialog.locator('.dsp-results button').click()
  assert.equal(await native.inputValue(),'salon-150')
  assert.deepEqual(await page.evaluate(()=>window.qa714Events),{input:1,change:1,submit:0})
  dialog=await popup(page,trigger)
  await dialog.locator('input').fill('CODE-150');await dialog.locator('.dsp-results button').click()
  assert.deepEqual(await page.evaluate(()=>window.qa714Events),{input:1,change:1,submit:0},'same selection is idempotent')
  dialog=await popup(page,trigger)
  await dialog.locator('input').fill('<img')
  assert.equal(await dialog.locator('img').count(),0,'option label is text, not HTML')
  await page.keyboard.press('Escape')
  await page.locator('#qa714-form').evaluate(e=>e.reset())
  await page.waitForFunction(()=>document.querySelector('#qa714-form .dsp-caption').textContent==='選択してください')
  assert.equal(await page.locator('#qa714-form').evaluate(e=>e.reportValidity()),false)
  assert.equal(await trigger.getAttribute('aria-invalid'),'true')
  assert(await trigger.evaluate(e=>e===document.activeElement),'invalid hidden native select focuses visible trigger')
  dialog=await popup(page,trigger)
  await native.evaluate(e=>{e.disabled=true})
  await page.locator('.dsp-dialog').waitFor({state:'detached'})
  assert(await trigger.isDisabled(),'disabled state propagated')
  await native.evaluate(e=>{e.disabled=false})
  dialog=await popup(page,trigger)
  await native.evaluate(e=>e.options[1].remove())
  await page.waitForFunction(()=>document.querySelector('.dsp-count').textContent==='151件')
  await native.evaluate(e=>e.remove())
  await page.locator('.dsp-dialog').waitFor({state:'detached'})
  assert.equal(await trigger.count(),0,'removed source cleaned up')
  assert.equal(await page.locator('.dsp-dialog').count(),0)
  fixture('seed')
  const staff=await browser.newContext(),staffPage=await staff.newPage()
  await login(staff,'qa713.staff')
  for(const route of ['sales','fulfillment','pricing']){
    await staffPage.goto(base+'/dealer/'+route,{waitUntil:'networkidle'})
    await staffPage.locator('.dsp-trigger').waitFor()
    const expected=await staffPage.locator('select[data-dealer-salon-picker] option').evaluateAll(es=>es.filter(o=>o.value).map(o=>o.dataset.salonName||o.text))
    const modal=await popup(staffPage)
    assert.deepEqual(await modal.locator('.dsp-results .dsp-name').allTextContents(),expected,'no privilege expansion')
    await staffPage.keyboard.press('Escape')
  }
  assert.equal((await staff.request.get(base+'/dealer/team')).status(),403)
  await staff.close()
  assert.deepEqual(errors,[])
  fs.writeFileSync(path.join(artifacts,'report.json'),JSON.stringify({checks:report,largeAccount:152,roles:'PASS',errors},null,2))
  console.log('v714 browser PASS: '+report.length+' route/form viewport checks; search, Unicode, codes, pagination, keyboard, focus, forms, lifecycle, roles')
}finally{await browser.close();fixture('restore')}
