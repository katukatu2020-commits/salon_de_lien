import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = { 'Cache-Control': 'no-cache', 'User-Agent': 'ORIMIA-public-brand-icon-v511-smoke/1.0' }

const ready = await fetch(`${baseUrl}/api/health/ready`, { headers })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-public-brand-icon'), 'v511')
assert.equal(ready.headers.get('x-lien-broadcast-layout'), 'v510')
assert.equal(ready.headers.get('x-lien-chat-message-ux'), 'v509')
assert.equal(ready.headers.get('x-lien-customer-experience'), 'v508')

const page = await fetch(`${baseUrl}/?smoke=v511`, { headers })
assert.equal(page.status, 200)
const html = await page.text()
assert.match(html, /<a class="wordmark" href="\/" aria-label="ORIMIA トップ">/)
assert.match(html, /<span class="mark" aria-hidden="true"><img src="\/brand\/orimia-icon-192\.png\?v=511"/)
assert.match(html, /\.mark img\{display:block;width:100%;height:100%;object-fit:contain\}/)
assert.doesNotMatch(html, /<span class="mark">L<\/span>/)

const icon = await fetch(`${baseUrl}/brand/orimia-icon-192.png?v=511&smoke=v511`, { headers })
assert.equal(icon.status, 200)
assert.match(icon.headers.get('content-type') || '', /^image\/png(?:;|$)/)
assert.ok((await icon.arrayBuffer()).byteLength > 10_000)

console.log(JSON.stringify({
  baseUrl,
  brand: 'ORIMIA',
  headerIcon: 'rainbow-hair',
  legacyLetterMark: false,
  homeLinkPreserved: true,
}, null, 2))
