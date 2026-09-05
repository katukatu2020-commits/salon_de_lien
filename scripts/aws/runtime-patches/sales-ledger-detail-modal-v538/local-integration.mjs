import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3115').replace(/\/$/, '')

async function login() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/owner-analytics?salesLedger=1' }),
  })
  assert.ok([302, 303].includes(response.status), `login failed with ${response.status}`)
  const cookie = (response.headers.get('set-cookie') || '').split(';')[0]
  assert.match(cookie, /^[^=]+=/)
  return cookie
}

const ready = await fetch(`${baseUrl}/api/health/ready?integration=v538`, { headers: { 'Cache-Control':'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-sales-ledger-detail-modal'), 'v538')
assert.equal(ready.headers.get('x-lien-sales-ledger-daily-summary'), 'v537')

const cookie = await login()
const headers = { Cookie:cookie, 'Cache-Control':'no-cache' }
const scriptResponse = await fetch(`${baseUrl}/sales-ledger-v318.js?integration=v538`, { headers })
assert.equal(scriptResponse.status, 200)
const script = await scriptResponse.text()
assert.match(script, /sales-ledger-detail-modal-v538/)
assert.match(script, /id="sl-payment-detail-dialog"/)
assert.doesNotMatch(script, /data-sl-detail-card/)

const reportResponse = await fetch(`${baseUrl}/api/admin/sales-ledger?from=2026-08-01&to=2026-08-31`, { headers })
assert.equal(reportResponse.status, 200)
const report = await reportResponse.json()
assert.ok(Array.isArray(report.rows))
assert.ok(Array.isArray(report.summary?.days))
assert.ok(report.summary.days.length > 0)

console.log(JSON.stringify({
  release:'sales-ledger-detail-modal-v538',
  rows:report.rows.length,
  days:report.summary.days.length,
  detailModalReady:true,
}))
