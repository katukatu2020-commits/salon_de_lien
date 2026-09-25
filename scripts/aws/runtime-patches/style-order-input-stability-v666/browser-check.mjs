import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'

export async function runBrowserCheck({ injectClient, mode }) {
  const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
  const screenshotDir = process.env.VERIFY_SCREENSHOT_DIR || path.join(here, 'artifacts', mode)
  fs.mkdirSync(screenshotDir, { recursive: true })

  const browser = await chromium.launch({ executablePath, headless: true })
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    const login = await context.request.post(baseUrl + '/api/auth/login', {
      headers: { Origin: baseUrl },
      form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/community' },
    })
    assert.ok(login.ok(), `Staff login returned ${login.status()}`)

    const page = await context.newPage()
    const errors = []
    const listRequests = []
    page.on('pageerror', error => errors.push('page: ' + error.message))
    page.on('console', message => {
      if (message.type() === 'error') errors.push('console: ' + message.text())
    })
    page.on('request', request => {
      if (new URL(request.url()).pathname === '/api/lien-style-admin-v618') listRequests.push(request.url())
    })
    if (process.env.STYLE_ORDER_FIXTURE === '1') {
      await page.route('**/api/lien-style-admin-v618**', route => route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({
          release: 'style-order-input-stability-v666-fixture',
          filters: { sort: 'manual', staffKey: '', course: '', gender: '' },
          posts: [{
            id: 'style-order-v666-fixture',
            displayOrder: 1,
            postKind: 'STORE',
            published: true,
            title: '入力安定性の確認',
            staffKey: 'staff-v666',
            stylistName: '確認スタッフ',
            gender: '女性',
            course: 'カット',
            publishedAt: '2026-09-26T00:00:00.000Z',
            coverPhotoUrl: '/brand/orimia-icon-192.png',
            likeCount: 0,
            commentCount: 0,
          }],
          options: {
            staff: [{ key: 'staff-v666', name: '確認スタッフ' }],
            courses: [{ value: 'カット', label: 'カット' }],
          },
          page: 1,
          pageSize: 15,
          totalCount: 1,
          totalPages: 1,
        }),
      }))
    }

    await page.goto(baseUrl + `/admin/community?verify=v666-${mode}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
    const firstCard = page.locator('.orimia-admin-style-managed-card-v625').first()
    try {
      await firstCard.waitFor({ state: 'visible', timeout: 15_000 })
    } catch (error) {
      console.error(JSON.stringify({
        url: page.url(),
        title: await page.title(),
        body: (await page.locator('body').innerText()).slice(0, 1000),
        listRequests,
        errors,
      }, null, 2))
      throw error
    }

    if (injectClient) {
      await page.addScriptTag({ path: path.join(here, 'style-order-input-stability-v666.js') })
    } else {
      assert.equal(await page.locator('script#orimia-style-order-input-stability-v666').count(), 1)
      assert.match(
        await page.locator('script#orimia-style-order-input-stability-v666').getAttribute('src'),
        /style-order-input-stability-v666\.js\?v=666-release1/,
      )
    }
    await page.waitForFunction(() => window.__orimiaStyleOrderInputStabilityV666 === true)

    const postId = await firstCard.getAttribute('data-orimia-style-post-id-v625')
    assert.ok(postId, 'The first style post id is missing')
    const cardSelector = `[data-orimia-style-post-id-v625="${postId}"]`
    const orderInput = page.locator(`${cardSelector} input[name="displayOrder"]`).first()
    const original = Number(await orderInput.inputValue())
    const draft = original === 17 ? 18 : 17
    const requestsBeforeEditing = listRequests.length

    await orderInput.click()
    await orderInput.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
    await orderInput.pressSequentially(String(draft), { delay: 100 })

    await page.evaluate(() => {
      const root = document.querySelector('.orimia-style-admin-v618')
      if (!root) throw new Error('The style list root is missing')
      root.innerHTML = '<div data-v666-shell-replacement>shell replacement</div>'
    })
    await page.waitForFunction(({ selector, value }) => {
      const input = document.querySelector(`${selector} input[name="displayOrder"]`)
      return input?.value === value && document.activeElement === input
    }, { selector: cardSelector, value: String(draft) }, { timeout: 8000 })
    assert.equal(await orderInput.inputValue(), String(draft))
    assert.equal(await orderInput.evaluate(element => document.activeElement === element), true)

    const stableCard = page.locator(cardSelector).first()
    const boxBefore = await stableCard.boundingBox()
    assert.ok(boxBefore, 'The style card has no hover target')
    await stableCard.hover({ position: { x: boxBefore.width / 2, y: boxBefore.height / 2 } })
    await page.waitForTimeout(300)
    const hoverState = await stableCard.evaluate(wrapper => ({
      wrapperTransform: getComputedStyle(wrapper).transform,
      cardTransform: getComputedStyle(wrapper.querySelector('.orimia-admin-style-card-v618')).transform,
      imageTransform: getComputedStyle(wrapper.querySelector('img')).transform,
      box: wrapper.getBoundingClientRect().toJSON(),
    }))
    assert.equal(hoverState.wrapperTransform, 'none')
    assert.equal(hoverState.cardTransform, 'none')
    assert.equal(hoverState.imageTransform, 'none')
    assert.ok(Math.abs(hoverState.box.x - boxBefore.x) < 0.5)
    assert.ok(Math.abs(hoverState.box.y - boxBefore.y) < 0.5)

    assert.equal(listRequests.length, requestsBeforeEditing, 'Editing or hovering reloaded the style list')
    const unexpectedErrors = errors.filter(message => (
      !/Minified React error #(329|418|423)/.test(message)
      && !message.includes('status of 404')
      && !message.includes('status of 410')
    ))
    assert.deepEqual(unexpectedErrors, [])
    await page.screenshot({ path: path.join(screenshotDir, 'style-order-input-stability.png'), fullPage: false })

    const result = {
      release: 'style-order-input-stability-v666',
      mode,
      draftRetained: true,
      focusRetained: true,
      hoverStable: true,
      listRequests: listRequests.length,
    }
    await context.close()
    return result
  } finally {
    await browser.close()
  }
}
