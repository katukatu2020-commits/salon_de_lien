import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const release = 'shift-grid-synchronization-v526'

function todayInJapan() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

const ready = await fetch(`${baseUrl}/api/health/ready`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-shift-grid-synchronization'), 'v526')
assert.equal(ready.headers.get('x-lien-coupon-broadcast-delivery'), 'v525')

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/appointments' }),
})
assert.ok([302, 303].includes(login.status), `admin login returned ${login.status}`)
const sessionCookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(sessionCookie, /^[^=]+=/)

const pagePath = `/admin/appointments?date=${todayInJapan()}`
const pageResponse = await fetch(`${baseUrl}${pagePath}`, {
  headers: { cookie: sessionCookie, 'Cache-Control': 'no-cache' },
})
const pageHtml = await pageResponse.text()
assert.equal(pageResponse.status, 200)
assert.match(pageHtml, /page-shift-grid-sync-v526\.js/)
assert.doesNotMatch(pageHtml, /page-shift-line-break-v461\.js/)

const shiftAsset = await fetch(`${baseUrl}/_next/static/chunks/app/admin/appointments/page-shift-grid-sync-v526.js?smoke=v526`, {
  headers: { 'Cache-Control': 'no-cache' },
})
const shiftSource = await shiftAsset.text()
assert.equal(shiftAsset.status, 200)
assert.match(shiftSource, /shift-grid-synchronization-v526/)
assert.match(shiftSource, /"--ts-shift-slots": String\(F\.length\)/)

