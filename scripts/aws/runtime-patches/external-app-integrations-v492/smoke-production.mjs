import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const injectedClientPath = String(process.env.SMOKE_INJECT_CLIENT || '')
const screenshotDirectory = String(process.env.SMOKE_SCREENSHOT_DIR || '')
const compactWidth = Number(process.env.SMOKE_COMPACT_WIDTH || 390)

const ready = await fetch(`${baseUrl}/api/health/ready`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(ready.status, 200)

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/settings' }),
})
assert.equal(login.status, 303)
const sessionCookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(sessionCookie, /^[^=]+=/)

async function json(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: { cookie: sessionCookie, Accept: 'application/json', 'Cache-Control': 'no-cache' },
  })
  const payload = await response.json().catch(() => ({}))
  assert.equal(response.status, 200, payload.error || pathname)
  return payload
}

const profile = (await json('/api/admin/store-profile')).profile
const lineSettings = await json('/api/lien-line-settings')
assert.ok(profile.setup.inboundAddress, 'the tenant inbound address is missing')
assert.equal(lineSettings.connected, true, 'LINE must remain connected')

const chromePath = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].find(candidate => candidate && existsSync(candidate))
assert.ok(chromePath, 'Chrome or Chromium is required')

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
const withTimeout = (promise, milliseconds, label) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), milliseconds)),
])
const port = 9492
const browserProfile = path.join(os.tmpdir(), `lien-external-integrations-v492-${process.pid}`)
await fs.rm(browserProfile, { recursive: true, force: true })
if (screenshotDirectory) await fs.mkdir(screenshotDirectory, { recursive: true })
const chrome = spawn(chromePath, [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--no-first-run',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${browserProfile}`,
  'about:blank',
], { stdio: 'ignore' })

