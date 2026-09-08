import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3144').replace(/\/$/, '')

async function login() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method:'POST',
    redirect:'manual',
    headers:{ Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded' },
    body:new URLSearchParams({ email:'demo.owner', password:'LienDemo2026!', next:'/admin/appointments' }),
  })
  assert.ok([302, 303].includes(response.status), `login failed with ${response.status}`)
  const cookie = (response.headers.get('set-cookie') || '').split(';')[0]
  assert.match(cookie, /^[^=]+=/)
  return cookie
}

const ready = await fetch(`${baseUrl}/api/health/ready?integration=v582`, { headers:{ 'Cache-Control':'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-receipt-pos-direct'), 'v582')
assert.equal(ready.headers.get('x-lien-dealer-contract-pricing'), 'v581')
assert.equal(ready.headers.get('x-lien-admin-chat-read-position'), 'v580')
assert.equal(ready.headers.get('x-lien-receipt-physical-roll'), 'v579')

const cookie = await login()
const authenticatedHeaders = { Cookie:cookie, Accept:'text/html', 'Cache-Control':'no-cache' }
const report = await fetch(`${baseUrl}/api/admin/sales-ledger?from=2026-08-01&to=2026-09-30`, {
  headers:{ Cookie:cookie, 'Cache-Control':'no-cache' },
})
assert.equal(report.status, 200)
const rows = (await report.json()).rows
const appointmentId = rows.find(row => row.appointmentId && row.productLineCount > 0)?.appointmentId
  || rows.find(row => row.appointmentId)?.appointmentId
assert.ok(appointmentId, 'no paid appointment fixture is available')

const receiptResponse = await fetch(`${baseUrl}/admin/appointments/${encodeURIComponent(appointmentId)}/receipt`, {
  headers:authenticatedHeaders,
})
assert.equal(receiptResponse.status, 200)
const receiptCsp = receiptResponse.headers.get('content-security-policy') || ''
const receiptHtml = await receiptResponse.text()
if (receiptCsp) assert.match(receiptCsp, /connect-src[^;]*http:\/\/127\.0\.0\.1:17615/)
assert.match(receiptHtml, /orimia-receipt-pos-direct-script-v582/)
assert.match(receiptHtml, /receipt-pos-direct-v582\.js\?v=582-release1/)
assert.match(receiptHtml, /orimia-receipt-physical-roll-style-v579/)
assert.doesNotMatch(receiptHtml, /orimia-receipt-physical-roll-script-v579/)

const adminResponse = await fetch(`${baseUrl}/admin/appointments`, { headers:authenticatedHeaders })
assert.equal(adminResponse.status, 200)
const adminCsp = adminResponse.headers.get('content-security-policy') || ''
const adminHtml = await adminResponse.text()
assert.doesNotMatch(adminCsp, /127\.0\.0\.1:17615/)
assert.doesNotMatch(adminHtml, /receipt-pos-direct-v582\.js/)

const scriptResponse = await fetch(`${baseUrl}/receipt-pos-direct-v582.js?integration=v582`)
assert.equal(scriptResponse.status, 200)
assert.match(await scriptResponse.text(), /__orimiaReceiptPosDirectV582/)

console.log(JSON.stringify({
  release:'receipt-pos-direct-v582',
  appointmentId,
  routeScopedAsset:true,
  routeScopedLoopbackCsp:true,
  regularAdminUnchanged:true,
}))
