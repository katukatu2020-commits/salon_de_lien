import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3117').replace(/\/$/, '')

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

const ready = await fetch(`${baseUrl}/api/health/ready?integration=v541`, { headers:{ 'Cache-Control':'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-daily-sales-complete-print'), 'v541')
assert.equal(ready.headers.get('x-lien-receipt-thermal-print'), 'v540')
assert.equal(ready.headers.get('x-lien-sales-ledger-staff-filter'), 'v539')

const cookie = await login()
const htmlHeaders = { Cookie:cookie, Accept:'text/html', 'Cache-Control':'no-cache' }
const analyticsResponse = await fetch(`${baseUrl}/admin/owner-analytics?salesLedger=1`, { headers:htmlHeaders })
assert.equal(analyticsResponse.status, 200)
const analyticsHtml = await analyticsResponse.text()
assert.match(analyticsHtml, /orimia-daily-sales-print-style-v541/)
assert.match(analyticsHtml, /orimia-daily-sales-print-script-v541/)

const appointmentsResponse = await fetch(`${baseUrl}/admin/appointments`, { headers:htmlHeaders })
assert.equal(appointmentsResponse.status, 200)
assert.doesNotMatch(await appointmentsResponse.text(), /orimia-daily-sales-print-script-v541/)

const reportResponse = await fetch(`${baseUrl}/api/admin/sales-ledger?from=2026-08-01&to=2026-08-31`, { headers:{ Cookie:cookie } })
assert.equal(reportResponse.status, 200)
const report = await reportResponse.json()
assert.ok(report.summary.days.length > 0, 'daily sales fixture is empty')
assert.ok(report.summary.staff.length > 0, 'daily staff totals are unavailable')

const scriptResponse = await fetch(`${baseUrl}/daily-sales-complete-print-v541.js?integration=v541`)
const styleResponse = await fetch(`${baseUrl}/daily-sales-complete-print-v541.css?integration=v541`)
assert.equal(scriptResponse.status, 200)
assert.equal(styleResponse.status, 200)
assert.match(await scriptResponse.text(), /__orimiaDailySalesPrintV541/)
assert.match(await styleResponse.text(), /size: A4 landscape/)

console.log(JSON.stringify({
  release:'daily-sales-complete-print-v541',
  dailyRows:report.summary.days.length,
  staffColumns:report.summary.staff.length,
  routeScopedAssets:true,
}))
