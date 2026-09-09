import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')

export async function verifyRegistration(base, { fixtures = false } = {}) {
  const output = process.env.SCREENSHOT_DIR || 'artifacts/store-registration-layout-v592/browser'
  fs.mkdirSync(output, { recursive: true })
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] })
  const errors = []
  try {
    for (const viewport of [{ width: 1920, height: 1080 }, { width: 1365, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
      const page = await browser.newPage({ viewport })
      page.on('pageerror', error => errors.push(error.message))
      const response = await page.goto(base + '/admin/register', { waitUntil: 'networkidle' })
      assert.equal(response.status(), 200)
      await page.getByRole('heading', { name: '美容室の新規登録' }).waitFor()
      assert.equal(await page.locator('.admin-app-shell, .registrationIntro, .benefitCard').count(), 0)
      assert.equal(await page.locator('script[src*="admin-workspace"], script[src*="daily-sales-print"]').count(), 0)
      const form = page.locator('form')
      assert.equal(await form.getAttribute('action'), '/admin/register')
      const input = page.getByLabel('登録メールアドレス')
      const submit = page.getByRole('button', { name: '確認メールを送る' })
      assert(await submit.isEnabled())
      await input.fill('invalid')
      assert.equal(await input.evaluate(element => element.checkValidity()), false)
      await input.fill('owner@example.com')
      assert.equal(await input.evaluate(element => element.checkValidity()), true)
      const layout = await page.evaluate(() => {
        const card = document.querySelector('.wo-auth-card')
        const visual = document.querySelector('.wo-auth-visual')
        const style = getComputedStyle(card)
        return { card: card.getBoundingClientRect().toJSON(), visual: visual.getBoundingClientRect().toJSON(), width: document.documentElement.scrollWidth, radius: style.borderRadius, padding: style.padding, background: getComputedStyle(visual, '::before').backgroundImage }
      })
      assert(layout.width <= viewport.width + 1, 'horizontal overflow at ' + viewport.width)
      assert(layout.background.includes('/brand/salon-interior.jpg'))
      assert.equal(layout.radius, '8px')
      if (viewport.width > 900) {
        assert(layout.card.x >= layout.visual.right)
        assert(layout.card.bottom <= viewport.height + 1, 'entry form must fit the desktop viewport')
      } else assert(layout.card.y >= layout.visual.bottom)
      assert(await page.evaluate(async () => { const image = new Image(); image.src = '/brand/salon-interior.jpg'; await image.decode(); return image.naturalWidth > 100 && image.naturalHeight > 100 }))
      await input.fill('')
      await input.blur()
      await page.evaluate(() => scrollTo(0, 0))
      await page.screenshot({ path: path.join(output, `entry-${viewport.width}.png`), fullPage: true, animations: 'disabled' })
      if (viewport.width === 1365) {
        await page.goto(base + '/dealer/register', { waitUntil: 'networkidle' })
        const dealer = await page.locator('.wo-auth-card').evaluate(element => ({ width: element.getBoundingClientRect().width, radius: getComputedStyle(element).borderRadius, padding: getComputedStyle(element).padding }))
        assert.equal(dealer.width, layout.card.width)
        assert.equal(dealer.radius, layout.radius)
        assert.equal(dealer.padding, layout.padding)
        await page.screenshot({ path: path.join(output, 'dealer-reference.png'), fullPage: true, animations: 'disabled' })
      }
      if ([1365, 390].includes(viewport.width)) {
        for (const [state, query, text] of [['sent', '?sent=1', '確認メールを送信しました。'], ['registered', '?registered=1', 'このメールアドレスは登録済みです。'], ['error', '?error=input', '入力内容を確認してください。'], ['expired', '?token=invalid', '確認リンクが無効か']]) {
          await page.goto(base + '/admin/register' + query, { waitUntil: 'networkidle' })
          assert((await page.textContent('body')).includes(text))
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
          await page.screenshot({ path: path.join(output, `${state}-${viewport.width}.png`), fullPage: true, animations: 'disabled' })
        }
        if (fixtures) {
          await page.goto(base + '/admin/register?fixture=setup', { waitUntil: 'networkidle' })
          await page.getByRole('heading', { name: '美容室の初期設定' }).waitFor()
          await page.locator('input[name="planKey"][value="matsu"]').check()
          assert(await page.locator('label.plan.selected input[value="matsu"]').isChecked())
          await page.getByLabel('店舗名', { exact: true }).fill('ORIMIA テスト店')
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
          assert.equal(await page.locator('input[name="termsAccepted"]').getAttribute('required'), '')
          await page.getByLabel('店舗名', { exact: true }).blur()
          await page.evaluate(() => scrollTo(0, 0))
          if (viewport.width > 900) assert.equal(await page.locator('.wo-auth-visual').evaluate(element => element.getBoundingClientRect().top), 0)
          await page.screenshot({ path: path.join(output, `setup-${viewport.width}.png`), fullPage: true, animations: 'disabled' })
        }
      }
      await page.close()
      console.log(JSON.stringify({ viewport, sharedDealerFormat: true, readableForm: true, assets: true, states: true }))
    }
    assert.deepEqual(errors, [])
  } finally { await browser.close() }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await verifyRegistration(process.env.SMOKE_BASE_URL || 'http://localhost:3592')
