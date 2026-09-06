import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const ready = await fetch(`${baseUrl}/api/health/ready?verify=v564-${Date.now()}`, { cache:'no-store' })
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

const missing = await fetch(`${baseUrl}/api/admin/customers/v564-read-only-smoke/chart-photos?limit=1`, {
  headers:{ Cookie:cookie, Accept:'application/json', 'Cache-Control':'no-cache' },
})
assert.equal(missing.status, 404)
const payload = await missing.json()
assert.match(payload.error, /顧客カルテ/)

const page = await fetch(`${baseUrl}/admin/customers`, { headers:{ Cookie:cookie, Accept:'text/html' } })
assert.equal(page.status, 200)
assert.match(await page.text(), /<title>ORIMIA<\/title>/)

console.log(JSON.stringify({ release:'customer-chart-attachments-v564', production:true, readOnly:true }))
