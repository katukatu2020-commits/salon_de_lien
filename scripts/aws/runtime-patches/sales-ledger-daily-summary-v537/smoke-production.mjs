import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(`${baseUrl}/api/health/ready?smoke=v537`, { headers: { 'Cache-Control':'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-sales-ledger-daily-summary'), 'v537')
assert.equal(ready.headers.get('x-lien-navigation-loading-experience'), 'v536')

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

const script = await fetch(`${baseUrl}/sales-ledger-v318.js?smoke=v537`, { headers })
assert.equal(script.status, 200)
assert.match(await script.text(), /sales-ledger-daily-summary-v537/)

const response = await fetch(`${baseUrl}/api/admin/sales-ledger?from=2026-08-01&to=2026-08-31`, { headers })
assert.equal(response.status, 200)
const payload = await response.json()
assert.ok(Array.isArray(payload.rows))
assert.ok(Array.isArray(payload.summary?.days))
const totals = payload.summary.totals
assert.equal(Object.values(totals.payments).reduce((sum, value) => sum + value, 0), totals.grossTotal)
assert.equal(Object.values(totals.staffSales).reduce((sum, value) => sum + value, 0), totals.grossTotal)
assert.equal(totals.netTotal + totals.includedTax, totals.grossTotal)

console.log(JSON.stringify({ release:'sales-ledger-daily-summary-v537', productionReady:true, rows:payload.rows.length, days:payload.summary.days.length }))
