import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(`${baseUrl}/api/health/ready?smoke=v538`, { headers: { 'Cache-Control':'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-sales-ledger-detail-modal'), 'v538')
assert.equal(ready.headers.get('x-lien-sales-ledger-daily-summary'), 'v537')

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method:'POST',
  redirect:'manual',
  headers:{ Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded' },
  body:new URLSearchParams({ email:'demo.owner', password:'LienDemo2026!', next:'/admin/owner-analytics?salesLedger=1' }),
})
assert.ok([302, 303].includes(login.status), `login failed with ${login.status}`)
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(cookie, /^[^=]+=/)
const headers = { Cookie:cookie, 'Cache-Control':'no-cache' }

const script = await fetch(`${baseUrl}/sales-ledger-v318.js?smoke=v538`, { headers })
assert.equal(script.status, 200)
const scriptText = await script.text()
assert.match(scriptText, /sales-ledger-detail-modal-v538/)
assert.match(scriptText, /id="sl-payment-detail-dialog"/)
assert.doesNotMatch(scriptText, /data-sl-detail-card/)

const response = await fetch(`${baseUrl}/api/admin/sales-ledger?from=2026-08-01&to=2026-08-31`, { headers })
assert.equal(response.status, 200)
const payload = await response.json()
assert.ok(Array.isArray(payload.rows))
assert.ok(Array.isArray(payload.summary?.days))
assert.ok(payload.summary.days.length > 0)

console.log(JSON.stringify({ release:'sales-ledger-detail-modal-v538', productionReady:true, rows:payload.rows.length, days:payload.summary.days.length }))
