import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = { 'Cache-Control': 'no-cache', 'User-Agent': 'ORIMIA-line-booking-ui-parity-v527-smoke/1.0' }

const ready = await fetch(`${baseUrl}/api/health/ready`, { headers })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-line-booking-ui-parity'), 'v527')
assert.equal(ready.headers.get('x-lien-shift-grid-synchronization'), 'v526')
assert.equal(ready.headers.get('x-lien-customer-booking-transition'), 'v524')

const page = await fetch(`${baseUrl}/line/booking/LIEN-YOHAKU`, { headers })
assert.equal(page.status, 200)
assert.match(page.headers.get('content-security-policy') || '', /line-scdn\.net/)
const html = await page.text()
assert.match(html, /data-line-booking-ui-parity="v527"/)
assert.match(html, /ORIMIA for Salon/)
assert.match(html, /選択中のメニュー/)
assert.match(html, /メニューとスタイリストを選択/)
assert.match(html, /id="availabilityTable"/)
assert.match(html, /id="bottomHistory"/)
assert.match(html, /\/api\/lien-line-booking\/book/)
assert.match(html, /\/api\/lien-line-booking\/history/)
assert.doesNotMatch(html, /<span class="mark">L<\/span>/)

const unauthenticated = await fetch(`${baseUrl}/api/lien-line-booking/config?store=LIEN-YOHAKU`, { headers })
assert.equal(unauthenticated.status, 401)

console.log(JSON.stringify({ release: 'line-booking-ui-parity-v527', ready: ready.status, page: page.status, unauthenticated: unauthenticated.status }))
