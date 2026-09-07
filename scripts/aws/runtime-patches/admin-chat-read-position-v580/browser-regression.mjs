import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3145').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const artifactRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-admin-chat-read-position-v580')
fs.mkdirSync(artifactRoot, { recursive:true })

async function login(context) {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    form:{ email:'demo.owner', password:'LienDemo2026!', next:'/admin/customers/messages/chat' },
  })
  assert.ok(response.ok(), `login failed with ${response.status()}`)
}

async function findConversation(page) {
  await page.goto(`${baseUrl}/admin/customers/messages/chat?verify=v580`, {
    waitUntil:'domcontentloaded',
    timeout:35_000,
  })
  const links = await page.locator('a[href*="/admin/customers/messages/chat?threadId="]').evaluateAll(nodes => (
    [...new Set(nodes.map(node => node.href))]
  ))
  assert.ok(links.length > 0, 'no admin chat fixture is available')

  for (const href of links.slice(0, 20)) {
    await page.goto(`${href}${href.includes('?') ? '&' : '?'}verify=v580`, {
      waitUntil:'domcontentloaded',
      timeout:35_000,
    })
    if (await page.locator('[data-lien-admin-chat-direction="outgoing"]').count()) return href
  }
  assert.fail('no conversation with an outgoing staff message is available')
}

async function inspectViewport(browser, viewport, label, errors) {
  const context = await browser.newContext({ viewport, deviceScaleFactor:1 })
  await login(context)
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(`${label}-page:${error.message}`))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`${label}-console:${message.text()}`)
  })
  const threadUrl = await findConversation(page)
  await page.locator('.admin-chat-conversation').waitFor({ state:'visible' })

  const geometry = await page.evaluate(() => {
    const readRect = element => {
      const rect = element.getBoundingClientRect()
      return { left:rect.left, right:rect.right, top:rect.top, bottom:rect.bottom, width:rect.width, height:rect.height }
    }
    const collect = selector => [...document.querySelectorAll(selector)].map(row => {
      const bubble = row.querySelector('[data-lien-chat-body]')
      const meta = row.querySelector('[data-lien-admin-chat-meta="v580"]')
      const read = row.querySelector('[data-lien-admin-chat-read="v580"]')
      return {
        direction:row.dataset.lienAdminChatDirection,
        flexDirection:getComputedStyle(row).flexDirection,
        row:readRect(row),
        bubble:bubble ? readRect(bubble) : null,
        meta:meta ? readRect(meta) : null,
        read:read ? readRect(read) : null,
        readText:read?.textContent?.trim() || '',
      }
    })
    return {
      outgoing:collect('[data-lien-admin-chat-direction="outgoing"]'),
      incoming:collect('[data-lien-admin-chat-direction="incoming"]'),
      viewportWidth:document.documentElement.clientWidth,
      scrollWidth:document.documentElement.scrollWidth,
    }
  })

  assert.ok(geometry.outgoing.length > 0, `${label}: no outgoing staff messages rendered`)
  for (const [index, row] of geometry.outgoing.entries()) {
    assert.equal(row.flexDirection, 'row-reverse', `${label}: outgoing row ${index} direction`)
    assert.ok(row.bubble && row.meta, `${label}: outgoing row ${index} lacks bubble metadata`)
    assert.ok(row.meta.right <= row.bubble.left + 0.75, `${label}: outgoing row ${index} metadata is not left of bubble`)
    assert.ok(row.bubble.left - row.meta.right >= 6, `${label}: outgoing row ${index} metadata gap is too small`)
    if (row.read) {
      assert.equal(row.readText, '\u65e2\u8aad')
      assert.ok(row.read.right <= row.bubble.left + 0.75, `${label}: read marker ${index} is not left of bubble`)
    }
  }
  for (const [index, row] of geometry.incoming.entries()) {
    assert.equal(row.flexDirection, 'row', `${label}: incoming row ${index} direction`)
    assert.ok(row.bubble && row.meta, `${label}: incoming row ${index} lacks bubble metadata`)
    assert.ok(row.meta.left >= row.bubble.right - 0.75, `${label}: incoming row ${index} metadata moved from the right`)
    assert.equal(row.read, null, `${label}: incoming row ${index} received a read marker`)
  }
  assert.ok(geometry.scrollWidth <= geometry.viewportWidth + 1, `${label}: page overflows horizontally`)

  const screenshot = path.join(artifactRoot, `admin-chat-read-position-v580-${label}.png`)
  await page.screenshot({ path:screenshot, fullPage:true })
  await context.close()
  return {
    label,
    threadUrl,
    outgoingRows:geometry.outgoing.length,
    incomingRows:geometry.incoming.length,
    readMarkers:geometry.outgoing.filter(row => row.read).length,
    screenshot,
  }
}

const browser = await chromium.launch({ executablePath, headless:true })
const errors = []
try {
  const desktop = await inspectViewport(browser, { width:1440, height:960 }, 'desktop', errors)
  const mobile = await inspectViewport(browser, { width:390, height:844 }, 'mobile', errors)
  const unexpectedErrors = errors.filter(message => !/Minified React error #(418|423)/.test(message))
  assert.deepEqual(unexpectedErrors, [], unexpectedErrors.join('\n'))
  console.log(JSON.stringify({
    release:'admin-chat-read-position-v580',
    browserVerified:true,
    desktop,
    mobile,
    artifacts:artifactRoot,
  }))
} finally {
  await browser.close()
}
