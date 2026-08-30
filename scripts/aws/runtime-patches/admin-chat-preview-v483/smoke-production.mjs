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
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/customers/messages/chat' }),
})
assert.equal(login.status, 303)
const sessionCookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(sessionCookie, /^[^=]+=/)

const page = await fetch(`${baseUrl}/admin/customers/messages/chat?smoke=v483`, {
  headers: { cookie: sessionCookie, 'Cache-Control': 'no-cache' },
})
assert.equal(page.status, 200)
const html = await page.text()
assert.match(html, /admin-chat-preview-v483/)
assert.match(html, /data-lien-chat-thread-preview="v483"/)
assert.match(html, /text-overflow:ellipsis/)
assert.match(html, /white-space:nowrap/)

const chromePath = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].find(candidate => candidate && existsSync(candidate))
assert.ok(chromePath, 'Chrome or Chromium is required for the admin chat preview smoke test')

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
const withTimeout = (promise, milliseconds, label) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), milliseconds)),
])
const port = 9483
const profile = path.join(os.tmpdir(), `lien-admin-chat-v483-${process.pid}`)
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
  await command('Page.navigate', { url: `${baseUrl}/admin/customers/messages/chat?smoke-browser=v483` })

  let count = 0
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await delay(250)
    count = await evaluate(`document.querySelectorAll('[data-lien-chat-thread-preview="v483"]').length`)
    if (count > 0) break
  }
  assert.ok(count > 0, 'conversation previews did not render')

  const inspection = await evaluate(`(() => {
    const previews = [...document.querySelectorAll('[data-lien-chat-thread-preview="v483"]')]
    const target = previews[0]
    const card = target.closest('a')
    const conversationBefore = [...document.querySelectorAll('[data-lien-chat-body]')].map(node => node.textContent).join('\\n')
    const original = target.textContent
    const cardHeightBefore = card.getBoundingClientRect().height
    target.textContent = '長い相談内容の表示確認'.repeat(80)
    const style = getComputedStyle(target)
    const time = target.nextElementSibling
    const timeStyle = time ? getComputedStyle(time) : null
    const result = {
      count: previews.length,
      whiteSpace: style.whiteSpace,
      overflowX: style.overflowX,
      textOverflow: style.textOverflow,
      clientWidth: target.clientWidth,
      scrollWidth: target.scrollWidth,
      height: target.getBoundingClientRect().height,
      lineHeight: parseFloat(style.lineHeight),
      cardHeightBefore,
      cardHeightAfter: card.getBoundingClientRect().height,
      timeWhiteSpace: timeStyle?.whiteSpace || null,
      timeFlexShrink: timeStyle?.flexShrink || null,
    }
    target.textContent = original
    result.conversationUnchanged = conversationBefore === [...document.querySelectorAll('[data-lien-chat-body]')].map(node => node.textContent).join('\\n')
    return result
  })()`)

  assert.equal(inspection.whiteSpace, 'nowrap')
  assert.equal(inspection.overflowX, 'hidden')
  assert.equal(inspection.textOverflow, 'ellipsis')
  assert.ok(inspection.scrollWidth > inspection.clientWidth, 'long preview must be visibly clipped')
  assert.ok(inspection.height <= inspection.lineHeight * 1.25, 'preview must stay one line tall')
  assert.ok(inspection.cardHeightAfter <= inspection.cardHeightBefore + 1, 'long preview must not grow the sidebar card')
  if (inspection.timeWhiteSpace) assert.equal(inspection.timeWhiteSpace, 'nowrap')
  if (inspection.timeFlexShrink) assert.equal(inspection.timeFlexShrink, '0')
  assert.equal(inspection.conversationUnchanged, true)

  console.log(JSON.stringify({ baseUrl, inspection }, null, 2))
} finally {
  try { socket?.close() } catch {}
  chrome.kill()
  await fs.rm(profile, { recursive: true, force: true }).catch(() => {})
}
