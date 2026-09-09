import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import fs from 'node:fs'
const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = 'http://localhost:3600'
const out = 'artifacts/hotpepper-import-confirm-v600/stored-detail'
fs.mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
try {
  let saved
  for (const audience of ['staff', 'customer']) for (const width of [1440, 390]) {
    const staff = audience === 'staff', prefix = staff ? '/admin' : '/u'
    const context = await browser.newContext({ viewport: { width, height: 1000 } })
    await context.request.post(base + (staff ? '/api/auth/login' : '/api/customer-auth/login'), { headers: { Origin: base }, form: staff ? { email: 'demo.owner', password: 'LienDemo2026!', next: prefix + '/community' } : { loginId: 'demo.hana', password: 'Mypage2026!', next: prefix + '/community' } })
    if (!saved) saved = (await (await context.request.get(base + '/api/lien-hotpepper-styles')).json()).job.items.find(i => i.status === 'PUBLISHED')
    assert.ok(saved)
    const info = await context.request.get(base + `/api/lien-content-management?audience=${audience}&postId=${saved.postId}`)
    assert.equal(info.status(), 200)
    const meta = (await info.json()).post.metadata
    assert.equal(meta.title, saved.data.title); assert.equal(meta.menuDescription, saved.data.menuDescription)
    const page = await context.newPage()
    await page.goto(base + prefix + '/community/' + saved.postId, { waitUntil: 'domcontentloaded' })
    await page.locator('.lien-style-metadata-v596').waitFor({ timeout: 30000 })
    await page.waitForFunction(() => [...document.images].some(i => /127\.0\.0\.1:9160/.test(i.src) && i.naturalWidth > 0), {}, { timeout: 30000 })
    assert.equal(await page.locator('.lien-style-metadata-v596').getByRole('button', { name: 'スタイル情報を編集' }).count(), staff ? 1 : 0)
    if (!staff) {
      const denied = await context.request.patch(base + '/api/lien-content-management?audience=customer', { headers: { Origin: base }, data: { target: 'post', action: 'metadata', postId: saved.postId, metadata: { title: 'must not change' } } })
      assert.equal(denied.status(), 403)
    }
    await page.screenshot({ path: `${out}/${audience}-${width}.png` })
    console.log(JSON.stringify({ audience, width, storedMetadataRendered: true, storedImageRendered: true, customerReadOnly: !staff }))
    await context.close()
  }
} finally { await browser.close() }
