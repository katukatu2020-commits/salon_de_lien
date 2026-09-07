import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

for (let attempt = 1; attempt <= 20; attempt += 1) {
  const response = await fetch(`${baseUrl}/api/health/ready?smoke=v573-${Date.now()}-${attempt}`, { cache:'no-store' })
  if (
    response.status === 200
    && response.headers.get('x-lien-admin-home-visual') === 'v573'
    && response.headers.get('x-lien-admin-shared-page-format') === 'v572'
    && response.headers.get('x-lien-customer-home-branding') === 'v528'
  ) break
  if (attempt === 20) assert.fail(`production readiness did not reach v573; last status ${response.status}`)
  await sleep(1500)
}

const browser = await chromium.launch(executablePath ? { executablePath, headless:true } : { headless:true })
try {
  const context = await browser.newContext({ viewport:{ width:1440, height:1000 } })
  const login = await context.request.post(`${baseUrl}/api/auth/login`, {
    form:{ email:'demo.owner', password:'LienDemo2026!', next:'/admin/appointments' },
  })
  assert.ok(login.ok(), `owner login failed: ${login.status()}`)
  const page = await context.newPage()

  for (const [pathname, minimum] of [
    ['/admin/appointments', 2],
    ['/admin/customers', 2],
    ['/admin/products', 2],
    ['/admin/community', 2],
    ['/admin/products/orders', 2],
  ]) {
    await page.goto(`${baseUrl}${pathname}`, { waitUntil:'domcontentloaded', timeout:30_000 })
    await page.waitForFunction(() => document.documentElement.classList.contains('orimia-admin-home-visual-ready-v573'), null, { timeout:15_000 })
    await page.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516', null, { timeout:15_000 })
    await page.waitForFunction(() => {
      const targets = [...document.querySelectorAll('img[data-orimia-admin-home-visual-v573="1"]')]
      return targets.length > 0 && targets.every(image => image.complete && image.naturalWidth > 0)
    }, null, { timeout:15_000 })
    await page.waitForTimeout(350)
    const state = await page.evaluate(() => {
      const targets = [...document.querySelectorAll('img[data-orimia-admin-home-visual-v573="1"]')]
      const configured = document.documentElement.dataset.orimiaAdminHomeVisualV573
      return {
        release:window.__orimiaAdminHomeVisualV573?.version,
        configured,
        targets:targets.map(image => image.getAttribute('src')),
        loaded:targets.every(image => image.complete && image.naturalWidth > 0),
        outside:targets.filter(image => !image.closest('.admin-app-shell')).length,
        productImages:[...document.querySelectorAll('.ca-product-uploaded-thumb')].map(image => image.getAttribute('src')),
      }
    })
    assert.equal(state.release, 'v573')
    assert.ok(state.targets.length >= minimum, `${pathname}: bound visual count is ${state.targets.length}`)
    assert.ok(state.configured, `${pathname}: configured image URL is missing`)
    assert.ok(state.targets.every(source => source === state.configured), `${pathname}: decorative images are not using one source`)
    assert.equal(state.loaded, true, `${pathname}: a configured image did not load`)
    assert.equal(state.outside, 0)
    if (pathname === '/admin/products') {
      assert.ok(state.productImages.length > 0)
      assert.ok(state.productImages.every(source => source !== state.configured), 'product images were replaced')
    }
  }
  await context.close()
} finally {
  await browser.close()
}

console.log(JSON.stringify({
  release:'admin-home-visual-v573',
  production:true,
  tenantHomeImage:true,
  sharedAdminVisuals:true,
  contentImagesPreserved:true,
  readOnly:true,
}))
