import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const nonce = Date.now()
const ready = await fetch(`${baseUrl}/api/health/ready?verify=v567-${nonce}`, { cache:'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-customer-chart-delete'), 'v567')
assert.equal(ready.headers.get('x-lien-style-post-directions'), 'v566')
assert.equal(ready.headers.get('x-lien-customer-appointment-history'), 'v565')
assert.equal(ready.headers.get('x-lien-customer-chart-attachments'), 'v564')
assert.equal(ready.headers.get('x-lien-daily-sales-print-fit'), 'v563')
assert.equal(ready.headers.get('x-lien-salon-records-controls'), 'v561')

const asset = await fetch(`${baseUrl}/commercial-admin-v101.js?verify=v567-${nonce}`, { cache:'no-store' })
assert.equal(asset.status, 200)
const source = await asset.text()
assert.match(source, /__lienCustomerChartAttachmentDeleteV567/)
assert.match(source, /data-chart-delete-confirm/)
assert.match(source, /このカルテファイルを完全に削除することを確認しました/)
assert.match(source, /method:'DELETE'/)

const anonymousDelete = await fetch(`${baseUrl}/api/admin/customers/v567-read-only/chart-photos/v567-missing`, {
  method:'DELETE',
  headers:{ Origin:baseUrl, Accept:'application/json' },
})
assert.equal(anonymousDelete.status, 401)

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method:'POST',
  redirect:'manual',
  headers:{ Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded' },
  body:new URLSearchParams({ email:'demo.owner', password:'LienDemo2026!', next:'/admin/customers' }),
})
assert.ok([302, 303].includes(login.status), `owner login failed: ${login.status}`)
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(cookie, /^lien_admin_session=/)

const missingCustomer = await fetch(`${baseUrl}/api/admin/customers/v567-read-only/chart-photos/v567-missing`, {
  method:'DELETE',
  headers:{ Cookie:cookie, Origin:baseUrl, Accept:'application/json', 'Cache-Control':'no-cache' },
})
assert.equal(missingCustomer.status, 404)
const missingPayload = await missingCustomer.json()
assert.match(missingPayload.error, /顧客カルテ/)

console.log(JSON.stringify({ release:'customer-chart-attachment-delete-v567', production:true, readOnly:true }))
