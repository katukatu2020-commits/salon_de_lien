import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const runtimeRoot = process.env.LIEN_RUNTIME_ROOT || '/app'
const runtimeRequire = createRequire(path.join(runtimeRoot, 'server.js'))
const { renderAudiencePage } = runtimeRequire('./audience-sites.js')
const { pageShell } = runtimeRequire('./platform-operator.js')
const { renderPlatformInbox } = runtimeRequire('./business-inquiries-v637.js')
const output = process.env.SCREENSHOT_DIR || 'artifacts/business-inquiries-v637/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive: true })

const sampleInbox = renderPlatformInbox({
  rows: [{ id: 'binq_browser', audience: 'salon', organizationName: 'Salon Browser Test', contactName: '山田 花子', email: 'browser@example.com', phone: '090-1234-5678', preferredContact: 'email', message: '店舗への導入方法と契約内容について相談したいです。', status: 'new', operatorNote: '', createdAt: new Date('2026-09-12T04:00:00Z') }],
  total: 1, stats: { total: 1, newCount: 1, inProgressCount: 0, closedCount: 0 }, status: 'all', audience: 'all', query: '', page: 1, pageSize: 30,
}, pageShell)

const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1')
  if (url.pathname === '/orimia-public-v637.css') {
    response.setHeader('Content-Type', 'text/css; charset=utf-8')
    return response.end(fs.readFileSync(path.join(runtimeRoot, 'orimia-public-v637.css')))
  }
  if (url.pathname === '/api/public/business-inquiries' && request.method === 'POST') {
    request.resume()
    response.statusCode = 303
    response.setHeader('Location', '/business/salon?inquiry=sent#contact')
    return response.end()
  }
  if (url.pathname.startsWith('/orimia-public-v588/')) {
    response.statusCode = 204
    return response.end()
  }
  if (url.pathname === '/platform-inquiries') {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    return response.end(sampleInbox)
  }
  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  response.end(renderAudiencePage(url.pathname, { inquiryStatus: url.searchParams.get('inquiry') || '' }) || 'not found')
})

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const port = server.address().port
const browser = await chromium.launch({ executablePath, headless: true })
const results = []

try {
  for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    await page.goto(`http://127.0.0.1:${port}/business/salon`, { waitUntil: 'domcontentloaded' })
    const cta = page.getByRole('link', { name: '導入について相談する' }).first()
    assert.equal(await cta.getAttribute('href'), '#contact')
    await cta.click()
    await page.waitForFunction(() => location.hash === '#contact')
    const contact = page.locator('#contact')
    await contact.waitFor({ state: 'visible' })
    await page.waitForFunction(() => {
      const target = document.querySelector('#contact')
      const rect = target?.getBoundingClientRect()
      return rect && rect.top < innerHeight && rect.bottom > 0
    })

    const form = page.locator('.business-inquiry-form')
    await form.locator('[name="organizationName"]').fill('Salon Browser Test')
    await form.locator('[name="contactName"]').fill('山田 花子')
    await form.locator('[name="email"]').fill('browser@example.com')
    await form.locator('[name="message"]').fill('導入方法について詳しく相談したいです。')
    await form.locator('[name="privacyAccepted"]').check()
    await Promise.all([page.waitForURL(/inquiry=sent/), form.locator('button[type="submit"]').click()])
    await page.getByText('お問い合わせを受け付けました。担当者からご連絡します。').waitFor()

    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      fields: getComputedStyle(document.querySelector('.inquiry-fields')).gridTemplateColumns.split(' ').length,
    }))
    assert.ok(layout.documentWidth <= layout.viewport + 2, `${width}: horizontal overflow`)
    assert.equal(layout.fields, width <= 600 ? 1 : 2)
    await contact.screenshot({ path: path.join(output, `contact-${width}.png`) })
    await page.goto(`http://127.0.0.1:${port}/platform-inquiries`, { waitUntil: 'domcontentloaded' })
    assert.equal(await page.getByRole('link', { name: '導入相談' }).count(), 1)
    assert.equal(await page.locator('.biResponse select[name="status"]').count(), 1)
    const inboxLayout = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, documentWidth: document.documentElement.scrollWidth }))
    assert.ok(inboxLayout.documentWidth <= inboxLayout.viewport + 2, `${width}: platform inbox horizontal overflow`)
    await page.locator('.biInquiry').screenshot({ path: path.join(output, `platform-inquiry-${width}.png`) })
    results.push({ width, smoothAnchor: true, submitted: true, layout, inboxLayout })
    await page.close()
  }
  console.log(JSON.stringify({ release: 'business-inquiries-v637', browserVerified: true, results }))
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
