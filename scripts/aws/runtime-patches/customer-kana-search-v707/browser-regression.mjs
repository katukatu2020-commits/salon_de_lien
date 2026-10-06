import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url), { chromium } = require('playwright-core')
const base = 'http://127.0.0.1:3188', container = 'orimia-qa-v680-app'
const dir = path.dirname(fileURLToPath(import.meta.url))
const artifact = path.resolve('artifacts/customer-kana-v707')
await fs.mkdir(artifact,{recursive:true})
execFileSync('docker',['cp',path.join(dir,'qa-fixture.cjs'),container+':/tmp/qa-v707.cjs'])
const fixture = action => execFileSync('docker',['exec',container,'node','/tmp/qa-v707.cjs',action],{encoding:'utf8'})
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true})
try {
  console.log(fixture('seed'))
  const context = await browser.newContext({baseURL:base,viewport:{width:1440,height:1000}})
  const login = await context.request.post('/api/auth/login',{form:{email:'demo.owner',password:'QaLocalOnly-v680!',next:'/admin/customers'},maxRedirects:0})
  assert.equal(login.status(),303)
  const page = await context.newPage(), errors=[]
  page.setDefaultTimeout(10000)
  page.on('pageerror',e=>errors.push(e.message))
  const names = () => page.locator('#customer-list [data-customer-name-v707]:visible').allTextContents()
  async function visit(query='') {
    const response = await page.goto(base+'/admin/customers'+query,{waitUntil:'domcontentloaded',timeout:45000})
    assert.equal(response.status(),200)
    await page.locator('#customer-list').waitFor()
  }
  await visit('?q='+encodeURIComponent('ヤマモトハナ'))
  assert.ok((await names()).includes('山本 はな（ヤマモトハナ）'))
  assert.ok(!(await names()).some(n=>/非表示確認|退会確認|他店舗確認/.test(n)))
  for (const query of ['ヤマモト ハナ','やまもと　はな','ﾔﾏﾓﾄﾊﾅ','モトハ','000-0707-0001']) {
    const input=page.getByRole('textbox',{name:'顧客名・フリガナ・電話・メモで検索',exact:true})
    await input.fill(query)
    await input.press('Enter')
    await page.waitForURL(url=>url.searchParams.get('q')===query)
    await page.locator('#customer-list').waitFor()
    assert.ok((await names()).includes('山本 はな（ヤマモトハナ）'),query)
  }
  await visit('?q='+encodeURIComponent('ページケンサ'))
  assert.equal((await names()).length,50)
  assert.match(await page.locator('#customer-list').innerText(),/52件中/)
  await page.getByRole('link',{name:'次の50人'}).click()
  await page.waitForURL(url=>url.searchParams.get('page')==='2')
  assert.equal((await names()).length,2)
  assert.equal(new URL(page.url()).searchParams.get('q'),'ページケンサ')
  await visit('?q='+encodeURIComponent('ヤマモトハナ')+'&registration=registered')
  assert.ok(!(await names()).includes('山本 はな（ヤマモトハナ）'))
  await visit('?q='+encodeURIComponent('ヤマモトハナ')+'&registration=provisional')
  assert.ok((await names()).includes('山本 はな（ヤマモトハナ）'))
  await page.locator('#customer-list').screenshot({path:path.join(artifact,'desktop.png')})
  await page.setViewportSize({width:390,height:844})
  await page.locator('#customer-list').scrollIntoViewIfNeeded()
  assert.ok((await names()).includes('山本 はな（ヤマモトハナ）'))
  assert.ok(await page.locator('[data-customer-name-v707]:visible').first().evaluate(el=>el.scrollWidth<=el.clientWidth+1))
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
  await page.locator('#customer-list').screenshot({path:path.join(artifact,'mobile.png')})
  await visit('?q='+encodeURIComponent('フリガナ未登録確認'))
  assert.deepEqual(await names(),['フリガナ未登録確認'])
  await visit('?q='+encodeURIComponent('該当しないカナケンサ'))
  assert.equal((await names()).length,0)
  assert.deepEqual(errors,[])
  const anonymous = await browser.newContext({baseURL:base})
  const blocked = await anonymous.request.get('/admin/customers?q='+encodeURIComponent('ヤマモトハナ'),{maxRedirects:0})
  assert.ok([302,303,307].includes(blocked.status()))
  await anonymous.close()
  console.log('v707 browser PASS: kana variants, phone, pagination, registration filter, absent kana, desktop/mobile, authentication, no browser exceptions')
} finally {
  console.log(fixture('restore'))
  await browser.close()
}
