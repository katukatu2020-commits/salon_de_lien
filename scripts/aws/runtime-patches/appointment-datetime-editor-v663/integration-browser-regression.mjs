import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3186').replace(/\/$/, '')
const screenshotDir = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'appointment-datetime-editor-v663-integration')
const mutationAppointmentId = String(process.env.VERIFY_MUTATION_APPOINTMENT_ID || '')
const mutationDate = String(process.env.VERIFY_MUTATION_DATE || '2026-11-17')
const mutationTime = String(process.env.VERIFY_MUTATION_TIME || '15:15')
fs.mkdirSync(screenshotDir, { recursive: true })

function monthOffset(offset) {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit' }).formatToParts(now)
  const year = Number(parts.find(part => part.type === 'year').value)
  const month = Number(parts.find(part => part.type === 'month').value)
  const date = new Date(Date.UTC(year, month - 1 + offset, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

const browser = await chromium.launch({ executablePath, headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
  const login = await context.request.post(`${baseUrl}/api/auth/login`, {
    form: {
      email: process.env.VERIFY_ADMIN_ID || 'demo.owner',
      password: process.env.VERIFY_ADMIN_PASSWORD || 'LienDemo2026!',
      next: '/admin/appointments',
    },
  })
  assert.equal(login.ok(), true, `admin login returned ${login.status()}`)

  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  const appointmentLinks = new Set()
  for (const offset of [0, 1, -1, 2]) {
    const response = await page.goto(`${baseUrl}/admin/appointments?month=${monthOffset(offset)}&view=calendar&integration=v663`, {
      waitUntil: 'domcontentloaded', timeout: 45_000,
    })
    assert.equal(response?.ok(), true, `appointments page returned ${response?.status()}`)
    await page.waitForFunction(() => window.__orimiaAppointmentDatetimeEditorV663 === true, null, { timeout: 20_000 })
    const links = await page.locator('a[href*="/admin/appointments/"]').evaluateAll(elements => elements
      .map(element => element.getAttribute('href'))
      .filter(href => /^\/admin\/appointments\/[^/?#]+(?:\?.*)?$/.test(String(href))))
    links.forEach(link => appointmentLinks.add(link.split('?')[0]))
    if (appointmentLinks.size >= 8) break
  }
  assert.ok(appointmentLinks.size > 0, 'no appointment detail links were available for production verification')

  let editableHref = ''
  for (const href of Array.from(appointmentLinks).slice(0, 16)) {
    const response = await page.goto(`${baseUrl}${href}?integration=v663`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    if (!response?.ok()) continue
    await page.waitForFunction(() => window.__orimiaAppointmentDatetimeEditorV663 === true, null, { timeout: 20_000 })
    await page.waitForTimeout(700)
    const trigger = page.locator('[data-orimia-appointment-datetime-trigger-v663]')
    if (await trigger.count()) {
      await trigger.waitFor({ state: 'visible', timeout: 10_000 })
      editableHref = href
      break
    }
  }
  assert.ok(editableHref, 'no active appointment exposed the datetime editor')

  const trigger = page.locator('[data-orimia-appointment-datetime-trigger-v663]')
  await page.waitForTimeout(500)
  pageErrors.length = 0
  await trigger.click()
  const dialog = page.locator('#orimia-appointment-datetime-v663')
  await dialog.waitFor({ state: 'visible', timeout: 8_000 })
  assert.match(await dialog.locator('input[name="date"]').inputValue(), /^20\d{2}-\d{2}-\d{2}$/)
  assert.match(await dialog.locator('input[name="time"]').inputValue(), /^\d{2}:\d{2}$/)
  assert.match(await dialog.locator('.orimia-appointment-datetime-summary-v663').textContent(), /施術時間 \d+分 \/ 担当 /)
  assert.equal(await dialog.getByRole('button', { name: '変更を保存' }).isEnabled(), true)

  await page.setViewportSize({ width: 390, height: 844 })
  const overflow = await dialog.locator('.orimia-appointment-datetime-panel-v663').evaluate(element => element.scrollWidth - element.clientWidth)
  assert.ok(overflow <= 1, `production mobile editor overflows by ${overflow}px`)
  await page.screenshot({ path: path.join(screenshotDir, 'appointment-datetime-editor-production-mobile.png'), fullPage: false })
  await dialog.getByRole('button', { name: '閉じる' }).click()
  await dialog.waitFor({ state: 'hidden' })

  let mutationVerified = false
  if (mutationAppointmentId) {
    await page.setViewportSize({ width: 1200, height: 900 })
    const mutationResponse = await page.goto(`${baseUrl}/admin/appointments/${encodeURIComponent(mutationAppointmentId)}?integration=v663-mutation`, {
      waitUntil: 'domcontentloaded', timeout: 45_000,
    })
    assert.equal(mutationResponse?.ok(), true, `mutation appointment returned ${mutationResponse?.status()}`)
    await page.waitForFunction(() => window.__orimiaAppointmentDatetimeEditorV663 === true, null, { timeout: 20_000 })
    const mutationTrigger = page.locator('[data-orimia-appointment-datetime-trigger-v663]')
    await mutationTrigger.waitFor({ state: 'visible', timeout: 12_000 })
    pageErrors.length = 0
    await mutationTrigger.click()
    const mutationDialog = page.locator('#orimia-appointment-datetime-v663')
    await mutationDialog.waitFor({ state: 'visible', timeout: 8_000 })
    await mutationDialog.locator('input[name="date"]').fill(mutationDate)
    await mutationDialog.locator('input[name="time"]').fill(mutationTime)
    const scheduleResponse = page.waitForResponse(response =>
      response.url().includes(`/api/admin/appointments/${encodeURIComponent(mutationAppointmentId)}/schedule`)
      && response.request().method() === 'PATCH',
    )
    await mutationDialog.getByRole('button', { name: '変更を保存' }).click()
    assert.equal((await scheduleResponse).ok(), true, 'schedule mutation API failed')
    await page.getByText('予約日時を変更しました。シフト表とお客様アプリにも反映されます。').waitFor({ state: 'visible' })
    const expected = mutationDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    assert.ok(expected)
    const weekday = ['日', '月', '火', '水', '木', '金', '土'][new Date(`${mutationDate}T00:00:00Z`).getUTCDay()]
    const displayed = `${Number(expected[1])}年${Number(expected[2])}月${Number(expected[3])}日(${weekday}) ${mutationTime}`
    assert.equal(await page.evaluate(() => {
      const label = Array.from(document.querySelectorAll('p')).find(element => String(element.textContent || '').trim() === '予約日時')
      return label?.parentElement?.querySelector('.tabular-nums')?.textContent
    }), displayed)
    mutationVerified = true
  }

  const unexpectedPageErrors = pageErrors.filter(message => !/Minified React error #(418|423)\b/.test(message))
  assert.deepEqual(unexpectedPageErrors, [])
  await context.close()

  console.log(JSON.stringify({
    release: 'appointment-datetime-editor-v663',
    integrationBrowserVerified: true,
    editableHref,
    productionDataNotMutated: !mutationAppointmentId,
    mutationVerified,
    mobileVerified: true,
    screenshotDir,
  }))
} finally {
  await browser.close()
}
