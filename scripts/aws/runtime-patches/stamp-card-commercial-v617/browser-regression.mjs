import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3617').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/stamp-card-commercial-v617/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
const results = []

function collectErrors(page) {
  const errors = []
  page.on('pageerror', error => errors.push(`page: ${error.message}`))
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`) })
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

async function customerLogin(context) {
  const response = await context.request.post(`${base}/api/customer-auth/login`, {
    headers: { Origin: base },
    form: { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/stamps' },
  })
  assert.ok(response.ok(), `Customer login returned ${response.status()}`)
}

async function verify(width) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 })
  await customerLogin(context)
  const page = await context.newPage()
  const errors = collectErrors(page)
  await page.goto(`${base}/u/stamps?verify=v617-${width}`, { waitUntil: 'domcontentloaded', timeout: 30_000 })

  const card = page.locator('[data-stamp-card-v617]')
  await card.waitFor({ state: 'visible', timeout: 20_000 })
  await page.locator('link#stamp-card-commercial-v617').waitFor({ state: 'attached' })
  const routeLoader = page.locator('#orimia-ui-loader-v536')
  if (await routeLoader.count()) await routeLoader.waitFor({ state: 'hidden', timeout: 10_000 })
  await page.getByRole('heading', { name: 'スタンプカード', exact: true }).waitFor()

  assert.equal(await page.locator('[data-stamp-card-v617]').count(), 1)
  assert.equal(await card.getByText('ORIMIA MEMBER CARD', { exact: true }).count(), 1)
  assert.ok((await card.locator('.sc-card-brand-v617 h2').innerText()).trim().length > 0, `${width}: store name missing`)
  assert.ok((await card.locator('.sc-reward-copy-v617 h3').innerText()).trim().length > 0, `${width}: reward title missing`)
  const bookingLink = card.getByRole('link', { name: '予約する', exact: false })
  assert.equal(await bookingLink.count(), 1)

  const requiredText = await card.locator('.sc-count-v617 strong').innerText()
  const required = Number(requiredText.split('/')[1]?.trim())
  assert.ok(Number.isInteger(required) && required >= 1 && required <= 50, `${width}: required visits missing`)
  assert.equal(await card.locator('.sc-stamp-v617').count(), required)

  const layout = await page.evaluate(() => {
    const stamps = [...document.querySelectorAll('.sc-stamp-seal-v617')]
    const cardNode = document.querySelector('[data-stamp-card-v617]')
    return {
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      cardWidth: cardNode?.getBoundingClientRect().width || 0,
      cardScrollWidth: cardNode?.scrollWidth || 0,
      maxStampWidth: Math.max(0, ...stamps.map(node => node.getBoundingClientRect().width)),
      minStampWidth: Math.min(...stamps.map(node => node.getBoundingClientRect().width)),
      cardHeaderColor: getComputedStyle(document.querySelector('.sc-card-head-v617')).backgroundColor,
    }
  })
  assert.ok(layout.documentWidth <= layout.viewportWidth + 1, `${width}: page has horizontal overflow`)
  assert.ok(layout.cardScrollWidth <= layout.cardWidth + 1, `${width}: card has horizontal overflow`)
  assert.ok(layout.maxStampWidth <= 54, `${width}: stamp became oversized`)
  assert.ok(layout.minStampWidth >= 40, `${width}: stamp became unreadably small`)
  assert.equal(layout.cardHeaderColor, 'rgb(47, 43, 41)')
  assert.ok(await page.locator('.sc-page-head-v617 h1').evaluate(node => node.getBoundingClientRect().height < 80), `${width}: page title wrapped vertically`)
  await page.screenshot({ path: path.join(output, `customer-${width}.png`), fullPage: true })

  await bookingLink.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await page.waitForTimeout(100)
  const bookingLinkOverlap = await page.evaluate(() => {
    const link = document.querySelector('.sc-reward-link-v617')
    const linkRect = link?.getBoundingClientRect()
    if (!linkRect) return true
    return [...document.body.querySelectorAll('*')].some(node => {
      if (node === link || node.contains(link) || link.contains(node)) return false
      const style = getComputedStyle(node)
      if (style.position !== 'fixed' || style.visibility === 'hidden' || style.display === 'none') return false
      const rect = node.getBoundingClientRect()
      if (rect.height < 36 || rect.top < innerHeight / 2) return false
      return rect.left < linkRect.right && rect.right > linkRect.left && rect.top < linkRect.bottom && rect.bottom > linkRect.top
    })
  })
  assert.equal(bookingLinkOverlap, false, `${width}: booking action is covered by fixed navigation`)
  await page.screenshot({ path: path.join(output, `customer-${width}-reward.png`), fullPage: false })

  await page.evaluate(() => {
    const list = document.querySelector('.sc-stamps-v617')
    if (!list) return
    list.style.setProperty('--sc-columns', '8')
    list.style.setProperty('--sc-mobile-columns', '5')
    const check = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>'
    list.innerHTML = Array.from({ length: 50 }, (_, index) => {
      const earned = index < 25
      const milestone = index === 49
      return `<li class="sc-stamp-v617${earned ? ' is-earned' : ''}${milestone ? ' is-milestone' : ''}"><span class="sc-stamp-seal-v617">${earned ? check : index + 1}</span><small>${milestone ? '特典' : ''}</small></li>`
    }).join('')
  })
  const stress = await page.evaluate(() => {
    const cardNode = document.querySelector('[data-st-card-v617], [data-stamp-card-v617]')
    const stamps = [...document.querySelectorAll('.sc-stamp-seal-v617')]
    return {
      count: stamps.length,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      cardOverflow: (cardNode?.scrollWidth || 0) - (cardNode?.clientWidth || 0),
      stampPanelOverflow: (() => {
        const panel = document.querySelector('.sc-stamp-panel-v617')
        const list = document.querySelector('.sc-stamps-v617')
        return Math.max(0, (list?.getBoundingClientRect().right || 0) - (panel?.getBoundingClientRect().right || 0))
      })(),
      maxStampWidth: Math.max(0, ...stamps.map(node => node.getBoundingClientRect().width)),
    }
  })
  assert.equal(stress.count, 50)
  assert.ok(stress.documentWidth <= stress.viewportWidth + 1, `${width}: 50-stamp page overflow`)
  assert.ok(stress.cardOverflow <= 1, `${width}: 50-stamp card overflow`)
  assert.ok(stress.stampPanelOverflow <= 1, `${width}: 50-stamp grid overlaps its progress panel`)
  assert.ok(stress.maxStampWidth <= 54, `${width}: 50-stamp sizing regression`)
  assert.deepEqual(unexpected(errors), [], `${width}: unexpected browser errors`)

  results.push({ width, storeBrand: true, rewardHierarchy: true, responsiveGrid: true, fiftyStampStress: true, noOverflow: true })
  await context.close()
}

try {
  await verify(320)
  await verify(390)
  await verify(768)
  await verify(1024)
  await verify(1280)
  console.log(JSON.stringify({ release: 'v617', passed: true, results }, null, 2))
} finally {
  await browser.close()
}
