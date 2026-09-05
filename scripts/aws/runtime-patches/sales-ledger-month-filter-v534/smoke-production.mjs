import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(`${baseUrl}/api/health/ready`, { cache: 'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-sales-ledger-month-filter'), 'v534')
assert.equal(ready.headers.get('x-lien-customer-registration-profile'), 'v533')
assert.equal(ready.headers.get('x-lien-customer-account-lifecycle'), 'v532')
assert.equal(ready.headers.get('x-lien-billing-display-mask'), 'v531')
assert.equal(ready.headers.get('x-lien-customer-home-menu-order'), 'v530')
assert.equal(ready.headers.get('x-lien-customer-desktop-frontend'), 'v529')
assert.equal(ready.headers.get('x-lien-customer-home-branding'), 'v528')
assert.equal(ready.headers.get('x-lien-line-booking-ui-parity'), 'v527')

const asset = await fetch(`${baseUrl}/sales-ledger-v318.js`, { cache: 'no-store' })
assert.equal(asset.status, 200)
const client = await asset.text()
assert.match(client, /sales-ledger-month-filter-v534/)
assert.match(client, /type="month"/)
assert.match(client, /data-sl-month-shift="-1"/)
assert.match(client, /function syncMonthFromDates/)
assert.match(client, /const sequence = \+\+loadSequence/)

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/owner-analytics?salesLedger=1' }),
})
assert.equal(login.status, 303)
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(cookie, /^[^=]+=/)

const month = '2026-08'
const from = `${month}-01`
const to = `${month}-31`
const ledger = await fetch(`${baseUrl}/api/admin/sales-ledger?from=${from}&to=${to}`, {
  headers: { Cookie: cookie, 'Cache-Control': 'no-cache' },
  cache: 'no-store',
})
assert.equal(ledger.status, 200)
const payload = await ledger.json()
assert.ok(Array.isArray(payload.rows))
for (const row of payload.rows) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(row.paidAt))
  const value = `${parts.find(part => part.type === 'year').value}-${parts.find(part => part.type === 'month').value}-${parts.find(part => part.type === 'day').value}`
  assert.ok(value >= from && value <= to, `row ${row.id} is outside the requested month: ${value}`)
}

console.log(JSON.stringify({ release: 'sales-ledger-month-filter-v534', ready: ready.status, asset: asset.status, api: ledger.status, augustRows: payload.rows.length }))
