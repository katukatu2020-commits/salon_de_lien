import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(`${baseUrl}/api/health/ready?smoke=v541`, { headers:{ 'Cache-Control':'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-daily-sales-complete-print'), 'v541')
assert.equal(ready.headers.get('x-lien-receipt-thermal-print'), 'v540')
assert.equal(ready.headers.get('x-lien-sales-ledger-staff-filter'), 'v539')

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method:'POST',
  redirect:'manual',
  headers:{ Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded' },
  body:new URLSearchParams({ email:'demo.owner', password:'LienDemo2026!', next:'/admin/owner-analytics?salesLedger=1' }),
})
assert.ok([302, 303].includes(login.status), `login failed with ${login.status}`)
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(cookie, /^[^=]+=/)

const page = await fetch(`${baseUrl}/admin/owner-analytics?salesLedger=1`, {
  headers:{ Cookie:cookie, Accept:'text/html', 'Cache-Control':'no-cache' },
})
assert.equal(page.status, 200)
const html = await page.text()
assert.match(html, /orimia-daily-sales-print-style-v541/)
assert.match(html, /orimia-daily-sales-print-script-v541/)

const report = await fetch(`${baseUrl}/api/admin/sales-ledger?from=2026-08-01&to=2026-08-31`, { headers:{ Cookie:cookie } })
assert.equal(report.status, 200)
assert.ok((await report.json()).summary.days.length > 0)

const script = await fetch(`${baseUrl}/daily-sales-complete-print-v541.js?smoke=v541`, { headers:{ 'Cache-Control':'no-cache' } })
const style = await fetch(`${baseUrl}/daily-sales-complete-print-v541.css?smoke=v541`, { headers:{ 'Cache-Control':'no-cache' } })
assert.equal(script.status, 200)
assert.equal(style.status, 200)
assert.match(await script.text(), /__orimiaDailySalesPrintV541/)
assert.match(await style.text(), /body > \*:not\(#orimia-daily-sales-print-host-v541\)/)

console.log(JSON.stringify({
  release:'daily-sales-complete-print-v541',
  productionReady:true,
  reportAvailable:true,
  printAssets:true,
}))
