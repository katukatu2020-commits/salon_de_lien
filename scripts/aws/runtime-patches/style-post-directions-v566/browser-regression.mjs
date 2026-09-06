import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3141').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const artifactRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-style-post-directions-v566')
fs.mkdirSync(artifactRoot, { recursive:true })

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const name = Buffer.from(type)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([length, name, data, checksum])
}

function solidPng(width, height, rgba) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 6
  const row = Buffer.alloc(1 + width * 4)
  row[0] = 0
  for (let index = 0; index < width; index += 1) Buffer.from(rgba).copy(row, 1 + index * 4)
  const pixels = Buffer.concat(Array.from({ length:height }, () => row))
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(pixels)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

const fixtures = {
  FRONT:{ name:'front.png', mimeType:'image/png', buffer:solidPng(96, 120, [204, 105, 130, 255]) },
  SIDE:{ name:'side.png', mimeType:'image/png', buffer:solidPng(96, 120, [78, 132, 107, 255]) },
  BACK:{ name:'back.png', mimeType:'image/png', buffer:solidPng(96, 120, [111, 99, 92, 255]) },
}

const browser = await chromium.launch({ executablePath, headless:true })
try {
  for (const [name, viewport] of [['desktop', { width:1440, height:1000 }], ['mobile', { width:390, height:844 }]]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor:1 })
    const login = await context.request.post(`${baseUrl}/api/auth/login`, {
      form:{ email:'demo.owner', password:'LienDemo2026!', next:'/admin/community' },
    })
    assert.ok(login.ok(), `${name}: login failed with ${login.status()}`)

    let submitted = null
    await context.route(/\/api\/lien-community-publish(?:\?.*)?$/, async route => {
      submitted = route.request().postDataJSON()
      await route.fulfill({
        status:201,
        contentType:'application/json',
        body:JSON.stringify({ ok:true, postId:'v566-browser-post', photoCount:3, directions:['FRONT', 'SIDE', 'BACK'] }),
      })
    })

    const page = await context.newPage()
    await page.goto(`${baseUrl}/admin/community`, { waitUntil:'domcontentloaded' })
    const open = page.getByRole('button', { name:'新しいスタイルを投稿' })
    await open.waitFor({ state:'visible', timeout:30000 })
    assert.equal(await open.count(), 1, `${name}: duplicate publish actions`)
    await open.click()

    const dialog = page.getByRole('dialog', { name:'新しいスタイルを投稿' })
    await dialog.waitFor({ state:'visible' })
    for (const direction of ['FRONT', 'SIDE', 'BACK']) {
      assert.equal(await dialog.locator(`[data-ca-cp-slot="${direction}"]`).count(), 1)
    }
    const submit = dialog.getByRole('button', { name:'3方向を公開' })
    await dialog.locator('[data-ca-cp-rights]').check()
    assert.equal(await submit.isDisabled(), true)

    await dialog.locator('[data-ca-cp-slot="FRONT"] [data-ca-cp-file]').setInputFiles(fixtures.FRONT)
    await dialog.locator('[data-ca-cp-slot="SIDE"] [data-ca-cp-file]').setInputFiles(fixtures.SIDE)
    assert.equal(await submit.isDisabled(), true)
    await dialog.locator('[data-ca-cp-slot="BACK"] [data-ca-cp-file]').setInputFiles(fixtures.BACK)
    await dialog.getByText('3 / 3', { exact:true }).waitFor()
    assert.equal(await dialog.locator('.ca-cp-slot-preview img').count(), 3)
    assert.equal(await submit.isEnabled(), true)

    await dialog.locator('[data-ca-cp-slot="SIDE"] [data-ca-cp-remove]').click()
    assert.equal(await dialog.getByText('2 / 3', { exact:true }).count(), 1)
    assert.equal(await submit.isDisabled(), true)
    await dialog.locator('[data-ca-cp-slot="SIDE"] [data-ca-cp-file]').setInputFiles(fixtures.SIDE)
    await dialog.locator('[data-ca-cp-caption]').fill('透明感カラーの仕上がり')
    assert.equal(await submit.isEnabled(), true)

    const overflow = await page.evaluate(() => ({ width:document.documentElement.scrollWidth, viewport:innerWidth }))
    assert.ok(overflow.width <= overflow.viewport, `${name}: dialog overflowed viewport`)
    await page.screenshot({ path:path.join(artifactRoot, `style-post-${name}.png`), fullPage:false })

    await submit.click()
    await page.waitForTimeout(120)
    assert.ok(submitted, `${name}: publish request was not sent`)
    assert.equal(submitted.caption, '透明感カラーの仕上がり')
    assert.equal(submitted.rightsConfirmed, true)
    assert.deepEqual(submitted.photos.map(photo => photo.direction), ['FRONT', 'SIDE', 'BACK'])
    assert.ok(submitted.photos.every(photo => /^data:image\/png;base64,/.test(photo.dataUrl)))

    await page.evaluate(() => {
      const probe = document.createElement('div')
      document.body.appendChild(probe)
      probe.remove()
    })
    await page.waitForTimeout(100)
    assert.equal(await page.getByRole('button', { name:'新しいスタイルを投稿' }).count(), 1)
    await context.close()
  }
} finally {
  await browser.close()
}

console.log(JSON.stringify({
  release:'style-post-directions-v566',
  fixedDirectionSlots:true,
  requiredThreePhotos:true,
  replaceAndRemove:true,
  orderedPayload:true,
  noDuplicates:true,
  responsive:true,
  artifacts:artifactRoot,
}))