let socket
try {
  let target
  for (let attempt = 0; attempt < 80; attempt += 1) {
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
  const bootstrapErrors = []
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (message.method === 'Runtime.exceptionThrown') {
      browserErrors.push(message.params?.exceptionDetails?.exception?.description || message.params?.exceptionDetails?.text || 'browser exception')
    }
    if (!message.id || !pending.has(message.id)) return
    const request = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) request.reject(new Error(message.error.message))
    else request.resolve(message.result)
  })
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++messageId
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'browser evaluation failed')
    return result.result.value
  }
  const navigate = async (width, height, hash) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
    await send('Page.navigate', { url: `${baseUrl}/admin/settings${hash}` })
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const settled = await evaluate(`document.readyState === 'complete' && Boolean(document.querySelector('#store-profile')) && Boolean(document.querySelector('.lien-settings-tabs-v447'))`)
      if (settled) break
      await delay(200)
    }
    bootstrapErrors.push(...browserErrors.splice(0))
    if (injectedClientPath) {
      const injectedSource = await fs.readFile(injectedClientPath, 'utf8')
      await evaluate(injectedSource)
    }
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const settled = await evaluate(`(() => {
        const panel = document.querySelector('#lien-external-integrations-v492')
        const hotpepper = document.querySelector('#lien-hotpepper-settings-v492')
        return Boolean(panel && panel.querySelector('#lien-line-settings-v436') && hotpepper?.dataset.state === 'ready')
      })()`)
      if (settled) return
      await delay(250)
    }
    throw new Error('external integrations page did not settle')
  }
  const capture = async name => {
    if (!screenshotDirectory) return
    const metrics = await send('Page.getLayoutMetrics')
    const width = Math.ceil(metrics.cssContentSize.width)
    const height = Math.ceil(metrics.cssContentSize.height)
    const shot = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height, scale: 1 },
    })
    await fs.writeFile(path.join(screenshotDirectory, name), Buffer.from(shot.data, 'base64'))
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  const cookieSeparator = sessionCookie.indexOf('=')
  await send('Network.setCookie', {
    name: sessionCookie.slice(0, cookieSeparator),
    value: sessionCookie.slice(cookieSeparator + 1),
    domain: 'salon-de-lien.com',
    path: '/',
    secure: true,
  })

  await navigate(1600, 1000, '#settings-store')
  const storeState = await evaluate(`(() => {
    const visible = node => Boolean(node && !node.hidden && getComputedStyle(node).display !== 'none' && node.getBoundingClientRect().width > 0)
    const store = document.querySelector('#store-profile')
    const panel = document.querySelector('#lien-external-integrations-v492')
    const source = store?.querySelector('[data-ca-inbound-email]')
    const button = document.querySelector('.lien-settings-tabs-v447 [data-settings-panel="line"]')
    return {
      tabText: button?.textContent.trim() || '',
      storeVisible: visible(store),
      panelVisible: visible(panel),
      sourceHidden: Boolean(source?.hidden) && getComputedStyle(source).display === 'none',
      visibleHotpepperInStore: Array.from(store?.querySelectorAll('h3') || []).some(node => node.textContent.includes('Hotpepper') && visible(node)),
    }
  })()`)
  assert.equal(storeState.tabText, '外部アプリ連携')
  assert.equal(storeState.storeVisible, true)
  assert.equal(storeState.panelVisible, false)
  assert.equal(storeState.sourceHidden, true)
  assert.equal(storeState.visibleHotpepperInStore, false)

  await evaluate(`document.querySelector('.lien-settings-tabs-v447 [data-settings-panel="line"]')?.click()`)
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const visible = await evaluate(`(() => { const panel=document.querySelector('#lien-external-integrations-v492'); return Boolean(panel && !panel.hidden && getComputedStyle(panel).display !== 'none') })()`)
    if (visible) break
    await delay(100)
  }
  const integrationState = await evaluate(`(() => {
    const visible = node => Boolean(node && !node.hidden && getComputedStyle(node).display !== 'none' && node.getBoundingClientRect().width > 0)
    const panel = document.querySelector('#lien-external-integrations-v492')
    const line = panel?.querySelector('#lien-line-settings-v436')
    const hotpepper = panel?.querySelector('#lien-hotpepper-settings-v492')
    const button = document.querySelector('.lien-settings-tabs-v447 [data-settings-panel="line"]')
    const store = document.querySelector('#store-profile')
    const hotTitles = Array.from(document.querySelectorAll('h3')).filter(node => node.textContent.trim() === 'Hotpepper予約受信用メール' && visible(node))
    return {
      heading: panel?.querySelector('h2')?.textContent.trim() || '',
      selected: button?.getAttribute('aria-selected') || '',
      storeVisible: visible(store),
      panelVisible: visible(panel),
      lineVisible: visible(line),
      hotpepperVisible: visible(hotpepper),
      inboundAddress: hotpepper?.querySelector('code')?.textContent.trim() || '',
      messagingChannelId: line?.querySelector('[name="messagingChannelId"]')?.value || '',
      lineLoginChannelId: line?.querySelector('[name="lineLoginChannelId"]')?.value || '',
      liffId: line?.querySelector('[name="liffId"]')?.value || '',
      visibleHotpepperCards: hotTitles.length,
      panelWidth: panel?.clientWidth || 0,
      panelScrollWidth: panel?.scrollWidth || 0,
      panelRight: panel?.getBoundingClientRect().right || 0,
      viewportWidth: innerWidth,
    }
  })()`)
  assert.equal(integrationState.heading, '外部アプリ連携')
  assert.equal(integrationState.selected, 'true')
  assert.equal(integrationState.storeVisible, false)
  assert.equal(integrationState.panelVisible, true)
  assert.equal(integrationState.lineVisible, true)
  assert.equal(integrationState.hotpepperVisible, true)
  assert.equal(integrationState.inboundAddress, profile.setup.inboundAddress)
  assert.equal(integrationState.messagingChannelId, lineSettings.messagingChannelId)
  assert.equal(integrationState.lineLoginChannelId, lineSettings.lineLoginChannelId)
  assert.equal(integrationState.liffId, lineSettings.liffId)
  assert.equal(integrationState.visibleHotpepperCards, 1)
  assert.ok(integrationState.panelScrollWidth <= integrationState.panelWidth + 2, JSON.stringify(integrationState))
  assert.ok(integrationState.panelRight <= integrationState.viewportWidth + 2, JSON.stringify(integrationState))
  await capture('external-integrations-desktop.png')

  await navigate(compactWidth, 1000, '#settings-line')
  const compactState = await evaluate(`(() => {
    const panel = document.querySelector('#lien-external-integrations-v492')
    const line = panel?.querySelector('#lien-line-settings-v436')
    const hotpepper = panel?.querySelector('#lien-hotpepper-settings-v492')
    return {
      panelVisible: Boolean(panel && !panel.hidden && getComputedStyle(panel).display !== 'none'),
      panelWidth: panel?.clientWidth || 0,
      panelScrollWidth: panel?.scrollWidth || 0,
      lineWidth: line?.clientWidth || 0,
      lineScrollWidth: line?.scrollWidth || 0,
      hotpepperWidth: hotpepper?.clientWidth || 0,
      hotpepperScrollWidth: hotpepper?.scrollWidth || 0,
      panelRight: panel?.getBoundingClientRect().right || 0,
      viewportWidth: innerWidth,
    }
  })()`)
  assert.equal(compactState.panelVisible, true)
  assert.ok(compactState.panelScrollWidth <= compactState.panelWidth + 2, JSON.stringify(compactState))
  assert.ok(compactState.lineScrollWidth <= compactState.lineWidth + 2, JSON.stringify(compactState))
  assert.ok(compactState.hotpepperScrollWidth <= compactState.hotpepperWidth + 2, JSON.stringify(compactState))
  assert.ok(compactState.panelRight <= compactState.viewportWidth + 2, JSON.stringify(compactState))
  await capture('external-integrations-compact.png')

  const unexpectedBootstrapErrors = bootstrapErrors.filter(error => !/Minified React error #(418|423)\b/.test(error))
  assert.deepEqual(unexpectedBootstrapErrors, [])
  assert.deepEqual(browserErrors, [])
  console.log(JSON.stringify({ storeState, integrationState, compactState, bootstrapWarnings: bootstrapErrors.length, browserErrors }, null, 2))
} finally {
  try { socket?.close() } catch {}
  chrome.kill('SIGTERM')
  await fs.rm(browserProfile, { recursive: true, force: true }).catch(() => {})
}
