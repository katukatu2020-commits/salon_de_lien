import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'

export async function runBrowserCheck({ injectClient, mode, styleClientOverride = '' }) {
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
    if (styleClientOverride) {
      await page.route('**/style-admin-controls-v618.js*', route => route.fulfill({
        status: 200,
        contentType: 'application/javascript; charset=utf-8',
        body: styleClientOverride,
      }))
    }
    if (process.env.STYLE_ORDER_FIXTURE === '1') {
      await page.route('**/api/lien-style-admin-v618**', route => route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({
          release: 'style-order-focus-stability-v667-fixture',
          filters: { sort: 'manual', staffKey: '', course: '', gender: '' },
          posts: [{
            id: 'style-order-v667-fixture',
            displayOrder: 1,
            postKind: 'STORE',
            published: true,
            title: '入力安定性の確認',
            staffKey: 'staff-v667',
            stylistName: '確認スタッフ',
            gender: '女性',
            course: 'カット',
            publishedAt: '2026-09-26T00:00:00.000Z',
            coverPhotoUrl: '/brand/orimia-icon-192.png',
            likeCount: 0,
            commentCount: 0,
          }],
          options: {
            staff: [{ key: 'staff-v667', name: '確認スタッフ' }],
            courses: [{ value: 'カット', label: 'カット' }],
          },
          page: 1,
          pageSize: 15,
          totalCount: 1,
          totalPages: 1,
        }),
      }))
    }

    await page.goto(baseUrl + `/admin/community?verify=v667-${mode}`, {
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
      await page.addScriptTag({ path: path.join(here, 'style-order-focus-stability-v667.js') })
    } else {
      assert.equal(await page.locator('script#orimia-style-order-focus-stability-v667').count(), 1)
      assert.match(
        await page.locator('script#orimia-style-order-focus-stability-v667').getAttribute('src'),
        /style-order-focus-stability-v667\.js\?v=667-release1/,
      )
    }
    await page.waitForFunction(() => window.__orimiaStyleOrderFocusStabilityV667 === true)

    const postId = await firstCard.getAttribute('data-orimia-style-post-id-v625')
    assert.ok(postId, 'The first style post id is missing')
    const cardSelector = `[data-orimia-style-post-id-v625="${postId}"]`
    const orderInput = page.locator(`${cardSelector} input[name="displayOrder"]`).first()
    const original = Number(await orderInput.inputValue())
    const draft = original === 17 ? 18 : 17
    const requestsBeforeEditing = listRequests.length
    const pretypeDelay = Math.max(0, Number(process.env.STYLE_ORDER_PRETYPE_DELAY_MS || 0))
    if (pretypeDelay) await page.waitForTimeout(pretypeDelay)

    await orderInput.click()
    await orderInput.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
    await orderInput.pressSequentially(String(draft), { delay: 100 })

    if (process.env.STYLE_ORDER_NATURAL_ONLY !== '1') {
      for (let replacement = 1; replacement <= 1; replacement += 1) {
        await page.waitForFunction(selector => {
          const wrapper = document.querySelector(selector)
          return Boolean(wrapper?.querySelector(':scope > .orimia-admin-style-card-v618'))
        }, cardSelector)
        await page.evaluate(({ selector, iteration }) => {
          const wrapper = document.querySelector(selector)
          const card = wrapper?.querySelector(':scope > .orimia-admin-style-card-v618')
          if (!wrapper || !card) throw new Error('The managed style card is missing')
          const replacementCard = card.cloneNode(true)
          replacementCard.dataset.v667CardReplacement = String(iteration)
          wrapper.replaceWith(replacementCard)
        }, { selector: cardSelector, iteration: replacement })
        await page.waitForFunction(({ selector, value }) => {
          const wrapper = document.querySelector(selector)
          const input = wrapper?.querySelector('input[name="displayOrder"]')
          return Boolean(wrapper?.querySelector(':scope > .orimia-admin-style-card-v618'))
            && input?.value === value
            && document.activeElement === input
        }, { selector: cardSelector, value: String(draft) }, { timeout: 8000 })
      }
    }

    const focusStability = await page.evaluate(async ({ selector, value }) => {
      const deadline = performance.now() + 5000
      let stableSince = 0
      let recoveryFrames = 0
      while (performance.now() < deadline) {
        const input = document.querySelector(`${selector} input[name="displayOrder"]`)
        if (input?.value === value && document.activeElement === input) {
          if (!stableSince) stableSince = performance.now()
          if (performance.now() - stableSince >= 750) return { stable: true, recoveryFrames }
        } else {
          stableSince = 0
          recoveryFrames += 1
        }
        await new Promise(resolve => requestAnimationFrame(resolve))
      }
      const input = document.querySelector(`${selector} input[name="displayOrder"]`)
      return {
        stable: false,
        recoveryFrames,
        value: input?.value || null,
        inputConnected: Boolean(input?.isConnected),
        activeTag: document.activeElement?.tagName || null,
        activeName: document.activeElement?.getAttribute?.('name') || null,
        focusedPostId: window.__orimiaStyleOrderFocusStabilityStateV667?.focusedPostId || null,
        hasDraft: window.__orimiaStyleOrderFocusStabilityStateV667?.drafts?.has?.(selector.match(/"([^"]+)"/)?.[1]) || false,
      }
    }, { selector: cardSelector, value: String(draft) })
    if (!focusStability.stable) {
      console.error(JSON.stringify({
        focusStability,
        url: page.url(),
        roots: await page.locator('.orimia-style-admin-v618').count(),
        managedCards: await page.locator('.orimia-admin-style-managed-card-v625').count(),
        managedIds: await page.locator('.orimia-admin-style-managed-card-v625').evaluateAll(cards => cards.map(card => card.dataset.orimiaStylePostIdV625)),
        bareCards: await page.locator('.orimia-admin-style-card-v618').count(),
        orderInputs: await page.locator('input[name="displayOrder"]').evaluateAll(inputs => inputs.map(input => ({
          value: input.value,
          postId: input.closest('.orimia-admin-style-managed-card-v625')?.dataset.orimiaStylePostIdV625 || null,
          connected: input.isConnected,
        }))),
        body: (await page.locator('body').innerText()).slice(0, 1200),
        listRequests,
        errors,
      }, null, 2))
    }
    assert.equal(focusStability.stable, true, `The No. draft or focus changed after DOM recovery: ${JSON.stringify(focusStability)}`)

    const boxBefore = await page.evaluate(async selector => {
      for (let frame = 0; frame < 120; frame += 1) {
        await new Promise(resolve => requestAnimationFrame(resolve))
        const wrapper = document.querySelector(selector)
        const card = wrapper?.querySelector(':scope > .orimia-admin-style-card-v618')
        const image = card?.querySelector('img')
        if (!wrapper?.isConnected || !card?.isConnected || !image?.isConnected) continue
        const box = wrapper.getBoundingClientRect()
        if (box.width > 0 && box.height > 0) return box.toJSON()
      }
      return null
    }, cardSelector)
    assert.ok(boxBefore, 'The style card has no hover target at paint time')
    await page.mouse.move(boxBefore.x + boxBefore.width / 2, boxBefore.y + boxBefore.height / 2)
    const hoverState = await page.evaluate(async selector => {
      let baseline = null
      let maxDeltaX = 0
      let maxDeltaY = 0
      for (let frame = 0; frame < 30; frame += 1) {
        await new Promise(resolve => requestAnimationFrame(resolve))
        const wrapper = document.querySelector(selector)
        const card = wrapper?.querySelector(':scope > .orimia-admin-style-card-v618')
        const image = card?.querySelector('img')
        if (!wrapper?.isConnected || !card?.isConnected || !image?.isConnected) {
          return { stable: false, missingFrame: frame }
        }
        const box = wrapper.getBoundingClientRect()
        if (!baseline) baseline = { x: box.x, y: box.y }
        maxDeltaX = Math.max(maxDeltaX, Math.abs(box.x - baseline.x))
        maxDeltaY = Math.max(maxDeltaY, Math.abs(box.y - baseline.y))
        if (
          getComputedStyle(wrapper).transform !== 'none'
          || getComputedStyle(card).transform !== 'none'
          || getComputedStyle(image).transform !== 'none'
        ) return { stable: false, transformedFrame: frame }
      }
      return { stable: true, maxDeltaX, maxDeltaY }
    }, cardSelector)
    assert.equal(hoverState.stable, true, `The hovered style card changed between paints: ${JSON.stringify(hoverState)}`)
    assert.ok(hoverState.maxDeltaX < 0.5)
    assert.ok(hoverState.maxDeltaY < 0.5)

    assert.equal(listRequests.length, requestsBeforeEditing, 'Editing or hovering reloaded the style list')
    const unexpectedErrors = errors.filter(message => (
      !/Minified React error #(329|418|423)/.test(message)
      && !message.includes('status of 404')
      && !message.includes('status of 410')
    ))
    assert.deepEqual(unexpectedErrors, [])
    await page.screenshot({ path: path.join(screenshotDir, 'style-order-focus-stability.png'), fullPage: false })

    const result = {
      release: 'style-order-focus-stability-v667',
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
