import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3150').replace(/\/$/, '')

const ready = await fetch(`${baseUrl}/api/health/ready?integration=v574`, { cache:'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-customer-booking-check'), 'v574')
assert.equal(ready.headers.get('x-lien-admin-home-visual'), 'v573')
assert.equal(ready.headers.get('x-lien-customer-experience'), 'v508')

const login = await fetch(`${baseUrl}/api/customer-auth/login`, {
  method:'POST',
  redirect:'manual',
  headers:{ Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded' },
  body:new URLSearchParams({ loginId:'demo.hana', password:'Mypage2026!', next:'/u/appointments' }),
})
assert.ok([302, 303].includes(login.status), `customer login failed with ${login.status}`)
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(cookie, /^lien_customer_session=/)

const appointments = await fetch(`${baseUrl}/u/appointments?integration=v574`, {
  headers:{ Cookie:cookie, Accept:'text/html', 'Cache-Control':'no-cache' },
})
assert.equal(appointments.status, 200)
const html = await appointments.text()
assert.match(html, /customer-experience-v508\.css\?v=574-booking-check1/)
assert.doesNotMatch(html, /customer-experience-v508\.css\?v=508["']/)

const stylesheet = await fetch(`${baseUrl}/customer-experience-v508.css?v=574-booking-check1`, {
  headers:{ 'Cache-Control':'no-cache' },
})
assert.equal(stylesheet.status, 200)
const css = await stylesheet.text()
assert.match(css, /customer-booking-check-v574/)
assert.match(css, /button\.cx-slot-confirmed-v508 > \.cx-slot-check-v508/)
assert.match(css, /position:\s*absolute !important/)
assert.match(css, /place-items:\s*center !important/)

console.log(JSON.stringify({
  release:'customer-booking-check-v574',
  integration:true,
  customerBooking:true,
  cacheBusted:true,
  readOnly:true,
}))
