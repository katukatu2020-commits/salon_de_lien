import assert from 'node:assert/strict'

const baseUrl = process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com'

const ready = await fetch(`${baseUrl}/api/health/ready`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(ready.status, 200)

const client = await fetch(`${baseUrl}/content-edit-delete-client-v477.js?smoke=v477`, {
  headers: { 'Cache-Control': 'no-cache' },
})
assert.equal(client.status, 200)
const source = await client.text()
assert.match(source, /__lienStyleCommunityControlsV477/)
assert.match(source, /new MutationObserver/)
assert.match(source, /communityRouteObserver\.observe/)
assert.match(source, /void enhanceCommunityList\(\)/)

console.log('style community route production smoke passed')
