import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3126').replace(/\/$/, '')
const ready = await fetch(`${baseUrl}/api/health/ready`)
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
  headers:{ Cookie:cookie, Accept:'text/html' },
})
assert.equal(page.status, 200)
const html = await page.text()
assert.match(html, /daily-sales-print-fit-v563\.css\?v=563-release1/)
assert.match(html, /daily-sales-print-fit-v563\.js\?v=563-release1/)
assert.doesNotMatch(html, /daily-sales-complete-print-v541\.css\?v=541-release1/)

for (const asset of ['daily-sales-print-fit-v563.css', 'daily-sales-print-fit-v563.js']) {
  const response = await fetch(`${baseUrl}/${asset}?integration=v563`)
  assert.equal(response.status, 200)
  assert.ok((await response.text()).includes('v563'))
}

const report = await fetch(`${baseUrl}/api/admin/sales-ledger?from=2026-08-01&to=2026-08-31`, { headers:{ Cookie:cookie } })
assert.equal(report.status, 200)
const data = await report.json()
assert.ok(data.summary.days.length > 0)
assert.ok(data.summary.staff.length > 0)

console.log(JSON.stringify({ release:'daily-sales-print-fit-v563', dailyRows:data.summary.days.length, staffColumns:data.summary.staff.length, integrated:true }))
