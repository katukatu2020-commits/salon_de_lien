import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

function sessionCookie(response) {
  return (response.headers.get('set-cookie') || '').split(';')[0]
}

const ready = await fetch(`${baseUrl}/api/health/ready`, { cache: 'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-customer-account-lifecycle'), 'v532')
assert.equal(ready.headers.get('x-lien-billing-display-mask'), 'v531')
assert.equal(ready.headers.get('x-lien-customer-home-menu-order'), 'v530')
assert.equal(ready.headers.get('x-lien-customer-desktop-frontend'), 'v529')
assert.equal(ready.headers.get('x-lien-customer-home-branding'), 'v528')
assert.equal(ready.headers.get('x-lien-line-booking-ui-parity'), 'v527')

const login = await fetch(`${baseUrl}/api/customer-auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/profile' }),
})
assert.equal(login.status, 303)
let cookie = sessionCookie(login)
assert.match(cookie, /^[^=]+=/)

const storesResponse = await fetch(`${baseUrl}/api/lien-customer-stores`, {
  headers: { Cookie: cookie, 'Cache-Control': 'no-cache' },
  cache: 'no-store',
})
assert.equal(storesResponse.status, 200)
const storesPayload = await storesResponse.json()
const originalStore = storesPayload.stores.find((store) => store.current)
const targetStore = storesPayload.stores.find((store) => store.linked && !store.current)
assert.ok(originalStore && targetStore, 'linked-store smoke fixtures are unavailable')

const switchResponse = await fetch(`${baseUrl}/api/lien-customer-stores`, {
  method: 'POST',
  headers: { Cookie: cookie, Origin: baseUrl, 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'switch', organizationId: targetStore.organizationId }),
})
assert.equal(switchResponse.status, 200)
cookie = sessionCookie(switchResponse) || cookie

const readNickname = async () => {
  const response = await fetch(`${baseUrl}/api/lien-customer-nickname`, {
    headers: { Cookie: cookie, 'Cache-Control': 'no-cache' },
    cache: 'no-store',
  })
  assert.equal(response.status, 200)
  return response.json()
}

const initialNickname = await readNickname()
assert.equal(typeof initialNickname.nickname, 'string')
assert.ok(initialNickname.nickname.trim(), 'demo customer nickname fixture is empty')

const saveNickname = await fetch(`${baseUrl}/api/lien-customer-nickname`, {
  method: 'POST',
  headers: { Cookie: cookie, Origin: baseUrl, 'Content-Type': 'application/json' },
  body: JSON.stringify({ nickname: initialNickname.nickname }),
})
assert.equal(saveNickname.status, 200)
assert.equal((await saveNickname.json()).nickname, initialNickname.nickname)
assert.equal((await readNickname()).nickname, initialNickname.nickname)

const profile = await fetch(`${baseUrl}/u/profile`, {
  redirect: 'manual',
  headers: { Cookie: cookie, 'Cache-Control': 'no-cache' },
  cache: 'no-store',
})
assert.equal(profile.status, 200)
const profileHtml = await profile.text()
assert.match(profileHtml, /\/api\/customer-auth\/withdrawal\/request/)
assert.match(profileHtml, /name="email"/)

const registration = await fetch(`${baseUrl}/u/register`, {
  headers: { 'Cache-Control': 'no-cache' },
  cache: 'no-store',
})
assert.equal(registration.status, 200)
const registrationHtml = await registration.text()
assert.match(registrationHtml, /\/api\/customer-auth\/registration-link\/request/)
assert.match(registrationHtml, /name="email"/)

console.log(JSON.stringify({
  release: 'customer-account-lifecycle-v532',
  ready: ready.status,
  linkedStore: targetStore.name,
  nicknamePersisted: true,
  withdrawalAvailable: true,
  registrationAvailable: true,
}))
