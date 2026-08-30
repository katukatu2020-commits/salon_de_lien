import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

function japanDateParts() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return { date: `${value.year}-${value.month}-${value.day}`, month: `${value.year}-${value.month}` }
}

async function getJson(pathname, cookie) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: { cookie, Accept: 'application/json', 'Cache-Control': 'no-cache' },
  })
  const payload = await response.json().catch(() => ({}))
  assert.equal(response.status, 200, `${pathname}: ${payload.error || response.status}`)
  return payload
}

const ready = await fetch(`${baseUrl}/api/health/ready`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(ready.status, 200)

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/appointments' }),
})
assert.equal(login.status, 303)
const sessionCookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(sessionCookie, /^[^=]+=/)

const profilePayload = await getJson('/api/admin/store-profile', sessionCookie)
const profile = profilePayload.profile
assert.equal(profile.organizationId, 'org_showcase_yohaku')
const current = japanDateParts()
let businessDays = await getJson(`/api/lien-business-days?month=${current.month}`, sessionCookie)
let today = businessDays.days.find(day => day.date === current.date)
assert.ok(today, `business day ${current.date} is missing`)

const needsRepair = today.openMinutes !== profile.businessSchedule.openMinutes
  || today.closeMinutes !== profile.businessSchedule.closeMinutes
const repairDate = String(process.env.LIEN_REPAIR_DATE || '')
if (needsRepair && repairDate === current.date) {
  const reset = await fetch(`${baseUrl}/api/lien-business-days`, {
    method: 'POST',
    headers: {
      cookie: sessionCookie,
      Origin: baseUrl,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ date: current.date, reset: true }),
  })
  const resetPayload = await reset.json().catch(() => ({}))
  assert.equal(reset.status, 200, resetPayload.error || 'current-day repair failed')
  businessDays = await getJson(`/api/lien-business-days?month=${current.month}`, sessionCookie)
  today = businessDays.days.find(day => day.date === current.date)
}

assert.equal(today.openMinutes, profile.businessSchedule.openMinutes)
assert.equal(today.closeMinutes, profile.businessSchedule.closeMinutes)
assert.equal(today.isClosed, profile.businessSchedule.closedWeekdays.includes(new Date(`${current.date}T00:00:00Z`).getUTCDay()))

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
const port = 9491
const browserProfile = path.join(os.tmpdir(), `lien-current-day-hours-v491-${process.pid}`)
await fs.rm(browserProfile, { recursive: true, force: true })
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
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
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
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'browser evaluation failed')
    return result.result.value
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
  const cookieSeparator = sessionCookie.indexOf('=')
  await send('Network.setCookie', {
    name: sessionCookie.slice(0, cookieSeparator),
    value: sessionCookie.slice(cookieSeparator + 1),
    domain: 'salon-de-lien.com',
    path: '/',
    secure: true,
  })
  const pageUrl = `${baseUrl}/admin/appointments?month=${current.month}&date=${current.date}#staff-schedule`
  await send('Page.navigate', { url: pageUrl })

  let timeline
  for (let attempt = 0; attempt < 120; attempt += 1) {
    timeline = await evaluate(`(() => {
      const canvas = document.querySelector('.shift-canvas')
      const header = canvas?.querySelector('.shift-top > div:nth-child(2)')
      const labels = header ? Array.from(header.querySelectorAll('span')).map(node => node.textContent.trim()).filter(Boolean) : []
      return {
        ready: document.readyState === 'complete' && Boolean(canvas) && labels.length >= 2,
        labels,
        title: document.title,
        url: location.href,
        canvasWidth: canvas?.clientWidth || 0,
        canvasScrollWidth: canvas?.scrollWidth || 0,
      }
    })()`)
    if (timeline.ready) break
    await delay(250)
  }
  assert.ok(timeline?.ready, `shift timeline did not render: ${JSON.stringify(timeline)}`)
  assert.equal(timeline.labels[0], profile.businessSchedule.openTime)
  assert.equal(timeline.labels.at(-1), profile.businessSchedule.closeTime)
  assert.ok(timeline.canvasScrollWidth <= timeline.canvasWidth + 2, `shift canvas overflowed: ${JSON.stringify(timeline)}`)
  console.log(JSON.stringify({ current, schedule: profile.businessSchedule, today, timeline }, null, 2))
} finally {
  try { socket?.close() } catch {}
  chrome.kill('SIGTERM')
  await fs.rm(browserProfile, { recursive: true, force: true }).catch(() => {})
}
