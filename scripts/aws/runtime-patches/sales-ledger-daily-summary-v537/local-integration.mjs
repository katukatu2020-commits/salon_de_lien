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

const ready = await fetch(`${baseUrl}/api/health/ready?integration=v537`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-sales-ledger-daily-summary'), 'v537')
assert.equal(ready.headers.get('x-lien-navigation-loading-experience'), 'v536')

const cookie = await login()
const headers = { Cookie: cookie, 'Cache-Control': 'no-cache' }
const scriptResponse = await fetch(`${baseUrl}/sales-ledger-v318.js?integration=v537`, { headers })
assert.equal(scriptResponse.status, 200)
const script = await scriptResponse.text()
assert.match(script, /sales-ledger-daily-summary-v537/)
assert.match(script, /日別売上集計/)
assert.match(script, /決済明細/)

const reportResponse = await fetch(`${baseUrl}/api/admin/sales-ledger?from=2026-08-01&to=2026-08-31`, { headers })
assert.equal(reportResponse.status, 200)
const report = await reportResponse.json()
assert.ok(Array.isArray(report.rows))
assert.ok(Array.isArray(report.summary?.days))
assert.ok(Array.isArray(report.summary?.staff))
assert.ok(Array.isArray(report.paymentMethods))
assert.equal(report.count, report.rows.length)

const totals = report.summary.totals
const dayGross = report.summary.days.reduce((sum, day) => sum + day.grossTotal, 0)
const paymentGross = Object.values(totals.payments).reduce((sum, value) => sum + value, 0)
const staffGross = Object.values(totals.staffSales).reduce((sum, value) => sum + value, 0)
assert.equal(dayGross, totals.grossTotal)
assert.equal(paymentGross, totals.grossTotal)
assert.equal(staffGross, totals.grossTotal)
assert.equal(totals.netTotal + totals.includedTax, totals.grossTotal)
assert.equal(
  totals.serviceTotal + totals.productTotal + totals.nominationFee + totals.shippingFee - totals.couponDiscount - totals.pointDiscount,
  totals.grossTotal,
)

if (report.paymentMethods[0]) {
  const filteredResponse = await fetch(`${baseUrl}/api/admin/sales-ledger?from=2026-08-01&to=2026-08-31&payment=${encodeURIComponent(report.paymentMethods[0])}`, { headers })
  assert.equal(filteredResponse.status, 200)
  const filtered = await filteredResponse.json()
  assert.ok(filtered.rows.every(row => row.paymentMethod === report.paymentMethods[0]))
  assert.equal(Object.values(filtered.summary.totals.payments).reduce((sum, value) => sum + value, 0), filtered.summary.totals.grossTotal)
}

console.log(JSON.stringify({
  release: 'sales-ledger-daily-summary-v537',
  rows: report.rows.length,
  days: report.summary.days.length,
  gross: totals.grossTotal,
  reconciled: true,
}))
