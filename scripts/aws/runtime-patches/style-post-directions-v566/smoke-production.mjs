import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const nonce = Date.now()

const ready = await fetch(`${baseUrl}/api/health/ready?verify=v566-${nonce}`, { cache:'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-style-post-directions'), 'v566')
assert.equal(ready.headers.get('x-lien-customer-appointment-history'), 'v565')
assert.equal(ready.headers.get('x-lien-customer-chart-attachments'), 'v564')
assert.equal(ready.headers.get('x-lien-daily-sales-print-fit'), 'v563')

const client = await fetch(`${baseUrl}/admin-community-publishing-v566.js?v=566-${nonce}`, { cache:'no-store' })
assert.equal(client.status, 200)
const clientSource = await client.text()
assert.match(clientSource, /__lienStylePostDirectionsV566/)
assert.match(clientSource, /direction:'FRONT'/)
assert.match(clientSource, /direction:'SIDE'/)
assert.match(clientSource, /direction:'BACK'/)
assert.match(clientSource, /3方向を公開/)

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method:'POST',
  redirect:'manual',
  headers:{ Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded' },
  body:new URLSearchParams({ email:'demo.owner', password:'LienDemo2026!', next:'/admin/community' }),
})
assert.ok([302, 303].includes(login.status), `owner login failed: ${login.status}`)
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(cookie, /^lien_admin_session=/)

const methodCheck = await fetch(`${baseUrl}/api/lien-community-publish`, {
  headers:{ Cookie:cookie, Origin:baseUrl, Accept:'application/json' },
})
assert.equal(methodCheck.status, 405)
assert.match(methodCheck.headers.get('allow') || '', /POST/)

const unauthorized = await fetch(`${baseUrl}/api/lien-community-publish`, {
  method:'POST',
  headers:{ Origin:baseUrl, 'Content-Type':'application/json' },
  body:JSON.stringify({}),
})
assert.equal(unauthorized.status, 401)

console.log(JSON.stringify({ release:'style-post-directions-v566', production:true, readOnly:true }))
