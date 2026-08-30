import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(`${baseUrl}/api/health/ready`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-product-catalog-stability'), 'v495')
assert.equal(ready.headers.get('x-lien-customer-registration-filter'), 'v496')

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/customers' }),
})
assert.equal(login.status, 303)
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(cookie, /^[^=]+=/)

async function customerPage(query = '') {
  const response = await fetch(`${baseUrl}/admin/customers${query}`, {
    headers: { cookie, Accept: 'text/html', 'Cache-Control': 'no-cache' },
  })
  assert.equal(response.status, 200)
  return response.text()
}

const all = await customerPage('?registration=all')
assert.match(all, /顧客登録状態で絞り込み/)
assert.match(all, /アプリ登録済み/)
assert.match(all, /仮カルテ/)
assert.match(all, /data-customer-registration-filter="registered"/)
assert.match(all, /data-customer-registration-filter="provisional"/)

const registered = await customerPage('?registration=registered')
assert.match(registered, /data-customer-registration="registered"/)
assert.doesNotMatch(registered, /data-customer-registration="provisional"/)
assert.match(registered, /name="registration" value="registered"/)

const provisional = await customerPage('?registration=provisional')
assert.match(provisional, /data-customer-registration="provisional"/)
assert.doesNotMatch(provisional, /data-customer-registration="registered"/)
assert.match(provisional, /name="registration" value="provisional"/)

console.log(JSON.stringify({
  ready: ready.status,
  all: true,
  registered: true,
  provisional: true,
}))