const tenantAsset = await fetch(`${baseUrl}/tenant-setup-client.js?smoke=v526`, {
  headers: { 'Cache-Control': 'no-cache' },
})
const tenantSource = await tenantAsset.text()
assert.equal(tenantAsset.status, 200)
assert.match(tenantSource, /shift-grid-synchronization-v526/)
assert.doesNotMatch(tenantSource, /setProperty\('--ts-shift-slots', String\(duration \/ 30\)\)/)

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
const port = 9526 + (process.pid % 200)
const browserProfile = path.join(os.tmpdir(), `lien-shift-grid-v526-${process.pid}`)
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
  for (let attempt = 0; attempt < 100; attempt += 1) {
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
  const cookieSeparator = sessionCookie.indexOf('=')
  await send('Network.setCookie', {
    name: sessionCookie.slice(0, cookieSeparator),
    value: sessionCookie.slice(cookieSeparator + 1),
    url: `${baseUrl}/`,
    secure: new URL(baseUrl).protocol === 'https:',
  })
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: `${baseUrl}${pagePath}&smoke=v526#staff-schedule` })

  for (let attempt = 0; attempt < 160; attempt += 1) {
    const readyState = await evaluate(`(() => {
      const canvas = document.querySelector('.shift-canvas')
      const booked = document.querySelector('.shift-top > div:nth-child(4) > div:first-child')
      const lane = document.querySelector('.shift-lane')
      return document.readyState === 'complete' && Boolean(canvas && booked?.children.length && lane)
    })()`)
    if (readyState) break
    if (attempt === 159) throw new Error('shift grid did not render')
    await delay(250)
  }
  await delay(3000)

  const auditExpression = `(() => {
    const canvas = document.querySelector('.shift-canvas')
    const top = canvas?.querySelector('.shift-top')
    const booked = top?.children?.[3]?.children?.[0]
    const remaining = top?.children?.[3]?.children?.[1]
    const lane = canvas?.querySelector('.shift-lane')
    if (!canvas || !booked || !remaining || !lane) return { ready: false }
    const slots = booked.children.length
    const bookedRect = booked.getBoundingClientRect()
    const remainingRect = remaining.getBoundingClientRect()
    const laneRect = lane.getBoundingClientRect()
    const cells = Array.from(booked.children)
    const gridlines = Array.from(lane.querySelectorAll(':scope > span.pointer-events-none.absolute.inset-y-0.border-l'))
    const expectedWidth = laneRect.width / slots
    const cellDeltas = cells.map((cell, index) => Math.abs(cell.getBoundingClientRect().left - (laneRect.left + index * expectedWidth)))
    const lineLefts = gridlines.slice(0, slots).map(line => parseFloat(line.style.left || '0'))
    const lineDeltas = lineLefts.map((left, index) => Math.abs(left - index * expectedWidth))
    const laneBackgroundWidth = parseFloat(getComputedStyle(lane).backgroundSize || '0')
    const headerTimeline = top.children[1]
    const headerBackgroundWidth = parseFloat(getComputedStyle(headerTimeline).backgroundSize || '0')
    return {
      ready: true,
      viewportWidth: innerWidth,
      canvasWidth: canvas.getBoundingClientRect().width,
      wrapperWidth: canvas.parentElement?.getBoundingClientRect().width || 0,
      laneWidth: laneRect.width,
      bookedWidth: bookedRect.width,
      remainingWidth: remainingRect.width,
      slots,
      remainingSlots: remaining.children.length,
      cssSlots: Number(getComputedStyle(canvas).getPropertyValue('--ts-shift-slots')),
      laneSlots: Number(lane.dataset.tsShiftSlots),
      gridlines: gridlines.length,
      expectedWidth,
      laneBackgroundWidth,
      headerBackgroundWidth,
      maxCellDelta: Math.max(0, ...cellDeltas),
      maxLineDelta: Math.max(0, ...lineDeltas),
      lineLefts,
    }
  })()`

  async function audit(label) {
    let result
    for (let attempt = 0; attempt < 40; attempt += 1) {
      result = await evaluate(auditExpression)
      if (result.ready && result.cssSlots === result.slots && result.laneSlots === result.slots) break
      await delay(100)
    }
    assert.ok(result?.ready, `${label}: shift DOM is unavailable`)
    assert.equal(result.remainingSlots, result.slots, `${label}: summary row counts differ`)
    assert.equal(result.cssSlots, result.slots, `${label}: CSS grid has stale slot count`)
    assert.equal(result.laneSlots, result.slots, `${label}: staff lane has stale slot count`)
    assert.ok(Math.abs(result.bookedWidth - result.laneWidth) <= 0.25, `${label}: booked row width drifted ${JSON.stringify(result)}`)
    assert.ok(Math.abs(result.remainingWidth - result.laneWidth) <= 0.25, `${label}: remaining row width drifted ${JSON.stringify(result)}`)
    assert.ok(result.maxCellDelta <= 0.25, `${label}: summary boundaries drifted ${JSON.stringify(result)}`)
    assert.ok(result.maxLineDelta <= 0.25, `${label}: React gridline geometry drifted ${JSON.stringify(result)}`)
    const expectedBackgroundPercent = 100 / result.slots
    assert.ok(Math.abs(result.laneBackgroundWidth - expectedBackgroundPercent) <= 0.01, `${label}: lane background drifted ${JSON.stringify(result)}`)
    assert.ok(Math.abs(result.headerBackgroundWidth - expectedBackgroundPercent) <= 0.01, `${label}: header background drifted ${JSON.stringify(result)}`)
    return { label, ...result }
  }

  const results = []
  results.push(await audit('desktop-open'))
  const desktopScreenshot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true })
  assert.ok((desktopScreenshot.data || '').length > 10000, 'desktop shift screenshot is unexpectedly blank')

  await evaluate(`document.querySelector('button[aria-label="サイドバーを閉じる"]')?.click()`)
  await delay(900)
  results.push(await audit('desktop-collapsed'))

  await send('Emulation.setDeviceMetricsOverride', { width: 520, height: 900, deviceScaleFactor: 1, mobile: true })
  await evaluate(`window.dispatchEvent(new Event('resize'))`)
  await delay(700)
  const mobile = await audit('mobile')
  results.push(mobile)
  assert.ok(mobile.slots <= results[0].slots, `mobile grid did not compact: ${JSON.stringify(mobile)}`)

  await evaluate(`window.dispatchEvent(new CustomEvent('lien:business-schedule-updated', { detail: { openMinutes: 600, closeMinutes: 1170, closedWeekdays: [], isClosed: false, overridden: true } }))`)
  await delay(700)
  const halfHourClose = await audit('half-hour-close')
  results.push(halfHourClose)
  assert.equal(halfHourClose.slots, 19, `half-hour closing slot was dropped: ${JSON.stringify(halfHourClose)}`)

  await evaluate(`document.querySelector('.shift-canvas')?.scrollIntoView({ block: 'start' })`)
  await delay(200)
  const mobileScreenshot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true })
  assert.ok((mobileScreenshot.data || '').length > 10000, 'mobile shift screenshot is unexpectedly blank')

  if (process.env.SMOKE_SCREENSHOT_DIR) {
    const screenshotDir = path.resolve(process.env.SMOKE_SCREENSHOT_DIR)
    await fs.mkdir(screenshotDir, { recursive: true })
    await fs.writeFile(path.join(screenshotDir, 'shift-grid-v526-desktop.png'), Buffer.from(desktopScreenshot.data, 'base64'))
    await fs.writeFile(path.join(screenshotDir, 'shift-grid-v526-mobile.png'), Buffer.from(mobileScreenshot.data, 'base64'))
  }

  console.log(JSON.stringify({
    release,
    results,
    screenshotBytes: {
      desktop: Math.floor(desktopScreenshot.data.length * 0.75),
      mobile: Math.floor(mobileScreenshot.data.length * 0.75),
    },
  }, null, 2))
} finally {
  try { socket?.close() } catch {}
  chrome.kill('SIGTERM')
  await fs.rm(browserProfile, { recursive: true, force: true }).catch(() => {})
}
