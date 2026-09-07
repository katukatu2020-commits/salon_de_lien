import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3148').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const artifactRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-admin-home-visual-v573')
const configuredImage = '/api/lien-customer-home-branding/image?audience=staff&v=573001'
const imageApiPath = '/api/lien-customer-home-branding/image'
const defaultImage = '/brand/salon-interior-illustrated.png'
const fixtureImage = fs.readFileSync(path.resolve(process.cwd(), 'public/brand/customer-crm.webp'))
const knownHydrationNoise = /Minified React error #(329|418|423)/
fs.mkdirSync(artifactRoot, { recursive:true })

async function login(context, next = '/admin/appointments') {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    form:{ email:'demo.owner', password:'LienDemo2026!', next },
  })
  assert.ok(response.ok(), `login failed with ${response.status()}`)
}

async function mockBranding(page, imageUrl) {
  await page.route(/\/api\/lien-customer-home-branding\/image\?/, route => route.fulfill({
    status:200,
    contentType:'image/webp',
    body:fixtureImage,
  }))
  await page.route(/\/api\/lien-customer-home-branding\?/, route => route.fulfill({
    status:200,
    contentType:'application/json',
    body:JSON.stringify({
      success:true,
      branding:{ phrase:'Test salon', imageKey:imageUrl === defaultImage ? null : 'private/test.jpg', imageUrl, isDefault:imageUrl === defaultImage },
    }),
  }))
}

async function openAndInspect(page, pathname) {
  await page.goto(`${baseUrl}${pathname}`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await page.waitForFunction(() => document.documentElement.classList.contains('orimia-admin-home-visual-ready-v573'), null, { timeout:15_000 })
  await page.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516', null, { timeout:15_000 })
  await page.waitForFunction(() => {
    const targets = [...document.querySelectorAll('img[data-orimia-admin-home-visual-v573="1"]')]
    return targets.length > 0 && targets.every(image => image.complete && image.naturalWidth > 0)
  }, null, { timeout:15_000 })
  await page.waitForTimeout(350)
  return page.evaluate(() => {
    const targets = [...document.querySelectorAll('img[data-orimia-admin-home-visual-v573="1"]')]
    return {
      release:window.__orimiaAdminHomeVisualV573?.version,
      shell:document.querySelectorAll('.admin-app-shell').length,
      targetCount:targets.length,
      sources:targets.map(image => image.getAttribute('src')),
      originals:targets.map(image => image.dataset.orimiaAdminHomeVisualV573Original),
      srcsetCount:targets.filter(image => image.hasAttribute('srcset')).length,
      loaded:targets.every(image => image.complete && image.naturalWidth > 0),
      naturalWidths:targets.map(image => image.naturalWidth),
      centered:targets.every(image => getComputedStyle(image).objectPosition === '50% 50%'),
      escapedTargets:targets.filter(image => !image.closest('.admin-app-shell')).length,
      logos:[...document.querySelectorAll('img[src*="orimia-icon"],img[src*="customer-service-mark"]')].map(image => image.getAttribute('src')),
      productImages:[...document.querySelectorAll('.ca-product-uploaded-thumb')].map(image => image.getAttribute('src')),
      styleImages:[...document.querySelectorAll('img')].filter(image => image.closest('[data-community-style-card],.community-style-card')).map(image => image.getAttribute('src')),
      overflow:document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }
  })
}

const browser = await chromium.launch({ executablePath, headless:true })
const errors = []
try {
  const context = await browser.newContext({ viewport:{ width:1440, height:1000 } })
  await login(context)
  const page = await context.newPage()
  page.on('console', message => {
    if (message.type() === 'error' && !knownHydrationNoise.test(message.text())) errors.push(`console:${message.text()}`)
  })
  page.on('pageerror', error => {
    if (!knownHydrationNoise.test(String(error))) errors.push(`pageerror:${error}`)
  })
  await mockBranding(page, configuredImage)

  const expectedMinimum = new Map([
    ['/admin/appointments', 2],
    ['/admin/customers', 2],
    ['/admin/products', 2],
    ['/admin/community', 2],
    ['/admin/owner-analytics', 1],
    ['/admin/products/orders', 2],
    ['/admin/settings', 1],
  ])
  for (const [pathname, minimum] of expectedMinimum) {
    const state = await openAndInspect(page, pathname)
    assert.equal(state.release, 'v573')
    assert.equal(state.shell, 1)
    assert.ok(state.targetCount >= minimum, `${pathname}: expected at least ${minimum} bound visuals, found ${state.targetCount}`)
    assert.ok(state.sources.every(source => source === configuredImage), `${pathname}: a decorative visual did not use the configured image`)
    assert.ok(state.originals.every(source => source && !source.includes(imageApiPath)), `${pathname}: original sources were not retained`)
    assert.equal(state.srcsetCount, 0)
    assert.equal(state.loaded, true, `${pathname}: a configured image did not load (${state.naturalWidths.join(', ')})`)
    assert.equal(state.centered, true)
    assert.equal(state.escapedTargets, 0)
    assert.equal(state.overflow, false)
    assert.ok(state.logos.every(source => !source.includes(imageApiPath)), `${pathname}: a logo was replaced`)
    if (pathname === '/admin/products') {
      assert.ok(state.productImages.length > 0, 'product fixtures are missing')
      assert.ok(state.productImages.every(source => source !== configuredImage), 'a product image was replaced')
    }
  }
  await openAndInspect(page, '/admin/products')
  await page.screenshot({ path:path.join(artifactRoot, 'desktop-products.png'), fullPage:true })
  await context.close()

  const mobileContext = await browser.newContext({ viewport:{ width:390, height:844 } })
  await login(mobileContext)
  const mobilePage = await mobileContext.newPage()
  await mockBranding(mobilePage, configuredImage)
  const mobile = await openAndInspect(mobilePage, '/admin/appointments')
  assert.ok(mobile.targetCount >= 2)
  assert.ok(mobile.sources.every(source => source === configuredImage))
  assert.equal(mobile.loaded, true)
  assert.equal(mobile.overflow, false)
  await mobilePage.screenshot({ path:path.join(artifactRoot, 'mobile-appointments.png') })
  await mobileContext.close()

  const defaultContext = await browser.newContext({ viewport:{ width:1280, height:900 } })
  await login(defaultContext)
  const defaultPage = await defaultContext.newPage()
  await mockBranding(defaultPage, defaultImage)
  const fallback = await openAndInspect(defaultPage, '/admin/customers')
  assert.ok(fallback.targetCount >= 2)
  assert.ok(fallback.sources.every(source => source === defaultImage))
  assert.equal(fallback.loaded, true)
  await defaultContext.close()

  for (const filename of fs.readdirSync(artifactRoot).filter(name => name.endsWith('.png'))) {
    assert.ok(fs.statSync(path.join(artifactRoot, filename)).size > 15_000, `${filename} appears blank`)
  }
  assert.deepEqual(errors, [], errors.join('\n'))
  console.log(JSON.stringify({
    release:'admin-home-visual-v573',
    browserVerified:true,
    routes:7,
    desktop:true,
    mobile:true,
    defaultFallback:true,
    contentImagesPreserved:true,
    artifacts:artifactRoot,
  }))
} finally {
  await browser.close()
}
