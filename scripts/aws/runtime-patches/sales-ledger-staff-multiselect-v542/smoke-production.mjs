import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(`${baseUrl}/api/health/ready?smoke=v542`, { headers:{ 'Cache-Control':'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-sales-ledger-staff-multiselect'), 'v542')
assert.equal(ready.headers.get('x-lien-daily-sales-complete-print'), 'v541')
assert.equal(ready.headers.get('x-lien-receipt-thermal-print'), 'v540')

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

const script = await fetch(`${baseUrl}/sales-ledger-v318.js?smoke=v542`, { headers })
assert.equal(script.status, 200)
const client = await script.text()
assert.match(client, /sales-ledger-staff-multiselect-v542/)
assert.match(client, /data-sl-staff-option/)

async function report(staff = null) {
  const params = new URLSearchParams({ from:'2026-08-01', to:'2026-08-31' })
  if (staff instanceof Array) {
    if (staff.length) staff.forEach(name => params.append('staff', name))
    else params.set('staffMode', 'none')
  }
  const response = await fetch(`${baseUrl}/api/admin/sales-ledger?${params}`, { headers })
  assert.equal(response.status, 200)
  return response.json()
}

const all = await report()
const staffWithSales = [...new Set(all.rows.map(row => String(row.staffName || '').trim()).filter(Boolean))]
  .filter(name => all.staff.includes(name))
assert.ok(staffWithSales.length >= 2)
const selectedStaff = staffWithSales.slice(0, 2)
const multiple = await report(selectedStaff)
assert.ok(multiple.rows.length > 0)
assert.ok(multiple.rows.every(row => selectedStaff.includes(row.staffName)))
assert.equal(multiple.summary.totals.transactions, multiple.rows.length)
assert.ok(multiple.summary.staff.every(name => selectedStaff.includes(name)))
const none = await report([])
assert.equal(none.rows.length, 0)
assert.equal(none.summary.totals.transactions, 0)

console.log(JSON.stringify({
  release:'sales-ledger-staff-multiselect-v542',
  productionReady:true,
  selectedStaff,
  multipleRows:multiple.rows.length,
  noneRows:none.rows.length,
}))
