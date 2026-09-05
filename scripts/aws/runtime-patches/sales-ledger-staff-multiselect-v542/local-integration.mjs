import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3118').replace(/\/$/, '')

const ready = await fetch(`${baseUrl}/api/health/ready?verify=v542`, { headers:{ 'Cache-Control':'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-sales-ledger-staff-multiselect'), 'v542')
assert.equal(ready.headers.get('x-lien-daily-sales-complete-print'), 'v541')

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
const clientResponse = await fetch(`${baseUrl}/sales-ledger-v318.js?verify=v542`, { headers })
assert.equal(clientResponse.status, 200)
const client = await clientResponse.text()
assert.match(client, /sales-ledger-staff-multiselect-v542/)
assert.match(client, /data-sl-staff-option/)
assert.doesNotMatch(client, /<select aria-label="日別売上集計の担当者"/)

async function report(staff = null) {
  const params = new URLSearchParams({ from:'2026-08-01', to:'2026-08-31' })
  if (staff instanceof Array) {
    if (staff.length) staff.forEach(name => params.append('staff', name))
    else params.set('staffMode', 'none')
  }
  const response = await fetch(`${baseUrl}/api/admin/sales-ledger?${params}`, { headers })
  if (response.status !== 200) throw new Error(`report failed with ${response.status}: ${await response.text()}`)
  return response.json()
}

const all = await report()
assert.ok(all.rows.length > 0, 'August sales fixture is empty')
const staffWithSales = [...new Set(all.rows.map(row => String(row.staffName || '').trim()).filter(Boolean))]
  .filter(name => all.staff.includes(name))
assert.ok(staffWithSales.length >= 2, 'August sales fixture needs two assigned staff')
const selectedStaff = staffWithSales.slice(0, 2)

const multiple = await report(selectedStaff)
assert.ok(multiple.rows.length > 0)
assert.ok(multiple.rows.every(row => selectedStaff.includes(String(row.staffName || '').trim())))
assert.ok(multiple.summary.staff.every(name => selectedStaff.includes(name)))
assert.equal(multiple.summary.totals.transactions, multiple.rows.length)
assert.equal(multiple.summary.totals.grossTotal, multiple.rows.reduce((sum, row) => sum + Number(row.grossTotal || 0), 0))

const single = await report(selectedStaff.slice(0, 1))
assert.ok(single.rows.length > 0)
assert.ok(single.rows.every(row => row.staffName === selectedStaff[0]))
assert.equal(single.summary.totals.transactions, single.rows.length)

const none = await report([])
assert.equal(none.rows.length, 0)
assert.equal(none.summary.days.length, 0)
assert.equal(none.summary.totals.transactions, 0)

console.log(JSON.stringify({
  release:'sales-ledger-staff-multiselect-v542',
  selectedStaff,
  multipleRows:multiple.rows.length,
  singleRows:single.rows.length,
  noneRows:none.rows.length,
  checkboxDropdown:true,
}))
