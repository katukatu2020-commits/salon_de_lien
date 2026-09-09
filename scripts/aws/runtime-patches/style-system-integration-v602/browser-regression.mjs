import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'http://localhost:3602').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/style-system-integration-v602/browser'
const explicitPostId = String(process.env.STYLE_POST_ID || '').trim()
const allowMutations = process.env.ALLOW_BROWSER_MUTATIONS === 'true'
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
  return { response, body:await response.json().catch(() => ({})) }
}

async function findStylePost(context) {
  if (explicitPostId) return explicitPostId
  const list = await context.request.get(`${base}/u/community?verify=v602`, { headers:{ 'Cache-Control':'no-cache' } })
  assert.ok(list.ok(), `Community list returned ${list.status()}`)
  const html = await list.text()
  const ids = [...new Set([...html.matchAll(/href="\/u\/community\/([^"?#]+)["?]/g)].map(match => decodeURIComponent(match[1])))]
  for (const id of ids) {
    const candidate = await structured(context, 'customer', id)
    if (candidate.response.ok() && candidate.body?.post?.postKind === 'STORE') return id
  }
  throw new Error('Published store style post was not found')
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
  await page.goto(`${base}/u/community/${encodeURIComponent(postId)}?verify=v602-${width}`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await page.locator('.orimia-style-lead-v602').waitFor({ state:'visible', timeout:20_000 })
  await page.locator('.orimia-style-details-v602').waitFor({ state:'attached', timeout:20_000 })
  await page.waitForTimeout(700)

  const lead = page.locator('.orimia-style-lead-v602')
  const gallery = page.locator('.orimia-style-gallery-v602')
  const details = page.locator('.orimia-style-details-v602')
  await gallery.waitFor({ state:'visible' })
  assert.ok((await lead.innerText()).includes(expected.title), `${width}: style title is missing above the gallery`)
  assert.ok((await lead.innerText()).includes(expected.stylist.name), `${width}: stylist is missing above the gallery`)
  assert.ok(expected.menus.length === 0 || (await lead.innerText()).includes(expected.menus[0].name), `${width}: menu is missing above the gallery`)
  assert.ok((await details.innerText()).includes('スタイリストコメント'), `${width}: stylist comment section is missing`)
  assert.ok((await details.innerText()).includes(expected.comment), `${width}: stylist comment is missing`)
  assert.ok((await details.innerText()).includes('メニュー内容'), `${width}: menu section is missing`)
  assert.ok(expected.menus.length === 0 || (await details.innerText()).includes(expected.menus[0].name), `${width}: structured menu is missing`)
  assert.equal(await visibleExactCount(page, '公開中'), 0, `${width}: publication status must not be shown`)
  assert.equal(await visibleExactCount(page, '非公開'), 0, `${width}: publication status must not be shown`)
  assert.equal(await visibleExactCount(page, '店舗スタイル'), 0, `${width}: legacy store-style label must not be shown`)
  assert.equal(await page.locator('.community-feed-meta:visible').count(), 0, `${width}: legacy style attribution is still visible`)
  assert.equal(await page.locator('.orimia-style-legacy-meta-v602:visible').count(), 0, `${width}: fallback style attribution is still visible`)
  assert.equal(await page.locator('.lien-owner-panel').count(), 0, `${width}: legacy customer caption panel is still present`)

  const measurement = await page.locator('.community-detail-page article.orimia-style-detail-v602').evaluate(article => {
    const lead = article.querySelector('.orimia-style-lead-v602')?.getBoundingClientRect()
    const gallery = article.querySelector('.orimia-style-gallery-v602')
    const galleryBox = gallery?.getBoundingClientRect()
    const photoBoxes = [...(gallery?.querySelectorAll(':scope > a') || [])].map(node => {
      const box = node.getBoundingClientRect()
      const style = getComputedStyle(node)
      return {
        x:box.x, y:box.y, width:box.width, height:box.height, right:box.right, bottom:box.bottom,
        aspectRatio:style.aspectRatio, cssHeight:style.height, minHeight:style.minHeight,
        padding:style.padding, boxSizing:style.boxSizing, alignSelf:style.alignSelf,
        inlineStyle:node.getAttribute('style'),
      }
    })
    return {
      lead:lead && { x:lead.x, y:lead.y, width:lead.width, height:lead.height, bottom:lead.bottom },
      gallery:galleryBox && { x:galleryBox.x, y:galleryBox.y, width:galleryBox.width, height:galleryBox.height, right:galleryBox.right, bottom:galleryBox.bottom },
      photoBoxes,
      scrollWidth:document.documentElement.scrollWidth,
      viewportWidth:innerWidth,
    }
  })
  assert.ok(measurement.lead && measurement.gallery, `${width}: lead or gallery measurement is missing`)
  assert.ok(measurement.lead.bottom <= measurement.gallery.y + 2, `${width}: summary must appear before photos`)
  assert.ok(measurement.scrollWidth <= measurement.viewportWidth + 1, `${width}: horizontal overflow`)
  if (measurement.photoBoxes.length === 3) {
    const [front, side, back] = measurement.photoBoxes
    const layoutDiagnostic = JSON.stringify({ gallery:measurement.gallery, photos:measurement.photoBoxes })
    assert.ok(front.width > side.width, `${width}: primary photo is not emphasized; ${layoutDiagnostic}`)
    assert.ok(side.x > front.x && back.x > front.x, `${width}: secondary photos are not in the right column; ${layoutDiagnostic}`)
    assert.ok(back.y >= side.bottom - 2, `${width}: secondary photos overlap; ${layoutDiagnostic}`)
    assert.ok(Math.abs(front.bottom - back.bottom) < 3, `${width}: photo mosaic has an empty lower cell; ${layoutDiagnostic}`)
    assert.ok(measurement.gallery.height <= measurement.gallery.width * .8, `${width}: gallery is still excessively tall`)
  }

  await page.screenshot({ path:path.join(output, `customer-top-${width}.png`), fullPage:false })
  await details.scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)
  await page.screenshot({ path:path.join(output, `customer-details-${width}.png`), fullPage:false })
  assert.deepEqual(unexpected(errors), [], `${width}: browser errors`)
  results.push({ audience:'customer', width, structuredSummary:true, details:true, noStatus:true, noOverflow:true })
  await context.close()
}

async function verifyStaff(postId) {
  const context = await browser.newContext({ viewport:{ width:1440, height:1000 }, deviceScaleFactor:1 })
  await staffLogin(context, `/admin/community/${encodeURIComponent(postId)}`)
  const before = await structured(context, 'staff', postId)
  assert.ok(before.response.ok(), `Staff structured API returned ${before.response.status()}`)
  assert.ok(Array.isArray(before.body.options?.staff), 'Staff options are missing')
  assert.ok(Array.isArray(before.body.options?.menus), 'Menu options are missing')

  const page = await context.newPage()
  const errors = collectErrors(page)
  await page.goto(`${base}/admin/community/${encodeURIComponent(postId)}?verify=v602-staff`, { waitUntil:'domcontentloaded', timeout:30_000 })
  const details = page.locator('.orimia-style-details-v602')
  await details.waitFor({ state:'visible', timeout:20_000 })
  assert.ok((await details.innerText()).includes(before.body.post.style.title))
  assert.ok((await details.innerText()).includes(before.body.post.style.stylist.name))
  assert.equal(await visibleExactCount(page, '公開中'), 0)
  assert.equal(await visibleExactCount(page, '非公開'), 0)
  const edit = page.getByRole('button', { name:'スタイル情報と紐付けを編集' })
  await edit.waitFor({ state:'visible' })
  await edit.click()
  const dialog = page.getByRole('dialog', { name:'スタイル情報とORIMIAの登録情報を紐付け' })
  await dialog.waitFor({ state:'visible' })
  assert.equal(await dialog.locator('select[name="staffKey"]').count(), 1)
  assert.equal(await dialog.locator('input[name="menuIds"]').count(), before.body.options.menus.length)
  assert.ok(await dialog.locator('input[name="styleName"]').inputValue())
  await page.screenshot({ path:path.join(output, 'staff-editor-1440.png'), fullPage:false })

  if (allowMutations) {
    const original = before.body.post.style
    const updatedName = `${original.title} UI確認`
    await dialog.locator('input[name="styleName"]').fill(updatedName)
    await dialog.locator('textarea[name="stylistComment"]').fill('構造化編集の動作確認コメント')
    await dialog.getByRole('button', { name:'保存', exact:true }).click()
    await dialog.waitFor({ state:'detached', timeout:15_000 })
    await page.getByText(updatedName, { exact:true }).waitFor()
    const saved = await structured(context, 'staff', postId)
    assert.equal(saved.body.post.style.title, updatedName)
    assert.equal(saved.body.post.style.comment, '構造化編集の動作確認コメント')
    const restore = await context.request.patch(`${base}/api/lien-style-system?audience=staff&postId=${encodeURIComponent(postId)}`, {
      headers:{ Origin:base, 'Content-Type':'application/json' },
      data:{
        styleName:original.title,
        stylistComment:original.comment,
        staffKey:original.stylist.linked ? original.stylist.key : '',
        menuIds:original.menus.map(menu => menu.id),
      },
    })
    assert.ok(restore.ok(), `Fixture restore returned ${restore.status()}`)
  } else {
    await dialog.getByRole('button', { name:'キャンセル' }).click()
  }

  await page.goto(`${base}/admin/community`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await page.getByRole('heading', { name:'スタイル共有', exact:true }).waitFor({ state:'visible', timeout:20_000 })
  const open = page.locator('button[data-ca-community-publish]')
  await open.waitFor({ state:'visible', timeout:20_000 })
  assert.equal(await open.count(), 1)
  await page.waitForFunction(() => window.__lienStylePostDirectionsV566 === true)
  await page.waitForTimeout(1200)
  await open.click()
  const publishDialog = page.getByRole('dialog', { name:'新しいスタイルを投稿' })
  await publishDialog.waitFor({ state:'visible', timeout:10_000 })
  const linking = publishDialog.locator('[data-style-links-v602]')
  try {
    await linking.waitFor({ state:'visible', timeout:20_000 })
  } catch (error) {
    await page.screenshot({ path:path.join(output, 'staff-publisher-missing-1440.png'), fullPage:false })
    const diagnostics = await page.evaluate(() => ({
      releaseScript:[...document.scripts].map(script => script.src).filter(source => source.includes('community-publishing')),
      linkRoots:document.querySelectorAll('[data-style-links-v602]').length,
      modalText:document.querySelector('.ca-cp-dialog')?.textContent?.replace(/\s+/g, ' ').slice(0, 400),
    }))
    throw new Error(`Publisher linking UI did not mount: ${JSON.stringify({ diagnostics, errors })}`, { cause:error })
  }
  await publishDialog.locator('[data-style-staff-v602]').waitFor({ state:'visible' })
  assert.ok((await linking.innerText()).includes('ORIMIAの登録情報と紐付け'))
  assert.ok((await publishDialog.locator('[data-style-menu-v602]').count()) > 0)
  assert.ok(await publishDialog.locator('[data-hp-field="title"]').evaluate(input => input.closest('.ca-cp-field')?.classList.contains('hp-wide')), 'style name field is not full width')
  for (const key of ['stylistName', 'stylistKana', 'stylistRole', 'menuDescription']) {
    assert.equal(await publishDialog.locator(`[data-hp-field="${key}"]`).evaluate(input => input.closest('.ca-cp-field')?.hidden), true, `${key}: legacy free-text field is still visible`)
  }
  const firstStaff = publishDialog.locator('[data-style-staff-v602] option').nth(1)
  if (await firstStaff.count()) {
    const value = await firstStaff.getAttribute('value')
    await publishDialog.locator('[data-style-staff-v602]').selectOption(value)
    assert.ok(await publishDialog.locator('[data-hp-field="stylistName"]').inputValue(), 'linked staff did not synchronize the fallback metadata')
  }
  const firstMenu = publishDialog.locator('[data-style-menu-v602]').first()
  if (await firstMenu.count()) {
    await firstMenu.check()
    assert.ok(await publishDialog.locator('[data-hp-field="menuDescription"]').inputValue(), 'linked menu did not synchronize the fallback metadata')
  }
  await page.screenshot({ path:path.join(output, 'staff-publisher-1440.png'), fullPage:false })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true)
  assert.deepEqual(unexpected(errors), [], 'Staff browser errors')
  results.push({ audience:'staff', width:1440, editor:true, publisherLinks:true, noStatus:true, mutationVerified:allowMutations })
  await context.close()
}

try {
  const discovery = await browser.newContext()
  await customerLogin(discovery)
  const postId = await findStylePost(discovery)
  const customerData = await structured(discovery, 'customer', postId)
  assert.ok(customerData.response.ok(), `Structured customer API returned ${customerData.response.status()}`)
  const expected = customerData.body.post.style
  assert.ok(expected.title)
  assert.ok(expected.stylist?.name)
  await discovery.close()

  for (const width of [390, 320, 1440]) await verifyCustomer(width, postId, expected)
  await verifyStaff(postId)
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ postId, results }, null, 2))
  console.log(JSON.stringify({ passed:true, postId, results }))
} finally {
  await browser.close()
}
