import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = process.env.SMOKE_BASE_URL || 'http://localhost:3593'
const output = process.env.SCREENSHOT_DIR || 'artifacts/customer-login-visual-v593/browser'
fs.mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] })
const errors = []
try {
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1365, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    const response = await page.goto(base + '/u/login?next=/u/history', { waitUntil: 'networkidle' })
    assert.equal(response.status(), 200)
    await page.waitForFunction(() => document.documentElement.classList.contains('cx-v508-login'))
    const photo = page.locator('figure.customer-login-visual-v593')
    await photo.waitFor({ state: 'visible' })
    assert.equal(await photo.locator('svg').count(), 0, 'decorative icon must not exist in the DOM')
    assert.equal(await photo.locator('a').count(), 0)
    const image = photo.locator('img').first()
    await image.evaluate(element => element.decode())
    assert(await image.evaluate(element => element.naturalWidth >= 256))
    const appearance = await photo.evaluate(element => ({
      wrapperBackground: getComputedStyle(element.querySelector(':scope > div')).backgroundColor,
      copyBackground: getComputedStyle(element.querySelector('.customer-login-copy-v593')).backgroundImage,
      textColor: getComputedStyle(element.querySelector('p')).color,
      opacity: getComputedStyle(element.querySelector('img')).opacity,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      box: element.getBoundingClientRect().toJSON(),
    }))
    assert.equal(appearance.wrapperBackground, 'rgba(0, 0, 0, 0)')
    assert(!appearance.copyBackground.includes('255, 253, 249'))
    assert.equal(appearance.textColor, 'rgb(255, 255, 255)')
    assert.equal(appearance.opacity, '1')
    assert.equal(appearance.overflow, false)
    const form = page.locator('form[action="/api/customer-auth/login"]')
    assert.equal(await form.getAttribute('method'), 'post')
    assert.equal(await form.locator('input[name="next"]').inputValue(), '/u/history')
    assert.equal(await form.locator('input[name="password"]').getAttribute('type'), 'password')
    assert.equal(await form.locator('input[name="password"]').getAttribute('autocomplete'), 'current-password')
    await form.locator('input[name="loginId"]').fill('test@example.invalid')
    await form.locator('input[name="password"]').fill('test-only-not-submitted')
    assert(await form.evaluate(element => element.checkValidity()))
    await form.locator('input[name="loginId"]').fill('')
    await form.locator('input[name="password"]').fill('')
    await form.locator('input[name="password"]').blur()
    await page.evaluate(() => scrollTo(0, 0))
    const photoPng = await photo.screenshot()
    const pixels = await page.evaluate(async encoded => {
      const image = new Image(); image.src = 'data:image/png;base64,' + encoded; await image.decode()
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0)
      const data = ctx.getImageData(0, 0, image.width, image.height).data
      let dark = 0, count = 0, sum = 0
      for (let i = 0; i < data.length; i += 4) { const light = (data[i] + data[i + 1] + data[i + 2]) / 3; if (light < 120) dark++; count++; sum += light }
      return { darkFraction: dark / count, meanLuminance: sum / count }
    }, photoPng.toString('base64'))
    assert(pixels.darkFraction > .12, 'photo remains washed out')
    assert(pixels.meanLuminance < 205, 'photo must retain original contrast')
    await page.screenshot({ path: path.join(output, `login-${viewport.width}.png`), fullPage: true, animations: 'disabled' })
    if ([1365, 390].includes(viewport.width)) {
      await page.goto(base + '/u/login?error=credentials', { waitUntil: 'networkidle' })
      assert((await page.getByRole('alert').filter({ hasText: '正しくありません' }).textContent()).includes('正しくありません'))
      assert.equal(await photo.locator('svg').count(), 0)
      await page.screenshot({ path: path.join(output, `error-${viewport.width}.png`), fullPage: true, animations: 'disabled' })
    }
    console.log(JSON.stringify({ viewport, iconAbsent: true, noWhiteWash: true, formPreserved: true, pixels }))
    await context.close()
  }
  const noScript = await browser.newContext({ viewport: { width: 1365, height: 900 }, javaScriptEnabled: false })
  const firstPaint = await noScript.newPage()
  await firstPaint.goto(base + '/u/login', { waitUntil: 'networkidle' })
  assert.equal(await firstPaint.locator('figure svg').count(), 0, 'icon must be removed in SSR, not after hydration')
  assert.equal(await firstPaint.locator('.customer-login-copy-v593 p').first().evaluate(element => getComputedStyle(element).color), 'rgb(255, 255, 255)')
  await firstPaint.screenshot({ path: path.join(output, 'login-no-javascript.png'), fullPage: true })
  for (const route of ['/u/password-reset', '/admin/login', '/admin/register']) {
    const response = await noScript.request.get(base + route)
    assert(!(await response.text()).includes('customer-login-visual-v593'), 'login CSS leaked to ' + route)
  }
  await noScript.close()
  const navigation = await browser.newPage({ viewport: { width: 1365, height: 900 } })
  navigation.on('pageerror', error => errors.push(error.message))
  await navigation.route('**/customer-login-visual-v593.css', route => route.abort())
  await navigation.goto(base + '/u/password-reset', { waitUntil: 'networkidle' })
  await navigation.locator('a[href="/u/login"]').first().click()
  await navigation.waitForURL('**/u/login', { waitUntil: 'networkidle' })
  await navigation.locator('figure.customer-login-visual-v593').waitFor()
  assert.equal(await navigation.locator('style#customer-login-visual-v593').count(), 1, 'photo styling must travel inline with RSC content')
  assert.equal(await navigation.locator('figure.customer-login-visual-v593 svg').count(), 0)
  assert.equal(await navigation.locator('.customer-login-copy-v593 p').first().evaluate(element => getComputedStyle(element).color), 'rgb(255, 255, 255)')
  await navigation.screenshot({ path: path.join(output, 'login-return-from-reset.png'), fullPage: true })
  await navigation.close()
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ serverRenderedIconRemoval: true, stylesRouteScoped: true, navigationFromReset: true, noCredentialsSubmitted: true }))
} finally { await browser.close() }
