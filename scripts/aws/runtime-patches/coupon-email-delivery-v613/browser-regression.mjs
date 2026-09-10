import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'http://localhost:3615').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/coupon-email-delivery-v613/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
const results = []

async function staffLogin(context) {
  const response = await context.request.post(base + '/api/auth/login', {
    headers: { Origin: base },
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/customers/messages' },
  })
  assert.ok(response.ok(), `Staff login returned ${response.status()}`)
}

function collectErrors(page) {
  const errors = []
  page.on('pageerror', error => errors.push(`page: ${error.message}`))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  return errors
}

function unexpected(errors) {
  return errors.filter(message => (
    !message.includes('Minified React error #418')
    && !message.includes('Minified React error #423')
    && !message.includes('Failed to load resource: the server responded with a status of 404')
  ))
}

async function verify(viewport, name) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  await staffLogin(context)
  const page = await context.newPage()
  const errors = collectErrors(page)
  await page.goto(`${base}/admin/customers/messages?verify=v613-${name}`, { waitUntil: 'domcontentloaded' })

  const summary = page.locator('#broadcast-email-eligibility-v613')
  await summary.waitFor({ state: 'visible' })
  const counts = await summary.evaluate(node => ({
    eligible: Number(node.dataset.emailEligibleCount || 0),
    unregistered: Number(node.dataset.emailUnregisteredCount || 0),
  }))
  assert.ok(counts.eligible > 0, 'An email-eligible fixture is required')
  assert.ok(counts.unregistered > 0, 'An email-unregistered fixture is required')

  await page.locator('input[name="deliveryMethod"][value="email"]').check()
  await page.locator('#broadcast-recipient-open').click()
  const modal = page.locator('#broadcast-recipient-modal')
  await modal.waitFor({ state: 'visible' })

  const rowState = await modal.locator('.broadcast-recipient-row').evaluateAll(rows => rows.map(row => ({
    email: row.dataset.recipientEmail,
    disabled: row.querySelector('input[name="targetCustomerId"]')?.disabled,
  })))
  assert.ok(rowState.some(row => row.email === '1'))
  assert.ok(rowState.some(row => row.email === '0'))
  assert.ok(rowState.filter(row => row.email === '1').every(row => row.disabled === false))
  assert.ok(rowState.filter(row => row.email === '0').every(row => row.disabled === true))
  await page.locator('#broadcast-recipient-search').fill('example')
  await page.locator('#broadcast-recipient-search').fill('')
  assert.match(await summary.textContent(), /自動で除外/)

  await page.screenshot({ path: path.join(output, `recipient-email-${name}.png`), fullPage: false })
  await page.locator('#broadcast-recipient-close').click()
  await page.locator('input[name="deliveryMethod"][value="app"]').check()
  assert.equal(await page.locator('.broadcast-recipient-row input[name="targetCustomerId"]:disabled').count(), 0)

  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    summary: (() => {
      const box = document.getElementById('broadcast-email-eligibility-v613').getBoundingClientRect()
      return { left: box.left, right: box.right, width: box.width }
    })(),
  }))
  assert.ok(layout.documentWidth <= layout.viewport + 2, 'Page has horizontal overflow')
  assert.ok(layout.summary.left >= -1 && layout.summary.right <= layout.viewport + 1, 'Email summary is outside viewport')

  await page.goto(`${base}/admin/customers/messages?notice=sent&count=9&skipped=123`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('status').getByText(/9名へ配信しました/).waitFor()
  await page.getByText(/メール未登録の123名は対象外/).waitFor()
  await page.goto(`${base}/admin/customers/messages?error=no-email-recipients&skipped=123`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('alert').getByText(/メール登録済みのお客様がいません/).waitFor()
  await page.goto(`${base}/admin/customers/messages?notice=email-partial&count=8&failed=1&delivered=9&skipped=123`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('status').getByText(/メールは8名へ送信し、1名分が送信失敗/).waitFor()

  assert.deepEqual(unexpected(errors), [], `${name} has unexpected browser errors`)
  results.push({ name, counts, layout, resultBanners: true, errors: unexpected(errors) })
  await context.close()
}

try {
  await verify({ width: 1280, height: 900 }, 'desktop')
  await verify({ width: 390, height: 844 }, 'mobile')
  console.log(JSON.stringify({ release: 'v613', results }, null, 2))
} finally {
  await browser.close()
}
