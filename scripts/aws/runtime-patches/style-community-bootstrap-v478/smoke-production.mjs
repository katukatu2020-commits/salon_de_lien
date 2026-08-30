import assert from 'node:assert/strict'

const baseUrl = process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com'

function cookie(response) {
  return (response.headers.get('set-cookie') || '').split(';')[0]
}

const ready = await fetch(`${baseUrl}/api/health/ready`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(ready.status, 200)

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/customers' }),
})
assert.equal(login.status, 303)

const page = await fetch(`${baseUrl}/admin/customers?smoke=v478`, {
  headers: { cookie: cookie(login), 'Cache-Control': 'no-cache' },
})
assert.equal(page.status, 200)
const html = await page.text()
assert.match(html, /content-edit-delete-client-v477\.js/)
assert.match(html, /data-lien-community-bootstrap/)

const client = await fetch(`${baseUrl}/content-edit-delete-client-v477.js?smoke=v478`, {
  headers: { 'Cache-Control': 'no-cache' },
})
assert.equal(client.status, 200)
const source = await client.text()
assert.match(source, /new MutationObserver/)
assert.match(source, /void enhanceCommunityList\(\)/)

console.log('style community bootstrap production smoke passed')
