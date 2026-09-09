import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'http://localhost:3603').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/stamp-program-v603/browser'
const allowMutations = process.env.ALLOW_BROWSER_MUTATIONS === 'true'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive:true })

const browser = await chromium.launch({ executablePath, headless:true })
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
    && !message.includes('Minified React error #329')
    && !message.includes('Failed to load resource: the server responded with a status of 404')
  ))
}

async function staffLogin(context, next = '/admin/settings#settings-business') {
  const response = await context.request.post(`${base}/api/auth/login`, {
    headers:{ Origin:base },
    form:{ email:'demo.owner', password:'LienDemo2026!', next },
  })
  assert.ok(response.ok(), `Staff login returned ${response.status()}`)
}

async function customerLogin(context, next = '/u/stamps') {
  const response = await context.request.post(`${base}/api/customer-auth/login`, {
    headers:{ Origin:base },
    form:{ loginId:'demo.hana', password:'Mypage2026!', next },
  })
  assert.ok(response.ok(), `Customer login returned ${response.status()}`)
}

async function readAdminProgram(context) {
  const response = await context.request.get(`${base}/api/lien-stamp-program`, { headers:{ 'Cache-Control':'no-cache' } })
  const body = await response.json().catch(() => ({}))
  assert.ok(response.ok(), `Stamp API returned ${response.status()}: ${body.error || ''}`)
  return body
}

function writableProgram(program) {
  return {
    requiredVisits:program.requiredVisits,
    rewardType:program.rewardType,
    rewardProductId:program.rewardProductId || '',
    rewardMenuId:program.rewardMenuId || '',
    discountValue:program.discountValue,
    rewardTitle:program.rewardTitle || '',
    rewardDescription:program.rewardDescription || '',
  }
}

async function restoreProgram(context, program) {
  const response = await context.request.patch(`${base}/api/lien-stamp-program`, {
    headers:{ Origin:base, 'Content-Type':'application/json' },
    data:writableProgram(program),
  })
  assert.ok(response.ok(), `Program restore returned ${response.status()}`)
}

async function verifyAdmin(width, context, mutate = false) {
  const page = await context.newPage()
  const errors = collectErrors(page)
  await page.setViewportSize({ width, height:900 })
  await page.goto(`${base}/admin/settings?verify=v603-${width}#settings-business`, { waitUntil:'domcontentloaded', timeout:30_000 })
  const root = page.locator('[data-stamp-settings-v603]')
  await root.waitFor({ state:'attached', timeout:20_000 })
  const businessTab = page.locator('[data-settings-panel="business"]').first()
  if (await businessTab.count()) await businessTab.click()
  await root.waitFor({ state:'visible', timeout:20_000 })
  await root.getByRole('heading', { name:'スタンプカード設定' }).waitFor({ state:'visible' })

  assert.equal(await root.locator('[data-sp-field="requiredVisits"]').count(), 1)
  assert.equal(await root.locator('[data-sp-field="rewardType"]').count(), 1)
  assert.equal(await root.locator('[data-sp-save]').count(), 1)
  assert.ok((await root.innerText()).includes('商品1点無料'))
  assert.ok((await root.innerText()).includes('メニュー無料'))

  if (mutate) {
    await root.locator('[data-sp-field="requiredVisits"]').fill('7')
    await root.locator('[data-sp-field="rewardType"]').selectOption('DISCOUNT_PERCENT')
    await root.locator('[data-sp-field="discountValue"]').fill('12')
    await root.locator('[data-sp-field="rewardTitle"]').fill('')
    await root.locator('[data-sp-field="rewardDescription"]').fill('')
    await root.locator('[data-sp-save]').click()
    await root.locator('[data-sp-feedback].is-success').waitFor({ state:'visible', timeout:15_000 })
    assert.ok((await root.locator('[data-sp-preview-reward]').innerText()).includes('12%OFF'))
  }

  const measurement = await page.evaluate(() => ({
    scrollWidth:document.documentElement.scrollWidth,
    viewportWidth:innerWidth,
    nestedFormCount:document.querySelectorAll('form form').length,
    sectionCount:document.querySelectorAll('[data-stamp-settings-v603]').length,
  }))
  assert.ok(measurement.scrollWidth <= measurement.viewportWidth + 1, `${width}: admin horizontal overflow`)
  assert.equal(measurement.nestedFormCount, 0, `${width}: nested settings form`)
  assert.equal(measurement.sectionCount, 1, `${width}: duplicate settings section`)
  await page.screenshot({ path:path.join(output, `admin-${width}.png`), fullPage:true })
  assert.deepEqual(unexpected(errors), [], `${width}: admin browser errors`)
  results.push({ audience:'admin', width, settings:true, noOverflow:true, mutation:mutate })
  await page.close()
}

