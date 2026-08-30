import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const expectedVersion = process.env.EXPECTED_STYLE_BACK_VERSION || 'v490'
const injectedClientSource = process.env.INJECT_CLIENT_PATH
  ? await fs.readFile(path.resolve(process.env.INJECT_CLIENT_PATH), 'utf8')
  : ''
const replacementClientSource = process.env.REPLACE_CLIENT_PATH
  ? await fs.readFile(path.resolve(process.env.REPLACE_CLIENT_PATH), 'utf8')
  : ''

const ready = await fetch(`${baseUrl}/api/health/ready`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(ready.status, 200)

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/community' }),
})
assert.equal(login.status, 303)
const sessionCookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(sessionCookie, /^[^=]+=/)

if (!injectedClientSource && !replacementClientSource) {
  const page = await fetch(`${baseUrl}/admin/community?smoke=v490`, {
    headers: { cookie: sessionCookie, 'Cache-Control': 'no-cache' },
  })
  assert.equal(page.status, 200)
  const html = await page.text()
  assert.match(html, /content-edit-delete-client-v490\.js/)
  assert.match(html, /data-lien-community-bootstrap="v490"/)

  const client = await fetch(`${baseUrl}/content-edit-delete-client-v490.js?smoke=v490`, {
    headers: { 'Cache-Control': 'no-cache' },
  })
  assert.equal(client.status, 200)
  const clientSource = await client.text()
  assert.match(clientSource, /__lienStyleCommunityRepairV490/)
  assert.match(clientSource, /if \(!controlsReady \|\| scheduleTimer\) return/)
}

