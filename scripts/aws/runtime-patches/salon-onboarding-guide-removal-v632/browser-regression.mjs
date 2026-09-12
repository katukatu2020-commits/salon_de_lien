import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { chromium } from 'playwright'

const runtimeRoot = process.env.LIEN_RUNTIME_ROOT || '/app'
const tenantClient = fs.readFileSync(path.join(runtimeRoot, 'tenant-setup-client.js'))
const commercialClient = fs.readFileSync(path.join(runtimeRoot, 'commercial-admin-v101.js'))

const setup = {
  organizationId: 'org-v632-new-store',
  role: 'ADMIN',
  legacy: false,
  staffCount: 0,
  menuCount: 0,
  inbound: { address: null, lastReceivedAt: null },
  businessSchedule: { openTime: '10:00', closeTime: '19:00', openMinutes: 600, closeMinutes: 1140, closedWeekdays: [1] },
}

const profile = {
  canEdit: true,
  storeName: 'V632 \u691c\u8a3c\u30b5\u30ed\u30f3',
  ownerName: '\u691c\u8a3c \u30aa\u30fc\u30ca\u30fc',
  phone: '',
  postalCode: '',
  prefecture: '',
  city: '',
  addressLine1: '',
  addressLine2: '',
  websiteUrl: '',
  ownerEmail: 'owner@example.test',
  businessSchedule: setup.businessSchedule,
  setup: { staffCount: 0, menuCount: 0, activeMenuCount: 0, inboundAddress: '' },
}

const pageHtml = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main><div class="max-w-7xl"><header><h1>\u5e97\u8217\u8a2d\u5b9a</h1><p>\u8a2d\u5b9a\u753b\u9762</p></header><form><button type="submit">\u8a2d\u5b9a\u3092\u4fdd\u5b58</button></form></div></main><script src="/tenant-setup-client.js"></script><script src="/commercial-admin-v136.js"></script></body></html>`

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  if (url.pathname === '/tenant-setup-client.js') {
    res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8' })
    res.end(tenantClient)
    return
  }
  if (url.pathname === '/commercial-admin-v136.js') {
    res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8' })
    res.end(commercialClient)
    return
  }
  if (url.pathname === '/api/lien-tenant-setup/status') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify(setup))
    return
  }
  if (url.pathname === '/api/admin/store-profile') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ profile }))
    return
  }
  if (url.pathname.startsWith('/admin/')) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(pageHtml)
    return
  }
  res.writeHead(404).end()
})

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const address = server.address()
const origin = `http://127.0.0.1:${address.port}`
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
})

try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    const pageErrors = []
    page.on('pageerror', error => pageErrors.push(error.message))
    await page.addInitScript(() => {
      localStorage.setItem('lien-product-tour-pending', 'awaiting')
      localStorage.setItem('lien-product-tour:v1:org-v632-new-store', JSON.stringify({ organizationId: 'org-v632-new-store', status: 'active', welcome: true }))
    })
    await page.goto(`${origin}/admin/settings?registered=1&setup=1`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-ca-store-settings]')
    await page.waitForTimeout(350)

    assert.equal(await page.locator('.lpt-welcome,.lpt-coach,.lpt-resume,.ts-launcher,.ts-overlay').count(), 0)
    assert.equal(await page.locator('.ca-setup-progress,[data-ca-open-setup]').count(), 0)
    assert.equal(await page.locator('[data-ca-store-form]').count(), 1)
    assert.equal(await page.locator('[data-ca-email-form]').count(), 1)
    assert.equal(await page.evaluate(() => location.search), '')
    assert.deepEqual(await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('lien-product-tour'))), [])
    assert.deepEqual(pageErrors, [])

    await page.goto(`${origin}/admin/appointments?setup=1`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(400)
    assert.equal(await page.locator('.lpt-welcome,.lpt-coach,.lpt-resume,.ts-launcher,.ts-overlay').count(), 0)
    assert.deepEqual(pageErrors, [])
    await context.close()
  }

  console.log(JSON.stringify({
    release: 'salon-onboarding-guide-removal-v632',
    browserVerified: true,
    viewports: ['390x844', '1440x1000'],
    retainedSettingsForms: true,
  }))
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