async function verifyCustomer(width) {
  const context = await browser.newContext({ viewport:{ width, height:900 }, deviceScaleFactor:1 })
  await customerLogin(context)
  const page = await context.newPage()
  const errors = collectErrors(page)
  await page.goto(`${base}/u/stamps?verify=v603-${width}`, { waitUntil:'domcontentloaded', timeout:30_000 })
  const card = page.locator('[data-stamp-card-v603]')
  await card.waitFor({ state:'visible', timeout:20_000 })
  await page.waitForTimeout(500)

  assert.equal(await page.locator('[data-stamp-card-v603]').count(), 1)
  assert.equal(await page.getByText('ヘア', { exact:true }).count(), 0)
  assert.equal(await page.getByText('フェイシャル', { exact:true }).count(), 0)
  assert.ok((await card.locator('.sp-card-head-v603 h2').innerText()).trim().length > 0, `${width}: store name missing`)
  const requiredText = await card.locator('.sp-card-count-v603 strong').innerText()
  const required = Number(requiredText.split('/')[1]?.trim())
  assert.ok(Number.isInteger(required) && required >= 1 && required <= 50, `${width}: required visits missing`)
  assert.equal(await card.locator('.sp-stamp-v603').count(), required)
  assert.ok((await card.locator('.sp-reward-copy-v603 h3').innerText()).trim().length > 0, `${width}: reward title missing`)

  const measurement = await page.evaluate(() => ({
    scrollWidth:document.documentElement.scrollWidth,
    viewportWidth:innerWidth,
    cardWidth:document.querySelector('[data-stamp-card-v603]')?.getBoundingClientRect().width || 0,
  }))
  assert.ok(measurement.scrollWidth <= measurement.viewportWidth + 1, `${width}: customer horizontal overflow`)
  assert.ok(measurement.cardWidth > 0 && measurement.cardWidth <= width, `${width}: invalid card width`)
  await page.screenshot({ path:path.join(output, `customer-${width}.png`), fullPage:true })
  assert.deepEqual(unexpected(errors), [], `${width}: customer browser errors`)
  results.push({ audience:'customer', width, unifiedCard:true, storeName:true, noOverflow:true })
  await context.close()
}

const adminContext = await browser.newContext({ viewport:{ width:1440, height:900 }, deviceScaleFactor:1 })
await staffLogin(adminContext)
const before = await readAdminProgram(adminContext)

try {
  await verifyAdmin(1440, adminContext, allowMutations)
  if (allowMutations) {
    const saved = await readAdminProgram(adminContext)
    assert.equal(saved.program.requiredVisits, 7)
    assert.equal(saved.program.rewardType, 'DISCOUNT_PERCENT')
    assert.equal(saved.program.discountValue, 12)
  }
  await verifyAdmin(390, adminContext)
  await verifyCustomer(320)
  await verifyCustomer(390)
  await verifyCustomer(1280)
} finally {
  if (allowMutations) await restoreProgram(adminContext, before.program)
  await adminContext.close()
  await browser.close()
}

console.log(JSON.stringify({ passed:true, allowMutations, results }))
