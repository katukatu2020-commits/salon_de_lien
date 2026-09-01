import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

function cookiesFrom(response) {
  return response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
}

const ready = await fetch(`${baseUrl}/api/health/ready`, { cache: 'no-store' })
assert.equal(ready.status, 200)
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
const cookie = cookiesFrom(login)
assert.ok(cookie.includes('lien_customer_session='))

const [home, appointments, standaloneClient, nextClient] = await Promise.all([
  fetch(`${baseUrl}/u/home`, { headers: { Cookie: cookie }, cache: 'no-store' }),
  fetch(`${baseUrl}/u/appointments`, { headers: { Cookie: cookie }, cache: 'no-store' }),
  fetch(`${baseUrl}/customer-experience-v503.js?v=529-release1`, { cache: 'no-store' }),
  fetch(`${baseUrl}/customer-experience-v508.js?v=529-release1`, { cache: 'no-store' }),
])
assert.equal(home.status, 200)
assert.equal(appointments.status, 200)
assert.equal(standaloneClient.status, 200)
assert.equal(nextClient.status, 200)
const homeHtml = await home.text()
const appointmentsHtml = await appointments.text()
const standaloneScript = await standaloneClient.text()
const nextScript = await nextClient.text()
assert.match(homeHtml, /customer-experience-v503\.js\?v=529-release1/)
assert.match(homeHtml, /data-customer-home-branding="v528"/)
assert.match(appointmentsHtml, /customer-native-route-shell/)
for (const script of [standaloneScript, nextScript]) {
  assert.match(script, /window\.__orimiaCustomerDesktopV529/)
  assert.match(script, /orimia-customer-desktop-nav-v529/)
  assert.match(script, /@media \(min-width:1024px\)/)
}

console.log(JSON.stringify({ release: 'customer-desktop-frontend-v529', ready: ready.status, home: home.status, appointments: appointments.status, desktopClients: 2 }))
