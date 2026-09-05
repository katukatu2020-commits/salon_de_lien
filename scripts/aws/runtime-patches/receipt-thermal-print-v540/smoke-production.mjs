import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(`${baseUrl}/api/health/ready?smoke=v540`, { headers:{ 'Cache-Control':'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-receipt-thermal-print'), 'v540')
assert.equal(ready.headers.get('x-lien-sales-ledger-staff-filter'), 'v539')

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method:'POST',
  redirect:'manual',
  headers:{ Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded' },
  body:new URLSearchParams({ email:'demo.owner', password:'LienDemo2026!', next:'/admin/appointments' }),
})
assert.ok([302, 303].includes(login.status), `login failed with ${login.status}`)
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(cookie, /^[^=]+=/)

const report = await fetch(`${baseUrl}/api/admin/sales-ledger?from=2025-01-01&to=2026-12-31`, { headers:{ Cookie:cookie } })
assert.equal(report.status, 200)
const rows = (await report.json()).rows
const appointmentId = rows.find(row => row.appointmentId)?.appointmentId
assert.ok(appointmentId, 'production fixture has no paid appointment')

const headers = { Cookie:cookie, Accept:'text/html', 'Cache-Control':'no-cache' }
const receipt = await fetch(`${baseUrl}/admin/appointments/${encodeURIComponent(appointmentId)}/receipt`, { headers })
assert.equal(receipt.status, 200)
const html = await receipt.text()
assert.match(html, /orimia-receipt-print-style-v540/)
assert.match(html, /orimia-receipt-print-script-v540/)
assert.doesNotMatch(html, /orimia-shell-consistency-script-v518/)

const script = await fetch(`${baseUrl}/receipt-thermal-print-v540.js?smoke=v540`, { headers:{ 'Cache-Control':'no-cache' } })
const style = await fetch(`${baseUrl}/receipt-thermal-print-v540.css?smoke=v540`, { headers:{ 'Cache-Control':'no-cache' } })
assert.equal(script.status, 200)
assert.equal(style.status, 200)
assert.match(await script.text(), /__orimiaReceiptPrintV540/)
assert.match(await style.text(), /width: 80mm !important/)

console.log(JSON.stringify({
  release:'receipt-thermal-print-v540',
  productionReady:true,
  appointmentId,
  receiptAssets:true,
}))
