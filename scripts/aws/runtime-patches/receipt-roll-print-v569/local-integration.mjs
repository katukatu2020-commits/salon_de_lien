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

const ready = await fetch(`${baseUrl}/api/health/ready?integration=v569`, { headers:{ 'Cache-Control':'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-receipt-roll-print'), 'v569')
assert.equal(ready.headers.get('x-lien-style-detail-three-photo-layout'), 'v568')
assert.equal(ready.headers.get('x-lien-receipt-thermal-print'), 'v540')

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
const receiptHtml = await receiptResponse.text()
assert.match(receiptHtml, /orimia-receipt-roll-style-v569/)
assert.match(receiptHtml, /orimia-receipt-roll-script-v569/)
assert.doesNotMatch(receiptHtml, /orimia-receipt-print-style-v540/)
assert.doesNotMatch(receiptHtml, /orimia-receipt-print-script-v540/)
assert.doesNotMatch(receiptHtml, /orimia-shell-consistency-script-v518/)

const adminResponse = await fetch(`${baseUrl}/admin/appointments`, { headers:authenticatedHeaders })
assert.equal(adminResponse.status, 200)
const adminHtml = await adminResponse.text()
assert.match(adminHtml, /orimia-shell-consistency-script-v518/)
assert.doesNotMatch(adminHtml, /orimia-receipt-roll-script-v569/)

const scriptResponse = await fetch(`${baseUrl}/receipt-roll-print-v569.js?integration=v569`)
const styleResponse = await fetch(`${baseUrl}/receipt-roll-print-v569.css?integration=v569`)
assert.equal(scriptResponse.status, 200)
assert.equal(styleResponse.status, 200)
assert.match(await scriptResponse.text(), /__orimiaReceiptRollPrintV569/)
assert.match(await styleResponse.text(), /--orimia-receipt-roll-height-v569/)

console.log(JSON.stringify({
  release:'receipt-roll-print-v569',
  appointmentId,
  routeScopedAssets:true,
  legacyReceiptAssetsReplaced:true,
  regularAdminShellPreserved:true,
}))
