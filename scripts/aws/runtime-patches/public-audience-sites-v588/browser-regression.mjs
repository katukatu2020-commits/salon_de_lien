import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const baseUrl = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3588').replace(/\/$/, '')
const screenshots = process.env.SCREENSHOT_DIR || path.resolve('artifacts/public-audience-sites-v588/screenshots')
const full = process.env.FULL_BROWSER_AUDIT === '1'
fs.mkdirSync(screenshots, { recursive:true })
const browser = await chromium.launch({ headless:true, executablePath:process.env.CHROME_PATH })
const routes = [
  ['/', 'customer', ['/u/register','/u/login']],
  ['/business', 'business', ['/business/salon','/business/dealer']],
  ['/business/salon', 'salon', ['/admin/register','/admin/login']],
  ['/business/dealer', 'dealer', ['/dealer/register','/dealer/login']],
]
const viewports = full ? [
  { width:1440, height:1000 }, { width:390, height:844 }, { width:320, height:740 },
  { width:768, height:1024 }, { width:2560, height:1080 }, { width:1280, height:720 },
  { width:375, height:667 }, { width:320, height:568 },
] : [{ width:1440, height:1000 }, { width:390, height:844 }]
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    for (const [route, audience, targets] of routes) {
      const response = await page.goto(baseUrl + route, { waitUntil:'networkidle' })
      assert.equal(response.status(), 200)
      assert.equal(response.headers()['x-lien-public-audience-sites'], 'v588')
      assert.equal(await page.locator('body').getAttribute('data-audience'), audience)
      assert.equal(await page.locator('main h1').count(), 1)
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://salon-de-lien.com' + route)
      for (const target of targets) assert.ok(await page.locator(`main a[href="${target}"]`).count() > 0, `${audience}: missing ${target}`)
      if (audience === 'customer') {
        const businessLinks = await page.locator('a[href]').evaluateAll(links => links.map(link => link.getAttribute('href')).filter(href => /^\/(admin|dealer|business)(\/|$)/.test(href)))
        assert.deepEqual(businessLinks, [])
        assert.ok(!(await page.locator('main').innerText()).includes('顧客管理'))
      }
      const layout = await page.evaluate(() => {
        const hero = document.querySelector('.hero').getBoundingClientRect()
        const copy = document.querySelector('.hero-copy').getBoundingClientRect()
        return { width:innerWidth, height:innerHeight, scrollWidth:document.documentElement.scrollWidth, heroBottom:hero.bottom, copyTop:copy.top, copyBottom:copy.bottom, heroTop:hero.top }
      })
      assert.ok(layout.scrollWidth <= layout.width + 1, `${audience} ${viewport.width}: horizontal page overflow`)
      assert.ok(layout.copyTop >= layout.heroTop && layout.copyBottom <= layout.heroBottom + 1, `${audience} ${viewport.width}: hero copy is clipped`)
      assert.ok(layout.heroBottom <= layout.height - 24, `${audience} ${viewport.width}: next section is not visible`)
      const invalidHashes = await page.locator('a[href^="#"]').evaluateAll(links => links.map(link => link.getAttribute('href')).filter(href => !document.getElementById(href.slice(1))))
      assert.deepEqual(invalidHashes, [])
      assert.equal(await page.locator('.desktop-nav').isVisible(), true)
      if (audience === 'customer') {
        await page.locator('.desktop-nav a[href="#services"]').click()
        await page.waitForFunction(() => Math.abs(document.querySelector('#services').getBoundingClientRect().top - parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)) < 2)
      }
      for (const img of await page.locator('main img').all()) {
        await img.scrollIntoViewIfNeeded()
        await img.evaluate(image => image.complete ? undefined : new Promise((resolve, reject) => { image.addEventListener('load', resolve, { once:true }); image.addEventListener('error', reject, { once:true }) }))
        assert.ok(await img.evaluate(image => image.naturalWidth > 0), `${audience}: image failed to load`)
      }
      const faq = page.locator('.faq-list details').first()
      if (await faq.count()) {
        await faq.locator('summary').click()
        assert.equal(await faq.getAttribute('open'), '')
        assert.equal(await faq.locator('div').isVisible(), true)
        await faq.locator('summary').click()
        assert.equal(await faq.getAttribute('open'), null)
      }
      await page.evaluate(() => scrollTo({ top:0, behavior:'instant' }))
      if (viewport.width === 1440 || viewport.width === 390) {
        await page.screenshot({ path:path.join(screenshots, `${audience}-${viewport.width}.png`) })
        await page.screenshot({ path:path.join(screenshots, `${audience}-${viewport.width}-full.png`), fullPage:true })
      }
      if (audience === 'business') {
        await page.locator('.solution a.action[href="/business/dealer"]').click()
        await page.waitForURL(baseUrl + '/business/dealer')
        assert.equal(await page.locator('body').getAttribute('data-audience'), 'dealer')
      }
    }
    if (viewport.width === 1440 || viewport.width === 390) {
      for (const legal of ['privacy','terms']) {
        await page.goto(baseUrl + '/' + legal, { waitUntil:'networkidle' })
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${legal}: horizontal overflow`)
        await page.screenshot({ path:path.join(screenshots, `${legal}-${viewport.width}.png`) })
      }
    }
    assert.deepEqual(errors, [])
    await context.close()
  }
  const context = await browser.newContext()
  for (const route of ['/privacy', '/terms']) {
    const response = await context.request.get(baseUrl + route)
    assert.equal(response.status(), 200)
    assert.ok((await response.text()).includes('070-9444-6007'))
  }
  const css = await context.request.get(baseUrl + '/orimia-public-v588.css')
  assert.equal(css.status(), 200)
  assert.match(css.headers()['content-type'], /text\/css/)
  console.log(JSON.stringify({ release:'public-audience-sites-v588', audiences:4, viewports:viewports.length, customerBusinessLinksAbsent:true, imagesLoaded:true, faq:true, navigation:true, legalPages:true }))
} finally {
  await browser.close()
}
