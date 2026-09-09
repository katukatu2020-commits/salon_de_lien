import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'http://localhost:3608').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/customer-style-mobile-gallery-v608/browser'
const explicitPostId = String(process.env.STYLE_POST_ID || '').trim()
const styleAssetBase = String(process.env.STYLE_ASSET_BASE || '').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive:true })

const browser = await chromium.launch({ executablePath, headless:true })
const results = []
const patchedAssets = styleAssetBase ? {
  css:await (await fetch(`${styleAssetBase}/style-system-integration-v602.css?v=608-regression`)).text(),
  js:await (await fetch(`${styleAssetBase}/style-system-integration-v602.js?v=608-regression`)).text(),
} : null

async function installPatchedStyleAssets(page) {
  if (!patchedAssets) return
  await page.route('**/style-system-integration-v602.css*', route => route.fulfill({
    status:200,
    contentType:'text/css; charset=utf-8',
    body:patchedAssets.css,
  }))
  await page.route('**/style-system-integration-v602.js*', route => route.fulfill({
    status:200,
    contentType:'application/javascript; charset=utf-8',
    body:patchedAssets.js,
  }))
}

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
  const response = await context.request.get(`${base}/u/community?verify=v608-discovery`)
  assert.ok(response.ok(), `Community list returned ${response.status()}`)
  const html = await response.text()
  const ids = [...new Set([...html.matchAll(/href="\/u\/community\/([^"?#]+)["?]/g)].map(match => decodeURIComponent(match[1])))]
  for (const id of ids) {
    const detail = await context.request.get(`${base}/u/community/${encodeURIComponent(id)}?verify=v608-candidate`)
    if (!detail.ok()) continue
    const detailHtml = await detail.text()
    if ((detailHtml.match(/aria-label="施術後写真を拡大表示"/g) || []).length >= 2) return id
  }
  throw new Error('A published style with at least two photos was not found')
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

function expectedMenu(style) {
  return style.menus.length ? style.menus.map(menu => menu.name).join(' / ') : (style.sourceMenuText || 'メニュー情報なし')
}

async function verifyCustomer(width, postId, style) {
  const context = await browser.newContext({ viewport:{ width, height:844 }, deviceScaleFactor:1 })
  await customerLogin(context, `/u/community/${encodeURIComponent(postId)}`)
  const page = await context.newPage()
  const errors = collectErrors(page)
  await installPatchedStyleAssets(page)
  await page.goto(`${base}/u/community/${encodeURIComponent(postId)}?verify=v608-${width}`, { waitUntil:'domcontentloaded', timeout:30_000 })
  const lead = page.locator('.orimia-style-lead-v602')
  const gallery = page.locator('.orimia-style-gallery-mobile-v608')
  const details = page.locator('.orimia-style-details-v602')
  await lead.waitFor({ state:'visible', timeout:20_000 })
  await gallery.waitFor({ state:'visible', timeout:20_000 })
  await details.waitFor({ state:'visible', timeout:20_000 })
  await page.waitForFunction(() => document.documentElement.dataset.orimiaStyleStateV606 === 'ready')
  await page.waitForFunction(() => [...document.querySelectorAll('.orimia-style-gallery-mobile-v608 > a.orimia-style-photo-v605')].every(photo => photo.dataset.orimiaStyleImageRatioV608 !== 'loading'))
  await page.waitForTimeout(500)

  assert.ok((await lead.innerText()).includes(style.title), `${width}: style title is missing`)
  assert.ok((await lead.innerText()).includes(expectedMenu(style)), `${width}: compact treatment menu is missing`)
  assert.equal(await details.locator('.orimia-style-menus-v602').count(), 0, `${width}: duplicate lower menu remains`)
  assert.equal(await visibleExactCount(page, 'メニュー内容'), 0, `${width}: lower menu heading remains`)
  assert.equal(await page.locator('.community-feed-meta,.orimia-style-legacy-meta-v602').count(), 0, `${width}: legacy store/stylist strip remains in the DOM`)
  assert.equal(await visibleExactCount(page, '店舗スタイル'), 0, `${width}: legacy store label remains`)
  assert.equal(await visibleExactCount(page, style.stylist.name), 1, `${width}: stylist name must appear once`)
  assert.equal(await page.locator('.orimia-style-stylist-v602:visible').count(), 1, `${width}: stylist profile count is incorrect`)

  const layout = await page.locator('.community-detail-page article.orimia-style-detail-customer-v602').evaluate(article => {
    const rect = node => {
      const box = node?.getBoundingClientRect()
      return box && { x:box.x, y:box.y, right:box.right, bottom:box.bottom, width:box.width, height:box.height }
    }
    const galleryNode = article.querySelector('.orimia-style-gallery-mobile-v608')
    const galleryStyle = galleryNode && getComputedStyle(galleryNode)
    const photos = [...(galleryNode?.querySelectorAll(':scope > a.orimia-style-photo-v605') || [])].map(photo => {
      const visual = photo.querySelector(':scope > span, :scope > img')
      const visualStyle = visual && getComputedStyle(visual)
      return {
        ...rect(photo),
        ratioState:photo.dataset.orimiaStyleImageRatioV608 || '',
        ratioValue:photo.style.getPropertyValue('--orimia-style-photo-aspect-v608'),
        backgroundSize:visualStyle?.backgroundSize || '',
        objectFit:visualStyle?.objectFit || '',
      }
    })
    return {
      gallery:rect(galleryNode),
      galleryDisplay:galleryStyle?.display,
      galleryColumns:galleryStyle?.gridTemplateColumns,
      galleryOverflow:galleryStyle?.overflow,
      photos,
      details:rect(article.querySelector('.orimia-style-details-v602')),
      scrollWidth:document.documentElement.scrollWidth,
      viewportWidth:innerWidth,
    }
  })

  assert.ok(layout.gallery && layout.photos.length >= 2, `${width}: gallery photos are missing`)
  assert.equal(layout.galleryDisplay, 'grid', `${width}: mobile gallery is not a grid`)
  assert.equal(layout.galleryOverflow, 'visible', `${width}: gallery still clips its photos`)
  assert.ok(layout.scrollWidth <= layout.viewportWidth + 1, `${width}: horizontal overflow`)
  for (const [index, photo] of layout.photos.entries()) {
    assert.ok(Math.abs(photo.width - layout.gallery.width) <= 1.5, `${width}: photo ${index + 1} is not full width`)
    assert.ok(photo.ratioState === 'ready' && photo.ratioValue.includes('/'), `${width}: natural ratio was not applied to photo ${index + 1}`)
    const [naturalWidth, naturalHeight] = photo.ratioValue.split('/').map(Number)
    assert.ok(naturalWidth > 0 && naturalHeight > 0, `${width}: photo ${index + 1} has an invalid natural ratio`)
    assert.ok(Math.abs(photo.height - (photo.width * naturalHeight / naturalWidth)) <= 2, `${width}: photo ${index + 1} does not preserve its natural ratio`)
    assert.ok(photo.backgroundSize === 'contain' || photo.objectFit === 'contain', `${width}: photo ${index + 1} can still be cropped`)
    if (index > 0) assert.ok(photo.y >= layout.photos[index - 1].bottom + 2, `${width}: photos ${index} and ${index + 1} overlap`)
  }
  assert.ok(layout.gallery.bottom <= layout.details.y + 1, `${width}: gallery overlaps the stylist details`)
  assert.ok(layout.gallery.bottom >= layout.photos.at(-1).bottom - 1, `${width}: gallery ends before its final photo`)

  await page.screenshot({ path:path.join(output, `customer-${width}.png`), fullPage:true })
  assert.deepEqual(unexpected(errors), [], `${width}: browser errors`)
  results.push({ audience:'customer', width, completePhotos:true, legacyStripRemoved:true, duplicateMenuRemoved:true, stylistCount:1 })
  await context.close()
}

async function verifyDesktop(postId) {
  const context = await browser.newContext({ viewport:{ width:1280, height:900 }, deviceScaleFactor:1 })
  await customerLogin(context, `/u/community/${encodeURIComponent(postId)}`)
  const page = await context.newPage()
  await installPatchedStyleAssets(page)
  await page.goto(`${base}/u/community/${encodeURIComponent(postId)}?verify=v608-desktop`, { waitUntil:'domcontentloaded', timeout:30_000 })
  const gallery = page.locator('.orimia-style-gallery-mobile-v608')
  await gallery.waitFor({ state:'visible', timeout:20_000 })
  await page.waitForFunction(() => document.documentElement.dataset.orimiaStyleStateV606 === 'ready')
  const layout = await gallery.evaluate(node => {
    const box = node.getBoundingClientRect()
    const photos = [...node.querySelectorAll(':scope > a.orimia-style-photo-v605')].map(photo => {
      const value = photo.getBoundingClientRect()
      return { x:value.x, y:value.y, width:value.width, height:value.height }
    })
    return { width:box.width, height:box.height, display:getComputedStyle(node).display, photos }
  })
  assert.ok(layout.width / layout.height > 1.4, 'desktop gallery aspect changed')
  assert.ok(layout.photos.length >= 2 && layout.photos[1].x > layout.photos[0].x, 'desktop collage was replaced by the mobile stack')
  results.push({ audience:'customer', width:1280, desktopCollagePreserved:true })
  await context.close()
}

async function verifyStaff(postId) {
  const context = await browser.newContext({ viewport:{ width:1280, height:900 }, deviceScaleFactor:1 })
  await staffLogin(context, `/admin/community/${encodeURIComponent(postId)}`)
  const expected = await structured(context, 'staff', postId)
  const page = await context.newPage()
  const errors = collectErrors(page)
  await installPatchedStyleAssets(page)
  await page.goto(`${base}/admin/community/${encodeURIComponent(postId)}?verify=v608-staff`, { waitUntil:'domcontentloaded', timeout:30_000 })
  const details = page.locator('.orimia-style-details-v602')
  await details.waitFor({ state:'visible', timeout:20_000 })
  assert.equal(await details.locator('.orimia-style-menus-v602').count(), 1, 'staff menu details were removed')
  const staffMenuText = await details.locator('.orimia-style-menus-v602').innerText()
  const expectedStaffMenus = expected.post.style.menus.length
    ? expected.post.style.menus.map(menu => menu.name)
    : [expected.post.style.sourceMenuText || 'メニュー未設定']
  for (const menu of expectedStaffMenus) assert.ok(staffMenuText.includes(menu), `staff menu content is missing: ${menu}`)
  assert.equal(await details.locator('[data-orimia-style-edit-v602]').count(), 1, 'staff editor is missing')
  assert.deepEqual(unexpected(errors), [], 'staff: browser errors')
  results.push({ audience:'staff', menuDetailsPreserved:true, editorPreserved:true })
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

  for (const width of [320, 390, 430]) await verifyCustomer(width, postId, expected.post.style)
  await verifyDesktop(postId)
  await verifyStaff(postId)
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ postId, results }, null, 2))
  console.log(JSON.stringify({ passed:true, postId, results }))
} finally {
  await browser.close()
}
