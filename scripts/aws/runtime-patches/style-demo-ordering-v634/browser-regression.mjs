import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const here = path.dirname(fileURLToPath(import.meta.url))
const output = process.env.SCREENSHOT_DIR || 'artifacts/style-demo-ordering-v634/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive: true })

const adminClient = fs.readFileSync(path.join(here, 'style-admin-controls-v618-client.js'))
const adminCss = fs.readFileSync(path.join(here, 'style-admin-controls-v618.css'))
const customerClient = fs.readFileSync(path.join(here, 'style-community-controls-v610-client.js'))
const customerCss = fs.readFileSync(path.join(here, 'style-community-controls-v610.css'))
let orderedIds = ['post-a', 'post-b', 'post-c', 'post-d']

const postDetails = new Map(orderedIds.map((id, index) => [id, {
  id,
  postKind: 'STORE',
  published: true,
  title: `テストスタイル${String.fromCharCode(65 + index)}`,
  staffKey: 'stylist-1',
  stylistName: '谷崎 太二',
  gender: index % 2 ? '女性' : '男性',
  course: 'カット',
  publishedAt: new Date(Date.UTC(2026, 8, 10 - index)).toISOString(),
  coverPhotoUrl: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="${index % 2 ? '#eadfd5' : '#dfe9e4'}"/><text x="200" y="250" text-anchor="middle" font-size="80">${index + 1}</text></svg>`)}`,
  likeCount: 2 + index,
  commentCount: 1 + (index % 2),
  liked: index % 2 === 0,
}]))

function adminPayload() {
  return {
    release: 'style-admin-controls-v618',
    filters: { sort: 'manual', staffKey: '', course: '', gender: '' },
    options: { staff: [{ key: 'stylist-1', name: '谷崎 太二' }], courses: [], genders: [] },
    posts: orderedIds.map((id, index) => ({ ...postDetails.get(id), displayOrder: index + 1 })),
    page: 1,
    pageSize: 20,
    totalCount: orderedIds.length,
    totalPages: 1,
  }
}

function customerPayload() {
  return {
    filters: { sort: 'manual', stylist: '', gender: '', likedOnly: false },
    options: { stylists: [{ value: '谷崎 太二', label: '谷崎 太二' }] },
    posts: orderedIds.map((id, index) => ({ ...postDetails.get(id), displayOrder: index + 1 })),
    page: 1,
    pageSize: 50,
    totalCount: orderedIds.length,
    totalPages: 1,
  }
}

function legacyFilters() {
  return '<section><h2>絞り込み・並び順</h2><select></select><select></select><select></select><select></select></section><div></div>'
}

function html(clientPath, stylesheetPath, title) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><link rel="stylesheet" href="${stylesheetPath}"></head><body><main style="max-width:1500px;margin:auto;padding:16px">${legacyFilters()}</main><script src="${clientPath}" defer></script></body></html>`
}

async function readBody(request) {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1')
  if (url.pathname === '/favicon.ico') {
    response.statusCode = 204
    return response.end()
  }
  if (url.pathname === '/admin/community') {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    return response.end(html('/style-admin-controls-v618.js', '/style-admin-controls-v618.css', '管理スタイル'))
  }
  if (url.pathname === '/u/community') {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    return response.end(html('/style-community-controls-v610.js', '/style-community-controls-v610.css', 'お客様スタイル'))
  }
  if (url.pathname === '/style-admin-controls-v618.js') {
    response.setHeader('Content-Type', 'application/javascript; charset=utf-8')
    return response.end(adminClient)
  }
  if (url.pathname === '/style-community-controls-v610.js') {
    response.setHeader('Content-Type', 'application/javascript; charset=utf-8')
    return response.end(customerClient)
  }
  if (url.pathname === '/style-admin-controls-v618.css') {
    response.setHeader('Content-Type', 'text/css; charset=utf-8')
    return response.end(adminCss)
  }
  if (url.pathname === '/style-community-controls-v610.css') {
    response.setHeader('Content-Type', 'text/css; charset=utf-8')
    return response.end(customerCss)
  }
  if (url.pathname === '/api/lien-style-admin-v618') {
    response.setHeader('Content-Type', 'application/json')
    return response.end(JSON.stringify(adminPayload()))
  }
  if (url.pathname === '/api/lien-style-community-v610') {
    response.setHeader('Content-Type', 'application/json')
    return response.end(JSON.stringify(customerPayload()))
  }
  if (url.pathname === '/api/lien-style-order-v634' && request.method === 'PATCH') {
    const body = JSON.parse(await readBody(request))
    const current = orderedIds.indexOf(body.postId)
    orderedIds.splice(current, 1)
    const destination = Math.min(Math.max(Number(body.displayOrder) - 1, 0), orderedIds.length)
    orderedIds.splice(destination, 0, body.postId)
    response.setHeader('Content-Type', 'application/json')
    return response.end(JSON.stringify({ success: true, displayOrder: destination + 1, totalCount: orderedIds.length }))
  }
  response.statusCode = 404
  response.end('not found')
})

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const port = server.address().port
const base = `http://127.0.0.1:${port}`
const browser = await chromium.launch({ executablePath, headless: true })
const results = []

