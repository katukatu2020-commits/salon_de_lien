import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'http://localhost:3609').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/customer-style-gallery-grid-v609/browser'
const explicitPostId = String(process.env.STYLE_POST_ID || '').trim()
const styleAssetBase = String(process.env.STYLE_ASSET_BASE || '').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive:true })

const browser = await chromium.launch({ executablePath, headless:true })
const results = []
const patchedAssets = styleAssetBase ? {
  css:await (await fetch(`${styleAssetBase}/style-system-integration-v602.css?v=609-regression`)).text(),
  js:await (await fetch(`${styleAssetBase}/style-system-integration-v602.js?v=609-regression`)).text(),
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
  const response = await context.request.get(`${base}/u/community?verify=v609-discovery`)
  assert.ok(response.ok(), `Community list returned ${response.status()}`)
  const html = await response.text()
  const ids = [...new Set([...html.matchAll(/href="\/u\/community\/([^"?#]+)["?]/g)].map(match => decodeURIComponent(match[1])))]
  for (const id of ids) {
    const detail = await context.request.get(`${base}/u/community/${encodeURIComponent(id)}?verify=v609-candidate`)
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

async function preparePhotoTemplates(page) {
  const count = await page.evaluate(() => {
    const gallery = document.querySelector('.orimia-style-gallery-grid-v609')
    const photos = [...(gallery?.querySelectorAll(':scope > a.orimia-style-photo-v605') || [])]
    if (photos.length) window.__orimiaStylePhotoTemplatesV609 = photos.map(photo => photo.outerHTML)
    return photos.length
  })
  assert.ok(count >= 2, 'At least two source photos are required for count-layout verification')
}

async function setPhotoCount(page, count) {
  await page.evaluate(countValue => {
    const gallery = document.querySelector('.orimia-style-gallery-grid-v609')
    const templates = window.__orimiaStylePhotoTemplatesV609 || []
    if (!gallery || !templates.length) throw new Error('Gallery templates are unavailable')
    gallery.innerHTML = Array.from({ length:countValue }, (_, index) => templates[index % templates.length]).join('')
    gallery.dataset.photoCountV602 = String(countValue)
    gallery.classList.toggle('is-single-v609', countValue === 1)
    gallery.classList.toggle('is-multiple-v609', countValue > 1)
    gallery.classList.toggle('is-odd-v609', countValue > 1 && countValue % 2 === 1)
  }, count)
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

async function readLayout(page) {
  return page.locator('.community-detail-page article.orimia-style-detail-customer-v602').evaluate(article => {
    const rect = node => {
      const box = node?.getBoundingClientRect()
      return box && { x:box.x, y:box.y, right:box.right, bottom:box.bottom, width:box.width, height:box.height }
    }
    const gallery = article.querySelector('.orimia-style-gallery-grid-v609')
    const galleryStyle = gallery && getComputedStyle(gallery)
    const photos = [...(gallery?.querySelectorAll(':scope > a.orimia-style-photo-v605') || [])].map(photo => {
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
      gallery:rect(gallery),
      galleryDisplay:galleryStyle?.display,
      galleryColumns:galleryStyle?.gridTemplateColumns,
      galleryOverflow:galleryStyle?.overflow,
      columnGap:Number.parseFloat(galleryStyle?.columnGap || '0'),
      photoCount:gallery?.dataset.photoCountV602,
      single:gallery?.classList.contains('is-single-v609'),
      multiple:gallery?.classList.contains('is-multiple-v609'),
      odd:gallery?.classList.contains('is-odd-v609'),
      photos,
      details:rect(article.querySelector('.orimia-style-details-v602')),
      scrollWidth:document.documentElement.scrollWidth,
      viewportWidth:innerWidth,
    }
  })
}

function closeTo(actual, expected, tolerance = 2) {
  return Math.abs(actual - expected) <= tolerance
}

function verifyCountLayout(layout, width, count) {
  assert.equal(layout.photoCount, String(count), `${width}/${count}: photo count marker is incorrect`)
  assert.equal(layout.photos.length, count, `${width}/${count}: photo count is incorrect`)
  assert.equal(layout.galleryDisplay, 'grid', `${width}/${count}: gallery is not a grid`)
  assert.equal(layout.galleryOverflow, 'visible', `${width}/${count}: gallery clips its photos`)
  assert.equal(layout.single, count === 1, `${width}/${count}: single-photo state is incorrect`)
  assert.equal(layout.multiple, count > 1, `${width}/${count}: multiple-photo state is incorrect`)
  assert.equal(layout.odd, count > 1 && count % 2 === 1, `${width}/${count}: odd-photo state is incorrect`)
  assert.ok(layout.scrollWidth <= layout.viewportWidth + 1, `${width}/${count}: horizontal overflow`)

  for (const [index, photo] of layout.photos.entries()) {
    assert.ok(photo.x >= layout.gallery.x - 1 && photo.right <= layout.gallery.right + 1, `${width}/${count}: photo ${index + 1} leaves the gallery`)
    assert.ok(photo.ratioState === 'ready' && photo.ratioValue.includes('/'), `${width}/${count}: photo ${index + 1} lacks its natural ratio`)
    const [naturalWidth, naturalHeight] = photo.ratioValue.split('/').map(Number)
    assert.ok(naturalWidth > 0 && naturalHeight > 0, `${width}/${count}: photo ${index + 1} ratio is invalid`)
    assert.ok(closeTo(photo.height, photo.width * naturalHeight / naturalWidth), `${width}/${count}: photo ${index + 1} is cropped or distorted`)
    assert.ok(photo.backgroundSize === 'contain' || photo.objectFit === 'contain', `${width}/${count}: photo ${index + 1} does not use contain`)
  }

  if (count === 1) {
    assert.ok(closeTo(layout.photos[0].width, layout.gallery.width), `${width}/${count}: single photo is not full width`)
  } else {
    const pairStart = count % 2 === 1 ? 1 : 0
    const halfWidth = (layout.gallery.width - layout.columnGap) / 2
    if (pairStart === 1) {
      assert.ok(closeTo(layout.photos[0].x, layout.gallery.x), `${width}/${count}: odd-count lead photo is misplaced`)
      assert.ok(closeTo(layout.photos[0].width, layout.gallery.width), `${width}/${count}: odd-count lead photo is not full width`)
    }
    assert.equal((count - pairStart) % 2, 0, `${width}/${count}: final row has an empty grid cell`)
    for (let index = pairStart; index < count; index += 2) {
      const left = layout.photos[index]
      const right = layout.photos[index + 1]
      assert.ok(right, `${width}/${count}: pair ending at photo ${index + 1} is incomplete`)
      assert.ok(closeTo(left.width, halfWidth) && closeTo(right.width, halfWidth), `${width}/${count}: row ${index / 2 + 1} is not a two-column row`)
      assert.ok(closeTo(left.y, right.y), `${width}/${count}: paired photos do not share a row`)
      assert.ok(closeTo(left.x, layout.gallery.x), `${width}/${count}: left photo is misplaced`)
      assert.ok(closeTo(right.right, layout.gallery.right), `${width}/${count}: right photo is misplaced`)
      if (index > pairStart) {
        const previousBottom = Math.max(layout.photos[index - 2].bottom, layout.photos[index - 1].bottom)
        assert.ok(left.y >= previousBottom + 2, `${width}/${count}: gallery rows overlap`)
      }
    }
  }

  const finalBottom = Math.max(...layout.photos.map(photo => photo.bottom))
  assert.ok(layout.gallery.bottom >= finalBottom - 1, `${width}/${count}: gallery ends before its final photo`)
  assert.ok(layout.details.y >= layout.gallery.bottom - 1, `${width}/${count}: gallery overlaps the style details`)
}

async function verifyCustomer(width, postId, style) {
  const context = await browser.newContext({ viewport:{ width, height:844 }, deviceScaleFactor:1 })
  await customerLogin(context, `/u/community/${encodeURIComponent(postId)}`)
  const page = await context.newPage()
  const errors = collectErrors(page)
  await installPatchedStyleAssets(page)
  await page.goto(`${base}/u/community/${encodeURIComponent(postId)}?verify=v609-${width}`, { waitUntil:'domcontentloaded', timeout:30_000 })
  const lead = page.locator('.orimia-style-lead-v602')
  const gallery = page.locator('.orimia-style-gallery-grid-v609')
  const details = page.locator('.orimia-style-details-v602')
  await lead.waitFor({ state:'visible', timeout:20_000 })
  await gallery.waitFor({ state:'visible', timeout:20_000 })
  await details.waitFor({ state:'visible', timeout:20_000 })
  await page.waitForFunction(() => document.documentElement.dataset.orimiaStyleStateV606 === 'ready')
  await page.waitForFunction(() => [...document.querySelectorAll('.orimia-style-gallery-grid-v609 > a.orimia-style-photo-v605')].every(photo => photo.dataset.orimiaStyleImageRatioV608 !== 'loading'))

  assert.ok((await lead.innerText()).includes(style.title), `${width}: style title is missing`)
  assert.ok((await lead.innerText()).includes(expectedMenu(style)), `${width}: compact treatment menu is missing`)
  assert.equal(await details.locator('.orimia-style-menus-v602').count(), 0, `${width}: duplicate lower menu remains`)
  assert.equal(await page.locator('.community-feed-meta,.orimia-style-legacy-meta-v602').count(), 0, `${width}: legacy metadata remains`)
  assert.equal(await visibleExactCount(page, style.stylist.name), 1, `${width}: stylist name must appear once`)
  assert.equal(await page.locator('.orimia-style-stylist-v602:visible').count(), 1, `${width}: stylist profile count is incorrect`)

  const initialLayout = await readLayout(page)
  verifyCountLayout(initialLayout, width, initialLayout.photos.length)
  await preparePhotoTemplates(page)
  for (const count of [1, 2, 3, 4, 5]) {
    console.log(JSON.stringify({ verify:'customer-gallery-count', width, count }))
    await setPhotoCount(page, count)
    verifyCountLayout(await readLayout(page), width, count)
    if (width === 390 && (count === 3 || count === 5)) {
      await page.screenshot({ path:path.join(output, `customer-${width}-${count}-photos.png`), fullPage:true })
    }
  }

  assert.deepEqual(unexpected(errors), [], `${width}: browser errors`)
  results.push({ audience:'customer', width, photoCounts:[1, 2, 3, 4, 5], completePhotos:true, noOddGridGap:true })
  await context.close()
}

async function verifyDesktop(postId) {
  const context = await browser.newContext({ viewport:{ width:1280, height:900 }, deviceScaleFactor:1 })
  await customerLogin(context, `/u/community/${encodeURIComponent(postId)}`)
  const page = await context.newPage()
  await installPatchedStyleAssets(page)
  await page.goto(`${base}/u/community/${encodeURIComponent(postId)}?verify=v609-desktop`, { waitUntil:'domcontentloaded', timeout:30_000 })
  const gallery = page.locator('.orimia-style-gallery-grid-v609')
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
  assert.ok(layout.width / layout.height > 1.4, 'Desktop gallery aspect changed')
  assert.ok(layout.photos.length >= 2 && layout.photos[1].x > layout.photos[0].x, 'Desktop collage was replaced by the mobile grid')
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
  await page.goto(`${base}/admin/community/${encodeURIComponent(postId)}?verify=v609-staff`, { waitUntil:'domcontentloaded', timeout:30_000 })
  const details = page.locator('.orimia-style-details-v602')
  await details.waitFor({ state:'visible', timeout:20_000 })
  assert.equal(await details.locator('.orimia-style-menus-v602').count(), 1, 'Staff menu details were removed')
  assert.equal(await details.locator('[data-orimia-style-edit-v602]').count(), 1, 'Staff editor is missing')
  assert.equal(await page.locator('.orimia-style-gallery-grid-v609').count(), 0, 'Customer gallery layout leaked into the staff view')
  assert.ok(expected.post.style.menus.length >= 0)
  assert.deepEqual(unexpected(errors), [], 'staff: browser errors')
  results.push({ audience:'staff', menuDetailsPreserved:true, editorPreserved:true, customerGridAbsent:true })
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
