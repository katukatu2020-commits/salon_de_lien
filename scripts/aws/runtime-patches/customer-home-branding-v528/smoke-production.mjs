import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = { 'Cache-Control': 'no-cache', 'User-Agent': 'ORIMIA-customer-home-branding-v528-smoke/1.0' }

const ready = await fetch(`${baseUrl}/api/health/ready`, { headers, cache: 'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-customer-home-branding'), 'v528')
assert.equal(ready.headers.get('x-lien-line-booking-ui-parity'), 'v527')
assert.equal(ready.headers.get('x-lien-shift-grid-synchronization'), 'v526')

const settingsApi = await fetch(`${baseUrl}/api/lien-customer-home-branding?audience=staff`, { headers, cache: 'no-store', redirect: 'manual' })
assert.equal(settingsApi.status, 401)
const settingsPayload = await settingsApi.json()
assert.match(String(settingsPayload.error || ''), /ログイン/)

const imageApi = await fetch(`${baseUrl}/api/lien-customer-home-branding/image?audience=customer`, { headers, cache: 'no-store', redirect: 'manual' })
assert.equal(imageApi.status, 401)

const customerHome = await fetch(`${baseUrl}/u/home`, { headers, cache: 'no-store', redirect: 'manual' })
assert.ok([302, 303, 307, 308].includes(customerHome.status))
assert.match(String(customerHome.headers.get('location') || ''), /\/u\/login/)

const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { ...headers, Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/settings' }),
})
assert.equal(adminLogin.status, 303)
const adminCookie = (adminLogin.headers.get('set-cookie') || '').split(';')[0]
assert.match(adminCookie, /^[^=]+=/)
const authenticatedSettings = await fetch(`${baseUrl}/api/lien-customer-home-branding?audience=staff`, { headers: { ...headers, cookie: adminCookie }, cache: 'no-store' })
assert.equal(authenticatedSettings.status, 200)
const branding = (await authenticatedSettings.json()).branding
assert.equal(typeof branding.phrase, 'string')
assert.ok(branding.phrase.length > 0)
assert.match(String(branding.imageUrl || ''), /^(?:\/brand\/|\/api\/lien-customer-home-branding\/image)/)
const settingsClient = await fetch(`${baseUrl}/tenant-setup-client.js?v=528-smoke`, { headers: { ...headers, cookie: adminCookie }, cache: 'no-store' })
assert.equal(settingsClient.status, 200)
assert.match(await settingsClient.text(), /window\.__orimiaCustomerHomeBrandingV528/)

const customerLogin = await fetch(`${baseUrl}/api/customer-auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { ...headers, Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/home' }),
})
assert.equal(customerLogin.status, 303)
const customerCookie = (customerLogin.headers.get('set-cookie') || '').split(';')[0]
assert.match(customerCookie, /^[^=]+=/)
const authenticatedHome = await fetch(`${baseUrl}/u/home?home-branding-smoke=v528`, { headers: { ...headers, cookie: customerCookie }, cache: 'no-store' })
assert.equal(authenticatedHome.status, 200)
const homeHtml = await authenticatedHome.text()
assert.match(homeHtml, /data-customer-home-branding="v528"/)
assert.match(homeHtml, /quick-service-icon/)
assert.equal((homeHtml.match(/class="quick-card"/g) || []).length, 9)
for (const label of ['予約する', 'キャンペーン', 'マイページ', 'クーポン', '登録済みの店舗', 'スタンプカード', 'ヘアスタイル', '私に合うアイテム', 'お客様の声']) {
  assert.match(homeHtml, new RegExp(label))
}

console.log(JSON.stringify({ release: 'customer-home-branding-v528', ready: ready.status, unauthenticated: settingsApi.status, adminSettings: authenticatedSettings.status, customerHome: authenticatedHome.status, quickCards: 9 }))
