import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'http://localhost:3606').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/customer-style-first-paint-v606/browser'
const explicitPostId = String(process.env.STYLE_POST_ID || '').trim()
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive:true })

const browser = await chromium.launch({ executablePath, headless:true })
const results = []

async function customerLogin(context, next = '/u/community') {
  const response = await context.request.post(`${base}/api/customer-auth/login`, {
    headers:{ Origin:base },
    form:{ loginId:'demo.hana', password:'Mypage2026!', next },
  })
  assert.ok(response.ok(), `Customer login returned ${response.status()}`)
}

async function staffLogin(context, next = '/admin/community') {
  const response = await context.request.post(`${base}/api/auth/login`, {
    headers:{ Origin:base },
    form:{ email:'demo.owner', password:'LienDemo2026!', next },
  })
  assert.ok(response.ok(), `Staff login returned ${response.status()}`)
}

async function structured(context, audience, postId) {
  const response = await context.request.get(`${base}/api/lien-style-system?audience=${audience}&postId=${encodeURIComponent(postId)}`, {
    headers:{ 'Cache-Control':'no-cache' },
  })
  const body = await response.json().catch(() => ({}))
  assert.ok(response.ok(), `${audience} style API returned ${response.status()}`)
  return body
}

async function findPost(context) {
  if (explicitPostId) return explicitPostId
  const response = await context.request.get(`${base}/u/community?verify=v606-discovery`)
  assert.ok(response.ok(), `Community list returned ${response.status()}`)
  const html = await response.text()
  const ids = [...new Set([...html.matchAll(/href="\/u\/community\/([^"?#]+)["?]/g)].map(match => decodeURIComponent(match[1])))]
  for (const id of ids) {
    const candidate = await context.request.get(`${base}/api/lien-style-system?audience=customer&postId=${encodeURIComponent(id)}`)
    if (candidate.ok() && (await candidate.json().catch(() => ({})))?.post?.style) return id
  }
  throw new Error('A published customer style was not found')
}

function collectErrors(page) {
  const errors = []
  page.on('pageerror', error => errors.push(`page: ${error.message}`))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  return errors
}

function unexpected(errors) {
  return errors.filter(message => (
    !message.includes('Minified React error #418')
    && !message.includes('Minified React error #423')
    && !message.includes('Minified React error #329')
    && !message.includes('Failed to load resource: the server responded with a status of 404')
  ))
}

async function visibleExactCount(page, value) {
  return page.getByText(value, { exact:true }).evaluateAll(nodes => nodes.filter(node => {
    const style = getComputedStyle(node)
    const box = node.getBoundingClientRect()
    return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0
  }).length)
}

async function verifyCustomer(width, postId, expected) {
  const context = await browser.newContext({ viewport:{ width, height:900 }, deviceScaleFactor:1 })
  await customerLogin(context, `/u/community/${encodeURIComponent(postId)}`)
  const page = await context.newPage()
  const errors = collectErrors(page)
  let releaseRequest
  let markRequestSeen
  const requestGate = new Promise(resolve => { releaseRequest = resolve })
  const requestSeen = new Promise(resolve => { markRequestSeen = resolve })

  await page.route('**/api/lien-style-system?*', async route => {
    const url = new URL(route.request().url())
    if (route.request().method() !== 'GET' || url.searchParams.get('audience') !== 'customer' || url.searchParams.get('postId') !== postId) {
      await route.continue()
      return
    }
    markRequestSeen()
    await requestGate
    await route.continue()
  })

  if (width === 390) {
    await page.goto(`${base}/u/community?verify=v606-list-${width}`, { waitUntil:'domcontentloaded', timeout:30_000 })
    const link = page.locator(`a[href="/u/community/${postId}"]`).first()
    await link.waitFor({ state:'visible', timeout:20_000 })
    await Promise.all([
      page.waitForURL(url => url.pathname === `/u/community/${postId}`, { timeout:30_000 }),
      requestSeen,
      link.click({ noWaitAfter:true }),
    ])
  } else {
    await Promise.all([
      page.goto(`${base}/u/community/${encodeURIComponent(postId)}?verify=v606-${width}`, { waitUntil:'domcontentloaded', timeout:30_000 }),
      requestSeen,
    ])
  }
  await page.waitForTimeout(250)

  try {
    const pending = await page.locator('.community-detail-page article').evaluate(article => {
      const articleStyle = getComputedStyle(article)
      const placeholder = getComputedStyle(article, '::before')
      const box = article.getBoundingClientRect()
      return {
        rootPending:document.documentElement.classList.contains('orimia-style-pending-v606'),
        rootState:document.documentElement.dataset.orimiaStyleStateV606 || '',
        preflightScript:Boolean(document.getElementById('orimia-style-first-paint-v606')),
        guardStyle:Boolean(document.getElementById('orimia-style-first-paint-v606-guard')),
        articleVisibility:articleStyle.visibility,
        placeholderVisibility:placeholder.visibility,
        placeholderDisplay:placeholder.display,
        placeholderHeight:parseFloat(placeholder.height || '0'),
        articleWidth:box.width,
      }
    })
    assert.equal(pending.preflightScript, true, `${width}: synchronous preflight script is missing`)
    assert.equal(pending.guardStyle, true, `${width}: first-paint guard was removed before data arrived ${JSON.stringify(pending)}`)
    assert.equal(pending.articleVisibility, 'hidden', `${width}: legacy article is visible during data loading`)
    assert.equal(pending.placeholderVisibility, 'visible', `${width}: loading placeholder is hidden`)
    assert.notEqual(pending.placeholderDisplay, 'none', `${width}: loading placeholder is absent`)
    assert.ok(pending.placeholderHeight > 200 && pending.articleWidth > 0, `${width}: loading placeholder has no stable size`)
    assert.equal(await visibleExactCount(page, '店舗スタイル'), 0, `${width}: legacy style label flashed before structured UI`)
    assert.equal(await page.locator('.community-feed-meta:visible').count(), 0, `${width}: legacy metadata flashed before structured UI`)
    assert.equal(await page.locator('.orimia-style-lead-v602').count(), 0, `${width}: structured UI rendered before its data arrived`)
    await page.screenshot({ path:path.join(output, `customer-pending-${width}.png`), fullPage:false })
  } finally {
    releaseRequest()
  }

  const lead = page.locator('.orimia-style-lead-v602')
  const gallery = page.locator('.orimia-style-gallery-stable-v605')
  const details = page.locator('.orimia-style-details-v602')
  await lead.waitFor({ state:'visible', timeout:20_000 })
  await gallery.waitFor({ state:'visible', timeout:20_000 })
  await details.waitFor({ state:'visible', timeout:20_000 })
  await page.waitForFunction(() => document.documentElement.dataset.orimiaStyleStateV606 === 'ready')
  assert.equal(await page.locator('#orimia-style-first-paint-v606-guard').count(), 0, `${width}: first-paint guard remains after render`)
  await page.waitForTimeout(2100)

  assert.ok((await lead.innerText()).includes(expected.title), `${width}: style title is missing after reveal`)
  assert.equal((await lead.innerText()).includes(expected.stylist.name), false, `${width}: stylist is duplicated above the gallery`)
  assert.ok(expected.menus.length === 0 || (await lead.innerText()).includes(expected.menus[0].name), `${width}: menu is missing after reveal`)
  assert.ok(!expected.comment || (await details.innerText()).includes(expected.comment), `${width}: stylist comment is missing after reveal`)
  assert.equal(await visibleExactCount(page, expected.stylist.name), 1, `${width}: stylist name must appear once`)
  assert.equal(await page.locator('.orimia-style-stylist-v602:visible').count(), 1, `${width}: stylist profile count is incorrect`)
  assert.equal(await page.getByRole('link', { name:'掲載元を見る', exact:true }).count(), 0, `${width}: source link remains in customer view`)
  assert.equal(await visibleExactCount(page, '公開中'), 0, `${width}: publication status remains`)
  assert.equal(await visibleExactCount(page, '店舗スタイル'), 0, `${width}: legacy style label remains after reveal`)

  const layout = await page.locator('.community-detail-page article.orimia-style-detail-customer-v602').evaluate(article => {
    const box = node => {
      const value = node?.getBoundingClientRect()
      return value && { x:value.x, y:value.y, right:value.right, bottom:value.bottom, width:value.width, height:value.height }
    }
    const lead = box(article.querySelector('.orimia-style-lead-v602'))
    const galleryNode = article.querySelector('.orimia-style-gallery-stable-v605')
    const gallery = box(galleryNode)
    const details = box(article.querySelector('.orimia-style-details-v602'))
    const photos = [...(galleryNode?.querySelectorAll(':scope > a.orimia-style-photo-v605') || [])].map(box)
    return { lead, gallery, details, photos, scrollWidth:document.documentElement.scrollWidth, viewportWidth:innerWidth }
  })
  assert.ok(layout.lead.bottom <= layout.gallery.y + 1, `${width}: gallery overlaps the style summary`)
  assert.ok(layout.gallery.bottom <= layout.details.y + 1, `${width}: gallery overlaps the stylist profile`)
  assert.ok(layout.scrollWidth <= layout.viewportWidth + 1, `${width}: horizontal overflow`)
  for (const photo of layout.photos) {
    assert.ok(photo.x >= layout.gallery.x - 1 && photo.y >= layout.gallery.y - 1, `${width}: photo starts outside gallery`)
    assert.ok(photo.right <= layout.gallery.right + 1 && photo.bottom <= layout.gallery.bottom + 1, `${width}: photo escapes gallery`)
  }

  await page.screenshot({ path:path.join(output, `customer-ready-${width}.png`), fullPage:true })
  assert.deepEqual(unexpected(errors), [], `${width}: browser errors`)
  results.push({ audience:'customer', width, legacyFirstPaintHidden:true, atomicReveal:true, finalLayoutPreserved:true })
  await context.close()
}

async function verifyStaff(postId) {
  const context = await browser.newContext({ viewport:{ width:1280, height:900 }, deviceScaleFactor:1 })
  await staffLogin(context, `/admin/community/${encodeURIComponent(postId)}`)
  const expected = await structured(context, 'staff', postId)
  const page = await context.newPage()
  const errors = collectErrors(page)
  await page.goto(`${base}/admin/community/${encodeURIComponent(postId)}?verify=v606-staff`, { waitUntil:'domcontentloaded', timeout:30_000 })
  const details = page.locator('.orimia-style-details-v602')
  await details.waitFor({ state:'visible', timeout:20_000 })
  assert.equal(await page.locator('html.orimia-style-pending-v606').count(), 0, 'staff page entered customer preflight')
  assert.equal(await details.locator('[data-orimia-style-edit-v602]').count(), 1, 'staff editor is missing')
  if (expected.post.style.source) assert.equal(await details.getByRole('link', { name:'掲載元を見る', exact:true }).count(), 1, 'staff source link is missing')
  assert.deepEqual(unexpected(errors), [], 'staff: browser errors')
  results.push({ audience:'staff', editorPreserved:true, internalSourcePreserved:Boolean(expected.post.style.source) })
  await context.close()
}

async function verifyFailureFallback(postId) {
  const context = await browser.newContext({ viewport:{ width:390, height:900 }, deviceScaleFactor:1 })
  await customerLogin(context, `/u/community/${encodeURIComponent(postId)}`)
  const page = await context.newPage()
  await page.route('**/api/lien-style-system?*', async route => {
    const url = new URL(route.request().url())
    if (route.request().method() === 'GET' && url.searchParams.get('audience') === 'customer' && url.searchParams.get('postId') === postId) {
      await route.fulfill({ status:503, contentType:'application/json', body:JSON.stringify({ error:'first-paint fallback verification' }) })
      return
    }
    await route.continue()
  })
  await page.goto(`${base}/u/community/${encodeURIComponent(postId)}?verify=v606-fallback`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await page.waitForFunction(() => document.documentElement.dataset.orimiaStyleStateV606 === 'fallback')
  assert.equal(await page.locator('#orimia-style-first-paint-v606-guard').count(), 0, 'failed API left the first-paint guard mounted')
  const article = page.locator('.community-detail-page article')
  await article.waitFor({ state:'visible', timeout:10_000 })
  const visibility = await article.evaluate(node => getComputedStyle(node).visibility)
  assert.equal(visibility, 'visible', 'failed API left the legacy fallback hidden')
  results.push({ audience:'customer', failureFallback:true })
  await context.close()
}

try {
  const discovery = await browser.newContext()
  await customerLogin(discovery)
  const postId = await findPost(discovery)
  const expected = await structured(discovery, 'customer', postId)
  assert.ok(expected.post.style.title)
  assert.ok(expected.post.style.stylist?.name)
  await discovery.close()

  for (const width of [320, 390, 1280]) await verifyCustomer(width, postId, expected.post.style)
  await verifyFailureFallback(postId)
  await verifyStaff(postId)
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ postId, results }, null, 2))
  console.log(JSON.stringify({ passed:true, postId, results }))
} finally {
  await browser.close()
}
