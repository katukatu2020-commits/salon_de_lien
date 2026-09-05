import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3117').replace(/\/$/, '')

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

const ready = await fetch(`${baseUrl}/api/health/ready?integration=v540`, { headers:{ 'Cache-Control':'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-receipt-thermal-print'), 'v540')
assert.equal(ready.headers.get('x-lien-sales-ledger-staff-filter'), 'v539')

const cookie = await login()
const headers = { Cookie:cookie, Accept:'text/html', 'Cache-Control':'no-cache' }
const report = await fetch(`${baseUrl}/api/admin/sales-ledger?from=2026-08-01&to=2026-09-30`, { headers:{ Cookie:cookie } })
assert.equal(report.status, 200)
const rows = (await report.json()).rows
const appointmentId = rows.find(row => row.appointmentId && row.productLineCount > 0)?.appointmentId
  || rows.find(row => row.appointmentId)?.appointmentId
assert.ok(appointmentId, 'no paid appointment fixture is available')

const receiptResponse = await fetch(`${baseUrl}/admin/appointments/${encodeURIComponent(appointmentId)}/receipt`, { headers })
assert.equal(receiptResponse.status, 200)
const receiptHtml = await receiptResponse.text()
assert.match(receiptHtml, /orimia-receipt-print-style-v540/)
assert.match(receiptHtml, /orimia-receipt-print-script-v540/)
assert.doesNotMatch(receiptHtml, /orimia-shell-consistency-script-v518/)

const adminResponse = await fetch(`${baseUrl}/admin/appointments`, { headers })
assert.equal(adminResponse.status, 200)
const adminHtml = await adminResponse.text()
assert.match(adminHtml, /orimia-shell-consistency-script-v518/)
assert.doesNotMatch(adminHtml, /orimia-receipt-print-script-v540/)

const scriptResponse = await fetch(`${baseUrl}/receipt-thermal-print-v540.js?integration=v540`)
const styleResponse = await fetch(`${baseUrl}/receipt-thermal-print-v540.css?integration=v540`)
assert.equal(scriptResponse.status, 200)
assert.equal(styleResponse.status, 200)
assert.match(await scriptResponse.text(), /__orimiaReceiptPrintV540/)
assert.match(await styleResponse.text(), /body > \*:not\(#orimia-receipt-print-host-v540\)/)

console.log(JSON.stringify({
  release:'receipt-thermal-print-v540',
  appointmentId,
  routeScopedAssets:true,
  regularAdminShellPreserved:true,
}))
