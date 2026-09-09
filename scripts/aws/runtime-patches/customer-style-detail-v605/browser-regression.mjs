import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'http://localhost:3605').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/customer-style-detail-v605/browser'
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
  const list = await context.request.get(`${base}/u/community?verify=v605`, { headers:{ 'Cache-Control':'no-cache' } })
  assert.ok(list.ok(), `Community list returned ${list.status()}`)
  const html = await list.text()
  const ids = [...new Set([...html.matchAll(/href="\/u\/community\/([^"?#]+)["?]/g)].map(match => decodeURIComponent(match[1])))]
  for (const id of ids) {
    const detail = await context.request.get(`${base}/u/community/${encodeURIComponent(id)}?verify=v605-discovery`)
    if (!detail.ok()) continue
    const detailHtml = await detail.text()
    if ((detailHtml.match(/aria-label="施術後写真を拡大表示"/g) || []).length === 3) return id
  }
  throw new Error('A published three-photo style was not found')
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
  await page.goto(`${base}/u/community/${encodeURIComponent(postId)}?verify=v605-${width}`, { waitUntil:'domcontentloaded', timeout:30_000 })
  const lead = page.locator('.orimia-style-lead-v602')
  const gallery = page.locator('.orimia-style-gallery-stable-v605')
  const details = page.locator('.orimia-style-details-v602')
  await lead.waitFor({ state:'visible', timeout:20_000 })
  await gallery.waitFor({ state:'visible', timeout:20_000 })
  await details.waitFor({ state:'visible', timeout:20_000 })
  await page.waitForTimeout(2100)

  assert.ok((await lead.innerText()).includes(expected.title), `${width}: style title is missing`)
  assert.equal((await lead.innerText()).includes(expected.stylist.name), false, `${width}: stylist is duplicated above the gallery`)
  assert.equal(await page.locator('.orimia-style-stylist-compact-v602:visible').count(), 0, `${width}: compact stylist card remains`)
  assert.equal(await page.locator('.orimia-style-stylist-v602:visible').count(), 1, `${width}: full stylist profile count is incorrect`)
  assert.equal(await visibleExactCount(page, expected.stylist.name), 1, `${width}: stylist name must appear once`)
  assert.ok((await details.locator('.orimia-style-stylist-v602').innerText()).includes(expected.stylist.name), `${width}: stylist profile is missing below photos`)
  assert.equal(await details.locator('footer:visible').count(), 0, `${width}: source footer remains in customer view`)
  assert.equal(await page.getByRole('link', { name:'掲載元を見る', exact:true }).count(), 0, `${width}: source link remains in customer view`)
  assert.equal(await visibleExactCount(page, '公開中'), 0, `${width}: publication status remains`)

  const measurement = await page.locator('.community-detail-page article.orimia-style-detail-customer-v602').evaluate(article => {
    const rect = node => {
      const box = node?.getBoundingClientRect()
      const style = node && getComputedStyle(node)
      return box && {
        x:box.x,
        y:box.y,
        right:box.right,
        bottom:box.bottom,
        width:box.width,
        height:box.height,
        className:String(node.className || ''),
        styleAttr:node.getAttribute?.('style') || '',
        cssWidth:style?.width,
        cssLeft:style?.left,
        cssRight:style?.right,
        transform:style?.transform,
      }
    }
    const lead = rect(article.querySelector('.orimia-style-lead-v602'))
    const galleryNode = article.querySelector('.orimia-style-gallery-stable-v605')
    const gallery = rect(galleryNode)
    const details = rect(article.querySelector('.orimia-style-details-v602'))
    const photos = [...(galleryNode?.querySelectorAll(':scope > a.orimia-style-photo-v605') || [])].map(rect)
    return { lead, gallery, details, photos, scrollWidth:document.documentElement.scrollWidth, viewportWidth:innerWidth }
  })

  assert.ok(measurement.lead && measurement.gallery && measurement.details, `${width}: layout boxes are missing`)
  assert.ok(measurement.lead.bottom <= measurement.gallery.y + 1, `${width}: gallery overlaps summary`)
  assert.ok(measurement.gallery.bottom <= measurement.details.y + 1, `${width}: gallery overlaps stylist or text`)
  assert.ok(measurement.gallery.width > 0 && measurement.gallery.height > 0, `${width}: gallery has no reserved size`)
  assert.ok(measurement.scrollWidth <= measurement.viewportWidth + 1, `${width}: horizontal overflow`)
  for (const photo of measurement.photos) {
    assert.ok(photo.x >= measurement.gallery.x - 1 && photo.y >= measurement.gallery.y - 1, `${width}: photo starts outside gallery`)
    assert.ok(
      photo.right <= measurement.gallery.right + 1 && photo.bottom <= measurement.gallery.bottom + 1,
      `${width}: photo escapes gallery ${JSON.stringify({ gallery:measurement.gallery, photo })}`,
    )
  }
  if (measurement.photos.length === 3) {
    const [primary, top, bottom] = measurement.photos
    assert.ok(primary.width > top.width, `${width}: primary photo is not emphasized`)
    assert.ok(top.x > primary.x && bottom.x > primary.x, `${width}: secondary photos are misplaced`)
    assert.ok(bottom.y >= top.bottom - 1, `${width}: secondary photos overlap`)
  }

  await page.screenshot({ path:path.join(output, `customer-${width}.png`), fullPage:true })
  assert.deepEqual(unexpected(errors), [], `${width}: browser errors`)
  results.push({ audience:'customer', width, stylistCount:1, sourceHidden:true, boundedGallery:true, noOverlap:true, noOverflow:true })
  await context.close()
}

async function verifyStaff(postId) {
  const context = await browser.newContext({ viewport:{ width:1280, height:900 }, deviceScaleFactor:1 })
  await staffLogin(context, `/admin/community/${encodeURIComponent(postId)}`)
  const expected = await structured(context, 'staff', postId)
  const page = await context.newPage()
  const errors = collectErrors(page)
  await page.goto(`${base}/admin/community/${encodeURIComponent(postId)}?verify=v605-staff`, { waitUntil:'domcontentloaded', timeout:30_000 })
  const details = page.locator('.orimia-style-details-v602')
  await details.waitFor({ state:'visible', timeout:20_000 })
  assert.ok((await details.innerText()).includes(expected.post.style.stylist.name))
  assert.equal(await details.locator('[data-orimia-style-edit-v602]').count(), 1)
  if (expected.post.style.source) assert.equal(await details.getByRole('link', { name:'掲載元を見る', exact:true }).count(), 1)
  assert.deepEqual(unexpected(errors), [], 'staff: browser errors')
  results.push({ audience:'staff', editorPreserved:true, internalSourcePreserved:Boolean(expected.post.style.source) })
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
  await verifyStaff(postId)
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ postId, results }, null, 2))
  console.log(JSON.stringify({ passed:true, postId, results }))
} finally {
  await browser.close()
}
