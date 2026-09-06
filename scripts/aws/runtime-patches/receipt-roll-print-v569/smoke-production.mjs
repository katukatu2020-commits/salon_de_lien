import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

async function waitForReady() {
  let lastStatus = 0
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/health/ready?smoke=v569-${Date.now()}-${attempt}`, {
      cache:'no-store',
    })
    lastStatus = response.status
    if (
      response.status === 200
      && response.headers.get('x-lien-receipt-roll-print') === 'v569'
      && response.headers.get('x-lien-style-detail-three-photo-layout') === 'v568'
      && response.headers.get('x-lien-customer-chart-delete') === 'v567'
      && response.headers.get('x-lien-style-post-directions') === 'v566'
      && response.headers.get('x-lien-daily-sales-print-fit') === 'v563'
    ) return
    await sleep(1500)
  }
  assert.fail(`production readiness did not reach v569; last status ${lastStatus}`)
}

await waitForReady()

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method:'POST',
  redirect:'manual',
  headers:{ Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded' },
  body:new URLSearchParams({ email:'demo.owner', password:'LienDemo2026!', next:'/admin/appointments' }),
})
assert.ok([302, 303].includes(login.status), `owner login failed: ${login.status}`)
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(cookie, /^lien_admin_session=/)

const report = await fetch(`${baseUrl}/api/admin/sales-ledger?from=2025-01-01&to=2026-12-31`, {
  headers:{ Cookie:cookie, 'Cache-Control':'no-cache' },
})
assert.equal(report.status, 200)
const rows = (await report.json()).rows
const appointmentId = rows.find(row => row.appointmentId)?.appointmentId
assert.ok(appointmentId, 'production fixture has no paid appointment')

const receipt = await fetch(`${baseUrl}/admin/appointments/${encodeURIComponent(appointmentId)}/receipt?smoke=v569`, {
  headers:{ Cookie:cookie, Accept:'text/html', 'Cache-Control':'no-cache' },
  redirect:'manual',
})
assert.equal(receipt.status, 200)
const html = await receipt.text()
assert.match(html, /orimia-receipt-roll-style-v569/)
assert.match(html, /orimia-receipt-roll-script-v569/)
assert.doesNotMatch(html, /orimia-receipt-print-script-v540/)
assert.doesNotMatch(html, /orimia-shell-consistency-script-v518/)

const script = await fetch(`${baseUrl}/receipt-roll-print-v569.js?smoke=v569`, {
  headers:{ 'Cache-Control':'no-cache' },
})
const style = await fetch(`${baseUrl}/receipt-roll-print-v569.css?smoke=v569`, {
  headers:{ 'Cache-Control':'no-cache' },
})
assert.equal(script.status, 200)
assert.equal(style.status, 200)
assert.match(await script.text(), /__orimiaReceiptRollPrintV569/)
assert.match(await style.text(), /width: 80mm !important/)

console.log(JSON.stringify({
  release:'receipt-roll-print-v569',
  production:true,
  readOnly:true,
  appointmentId,
  receiptAssets:true,
}))
