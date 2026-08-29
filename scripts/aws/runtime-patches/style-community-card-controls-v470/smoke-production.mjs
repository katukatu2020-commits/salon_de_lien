import assert from 'node:assert/strict'

const baseUrl = String(process.env.BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const asset = await fetch(`${baseUrl}/content-edit-delete-client-v470.js`, { redirect: 'manual' })
assert.equal(asset.status, 200)
assert.equal(asset.headers.get('x-content-type-options'), 'nosniff')
const source = await asset.text()
assert.match(source, /window\.__lienStyleCommunityControlsV470/)
assert.match(source, /lien-style-card__footer/)
assert.doesNotMatch(source, /投稿の公開管理/)
assert.match(source, /data-lien-comment-id/)
assert.doesNotMatch(source, /new MutationObserver/)

const unauthenticated = await fetch(`${baseUrl}/api/lien-content-management?audience=staff&scope=posts`, { redirect: 'manual' })
assert.equal(unauthenticated.status, 401)

const ready = await fetch(`${baseUrl}/api/health/ready`)
assert.equal(ready.status, 200)
assert.equal((await ready.json()).status, 'ready')

console.log(`style community card controls v470 production smoke passed (${baseUrl})`)
