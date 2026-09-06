import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3137').replace(/\/$/, '')
const ready = await fetch(`${baseUrl}/api/health/ready?verify=v564`, { cache:'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-customer-chart-attachments'), 'v564')
assert.equal(ready.headers.get('x-lien-customer-chart-ui'), 'v562')
assert.equal(ready.headers.get('x-lien-daily-sales-print-fit'), 'v563')

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method:'POST',
  redirect:'manual',
  headers:{ Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded' },
  body:new URLSearchParams({ email:'demo.owner', password:'LienDemo2026!', next:'/admin/customers' }),
})
assert.ok([302, 303].includes(login.status), `owner login failed: ${login.status}`)
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(cookie, /^lien_admin_session=/)

const missing = await fetch(`${baseUrl}/api/admin/customers/v564-does-not-exist/chart-photos?limit=1`, {
  headers:{ Cookie:cookie, Accept:'application/json' },
})
assert.equal(missing.status, 404)
const payload = await missing.json()
assert.equal(payload.ok, false)
assert.match(payload.error, /顧客カルテ/)

const customerPage = await fetch(`${baseUrl}/admin/customers`, { headers:{ Cookie:cookie, Accept:'text/html' } })
assert.equal(customerPage.status, 200)
assert.match(await customerPage.text(), /<title>ORIMIA<\/title>/)

console.log(JSON.stringify({ release:'customer-chart-attachments-v564', ready:true, route:true, page:true }))
