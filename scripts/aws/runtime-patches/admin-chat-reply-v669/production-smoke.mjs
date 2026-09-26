import assert from 'node:assert/strict'

const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const ready = await fetch(`${base}/api/health/ready`, { cache: 'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-admin-chat-reply'), 'v669')
assert.equal(ready.headers.get('x-lien-customer-store-frequency'), 'v668')

const asset = await fetch(`${base}/admin-chat-reply-client-v669.js?v=669-release1`, { cache: 'no-store' })
assert.equal(asset.status, 200)
assert.match(asset.headers.get('content-type') || '', /javascript/)
assert.match(await asset.text(), /chatReplyContext = 'v669'/)

console.log(JSON.stringify({ release: 'admin-chat-reply-v669', ready: true, asset: true }))
