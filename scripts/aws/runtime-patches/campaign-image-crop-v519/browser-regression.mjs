import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3124').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotDir = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'campaign-image-crop-v519')
fs.mkdirSync(screenshotDir, { recursive: true })

async function selectWideCampaignImage(page) {
  await page.locator('#campaign-image').evaluate(input => {
    const canvas = document.createElement('canvas')
    canvas.width = 960
    canvas.height = 540
    const context = canvas.getContext('2d')
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, '#d94e71')
    gradient.addColorStop(1, '#2d8f7b')
    context.fillStyle = gradient
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#ffffff'
    context.font = 'bold 64px sans-serif'
    context.fillText('CAMPAIGN 16:9', 190, 295)
    canvas.toBlob(blob => {
      const transfer = new DataTransfer()
      transfer.items.add(new File([blob], 'campaign-wide.png', { type: 'image/png' }))
      input.files = transfer.files
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }, 'image/png')
  })
}

const browser = await chromium.launch({ executablePath, headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } })
  const login = await context.request.post(`${baseUrl}/api/auth/login`, {
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/customers/messages/campaigns' },
  })
  assert.equal(login.ok(), true, `admin login returned ${login.status()}`)

  const page = await context.newPage()
  const dialogs = []
  page.on('dialog', async dialog => {
    dialogs.push(dialog.message())
    await dialog.dismiss()
  })
  await page.goto(`${baseUrl}/admin/customers/messages/campaigns`, { waitUntil: 'domcontentloaded' })
  await page.locator('#campaign-image').waitFor({ state: 'attached' })

  const initialPreview = await page.locator('#campaign-preview').innerText()
  assert.match(initialPreview, /画像がない場合/)

  await selectWideCampaignImage(page)

  const cropModal = page.locator('.lien-v293-crop-modal')
  await cropModal.waitFor({ state: 'visible' })
  await page.getByRole('heading', { name: '画像を正方形に調整' }).waitFor()
  assert.equal(dialogs.length, 0, `unexpected browser dialog: ${dialogs.join(', ')}`)
  assert.match(await page.locator('#campaign-preview').innerText(), /画像がない場合/)

  const cropCanvas = cropModal.locator('canvas')
  const canvasBox = await cropCanvas.boundingBox()
  assert.ok(canvasBox && Math.abs(canvasBox.width - canvasBox.height) < 1, 'crop viewport is not square')
  await cropCanvas.hover({ position: { x: canvasBox.width * 0.55, y: canvasBox.height * 0.5 } })
  await page.mouse.down()
  await page.mouse.move(canvasBox.x + canvasBox.width * 0.45, canvasBox.y + canvasBox.height * 0.5, { steps: 5 })
  await page.mouse.up()
  await cropModal.locator('input[type="range"]').evaluate(input => {
    input.value = '1.25'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.screenshot({ path: path.join(screenshotDir, 'campaign-crop-modal.png'), fullPage: false })
  await cropModal.getByRole('button', { name: 'この範囲で決定' }).click()
  await cropModal.waitFor({ state: 'detached' })

  const file = await page.locator('#campaign-image').evaluate(async input => {
    const selected = input.files?.[0]
    if (!selected) return null
    const bitmap = await createImageBitmap(selected)
    const value = {
      name: selected.name,
      type: selected.type,
      size: selected.size,
      width: bitmap.width,
      height: bitmap.height,
      validationMessage: input.validationMessage,
    }
    bitmap.close()
    return value
  })
  assert.ok(file, 'cropped campaign file was not returned to the input')
  assert.match(file.name, /-square\.jpg$/)
  assert.equal(file.type, 'image/jpeg')
  assert.ok(file.size > 0)
  assert.equal(file.width, 512)
  assert.equal(file.height, 512)
  assert.equal(file.validationMessage, '')
  await page.locator('#campaign-preview img').waitFor({ state: 'visible' })
  assert.match(await page.locator('#campaign-preview img').getAttribute('src'), /^blob:/)
  assert.equal(dialogs.length, 0)
  await page.screenshot({ path: path.join(screenshotDir, 'campaign-cropped-preview.png'), fullPage: false })

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const mobileLogin = await mobileContext.request.post(`${baseUrl}/api/auth/login`, {
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/customers/messages/campaigns' },
  })
  assert.equal(mobileLogin.ok(), true, `mobile admin login returned ${mobileLogin.status()}`)
  const mobilePage = await mobileContext.newPage()
  await mobilePage.goto(`${baseUrl}/admin/customers/messages/campaigns`, { waitUntil: 'domcontentloaded' })
  await mobilePage.locator('#campaign-image').waitFor({ state: 'attached' })
  await selectWideCampaignImage(mobilePage)
  const mobileModal = mobilePage.locator('.lien-v293-crop-modal')
  await mobileModal.waitFor({ state: 'visible' })
  const mobileDialog = mobileModal.locator('.lien-v293-dialog')
  const mobileRect = await mobileDialog.boundingBox()
  assert.ok(mobileRect, 'mobile crop dialog is missing')
  assert.ok(mobileRect.x >= 0 && mobileRect.x + mobileRect.width <= 390, 'mobile crop dialog overflows horizontally')
  assert.equal(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await mobileModal.getByRole('button', { name: 'この範囲で決定' }).waitFor({ state: 'visible' })
  await mobilePage.screenshot({ path: path.join(screenshotDir, 'campaign-crop-modal-mobile.png'), fullPage: false })
  await mobileModal.getByRole('button', { name: 'キャンセル' }).click()
  await mobileModal.waitFor({ state: 'detached' })
  await mobileContext.close()

  console.log(JSON.stringify({ release: 'campaign-image-crop-v519', browserVerified: true, baseUrl, file }))
} finally {
  await browser.close()
}