function collectErrors(page) {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  return errors
}

try {
  for (const width of [390, 1280]) {
    orderedIds = ['post-a', 'post-b', 'post-c', 'post-d']
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    const errors = collectErrors(page)
    await page.goto(base + '/admin/community', { waitUntil: 'domcontentloaded' })
    const root = page.locator('.orimia-style-admin-v618')
    await root.locator('.orimia-admin-style-managed-card-v625').first().waitFor({ state: 'visible' })
    assert.equal(await root.locator('.orimia-admin-style-order-form-v634').count(), 4)
    assert.deepEqual(await root.locator('.orimia-admin-style-order-badge-v634').allTextContents(), ['No.1', 'No.2', 'No.3', 'No.4'])

    const fourth = root.locator('.orimia-admin-style-managed-card-v625').filter({ has: page.getByText('テストスタイルD', { exact: true }) })
    const moveResponse = page.waitForResponse(response => response.url().endsWith('/api/lien-style-order-v634') && response.status() === 200)
    await fourth.locator('input[name="displayOrder"]').fill('2')
    await fourth.locator('.orimia-admin-style-order-form-v634 button').click()
    await moveResponse
    await page.waitForFunction(() => [...document.querySelectorAll('.orimia-admin-style-card-copy-v618 strong')].map(node => node.textContent).join(',') === 'テストスタイルA,テストスタイルD,テストスタイルB,テストスタイルC')
    assert.deepEqual(await root.locator('.orimia-admin-style-order-badge-v634').allTextContents(), ['No.1', 'No.2', 'No.3', 'No.4'])
    assert.deepEqual(await root.locator('.orimia-admin-style-card-copy-v618 strong').allTextContents(), ['テストスタイルA', 'テストスタイルD', 'テストスタイルB', 'テストスタイルC'])

    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
    }))
    assert.ok(layout.documentWidth <= layout.viewport + 2, `${width}: horizontal overflow`)
    assert.deepEqual(errors, [], `${width}: browser errors`)
    await page.screenshot({ path: path.join(output, `admin-order-${width}.png`), fullPage: true })
    results.push({ width, order: [...orderedIds], layout })
    await page.close()
  }

  const customer = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const customerErrors = collectErrors(customer)
  await customer.goto(base + '/u/community', { waitUntil: 'domcontentloaded' })
  const customerRoot = customer.locator('.orimia-style-community-v610')
  await customerRoot.locator('.orimia-style-card-v610').first().waitFor({ state: 'visible' })
  assert.equal(await customerRoot.locator('select[name="sort"]').inputValue(), 'manual')
  assert.deepEqual(
    await customerRoot.locator('.orimia-style-card-v610').evaluateAll(cards => cards.map(card => card.getAttribute('href'))),
    ['/u/community/post-a', '/u/community/post-d', '/u/community/post-b', '/u/community/post-c'],
  )
  assert.deepEqual(customerErrors, [], 'customer browser errors')
  await customer.screenshot({ path: path.join(output, 'customer-order-390.png'), fullPage: true })
  await customer.close()

  console.log(JSON.stringify({ release: 'style-demo-ordering-v634', browserVerified: true, results }, null, 2))
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
