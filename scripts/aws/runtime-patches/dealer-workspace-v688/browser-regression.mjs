import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE||import.meta.url),{chromium}=require('playwright-core')
const base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3194',artifacts=path.resolve('artifacts/dealer-workspace-v688')
fs.mkdirSync(artifacts,{recursive:true})
const routes={operations:'home',orders:'orders',fulfillment:'orders',inventory:'orders',salons:'partners',products:'partners',pricing:'partners',sales:'sales',calendar:'sales',receivables:'sales',activities:'activity',messages:'activity',targets:'activity',company:'settings',team:'settings'}
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const report=[]
try{
  for(const width of [1440,1024,390,320]){
    const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[]
    page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message))
    const login=await context.request.post(base+'/api/dealer/auth/login',{headers:{Origin:base},data:{loginId:'erp-owner-a',password:'FixtureOnly-v678!'},maxRedirects:0});assert.equal(login.status(),303)
    for(const [route,group]of Object.entries(routes)){
      const response=await page.goto(base+'/dealer/'+route);assert.equal(response.status(),200,route)
      await page.locator('#wholesale-app').waitFor()
      await page.waitForFunction(()=>document.querySelector('#wholesale-app')?.textContent.trim()&&!document.querySelector('#wholesale-app .wo-loading')&&!document.querySelector('#wholesale-app').textContent.includes('読み込んでいます'))
      assert.equal(await page.locator('body').getAttribute('data-workspace-group'),group)
      assert.equal(await page.locator('.dw-sidebar nav>a').count(),6)
      assert.equal(await page.locator('.dw-bottom>a,.dw-bottom>button').count(),5)
      assert(await page.locator('h1').isVisible(),'visible page heading '+route)
      assert((await page.locator('.dw-tabs>a').count())<=3)
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow: '+route+' '+width)
      assert.equal(await page.locator('.dw-sidebar .is-active').count(),1)
      if(width<768){assert(await page.locator('.dw-bottom').isVisible());assert.equal(await page.locator('.dw-sidebar').isVisible(),false)}
      if(route==='messages'){
        const message='画面確認 '+width+' '+Date.now()
        await page.locator('[data-partner="salon-a"]').click();await page.locator('#pc-body').fill(message)
        assert(await page.locator('#pc-form').evaluate(el=>{const r=el.getBoundingClientRect(),nav=document.querySelector('.dw-bottom'),visible=getComputedStyle(nav).display!=='none';return r.bottom<=(visible?nav.getBoundingClientRect().top:innerHeight)+1}),'chat composer must not overlap navigation')
        await page.locator('#pc-form button[type=submit]').click();await page.locator('#pc-messages').getByText(message,{exact:true}).waitFor()
        if(width<768)await page.locator('#pc-back').click()
      }
      const opener=page.locator(width<768?'.dw-bottom [data-dw-open]':'.dw-topbar [data-dw-open]')
      await opener.click();await page.locator('#dw-menu').waitFor({state:'visible'})
      assert.equal(await page.locator('#dw-menu [data-dw-link]:visible').count(),16)
      assert(await page.locator('#dw-menu').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'menu overflow')
      await page.locator('[data-dw-search]').fill('請求')
      assert.equal(await page.locator('#dw-menu [data-dw-link]:visible').count(),1)
      await page.keyboard.press('Escape');await page.locator('#dw-menu').waitFor({state:'hidden'});await page.waitForFunction(()=>document.querySelector('[data-dw-open]').getAttribute('aria-expanded')==='false');assert.equal(await opener.getAttribute('aria-expanded'),'false')
      assert(await opener.evaluate(el=>document.activeElement===el),'menu restores focus')
      if(['operations','orders','products','messages','team'].includes(route))await page.screenshot({path:path.join(artifacts,route+'-'+width+'.png')})
      report.push({route,width,group,status:'PASS'})
    }
    await page.goto(base+'/dealer/products');const search=page.locator('input[placeholder="商品名・メーカー・商品コードで検索"]');await search.waitFor()
    assert.equal(await page.locator('#dealer-product-form').isVisible(),false)
    await page.locator('.dw-product-create>summary').click();await page.locator('#dealer-product-form').waitFor()
    await page.locator('#dealer-product-form input').first().fill('検証メーカー')
    await page.locator('.dw-product-create>summary').click();await page.locator('.dw-product-create>summary').click()
    assert.equal(await page.locator('#dealer-product-form input').first().inputValue(),'検証メーカー')
    await page.locator('.dw-product-create>summary').click()
    await search.evaluate(el=>window.dealerSearch688=el);await search.fill('オルディーブ');await search.press('End')
    await search.evaluate(el=>{el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));el.value='ｵﾙﾃﾞｨｰﾌﾞ';el.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:el.value}))})
    assert(await search.evaluate(el=>el===window.dealerSearch688&&document.activeElement===el),'IME focus preserved')
    assert.equal(await search.inputValue(),'ｵﾙﾃﾞｨｰﾌﾞ')
    await page.locator('.dw-tabs a[href="/dealer/pricing"]').click();await page.waitForURL('**/dealer/pricing');await page.goBack();await page.waitForURL(url=>url.pathname==='/dealer/products')
    assert.equal(await page.locator('body').getAttribute('data-workspace-group'),'partners')
    const menuOpener=page.locator(width<768?'.dw-bottom [data-dw-open]':'.dw-topbar [data-dw-open]')
    await menuOpener.click();await page.locator('#dw-menu a[href="/dealer/inventory"]').click();await page.waitForURL('**/dealer/inventory')
    await page.goBack();await page.waitForURL(url=>url.pathname==='/dealer/products')
    assert.equal(await page.locator('#dw-menu').isVisible(),false,'back must not reopen the menu')
    assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('dw-menu-open')),false)
    await page.goto(base+'/dealer/orders');await page.locator('.dw-cutoff>summary').click();await page.locator('.oa-settings').waitFor();assert.equal(await page.locator('.oa-settings button[type=submit]').count(),1)
    assert.deepEqual(errors,[]);await context.close()
  }
  const staff=await browser.newContext({viewport:{width:390,height:844}}),page=await staff.newPage()
  await staff.request.post(base+'/api/dealer/auth/login',{headers:{Origin:base},data:{loginId:'erp-sales-a',password:'FixtureOnly-v678!'},maxRedirects:0})
  await page.goto(base+'/dealer/company');await page.locator('.dw-bottom [data-dw-open]').click()
  assert.equal(await page.locator('#dw-menu [data-dw-link]').count(),15);assert.equal(await page.locator('a[href="/dealer/team"]').count(),0)
  await page.locator('#dw-menu a[href="/dealer/password-change"]').click();await page.waitForURL('**/dealer/password-change')
  await page.locator('input[type=password]').first().waitFor();assert.equal(await page.locator('.dw-tabs [aria-current=page]').innerText(),'パスワード変更')
  assert.equal((await staff.request.get(base+'/dealer/team')).status(),403)
  await page.screenshot({path:path.join(artifacts,'staff-password-390.png')});await staff.close()
  fs.writeFileSync(path.join(artifacts,'report.json'),JSON.stringify(report,null,2))
  console.log('v688 browser PASS: 60 route/viewport checks; menu, search, IME, back, mobile, roles, password, cutoff retained')
}finally{await browser.close()}
