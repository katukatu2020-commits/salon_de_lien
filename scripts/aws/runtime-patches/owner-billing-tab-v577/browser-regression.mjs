import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.TEST_BASE_URL || 'http://127.0.0.1:3154').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
const outputDir = process.env.SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-owner-billing-tab-v577')
fs.mkdirSync(outputDir, { recursive:true })

const browser = await chromium.launch(executablePath ? { executablePath, headless:true } : { headless:true })

async function verifyViewport(label, viewport) {
  const context = await browser.newContext({ viewport })
  const login = await context.request.post(`${baseUrl}/api/auth/login`, {
    form:{ email:'demo.owner', password:'LienDemo2026!', next:'/admin/owner-analytics' },
  })
  assert.ok(login.ok(), `${label}: admin login failed with ${login.status()}`)

  const page = await context.newPage()
  const navSelector = 'nav[aria-label="経営ページ切替"]'

  async function expectActive(expected) {
    await page.waitForFunction(
      ([selector, key]) => document.querySelector(selector)?.dataset.ownerTabActiveV577 === key,
      [navSelector, expected],
      { timeout:15_000 },
    )
    const state = await page.locator(`${navSelector} a`).evaluateAll(links => links.map(link => ({
      href:link.getAttribute('href'),
      current:link.getAttribute('aria-current'),
      active:link.classList.contains('bg-[color:var(--lien-primary)]'),
      inactive:link.classList.contains('text-lien-muted'),
    })))
    const expectedHref = expected === 'billing'
      ? '/admin/owner-analytics?section=billing'
      : expected === 'ledger' ? '/admin/owner-analytics?salesLedger=1' : '/admin/owner-analytics'
    assert.equal(state.filter(tab => tab.current === 'page').length, 1, `${label}: aria-current must be unique`)
    assert.equal(state.filter(tab => tab.active).length, 1, `${label}: visual active class must be unique`)
    const selected = state.find(tab => tab.href === expectedHref)
    assert.ok(selected, `${label}: ${expected} tab is missing`)
    assert.equal(selected.current, 'page', `${label}: ${expected} aria-current`)
    assert.equal(selected.active, true, `${label}: ${expected} active class`)
    assert.equal(selected.inactive, false, `${label}: ${expected} inactive class removed`)
  }

  await page.goto(`${baseUrl}/admin/owner-analytics?verify=v577-${label}`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await page.locator(navSelector).waitFor({ state:'visible', timeout:15_000 })
  await expectActive('analytics')

  await page.locator(`${navSelector} a[href*="section=billing"]`).click()
  await page.waitForURL(url => url.searchParams.get('section') === 'billing', { timeout:15_000 })
  await page.getByRole('heading', { name:'システム利用料', exact:true }).waitFor({ state:'visible', timeout:15_000 })
  await expectActive('billing')

  await page.evaluate(selector => {
    const links = [...document.querySelectorAll(`${selector} a`)]
    const active = ['bg-[color:var(--lien-primary)]', 'text-white', 'shadow-sm']
    const inactive = ['text-lien-muted', 'hover:bg-lien-soft', 'hover:text-lien-ink']
    for (const [index, link] of links.entries()) {
      const wrongCurrent = index === 0
      link.classList.remove(...(wrongCurrent ? inactive : active))
      link.classList.add(...(wrongCurrent ? active : inactive))
      if (wrongCurrent) link.setAttribute('aria-current', 'page')
      else link.removeAttribute('aria-current')
    }
    document.querySelector(selector)?.removeAttribute('data-owner-tab-active-v577')
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted:true }))
  }, navSelector)
  await expectActive('billing')

  await page.locator(`${navSelector} a[href*="salesLedger=1"]`).click()
  await page.waitForURL(url => url.searchParams.get('salesLedger') === '1', { timeout:15_000 })
  await page.locator('[data-sl-ledger-portal]').waitFor({ state:'attached', timeout:15_000 })
  await expectActive('ledger')

  await page.goBack({ waitUntil:'domcontentloaded' })
  await page.waitForURL(url => url.searchParams.get('section') === 'billing', { timeout:15_000 })
  await expectActive('billing')

  await page.goBack({ waitUntil:'domcontentloaded' })
  await page.waitForURL(url => !url.searchParams.has('section') && !url.searchParams.has('salesLedger'), { timeout:15_000 })
  await expectActive('analytics')

  await page.goto(`${baseUrl}/admin/owner-analytics?section=billing`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await page.getByRole('heading', { name:'システム利用料', exact:true }).waitFor({ state:'visible', timeout:15_000 })
  await expectActive('billing')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), false)
  await page.screenshot({ path:path.join(outputDir, `billing-${label}.png`), fullPage:true })
  await context.close()
}

try {
  await verifyViewport('desktop', { width:1440, height:900 })
  await verifyViewport('mobile', { width:390, height:844 })
  console.log(JSON.stringify({ release:'owner-billing-tab-v577', desktop:true, mobile:true, click:true, history:true, restoredPage:true }))
} finally {
  await browser.close()
}
