import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const expected = [
  ['予約する', '/u/appointments'],
  ['ヘアスタイル', '/u/community'],
  ['私に合うアイテム', '/u/catalog'],
  ['クーポン', '/u/coupons'],
  ['マイページ', '/u/profile'],
  ['スタンプカード', '/u/stamps'],
  ['キャンペーン', '/u/campaigns'],
  ['お客様の声', '/u/reviews'],
  ['登録済みの店舗', '/u/stores'],
]

const ready = await fetch(`${baseUrl}/api/health/ready`, { cache: 'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-customer-home-menu-order'), 'v530')
assert.equal(ready.headers.get('x-lien-customer-desktop-frontend'), 'v529')
assert.equal(ready.headers.get('x-lien-customer-home-branding'), 'v528')
assert.equal(ready.headers.get('x-lien-line-booking-ui-parity'), 'v527')

const login = await fetch(`${baseUrl}/api/customer-auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/home' }),
})
assert.ok([302, 303].includes(login.status), `customer login failed with ${login.status}`)
const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
assert.ok(cookie.includes('lien_customer_session='))

const home = await fetch(`${baseUrl}/u/home`, { headers: { Cookie: cookie }, cache: 'no-store' })
assert.equal(home.status, 200)
const html = await home.text()
let previousIndex = -1
for (const [label, href] of expected) {
  const token = `<a class="quick-card" href="${href}" aria-label="${label}">`
  const index = html.indexOf(token)
  assert.ok(index > previousIndex, `${label} is missing or out of order`)
  previousIndex = index
}

console.log(JSON.stringify({ release: 'customer-home-menu-order-v530', ready: ready.status, home: home.status, shortcuts: expected.length }))
