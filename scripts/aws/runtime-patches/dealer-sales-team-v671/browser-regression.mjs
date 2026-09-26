import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const {chromium}=require('playwright-core')
const base=process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3171'
const out=process.env.SCREENSHOT_DIR || 'artifacts/dealer-sales-team-v671/browser'
fs.mkdirSync(out,{recursive:true})
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true})
const errors=[]
try {
  for(const viewport of [{name:'desktop',width:1440,height:1000},{name:'mobile',width:390,height:844}]) {
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height}})
    const login=await context.request.post(base+'/api/dealer/auth/login',{headers:{Origin:base},data:{loginId:'test-owner-a',password:'IntegrationOnly-v671!'},maxRedirects:0})
    assert.equal(login.status(),303)
    assert.ok(login.headers()['set-cookie'])
    const page=await context.newPage()
    page.on('pageerror',e=>errors.push(e.message))
    for(const view of ['sales','targets','team']) {
      await page.goto(base+'/dealer/'+view+'?month=2026-09',{waitUntil:'networkidle'})
      await page.locator('.dst-app').waitFor()
      await page.locator('.dst-table').first().waitFor()
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)
      assert.ok(overflow<=2,`${view}/${viewport.name}: overflow ${overflow}`)
      if(view==='sales') {
        assert.match(await page.locator('.dst-metrics').innerText(),/15,000円/)
        await page.locator('[name=closing]').selectOption('20')
        await page.getByRole('button',{name:'絞り込む',exact:true}).click()
        await page.waitForFunction(()=>document.querySelector('.dst-metrics')?.textContent.includes('6,000円'))
        await page.getByRole('button',{name:'リセット',exact:true}).click()
        await page.waitForFunction(()=>document.querySelector('input[name=month]')?.value===new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit'}).format(new Date()))
        await page.locator('[name=month]').fill('2026-09')
        await page.getByRole('button',{name:'絞り込む',exact:true}).click()
        await page.waitForFunction(()=>document.querySelector('.dst-metrics')?.textContent.includes('15,000円'))
      }
      if(view==='targets') {
        const row=page.locator('tr').filter({hasText:'山本 営業'})
        assert.match(await row.innerText(),/50%/)
        await row.getByRole('button',{name:'目標を設定'}).click()
        await page.locator('dialog [name=salesTargetYen]').fill('12000')
        await page.locator('dialog [name=acquisitionTarget]').fill('2')
        await page.locator('dialog button[type=submit]').click()
        await page.locator('dialog').waitFor({state:'detached'})
      }
      if(view==='team') {
        const input=page.locator('[name=q]')
        await input.focus()
        await input.evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionstart',{data:''})))
        await input.fill('やまもと')
        await input.evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionupdate',{data:'やまもと'})))
        assert.equal(await input.evaluate(el=>document.activeElement===el),true)
        await input.fill('山本')
        await input.evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionend',{data:'山本'})))
        await page.getByRole('button',{name:'検索',exact:true}).click()
        assert.equal(await page.locator('tbody tr').count(),1)
        await page.getByRole('button',{name:'編集',exact:true}).click()
        assert.equal(await page.locator('dialog [name=name]').inputValue(),'山本 営業')
        await page.locator('dialog [data-close]').click()
        await page.getByRole('tab',{name:'営業所',exact:true}).click()
        assert.match(await page.locator('tbody').innerText(),/岡山営業所/)
        await page.getByRole('tab',{name:'サロン担当・締日'}).click()
        await page.locator('[data-assignment]').first().click()
        await page.locator('dialog [data-close]').click()
        await page.getByRole('tab',{name:'スタッフ',exact:true}).click()
      }
      await page.evaluate(()=>window.scrollTo(0,0))
      await page.screenshot({path:path.join(out,viewport.name+'-'+view+'.png'),fullPage:true})
    }
    if(viewport.name==='desktop') {
      await page.getByRole('button',{name:'スタッフを追加',exact:true}).click()
      await page.locator('dialog [name=name]').fill('ブラウザ検証スタッフ')
      await page.locator('dialog [name=loginId]').fill('browser-staff-v671')
      await page.locator('dialog button[type=submit]').click()
      const credentials=page.getByRole('dialog').filter({hasText:'ログイン情報'})
      await credentials.waitFor()
      const initialPassword=await credentials.locator('[name=initialPassword]').inputValue()
      assert.ok(initialPassword.length>=10)
      await credentials.getByRole('button',{name:'確認しました'}).click()
      const employee=await browser.newContext({viewport:{width:390,height:844}})
      const staffLogin=await employee.request.post(base+'/api/dealer/auth/login',{headers:{Origin:base},data:{loginId:'browser-staff-v671',password:initialPassword},maxRedirects:0})
      assert.equal(staffLogin.headers().location,'/dealer/password-change')
      const staffPage=await employee.newPage()
      staffPage.on('pageerror',e=>errors.push(e.message))
      await staffPage.goto(base+'/dealer/password-change',{waitUntil:'networkidle'})
      await staffPage.locator('[name=currentPassword]').fill(initialPassword)
      await staffPage.locator('[name=newPassword]').fill('BrowserChanged-v671!')
      await staffPage.locator('[name=newPasswordConfirm]').fill('BrowserChanged-v671!')
      await staffPage.screenshot({path:path.join(out,'mobile-staff-password.png'),fullPage:true})
      await staffPage.getByRole('button',{name:'パスワードを変更',exact:true}).click()
      await staffPage.waitForURL(/\/dealer\/login\?reset=1/)
      const relogin=await employee.request.post(base+'/api/dealer/auth/login',{headers:{Origin:base},data:{loginId:'browser-staff-v671',password:'BrowserChanged-v671!'},maxRedirects:0})
      assert.equal(relogin.status(),303)
      await staffPage.goto(base+'/dealer/targets?month=2026-09',{waitUntil:'networkidle'})
      await staffPage.locator('.dst-table').waitFor()
      assert.equal(await staffPage.locator('[data-goal]').count(),0)
      assert.equal(await staffPage.locator('a[href="/dealer/team"]').count(),0)
      assert.equal(await staffPage.locator('tbody tr').count(),1)
      await employee.close()
    }
    await context.close()
  }
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({ok:true,viewports:['1440x1000','390x844'],tested:['sales filters','target edit','IME input stability','staff creation','initial password change','role-aware navigation'],screenshots:out}))
} finally {await browser.close()}
