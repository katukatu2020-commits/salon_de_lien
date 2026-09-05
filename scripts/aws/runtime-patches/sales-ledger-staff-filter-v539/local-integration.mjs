import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3116').replace(/\/$/, '')

async function login() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method:'POST',
    redirect:'manual',
    headers:{ Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded' },
    body:new URLSearchParams({ email:'demo.owner', password:'LienDemo2026!', next:'/admin/owner-analytics?salesLedger=1' }),
  })
  assert.ok([302, 303].includes(response.status), `login failed with ${response.status}`)
  const cookie = (response.headers.get('set-cookie') || '').split(';')[0]
  assert.match(cookie, /^[^=]+=/)
  return cookie
}

async function report(headers, staff = '') {
  const params = new URLSearchParams({ from:'2026-08-01', to:'2026-08-31' })
  if (staff) params.set('staff', staff)
  const response = await fetch(`${baseUrl}/api/admin/sales-ledger?${params}`, { headers })
  assert.equal(response.status, 200)
  return response.json()
}

const ready = await fetch(`${baseUrl}/api/health/ready?integration=v539`, { headers:{ 'Cache-Control':'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-sales-ledger-staff-filter'), 'v539')
assert.equal(ready.headers.get('x-lien-sales-ledger-detail-modal'), 'v538')
assert.equal(ready.headers.get('x-lien-sales-ledger-daily-summary'), 'v537')

const cookie = await login()
const headers = { Cookie:cookie, 'Cache-Control':'no-cache' }
const scriptResponse = await fetch(`${baseUrl}/sales-ledger-v318.js?integration=v539`, { headers })
assert.equal(scriptResponse.status, 200)
const script = await scriptResponse.text()
assert.match(script, /sales-ledger-staff-filter-v539/)
assert.equal((script.match(/name="staff"/g) || []).length, 1)
assert.match(script, /form="sl-ledger-filter-form"/)

const all = await report(headers)
assert.ok(all.rows.length > 0, 'August sales fixture is empty')
const staff = all.rows.map(row => String(row.staffName || '').trim()).find(Boolean)
assert.ok(staff, 'August sales fixture has no assigned staff')
const filtered = await report(headers, staff)
assert.ok(filtered.rows.length > 0, 'staff-filtered report is empty')
assert.ok(filtered.rows.every(row => row.staffName === staff), 'staff-filtered report leaked another staff member')
assert.equal(filtered.summary.totals.transactions, filtered.rows.length)
assert.equal(filtered.summary.totals.grossTotal, filtered.rows.reduce((sum, row) => sum + Number(row.grossTotal || 0), 0))
assert.ok(filtered.staff.includes(staff), 'selected staff disappeared from the selector options')

console.log(JSON.stringify({
  release:'sales-ledger-staff-filter-v539',
  allRows:all.rows.length,
  filteredRows:filtered.rows.length,
  selectedStaff:staff,
  filteredGrossTotal:filtered.summary.totals.grossTotal,
}))
