import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/style-publisher-comments-v615/browser'
const injectedClient = String(process.env.INJECT_CLIENT_PATH || '').trim()
const skipPublisherAssert = process.env.SKIP_PUBLISHER_ASSERT === '1'
fs.mkdirSync(output, { recursive:true })

const executablePath = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find(candidate => fs.existsSync(candidate))
assert.ok(executablePath, 'Chrome or Chromium was not found')

const browser = await chromium.launch({ executablePath, headless:true, args:['--no-sandbox'] })

async function login(context) {
  const response = await context.request.post(`${base}/api/customer-auth/login`, {
    maxRedirects:0,
    headers:{ Origin:base },
    form:{ loginId:'demo.hana', password:'Mypage2026!', next:'/u/community' },
  })
  assert.ok([200, 303].includes(response.status()), `Customer login returned ${response.status()}`)
}

async function communityPostIds(context) {
  const response = await context.request.get(`${base}/u/community?v615=list`, { headers:{ 'Cache-Control':'no-cache' } })
  assert.equal(response.ok(), true, `Community list returned ${response.status()}`)
  const html = await response.text()
  const ids = [...new Set([...html.matchAll(/href="\/u\/community\/([^"?]+)["?]/g)].map(match => decodeURIComponent(match[1])))]
  assert.ok(ids.length > 0, 'No published community post was found')
  return ids
}

async function cleanup(context, postId, commentId) {
  if (!postId || !commentId) return
  await context.request.delete(`${base}/api/lien-content-management?audience=customer`, {
    headers:{ Origin:base, 'Content-Type':'application/json' },
    data:{ target:'comment', postId, id:commentId },
    failOnStatusCode:false,
  })
}

async function preparePage(page, postId, suffix) {
  if (injectedClient) {
    await page.route('**/content-edit-delete-client-v560.js*', route => route.fulfill({
      status:200,
      contentType:'application/javascript; charset=utf-8',
      body:'',
    }))
  }
  await page.goto(`${base}/u/community/${encodeURIComponent(postId)}?v615=${suffix}`, {
    waitUntil:'domcontentloaded',
    timeout:30_000,
  })
  if (injectedClient) await page.addScriptTag({ path:path.resolve(injectedClient) })
  await page.waitForFunction(() => window.__lienStyleCommunityControlsV615 === true, null, { timeout:12_000 })
  await page.waitForFunction(id => document.body.dataset.lienCommunityOwnerEnhancedV615 === id, postId, { timeout:12_000 })
}

async function verifyViewport(name, viewport) {
  const context = await browser.newContext({ viewport })
  let postId = ''
  let commentId = ''
  let deleted = false
  const pageErrors = []
  try {
    await login(context)
    const storesResponse = await context.request.get(`${base}/api/lien-customer-stores`, { headers:{ 'Cache-Control':'no-cache' } })
    assert.equal(storesResponse.ok(), true)
    const stores = await storesResponse.json()
    const currentStore = stores.stores?.find(store => store.current)
    assert.ok(currentStore?.name, `${name}: active store name is missing`)
    const postIds = await communityPostIds(context)
    const publisherPage = await context.newPage()

    for (const [index, candidate] of postIds.slice(0, 4).entries()) {
      await preparePage(publisherPage, candidate, `${name}-publisher-${index}`)
      if (!skipPublisherAssert) {
        const publisher = publisherPage.locator('.community-detail-page article > header span.block.truncate').first()
        await publisher.waitFor({ state:'visible', timeout:12_000 })
        assert.equal((await publisher.textContent())?.trim(), currentStore.name.trim(), `${name}: publisher must be the salon name`)
      }
    }
    await publisherPage.close()

    postId = postIds[0]
    const page = await context.newPage()
    page.on('pageerror', error => pageErrors.push(error.message))
    await preparePage(page, postId, `${name}-comments`)
    const originalBody = `v615 ${name} comment ${Date.now()}`
    const editedBody = `${originalBody} edited`
    const input = page.locator('form textarea[placeholder="コメントを入力"], form input[placeholder="コメントを入力"]').last()
    await input.waitFor({ state:'visible', timeout:12_000 })
    await input.fill(originalBody)
    const createPromise = page.waitForResponse(response => (
      response.request().method() === 'POST' && /\/api\/customer\/community\/posts\/[^/]+\/comments(?:\?|$)/.test(response.url())
    ))
    await input.locator('xpath=ancestor::form').locator('button[type="submit"]').click()
    const createResponse = await createPromise
    assert.equal(createResponse.status(), 201, `${name}: comment creation returned ${createResponse.status()}`)
    const created = await createResponse.json()
    commentId = String(created.id || '')
    assert.ok(commentId, `${name}: created comment id is missing`)

    let card = page.locator('.mt-4.grid > div').filter({ hasText:originalBody }).last()
    await card.waitFor({ state:'visible', timeout:12_000 })
    const trigger = card.locator('[data-lien-customer-comment-menu="v615"] .lien-comment-menu-trigger')
    await trigger.waitFor({ state:'visible', timeout:12_000 })
    assert.equal(await trigger.getAttribute('aria-label'), 'コメントの操作')
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false')

    const payloadResponse = await context.request.get(
      `${base}/api/lien-content-management?audience=customer&postId=${encodeURIComponent(postId)}`,
      { headers:{ 'Cache-Control':'no-cache' } },
    )
    assert.equal(payloadResponse.ok(), true)
    const payload = await payloadResponse.json()
    const ownedCount = payload.comments.filter(comment => comment.canEdit || comment.canDelete).length
    assert.equal(await page.locator('[data-lien-customer-comment-menu="v615"]').count(), ownedCount)

    await trigger.click()
    const menu = card.locator('.lien-comment-menu')
    await menu.waitFor({ state:'visible' })
    assert.equal(await menu.getByRole('menuitem', { name:'編集' }).count(), 1)
    assert.equal(await menu.getByRole('menuitem', { name:'削除' }).count(), 1)
    const menuBox = await menu.boundingBox()
    assert.ok(menuBox)
    assert.ok(menuBox.y >= 0 && menuBox.y + menuBox.height <= viewport.height - (name === 'mobile' ? 88 : 0), `${name}: comment menu is clipped`)
    await page.screenshot({ path:path.join(output, `comment-menu-${name}.png`), animations:'disabled' })

    await menu.getByRole('menuitem', { name:'編集' }).click()
    const dialog = page.locator('[data-lien-content-dialog]')
    await dialog.waitFor({ state:'visible' })
    await dialog.locator('[data-dialog-input]').fill(editedBody)
    const editPromise = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().includes('/api/lien-content-management'))
    await dialog.getByRole('button', { name:'保存' }).click()
    assert.equal((await editPromise).status(), 200)
    card = page.locator('.mt-4.grid > div').filter({ hasText:editedBody }).last()
    await card.waitFor({ state:'visible' })

    await card.locator('.lien-comment-menu-trigger').click()
    await card.locator('.lien-comment-menu').getByRole('menuitem', { name:'削除' }).click()
    await dialog.waitFor({ state:'visible' })
    const confirmation = dialog.getByRole('checkbox', { name:'削除する内容を確認しました' })
    const deleteButton = dialog.getByRole('button', { name:'コメントを削除' })
    assert.equal(await deleteButton.isDisabled(), true)
    await confirmation.check()
    const deletePromise = page.waitForResponse(response => response.request().method() === 'DELETE' && response.url().includes('/api/lien-content-management'))
    await deleteButton.click()
    assert.equal((await deletePromise).status(), 200)
    await card.waitFor({ state:'detached' })
    deleted = true

    const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth)
    assert.ok(overflow <= 1, `${name}: horizontal overflow is ${overflow}px`)
    const unexpectedPageErrors = pageErrors.filter(message => !/Minified React error #(329|418|423)/.test(message))
    assert.deepEqual(unexpectedPageErrors, [])
    await page.screenshot({ path:path.join(output, `${name}.png`), fullPage:true, animations:'disabled' })

    return {
      viewport,
      publisherPostsChecked:skipPublisherAssert ? 0 : Math.min(4, postIds.length),
      salonName:currentStore.name,
      ownedMenuCount:ownedCount,
      edited:true,
      deleted:true,
      overflow,
      ignoredExistingHydrationErrors:pageErrors.length,
    }
  } finally {
    if (!deleted) await cleanup(context, postId, commentId)
    await context.close()
  }
}

try {
  const results = []
  results.push(await verifyViewport('mobile', { width:390, height:844 }))
  results.push(await verifyViewport('desktop', { width:1440, height:1000 }))
  console.log(JSON.stringify({ release:'v615', results }, null, 2))
} finally {
  await browser.close()
}
