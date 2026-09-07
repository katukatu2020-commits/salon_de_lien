import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.TEST_BASE_URL || 'http://127.0.0.1:3155').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
const outputDir = process.env.SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-admin-sidebar-labels-v578')
fs.mkdirSync(outputDir, { recursive:true })

const expectedItems = [
  { path:'/admin/appointments', label:'予約・シフト・会計' },
  { path:'/admin/customers', label:'顧客・カルテ・配信' },
  { path:'/admin/products', label:'メニュー・商品・在庫' },
  { path:'/admin/community', label:'スタイル投稿' },
  { path:'/admin/owner-analytics', label:'経営・会計管理' },
]
const staleLabels = ['予約カレンダー', '顧客・チャット・配信', 'メニュー・商品棚・集計', 'スタイル共有', '経営分析']

const browser = await chromium.launch(executablePath ? { executablePath, headless:true } : { headless:true })

async function login(context, next) {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    form:{ email:'demo.owner', password:'LienDemo2026!', next },
  })
  assert.ok(response.ok(), `admin login failed with ${response.status()}`)
}

async function verifySidebar(page, label) {
  const nav = page.locator('nav[aria-label="管理画面ナビゲーション"]:visible').first()
  await nav.waitFor({ state:'visible', timeout:15_000 })
  const links = await nav.locator('a[href]').evaluateAll(nodes => nodes.map(node => ({
    href:new URL(node.getAttribute('href') || '', location.origin).pathname,
    text:(node.textContent || '').trim(),
    box:node.getBoundingClientRect().toJSON(),
  })))
  for (const expected of expectedItems) {
    const item = links.find(link => link.href === expected.path)
    assert.ok(item, `${label}: ${expected.path} is missing`)
    assert.equal(item.text, expected.label, `${label}: ${expected.path} label`)
  }
  const navText = await nav.innerText()
  for (const stale of staleLabels) assert.equal(navText.includes(stale), false, `${label}: stale label ${stale}`)
  return { nav, links }
}

async function verifyDesktop() {
  const context = await browser.newContext({ viewport:{ width:1440, height:900 } })
  await login(context, '/admin/appointments')
  const page = await context.newPage()
  const routes = [
    '/admin/appointments',
    '/admin/customers/messages/campaigns',
    '/admin/products/orders',
    '/admin/community',
    '/admin/owner-analytics?section=billing',
  ]

  for (const route of routes) {
    await page.goto(`${baseUrl}${route}${route.includes('?') ? '&' : '?'}verify=v578`, { waitUntil:'domcontentloaded', timeout:30_000 })
    assert.equal(new URL(page.url()).pathname, new URL(route, baseUrl).pathname, `${route}: unexpected redirect`)
    await verifySidebar(page, `desktop ${route}`)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), false, `${route}: horizontal overflow`)
  }

  await page.goto(`${baseUrl}/admin/appointments?verify=v578-screenshot`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await verifySidebar(page, 'desktop screenshot')
  await page.screenshot({ path:path.join(outputDir, 'sidebar-desktop.png'), fullPage:false })
  await context.close()
}

async function verifyMobile() {
  const context = await browser.newContext({ viewport:{ width:390, height:844 } })
  await login(context, '/admin/appointments')
  const page = await context.newPage()
  await page.goto(`${baseUrl}/admin/appointments?verify=v578-mobile`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await page.getByRole('button', { name:'メニューを開く' }).click()
  const { nav, links } = await verifySidebar(page, 'mobile drawer')
  const navBox = await nav.boundingBox()
  assert.ok(navBox, 'mobile drawer nav box is missing')
  for (const link of links) {
    assert.ok(link.box.x >= navBox.x - 1, `${link.text}: left overflow`)
    assert.ok(link.box.x + link.box.width <= navBox.x + navBox.width + 1, `${link.text}: right overflow`)
  }
  await page.screenshot({ path:path.join(outputDir, 'sidebar-mobile.png'), fullPage:false })
  await context.close()
}

try {
  await verifyDesktop()
  await verifyMobile()
  console.log(JSON.stringify({ release:'admin-sidebar-labels-v578', desktop:true, mobile:true, standaloneRoutes:true }))
} finally {
  await browser.close()
}
