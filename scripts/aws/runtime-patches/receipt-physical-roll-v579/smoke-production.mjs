import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

async function waitForReady() {
  let lastStatus = 0
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/health/ready?smoke=v579-${Date.now()}-${attempt}`, {
      cache:'no-store',
    })
    lastStatus = response.status
    if (
      response.status === 200
      && response.headers.get('x-lien-receipt-physical-roll') === 'v579'
      && response.headers.get('x-lien-admin-sidebar-labels') === 'v578'
      && response.headers.get('x-lien-owner-billing-tab') === 'v577'
      && response.headers.get('x-lien-dealer-operations') === 'v576'
      && response.headers.get('x-lien-receipt-roll-print') === 'v569'
    ) return
    await sleep(1500)
  }
  assert.fail(`production readiness did not reach v579; last status ${lastStatus}`)
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

const receipt = await fetch(`${baseUrl}/admin/appointments/${encodeURIComponent(appointmentId)}/receipt?smoke=v579`, {
  headers:{ Cookie:cookie, Accept:'text/html', 'Cache-Control':'no-cache' },
  redirect:'manual',
})
assert.equal(receipt.status, 200)
const html = await receipt.text()
assert.match(html, /orimia-receipt-physical-roll-style-v579/)
assert.match(html, /orimia-receipt-physical-roll-script-v579/)
assert.doesNotMatch(html, /orimia-receipt-roll-style-v569/)
assert.doesNotMatch(html, /orimia-receipt-roll-script-v569/)
assert.doesNotMatch(html, /orimia-receipt-print-script-v540/)
assert.doesNotMatch(html, /orimia-shell-consistency-script-v518/)

const script = await fetch(`${baseUrl}/receipt-physical-roll-v579.js?smoke=v579`, {
  headers:{ 'Cache-Control':'no-cache' },
})
const style = await fetch(`${baseUrl}/receipt-physical-roll-v579.css?smoke=v579`, {
  headers:{ 'Cache-Control':'no-cache' },
})
assert.equal(script.status, 200)
assert.equal(style.status, 200)
assert.match(await script.text(), /__orimiaReceiptPhysicalRollV579/)
assert.match(await style.text(), /width: 80mm !important/)

console.log(JSON.stringify({
  release:'receipt-physical-roll-v579',
  production:true,
  readOnly:true,
  appointmentId,
  receiptAssets:true,
}))
