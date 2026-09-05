import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(`${baseUrl}/api/health/ready?smoke=v539`, { headers:{ 'Cache-Control':'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-sales-ledger-staff-filter'), 'v539')
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

const scriptResponse = await fetch(`${baseUrl}/sales-ledger-v318.js?smoke=v539`, { headers })
assert.equal(scriptResponse.status, 200)
const script = await scriptResponse.text()
assert.match(script, /sales-ledger-staff-filter-v539/)
assert.equal((script.match(/name="staff"/g) || []).length, 1)

const range = new URLSearchParams({ from:'2026-08-01', to:'2026-08-31' })
const allResponse = await fetch(`${baseUrl}/api/admin/sales-ledger?${range}`, { headers })
assert.equal(allResponse.status, 200)
const all = await allResponse.json()
const staff = all.rows.map(row => String(row.staffName || '').trim()).find(Boolean)
assert.ok(staff)
range.set('staff', staff)
const filteredResponse = await fetch(`${baseUrl}/api/admin/sales-ledger?${range}`, { headers })
assert.equal(filteredResponse.status, 200)
const filtered = await filteredResponse.json()
assert.ok(filtered.rows.length > 0)
assert.ok(filtered.rows.every(row => row.staffName === staff))
assert.equal(filtered.summary.totals.transactions, filtered.rows.length)

console.log(JSON.stringify({
  release:'sales-ledger-staff-filter-v539',
  productionReady:true,
  selectedStaff:staff,
  filteredRows:filtered.rows.length,
}))
