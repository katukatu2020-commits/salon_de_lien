import assert from 'node:assert/strict'

const baseUrl = String(process.env.BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const response = await fetch(`${baseUrl}/content-edit-delete-client-v466.js`, { redirect: 'manual' })
assert.equal(response.status, 200)
assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
const source = await response.text()
assert.match(source, /window\.__lienContentEditDeleteV466/)
assert.match(source, /lien:chat-rendered/)
assert.doesNotMatch(source, /new MutationObserver\(schedule\)/)

const ready = await fetch(`${baseUrl}/api/health/ready`)
assert.equal(ready.status, 200)
assert.equal((await ready.json()).status, 'ready')

console.log(`customer chat stability v466 production smoke passed (${baseUrl})`)
