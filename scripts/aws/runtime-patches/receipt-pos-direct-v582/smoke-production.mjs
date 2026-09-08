import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

async function waitForReady() {
  for (let attempt = 1; attempt <= 24; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/health/ready?smoke=v582-${Date.now()}-${attempt}`, { cache:'no-store' })
    if (
      response.status === 200
      && response.headers.get('x-lien-receipt-pos-direct') === 'v582'
      && response.headers.get('x-lien-dealer-contract-pricing') === 'v581'
      && response.headers.get('x-lien-admin-chat-read-position') === 'v580'
      && response.headers.get('x-lien-receipt-physical-roll') === 'v579'
    ) return
    await sleep(1500)
  }
  assert.fail('production readiness did not reach v582')
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

const headers = { Cookie:cookie, Accept:'text/html', 'Cache-Control':'no-cache' }
const receipt = await fetch(`${baseUrl}/admin/appointments/${encodeURIComponent(appointmentId)}/receipt?smoke=v582`, { headers })
assert.equal(receipt.status, 200)
assert.match(receipt.headers.get('content-security-policy') || '', /connect-src[^;]*http:\/\/127\.0\.0\.1:17615/)
const html = await receipt.text()
assert.match(html, /orimia-receipt-pos-direct-script-v582/)
assert.doesNotMatch(html, /orimia-receipt-physical-roll-script-v579/)

const regular = await fetch(`${baseUrl}/admin/appointments`, { headers })
assert.equal(regular.status, 200)
assert.doesNotMatch(regular.headers.get('content-security-policy') || '', /127\.0\.0\.1:17615/)

const script = await fetch(`${baseUrl}/receipt-pos-direct-v582.js?smoke=v582`, { headers:{ 'Cache-Control':'no-cache' } })
assert.equal(script.status, 200)
assert.match(await script.text(), /__orimiaReceiptPosDirectV582/)

console.log(JSON.stringify({
  release:'receipt-pos-direct-v582',
  production:true,
  readOnly:true,
  appointmentId,
  routeScopedLoopback:true,
  receiptAsset:true,
}))
