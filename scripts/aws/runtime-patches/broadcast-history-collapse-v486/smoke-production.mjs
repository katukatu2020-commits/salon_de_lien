import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(`${baseUrl}/api/health/ready`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(ready.status, 200)

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/customers/messages' }),
})
assert.equal(login.status, 303)
const sessionCookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(sessionCookie, /^[^=]+=/)

const page = await fetch(`${baseUrl}/admin/customers/messages?smoke=v486`, {
  headers: { cookie: sessionCookie, 'Cache-Control': 'no-cache' },
})
assert.equal(page.status, 200)
const html = await page.text()
assert.match(html, /data-lien-broadcast-history="v486"/)
assert.match(html, /broadcast-history-content-v486/)
assert.match(html, /display: none !important/)
assert.match(html, /履歴を表示/)
assert.match(html, /履歴を閉じる/)
assert.doesNotMatch(html, /<details[^>]*data-lien-broadcast-history="v486"[^>]*\sopen(?:=|>)/)

const chromePath = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].find(candidate => candidate && existsSync(candidate))
assert.ok(chromePath, 'Chrome or Chromium is required for the broadcast history smoke test')

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
const withTimeout = (promise, milliseconds, label) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), milliseconds)),
])
const port = 9486
const profile = path.join(os.tmpdir(), `lien-broadcast-history-v486-${process.pid}`)
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
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
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
    const response = await withTimeout(command('Runtime.evaluate', { expression, returnByValue: true }), 8000, 'browser evaluation')
    return response.result.value
  }

  await command('Page.enable')
  await command('Runtime.enable')
  await command('Network.enable')
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, screenWidth: 1440, screenHeight: 900 })
  const separator = sessionCookie.indexOf('=')
  await command('Network.setCookie', {
    name: sessionCookie.slice(0, separator),
    value: sessionCookie.slice(separator + 1),
    url: baseUrl,
    secure: baseUrl.startsWith('https://'),
    httpOnly: true,
  })
  await command('Page.navigate', { url: `${baseUrl}/admin/customers/messages?smoke-browser=v486` })

  let found = false
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await delay(250)
    found = await evaluate(`Boolean(document.querySelector('[data-lien-broadcast-history="v486"]'))`)
    if (found) break
  }
  assert.equal(found, true)

  const inspect = () => evaluate(`(() => {
    const details = document.querySelector('[data-lien-broadcast-history="v486"]')
    const content = document.querySelector('[data-lien-broadcast-history-content]')
    const openLabel = details.querySelector('[data-lien-history-open-label]')
    const closeLabel = details.querySelector('[data-lien-history-close-label]')
    const chevron = details.querySelector('[data-lien-history-chevron]')
    return {
      open: details.open,
      contentDisplay: getComputedStyle(content).display,
      contentVisible: content.getClientRects().length > 0,
      articleCount: content.querySelectorAll('article').length,
      openLabelDisplay: getComputedStyle(openLabel).display,
      closeLabelDisplay: getComputedStyle(closeLabel).display,
      chevronTransform: getComputedStyle(chevron).transform,
    }
  })()`)

  const initial = await inspect()
  console.log(JSON.stringify({ stage: 'initial', initial }, null, 2))
  assert.equal(initial.open, false)
  assert.equal(initial.contentVisible, false)
  assert.equal(initial.contentDisplay, 'none')
  assert.notEqual(initial.openLabelDisplay, 'none')
  assert.equal(initial.closeLabelDisplay, 'none')

  await evaluate(`document.querySelector('[data-lien-broadcast-history="v486"] > summary').click()`)
  await delay(220)
  const opened = await inspect()
  assert.equal(opened.open, true)
  assert.equal(opened.contentVisible, true)
  assert.equal(opened.contentDisplay, 'block')
  assert.ok(opened.articleCount > 0)
  assert.equal(opened.openLabelDisplay, 'none')
  assert.notEqual(opened.closeLabelDisplay, 'none')
  assert.notEqual(opened.chevronTransform, 'none')

  await evaluate(`document.querySelector('[data-lien-broadcast-history="v486"] > summary').click()`)
  await delay(80)
  const closed = await inspect()
  assert.equal(closed.open, false)
  assert.equal(closed.contentVisible, false)
  assert.equal(closed.contentDisplay, 'none')

  await command('Page.reload', { ignoreCache: true })
  await delay(500)
  const reloaded = await inspect()
  assert.equal(reloaded.open, false)
  assert.equal(reloaded.contentVisible, false)
  assert.equal(reloaded.contentDisplay, 'none')

  console.log(JSON.stringify({ baseUrl, initial, opened, closed, reloaded }, null, 2))
} finally {
  try { socket?.close() } catch {}
  chrome.kill()
  await fs.rm(profile, { recursive: true, force: true }).catch(() => {})
}
