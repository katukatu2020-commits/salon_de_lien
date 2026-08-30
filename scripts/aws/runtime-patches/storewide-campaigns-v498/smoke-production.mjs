import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(`${baseUrl}/api/health/ready`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-attendance-history-editor'), 'v497')
assert.equal(ready.headers.get('x-lien-storewide-campaigns'), 'v498')

const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/customers/messages/campaigns' }),
})
assert.equal(adminLogin.status, 303)
const adminCookie = (adminLogin.headers.get('set-cookie') || '').split(';')[0]
assert.match(adminCookie, /^[^=]+=/)

const adminPage = await fetch(`${baseUrl}/admin/customers/messages/campaigns`, {
  headers: { cookie: adminCookie, Accept: 'text/html', 'Cache-Control': 'no-cache' },
})
assert.equal(adminPage.status, 200)
const adminHtml = await adminPage.text()
assert.match(adminHtml, /公開対象：この店舗を登録しているすべてのお客様/)
for (const removed of ['name="audienceGender"', 'name="audienceMinAge"', 'name="audienceMaxAge"']) {
  assert.ok(!adminHtml.includes(removed), `${removed} must not be rendered`)
}

const customerLogin = await fetch(`${baseUrl}/api/customer-auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/campaigns' }),
})
assert.equal(customerLogin.status, 303)
const customerCookie = (customerLogin.headers.get('set-cookie') || '').split(';')[0]
assert.match(customerCookie, /^[^=]+=/)

for (const pathname of ['/u/home', '/u/campaigns']) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    redirect: 'manual',
    headers: { cookie: customerCookie, Accept: 'text/html', 'Cache-Control': 'no-cache' },
  })
  assert.equal(response.status, 200, `${pathname} must remain available`)
}

console.log(JSON.stringify({ ready: ready.status, admin: adminPage.status, customer: 200 }))