const chromePath = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].find(candidate => candidate && existsSync(candidate))
assert.ok(chromePath, 'Chrome or Chromium is required for the style community browser-back smoke test')

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
const withTimeout = (promise, milliseconds, label) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), milliseconds)),
])
const port = Number(process.env.CHROME_DEBUG_PORT || 9490)
const profile = path.join(os.tmpdir(), `lien-style-back-v490-${process.pid}`)
await fs.rm(profile, { recursive: true, force: true })
const chrome = spawn(chromePath, [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--no-first-run',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: 'ignore' })

let socket
try {
  let target
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      await fetch(`http://127.0.0.1:${port}/json/version`)
      target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' }).then(response => response.json())
      break
    } catch {
      await delay(100)
    }
  }
  assert.ok(target?.webSocketDebuggerUrl, 'Chrome DevTools target was not created')
  socket = new WebSocket(target.webSocketDebuggerUrl)
  await withTimeout(new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  }), 5000, 'DevTools connection')

  let messageId = 0
  const pending = new Map()
  const browserErrors = []
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (message.method === 'Fetch.requestPaused' && replacementClientSource) {
      void command('Fetch.fulfillRequest', {
        requestId: message.params.requestId,
        responseCode: 200,
        responseHeaders: [
          { name: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { name: 'Cache-Control', value: 'no-store' },
        ],
        body: Buffer.from(replacementClientSource, 'utf8').toString('base64'),
      }).catch(error => browserErrors.push(String(error)))
    }
    if (message.method === 'Runtime.exceptionThrown') {
      browserErrors.push(message.params?.exceptionDetails?.exception?.description || message.params?.exceptionDetails?.text || 'Uncaught browser exception')
    }
    if (message.method === 'Runtime.consoleAPICalled' && message.params?.type === 'error') {
      browserErrors.push((message.params.args || []).map(argument => argument.value || argument.description || '').join(' '))
    }
    if (!message.id || !pending.has(message.id)) return
    const request = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) request.reject(new Error(message.error.message))
    else request.resolve(message.result)
  })
  const command = (method, params = {}) => {
    const id = ++messageId
    socket.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
  }
  const evaluate = async expression => {
    const response = await withTimeout(command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }), 10000, 'browser evaluation')
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || 'browser evaluation failed')
    return response.result.value
  }
  const inspect = () => evaluate(`(() => ({
    path: location.pathname + location.search,
    managedGridCount: document.querySelectorAll('[data-lien-style-grid-managed-${expectedVersion}]').length,
    cardCount: document.querySelectorAll('.lien-style-card').length,
    footerCount: document.querySelectorAll('.lien-style-card__footer').length,
    visibilityCount: document.querySelectorAll('.lien-style-visibility').length,
    deleteCount: document.querySelectorAll('.lien-style-delete').length,
    detailLinkCount: document.querySelectorAll('a[href^="/admin/community/"]').length,
    ownerPanelCount: document.querySelectorAll('.lien-owner-panel').length,
    bodyMarker: document.body.dataset.lienCommunityOwnerEnhancedV471 || '',
    viewportOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    controlOverflow: Array.from(document.querySelectorAll('.lien-style-card')).some(card => {
      const cardRect = card.getBoundingClientRect()
      return Array.from(card.querySelectorAll('.lien-style-card__footer button')).some(button => {
        const rect = button.getBoundingClientRect()
        return rect.left < cardRect.left - 1 || rect.right > cardRect.right + 1
      })
    }),
  }))()`)

  await command('Page.enable')
  await command('Runtime.enable')
  await command('Network.enable')
  if (replacementClientSource) {
    await command('Network.setCacheDisabled', { cacheDisabled: true })
    await command('Fetch.enable', { patterns: [{ urlPattern: '*content-edit-delete-client-v482.js*', requestStage: 'Request' }] })
  }
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, screenWidth: 1440, screenHeight: 900 })
  const separator = sessionCookie.indexOf('=')
  await command('Network.setCookie', {
    name: sessionCookie.slice(0, separator),
    value: sessionCookie.slice(separator + 1),
    url: baseUrl,
    secure: baseUrl.startsWith('https://'),
    httpOnly: true,
  })
  await command('Page.navigate', { url: `${baseUrl}/admin/community?browserBack=v490` })

  if (injectedClientSource) {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await delay(100)
      if (await evaluate(`Boolean(document.querySelector('main'))`)) break
    }
    await evaluate(`${injectedClientSource}\n//# sourceURL=content-edit-delete-client-v490.injected.js`)
  }

  let initial
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await delay(200)
    initial = await inspect()
    if (initial.managedGridCount === 1 && initial.cardCount > 0 && initial.footerCount === initial.cardCount) break
  }
  assert.ok(initial.cardCount > 0, 'style cards were not rendered')
  assert.equal(initial.managedGridCount, 1)
  assert.equal(initial.footerCount, initial.cardCount)
  assert.equal(initial.visibilityCount, initial.cardCount)
  assert.equal(initial.deleteCount, initial.cardCount)
  assert.equal(initial.viewportOverflow, false)
  assert.equal(initial.controlOverflow, false)

  const clickedPostPath = await evaluate(`(() => {
    const link = Array.from(document.querySelectorAll('.lien-style-card__media[href^="/admin/community/"]')).find(candidate => candidate.getAttribute('aria-disabled') !== 'true')
    if (!link) return ''
    const postPath = new URL(link.href, location.origin).pathname
    link.click()
    return postPath
  })()`)
  assert.match(clickedPostPath, /^\/admin\/community\/[^/?]+/)

  let detail
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await delay(200)
    detail = await inspect()
    if (detail.path === clickedPostPath && detail.ownerPanelCount === 1) break
  }
  assert.equal(detail.path, clickedPostPath)
  assert.equal(detail.ownerPanelCount, 1)

  const navigation = await command('Page.getNavigationHistory')
  const listEntry = navigation.entries
    .slice(0, navigation.currentIndex)
    .reverse()
    .find(entry => new URL(entry.url).pathname === '/admin/community')
  assert.ok(listEntry, 'the browser history does not contain the style list')
  await command('Page.navigateToHistoryEntry', { entryId: listEntry.id })

  let backImmediate
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await delay(100)
    backImmediate = await inspect()
    if (/^\/admin\/community(?:\?|$)/.test(backImmediate.path)) break
  }
  assert.match(backImmediate.path, /^\/admin\/community(?:\?|$)/)

  let backSettled
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await delay(200)
    backSettled = await inspect()
    if (backSettled.managedGridCount === 1 && backSettled.cardCount > 0 && backSettled.footerCount === backSettled.cardCount) break
  }
  assert.equal(backSettled.managedGridCount, 1)
  assert.ok(backSettled.cardCount > 0)
  assert.equal(backSettled.footerCount, backSettled.cardCount)
  assert.equal(backSettled.visibilityCount, backSettled.cardCount)
  assert.equal(backSettled.deleteCount, backSettled.cardCount)
  assert.equal(backSettled.bodyMarker, '')
  assert.equal(backSettled.viewportOverflow, false)
  assert.equal(backSettled.controlOverflow, false)

  if (process.env.SCREENSHOT_DIR) {
    await fs.mkdir(process.env.SCREENSHOT_DIR, { recursive: true })
    const desktopShot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    await fs.writeFile(path.join(process.env.SCREENSHOT_DIR, 'style-community-back-desktop.png'), Buffer.from(desktopShot.data, 'base64'))
  }

  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 })
  await delay(300)
  const mobile = await inspect()
  assert.equal(mobile.footerCount, mobile.cardCount)
  assert.equal(mobile.visibilityCount, mobile.cardCount)
  assert.equal(mobile.deleteCount, mobile.cardCount)
  assert.equal(mobile.viewportOverflow, false)
  assert.equal(mobile.controlOverflow, false)

  if (process.env.SCREENSHOT_DIR) {
    const mobileShot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    await fs.writeFile(path.join(process.env.SCREENSHOT_DIR, 'style-community-back-mobile.png'), Buffer.from(mobileShot.data, 'base64'))
  }

  await evaluate(`(() => {
    const link = Array.from(document.querySelectorAll('.lien-style-card__media[href^="/admin/community/"]')).find(candidate => new URL(candidate.href, location.origin).pathname === ${JSON.stringify(clickedPostPath)})
    link?.click()
  })()`)
  let repeatedDetail
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await delay(200)
    repeatedDetail = await inspect()
    if (repeatedDetail.path === clickedPostPath && repeatedDetail.ownerPanelCount === 1) break
  }
  assert.equal(repeatedDetail.path, clickedPostPath)
  assert.equal(repeatedDetail.ownerPanelCount, 1)
  const unexpectedBrowserErrors = browserErrors.filter(error => !/Minified React error #(418|423)/.test(error))
  assert.deepEqual(unexpectedBrowserErrors, [])

  console.log(JSON.stringify({
    baseUrl,
    initialCards: initial.cardCount,
    backImmediateControls: backImmediate.footerCount,
    backSettledControls: backSettled.footerCount,
    mobileControls: mobile.footerCount,
    repeatedDetailManagementPanels: repeatedDetail.ownerPanelCount,
    browserErrors: unexpectedBrowserErrors,
  }, null, 2))
} finally {
  try { socket?.close() } catch {}
  chrome.kill()
  await fs.rm(profile, { recursive: true, force: true }).catch(() => {})
}
