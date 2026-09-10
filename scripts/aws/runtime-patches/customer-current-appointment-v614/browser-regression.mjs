import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'http://localhost:3614').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/customer-current-appointment-v614/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
const results = []

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
  const login = await context.request.post(`${base}/api/customer-auth/login`, {
    form: { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/appointments' },
  })
  assert.ok(login.ok(), `Customer login returned ${login.status()}`)

  const page = await context.newPage()
  const errors = collectErrors(page)
  await page.goto(`${base}/u/appointments?verify=v614-${name}`, { waitUntil: 'domcontentloaded' })
  await page.locator('.cj-menu-row').first().waitFor({ timeout: 20000 })
  await page.waitForTimeout(800)
  assert.equal(await page.getByText('Application error', { exact: false }).count(), 0)

  const appointmentIds = await page.locator('[data-customer-appointment-id]').evaluateAll(nodes => (
    nodes.map(node => node.getAttribute('data-customer-appointment-id')).filter(Boolean)
  ))
  assert.equal(new Set(appointmentIds).size, appointmentIds.length, 'Current reservations must not be duplicated')

  const summaryResponse = await context.request.get(`${base}/api/customer/mypage-summary`)
  assert.ok(summaryResponse.ok(), `Mypage summary returned ${summaryResponse.status()}`)
  const summary = await summaryResponse.json()
  assert.equal(typeof summary.name, 'string')
  assert.ok(summary.appointment === null || typeof summary.appointment.id === 'string')

  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
  }))
  assert.ok(layout.documentWidth <= layout.viewport + 2, 'Appointments page has horizontal overflow')
  await page.screenshot({ path: path.join(output, `appointments-${name}.png`), fullPage: false })

  await page.goto(`${base}/u/home?verify=v614-${name}`, { waitUntil: 'domcontentloaded' })
  await page.locator('main').waitFor({ timeout: 20000 })
  assert.equal(await page.getByText('Application error', { exact: false }).count(), 0)
  await page.screenshot({ path: path.join(output, `home-${name}.png`), fullPage: false })

  await page.goto(`${base}/u/profile?verify=v614-${name}`, { waitUntil: 'domcontentloaded' })
  await page.locator('.cj-member').waitFor({ timeout: 20000 })
  assert.equal(await page.getByText('Application error', { exact: false }).count(), 0)
  assert.deepEqual(unexpected(errors), [], `${name} has unexpected browser errors`)

  results.push({ name, appointmentIds, summaryAppointmentId: summary.appointment?.id ?? null, layout })
  await context.close()
}

try {
  await verify({ width: 1280, height: 900 }, 'desktop')
  await verify({ width: 390, height: 844 }, 'mobile')
  console.log(JSON.stringify({ release: 'v614', results }, null, 2))
} finally {
  await browser.close()
}
