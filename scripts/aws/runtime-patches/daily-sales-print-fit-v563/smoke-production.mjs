import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const ready = await fetch(`${baseUrl}/api/health/ready`, { headers:{ 'Cache-Control':'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-daily-sales-print-fit'), 'v563')
assert.equal(ready.headers.get('x-lien-customer-chart-ui'), 'v562')

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
assert.match(html, /daily-sales-print-fit-v563\.css\?v=563-release1/)
assert.match(html, /daily-sales-print-fit-v563\.js\?v=563-release1/)

const script = await fetch(`${baseUrl}/daily-sales-print-fit-v563.js?smoke=v563`, { headers:{ 'Cache-Control':'no-cache' } })
const style = await fetch(`${baseUrl}/daily-sales-print-fit-v563.css?smoke=v563`, { headers:{ 'Cache-Control':'no-cache' } })
assert.equal(script.status, 200)
assert.equal(style.status, 200)
assert.match(await script.text(), /__orimiaDailySalesPrintV563/)
assert.match(await style.text(), /table-layout: fixed !important/)

const report = await fetch(`${baseUrl}/api/admin/sales-ledger?from=2026-08-01&to=2026-08-31`, { headers:{ Cookie:cookie } })
assert.equal(report.status, 200)
assert.ok((await report.json()).summary.days.length > 0)

console.log(JSON.stringify({ release:'daily-sales-print-fit-v563', production:true }))
