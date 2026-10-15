import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
const base = 'http://127.0.0.1:3188'
const artifactDir = new URL('../../../../artifacts/dealer-delivery-v715/', import.meta.url)
const fixtureFile = new URL('./qa-fixture.cjs', import.meta.url)
const container = 'orimia-qa-v680-app'
const bugExpected = process.argv.includes('--expect-bug')
const docker = args => execFileSync('docker', args, { encoding: 'utf8', maxBuffer: 20000000, windowsHide: true })
const fixture = mode => docker(['exec', container, 'node', '/tmp/qa-v715-fixture.cjs', mode])
const snapshot = () => JSON.parse(fixture('snapshot'))
docker(['cp', fileURLToPath(fixtureFile), container + ':/tmp/qa-v715-fixture.cjs'])
await mkdir(artifactDir, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const errors = []
let created = false
async function login(context, loginId = 'dealer.browser.v584.mtsptddu') {
  const response = await context.request.post(base + '/api/dealer/auth/login', { headers: { Origin: base }, form: { loginId, password: 'QaLocalOnly-v680!' }, maxRedirects: 0 })
  assert.equal(response.status(), 303)
  assert(!response.headers().location.includes('/login'), 'Login must succeed')
}
async function post(context, id, payload, expected) {
  const response = await context.request.post(base + '/api/dealer/orders/' + id + '/status', { headers: { Origin: base }, data: payload })
  assert.equal(response.status(), expected, await response.text())
  return response
}
try {
  fixture('setup'); created = true
  const initial = snapshot()
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await login(context)
  const originalLines = initial.lines.filter(line => line.orderId === 'qa-v715-desktop')
  const badPayload = { status: 'DELIVERED', lines: originalLines.map(line => ({ ...line, unitPrice: line.unitPrice + 1 })) }
  await post(context, 'qa-v715-desktop', badPayload, 409)
  assert.deepEqual(snapshot(), initial, 'Rejected line mutations must be atomic')
  await post(context, 'qa-v715-tracked', { status: 'DELIVERED' }, 409)
  assert.deepEqual(snapshot(), initial, 'ERP fulfillment must not be bypassed')
  await post(context, 'qa-v715-desktop', { status: 'ACCEPTED' }, 409)
  assert.deepEqual(snapshot(), initial, 'Invalid backward transition must be rejected')
  const staff = await browser.newContext()
  await login(staff, 'qa715.staff')
  await post(staff, 'qa-v715-desktop', { status: 'DELIVERED' }, 404)
  assert.deepEqual(snapshot(), initial, 'Unassigned staff must not change this order')
  await staff.close()
  const unauth = await browser.newContext()
  await post(unauth, 'qa-v715-desktop', { status: 'DELIVERED' }, 401)
  await unauth.close()
  const csrf = await context.request.post(base + '/api/dealer/orders/qa-v715-desktop/status', { headers: { Origin: 'https://invalid.example' }, data: { status: 'DELIVERED' } })
  assert.equal(csrf.status(), 403)
  assert.deepEqual(snapshot(), initial, 'Denied requests must not change data')
  for (const [name, width] of [['desktop', 1440], ['mobile', 390]]) {
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewportSize({ width, height: 1000 })
    const id = 'qa-v715-' + name
    await page.goto(base + '/dealer/orders', { waitUntil: 'networkidle' })
    await page.locator('[data-action="open-order"][data-id="' + id + '"]').click()
    const dialog = page.locator('#wo-order-dialog')
    const button = dialog.getByRole('button', { name: '納品を完了', exact: true })
    await button.waitFor()
    assert.equal(await dialog.locator('.wo-detail-line input:not([disabled])').count(), 0)
    const responsePromise = page.waitForResponse(response => response.url().endsWith('/' + id + '/status') && response.request().method() === 'POST')
    await button.click()
    const response = await responsePromise
    const payload = response.request().postDataJSON()
    if (bugExpected) {
      assert.equal(response.status(), 409)
      assert.match(await response.text(), /出荷後の明細は変更できません/)
      assert(payload.lines.length === 2)
      assert.deepEqual(snapshot(), initial)
      await page.screenshot({ path: fileURLToPath(new URL('before-error.png', artifactDir)), fullPage: true })
      console.log('Reproduced: disabled shipment lines submitted, delivery rejected with 409')
      break
    }
    assert.equal(response.status(), 200, await response.text())
    assert.equal(Object.hasOwn(payload, 'lines'), false)
    assert.equal(payload.dealerNote, 'QA715 existing memo')
    await page.waitForFunction(() => !document.getElementById('wo-order-dialog')?.open)
    await page.reload({ waitUntil: 'networkidle' })
    const row = page.locator('[data-action="open-order"][data-id="' + id + '"]')
    assert.match(await row.innerText(), /納品済み/)
    await row.click()
    await dialog.getByText('納品済み', { exact: true }).waitFor()
    assert.equal(await dialog.getByRole('button', { name: '納品を完了', exact: true }).count(), 0)
    await page.screenshot({ path: fileURLToPath(new URL(name + '-delivered.png', artifactDir)), fullPage: true })
    const after = snapshot()
    assert.deepEqual(after.lines, initial.lines)
    for (const key of ['stocks', 'charges', 'products']) assert.deepEqual(after[key], initial[key], key + ' must not change')
    const oldOrder = initial.orders.find(o => o.id === id), newOrder = after.orders.find(o => o.id === id)
    for (const key of ['subtotalYen', 'taxYen', 'totalYen', 'deliveryNo', 'dealerNote', 'shippedAt']) assert.equal(newOrder[key], oldOrder[key], key)
    assert.equal(newOrder.status, 'DELIVERED')
    assert(newOrder.deliveredAt)
    assert.equal(after.events.filter(event => event.orderId === id && event.eventType === 'DELIVERED').length, 1)
    for (const kind of ['invoice', 'delivery-note', 'export.csv']) {
      const doc = await context.request.get(base + '/dealer/orders/' + id + '/' + kind)
      assert.equal(doc.status(), 200, kind)
      assert((await doc.body()).length > 100, kind)
    }
    await post(context, id, { status: 'DELIVERED', lines: initial.lines.filter(l => l.orderId === id) }, 409)
    assert.deepEqual(snapshot(), after, 'Delivered lines must remain immutable')
    await post(context, id, { status: 'DELIVERED', dealerNote: 'QA715 existing memo' }, 200)
    const retried = snapshot()
    assert.equal(retried.orders.find(o => o.id === id).deliveredAt, newOrder.deliveredAt)
    assert.deepEqual(retried.lines, after.lines)
    for (const key of ['stocks', 'charges', 'products']) assert.deepEqual(retried[key], after[key], 'Retry: ' + key)
    await page.close()
  }
  assert.deepEqual(errors, [])
  console.log(bugExpected ? 'Pre-fix regression confirmed' : 'v715 browser/API passed: desktop + mobile delivery, persisted status, immutable lines/stock/prices, documents, retries, ERP guard, staff scope, authentication and CSRF')
} finally {
  await browser.close()
  if (created) fixture('restore')
}
