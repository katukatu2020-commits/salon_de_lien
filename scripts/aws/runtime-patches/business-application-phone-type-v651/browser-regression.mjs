import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const runtimeRoot = process.env.LIEN_RUNTIME_ROOT || '/app'
const runtimeRequire = createRequire(path.join(runtimeRoot, 'server.js'))
const { renderBusinessContactForm, parsePublicInquiry } = runtimeRequire('./business-inquiries-v637.js')
const output = process.env.SCREENSHOT_DIR || 'artifacts/business-application-phone-type-v651/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive: true })

const css = `<style>*{box-sizing:border-box}body{margin:0;background:#f7f3ef;color:#2b2522;font-family:system-ui,sans-serif}.contact-section{padding:36px 0}.wrap{width:min(1080px,calc(100% - 32px));margin:auto}.contact-layout{display:grid;grid-template-columns:.8fr 1.2fr;gap:48px}.inquiry-panel{background:#fff;border:1px solid #dccfc7;border-radius:8px;padding:24px}.business-inquiry-form,.inquiry-fields,.inquiry-field{display:grid;gap:14px}.inquiry-fields{grid-template-columns:1fr 1fr}.inquiry-field-wide{grid-column:1/-1}.inquiry-field input,.inquiry-field select,.inquiry-field textarea{width:100%;min-height:46px;padding:10px;border:1px solid #cfc4bc}.inquiry-honeypot{display:none}.inquiry-submit{min-height:48px}@media(max-width:700px){.contact-layout,.inquiry-fields{grid-template-columns:1fr}.inquiry-field-wide{grid-column:auto}}</style>`
const pageHtml = (audience, status = '') => `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${css}</head><body>${renderBusinessContactForm({ audience, status })}</body></html>`

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`)
  if (url.pathname === '/api/public/business-inquiries' && req.method === 'POST') {
    let raw = ''
    for await (const chunk of req) raw += chunk
    const parsed = parsePublicInquiry(raw)
    res.statusCode = 303
    res.setHeader('Location', parsed.sourcePath + '?inquiry=' + (parsed.valid ? 'sent' : 'invalid') + '#contact')
    res.end()
    return
  }
  const audience = url.pathname === '/business/salon' ? 'salon' : url.pathname === '/business/dealer' ? 'dealer' : 'other'
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.end(pageHtml(audience, url.searchParams.get('inquiry') || ''))
})
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ executablePath, headless: true })
const results = []

try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, deviceScaleFactor: 1 })
    const page = await context.newPage()
    for (const [route, expected] of [['/business', ''], ['/business/salon', 'salon'], ['/business/dealer', 'dealer']]) {
      await page.goto(base + route, { waitUntil: 'domcontentloaded' })
      const form = page.locator('.business-inquiry-form')
      const type = form.locator('select[name="audience"]')
      const phone = form.locator('input[name="phone"]')
      assert.equal(await type.isVisible(), true)
      assert.equal(await type.inputValue(), expected)
      assert.equal(await type.getAttribute('required'), '')
      assert.deepEqual(await type.locator('option').evaluateAll(options => options.map(option => option.value)), ['', 'salon', 'dealer'])
      assert.equal(await form.locator('input[type="hidden"][name="audience"]').count(), 0)
      assert.equal(await phone.getAttribute('required'), '')
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))
    }

    await page.goto(base + '/business/salon', { waitUntil: 'domcontentloaded' })
    const form = page.locator('.business-inquiry-form')
    await form.locator('[name="organizationName"]').fill('Salon Browser Test')
    await form.locator('[name="contactName"]').fill('山田 花子')
    await form.locator('[name="email"]').fill('browser@example.jp')
    await form.locator('[name="message"]').fill('ディーラーとして新規利用を申請します。')
    await form.locator('[name="privacyAccepted"]').check()
    await form.locator('[name="audience"]').selectOption('dealer')
    assert.equal(await form.evaluate(element => element.checkValidity()), false)
    assert.equal(await form.locator('[name="phone"]').evaluate(element => element.validity.valueMissing), true)
    await form.locator('[name="phone"]').fill('090-1234-5678')
    await Promise.all([
      page.waitForURL(/\/business\/dealer\?inquiry=sent/),
      form.locator('button[type="submit"]').click(),
    ])
    assert.equal(await page.locator('select[name="audience"]').inputValue(), 'dealer')
    await page.locator('#contact').screenshot({ path: path.join(output, `application-${width}.png`) })
    results.push({ width, visibleTypeSelector: true, phoneRequired: true, selectedTypeRedirect: true, noOverflow: true })
    await context.close()
  }
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}

console.log(JSON.stringify({ release: 'business-application-phone-type-v651', browserVerified: true, results }))
