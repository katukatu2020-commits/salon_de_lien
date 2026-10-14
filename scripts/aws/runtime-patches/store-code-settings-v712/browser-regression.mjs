import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {createRequire} from 'node:module'
const require = createRequire(path.resolve('package.json'))
const {chromium} = require('playwright-core')
const base = 'http://127.0.0.1:3188', out = 'artifacts/store-code-settings-v712'
const config = JSON.parse(execFileSync('docker', ['inspect', 'orimia-qa-v680-app'], {encoding:'utf8'}))[0]
assert.ok(config.Config.Env.includes('ORIMIA_ISOLATED_QA=v680'))
assert.ok(config.Config.Env.some(e => e.includes('/orimia_qa_v680_20260926?')))
fs.mkdirSync(out, {recursive:true})
const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const report = []
async function login(context, email) {
  await context.request.post(base + '/api/auth/login', {form:{email,password:'QaLocalOnly-v680!',next:'/admin/settings'}})
}
try {
  const anon = await browser.newContext()
  assert.equal((await anon.request.get(base + '/api/admin/store-profile')).status(), 401)
  await anon.close()
  for (const [role, loginId] of [['owner','demo.owner'], ['staff','demo.mizuki'], ['shared','qa.v553.self.mtp7ztgk']]) {
    const context = await browser.newContext({locale:'ja-JP', permissions:['clipboard-read','clipboard-write']})
    await login(context, loginId)
    const before = await context.request.get(base + '/api/admin/store-profile').then(r => r.json())
    assert.ok(before.profile?.storeCode)
    const other = await context.request.get(base + '/api/admin/store-profile?organizationId=org_salon_de_lien').then(r => r.json())
    assert.equal(other.profile.organizationId, before.profile.organizationId)
    assert.equal(other.profile.storeCode, before.profile.storeCode)
    const page = await context.newPage(), errors = []
    page.on('pageerror', e => errors.push(e.message))
    for (const width of [1440,390]) {
      await page.setViewportSize({width,height:width < 600 ? 844 : 1000})
      await page.goto(base + '/admin/settings', {waitUntil:'load'})
      const card = page.locator('[data-store-code-v712]')
      await card.locator('[data-store-code-copy]:not([disabled])').waitFor()
      assert.equal(await card.count(),1)
      assert.equal(await card.locator('code').innerText(), before.profile.storeCode)
      await card.getByRole('button', {name:'店舗固有コードをコピー'}).click()
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), before.profile.storeCode)
      await page.getByText('コピーしました。', {exact:true}).waitFor()
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      assert.ok(await card.isVisible())
      await page.screenshot({path:out + '/' + role + '-' + width + '.png'})
      if (role === 'owner') {
        for (const name of ['会計・ポイント', '外部アプリ連携']) {
          await page.getByRole('button',{name,exact:true}).click()
          assert.equal(await card.isVisible(), false)
          await page.getByRole('button',{name:'店舗情報',exact:true}).click()
          assert.ok(await card.isVisible())
          assert.equal(await card.count(),1)
        }
        assert.equal(await page.locator('form[data-ca-store-form]').count(),1)
        assert.equal(await card.locator('input').count(),0)
      } else {
        assert.equal(await page.locator('main form').count(),0)
        const denied = await context.request.post(base + '/api/admin/store-profile', {data:{action:'update-store',storeName:'Unauthorized'}})
        assert.equal(denied.status(),403)
      }
      await page.goto(base + '/admin/account', {waitUntil:'load'})
      assert.equal(await page.locator('[data-store-code-v712]').count(),0)
      report.push({role,width,code:true,copy:true,scope:true})
    }
    assert.deepEqual(errors,[])
    const after = await context.request.get(base + '/api/admin/store-profile').then(r => r.json())
    assert.equal(after.profile.storeCode, before.profile.storeCode)
    assert.equal(after.profile.updatedAt, before.profile.updatedAt)
    await context.close()
  }
  // Exercise the existing enhancer with explicit load/error/empty states, without DB writes.
  const source = execFileSync('docker', ['exec','orimia-qa-v680-app','cat','/app/admin-staff-experience-v276.js'], {encoding:'utf8'})
  for (const mode of ['empty','retry','clipboard-denied','escaped']) {
    const context = await browser.newContext(), page = await context.newPage()
    let calls = 0
    await page.route('**/*', async route => {
      const url = new URL(route.request().url())
      if (url.pathname === '/api/admin/store-profile') {
        calls++
        if (mode === 'retry' && calls === 1) return route.fulfill({status:503,json:{error:'Unavailable'}})
        return route.fulfill({json:{ok:true,profile:{storeCode:mode === 'empty' ? '' : mode === 'escaped' ? '<img src=x onerror=alert(1)>' : 'STORE-TEST',role:'ADMIN'}}})
      }
      if (url.pathname === '/admin/settings') return route.fulfill({contentType:'text/html',body:'<main><div id="store-profile" data-ca-store-settings><header>店舗情報</header></div></main>'})
      return route.fulfill({contentType:'application/javascript',body:''})
    })
    await page.goto(base + '/admin/settings')
    await page.addScriptTag({content:source})
    const card = page.locator('[data-store-code-v712]'), button = card.locator('button')
    if (mode === 'empty') {
      await card.getByText('未発行',{exact:true}).waitFor()
      assert.ok(await button.isDisabled())
    } else if (mode === 'retry') {
      await card.getByRole('button',{name:'店舗固有コードを再取得'}).click()
      await card.getByText('STORE-TEST',{exact:true}).waitFor()
      assert.equal(calls,2)
    } else if (mode === 'clipboard-denied') {
      await card.locator('button:not([disabled])').waitFor()
      await page.evaluate(() => Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw Error('denied')}}}))
      await button.click()
      await card.getByText('コピーできませんでした。選択されたコードをコピーしてください。',{exact:true}).waitFor()
      assert.equal(await page.evaluate(() => getSelection().toString()), 'STORE-TEST')
    } else {
      await card.getByText('<img src=x onerror=alert(1)>',{exact:true}).waitFor()
      assert.equal(await card.locator('img').count(),0)
    }
    for (let i = 0; i < 5; i++) await page.evaluate(() => document.body.appendChild(document.createElement('span')))
    assert.equal(await card.count(),1)
    report.push({mode,pass:true})
    await context.close()
  }
} finally {
  fs.writeFileSync(out + '/report.json',JSON.stringify(report,null,2))
  await browser.close()
}
console.log('v712 browser PASS: owner/staff/shared, desktop/mobile, copy, tabs, auth, tenant scoping, retry/empty/escaped/fallback; no store data changed')
