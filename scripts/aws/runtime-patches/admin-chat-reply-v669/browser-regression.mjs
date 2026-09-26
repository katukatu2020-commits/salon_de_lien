import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const client = fs.readFileSync(path.join(root, 'admin-chat-reply-client-v669.js'))

function pageHtml() {
  return `<!doctype html><html><head><script src="/admin-chat-reply-client-v669.js" defer></script></head><body>
    <main class="admin-chat-conversation"><form action="/api/lien-chat-form" method="post"><input type="hidden" name="threadId"><textarea name="body"></textarea><button type="submit">Send</button></form></main>
    <script>document.querySelector('form').addEventListener('submit',event=>{event.preventDefault();window.__captured=Object.fromEntries(new FormData(event.currentTarget))})</script>
  </body></html>`
}

const server = http.createServer((req, res) => {
  if (req.url?.startsWith('/admin-chat-reply-client-v669.js')) {
    res.writeHead(200, { 'Content-Type': 'application/javascript' })
    return res.end(client)
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(pageHtml())
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const port = server.address().port
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })

try {
  const page = await browser.newPage()
  await page.goto(`http://127.0.0.1:${port}/admin/customers/messages?chat=1&threadId=thread-669`)
  const field = page.locator('input[name="threadId"]')
  await page.waitForFunction(() => document.querySelector('input[name="threadId"]')?.value === 'thread-669')
  assert.equal(await field.getAttribute('value'), 'thread-669')

  await page.evaluate(() => {
    const form = document.querySelector('form')
    form.querySelector('input[name="threadId"]').remove()
    form.insertAdjacentHTML('afterbegin', '<input type="hidden" name="threadId">')
  })
  await page.waitForFunction(() => document.querySelector('input[name="threadId"]')?.value === 'thread-669')

  await page.locator('textarea[name="body"]').fill('reply body')
  await page.evaluate(() => {
    const input = document.querySelector('input[name="threadId"]')
    input.value = ''
    input.removeAttribute('value')
  })
  await page.locator('button[type="submit"]').click()
  await page.waitForFunction(() => Boolean(window.__captured))
  assert.deepEqual(await page.evaluate(() => window.__captured), { threadId: 'thread-669', body: 'reply body' })

  await page.goto(`http://127.0.0.1:${port}/admin/customers/messages?chat=1&customerId=customer-669`)
  await page.waitForFunction(() => document.querySelector('input[name="customerId"]')?.value === 'customer-669')
  assert.equal(await page.locator('input[name="customerId"]').getAttribute('value'), 'customer-669')

  await page.goto(`http://127.0.0.1:${port}/admin/products?threadId=unrelated`)
  await page.waitForTimeout(100)
  assert.equal(await page.locator('input[name="threadId"]').inputValue(), '')

  console.log(JSON.stringify({ release: 'admin-chat-reply-v669', hydrationRecovery: true, submitCaptureRecovery: true, customerContextRecovery: true, routeScoped: true }))
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
