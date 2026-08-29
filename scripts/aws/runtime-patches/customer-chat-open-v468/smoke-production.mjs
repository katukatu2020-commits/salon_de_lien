import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const baseUrl = String(process.env.BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const loginId = process.env.VERIFY_CUSTOMER_ID || 'demo.hana'
const password = process.env.VERIFY_CUSTOMER_PASSWORD || 'Mypage2026!'

const ready = await fetch(`${baseUrl}/api/health/ready`)
assert.equal(ready.status, 200)
assert.equal((await ready.json()).status, 'ready')

const workflowResponse = await fetch(`${baseUrl}/ui-workflows-v294.js?v=468`)
assert.equal(workflowResponse.status, 200)
const workflow = await workflowResponse.text()
assert.match(workflow, /customer-chat-open-v468/)
assert.doesNotMatch(workflow, /window\.setInterval\(boot, 1000\)/)

const customerRuntimeResponse = await fetch(`${baseUrl}/customer-runtime-v267.js`)
assert.equal(customerRuntimeResponse.status, 200)
assert.match(await customerRuntimeResponse.text(), /ui-workflows-v294\.js\?v=468/)

const chromePath = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].find((candidate) => candidate && existsSync(candidate))
assert.ok(chromePath, 'Chrome or Chromium is required for the customer chat smoke test')

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
const withTimeout = (promise, milliseconds, label) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), milliseconds)),
])
const port = 9468
const profile = path.join(os.tmpdir(), `lien-chat-v468-${process.pid}`)
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
      target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(`${baseUrl}/u/login`)}`, { method: 'PUT' }).then((response) => response.json())
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
  const exceptions = []
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id && pending.has(message.id)) {
      const request = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) request.reject(new Error(message.error.message))
      else request.resolve(message.result)
    }
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text)
  })
  const command = (method, params = {}) => {
    const id = ++messageId
    socket.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
  }
  const evaluate = async (expression, awaitPromise = false) => {
    const response = await withTimeout(command('Runtime.evaluate', { expression, awaitPromise, returnByValue: true }), 8000, 'browser evaluation')
    return response.result.value
  }

  await command('Page.enable')
  await command('Runtime.enable')
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true, screenWidth: 390, screenHeight: 844 })
  await command('Page.navigate', { url: `${baseUrl}/u/login` })
  await delay(700)
  const login = await evaluate(`(async()=>{const response=await fetch('/api/customer-auth/login',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({loginId:${JSON.stringify(loginId)},password:${JSON.stringify(password)},next:'/u/chat'}),redirect:'follow'});return {status:response.status,url:response.url}})()`, true)
  assert.equal(login.status, 200)
  await command('Page.navigate', { url: `${baseUrl}/u/chat` })
  await delay(700)

  let inspection
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await delay(250)
    inspection = await evaluate(`({path:location.pathname,ready:document.readyState,portal:Boolean(document.querySelector('[data-lien-customer-chat-portal]')),staffButtons:document.querySelectorAll('[data-staff-key]').length,conversation:Boolean(document.querySelector('[data-chat-conversation]'))})`)
    if (inspection.portal && inspection.staffButtons > 0 && inspection.conversation) break
  }
  assert.equal(inspection.path, '/u/chat')
  assert.equal(inspection.ready, 'complete')
  assert.equal(inspection.portal, true)
  assert.ok(inspection.staffButtons >= 1)
  assert.equal(inspection.conversation, true)

  const opened = await evaluate(`(()=>{const button=document.querySelector('[data-staff-key]');button?.click();return {clicked:Boolean(button),active:Boolean(document.querySelector('.lien-chat-v294.is-conversation'))}})()`)
  assert.equal(opened.clicked, true)
  assert.equal(opened.active, true)
  assert.deepEqual(exceptions, [])

  console.log(JSON.stringify({ baseUrl, inspection, conversationOpened: opened.active, exceptions }, null, 2))
} finally {
  try { socket?.close() } catch {}
  chrome.kill()
  await fs.rm(profile, { recursive: true, force: true }).catch(() => {})
}
