import assert from 'node:assert/strict'

const baseUrl = (process.env.BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = { 'Cache-Control': 'no-cache', 'User-Agent': 'ORIMIA-campaign-image-crop-v519-smoke/1.0' }

const health = await fetch(`${baseUrl}/api/health/ready`, { headers })
assert.equal(health.ok, true)
assert.equal(health.headers.get('x-lien-campaign-image-crop'), 'v519')
assert.equal(health.headers.get('x-lien-shell-consistency'), 'v518')

const runtimeResponse = await fetch(`${baseUrl}/customer-link-ui-v293.js?v=519`, { headers })
assert.equal(runtimeResponse.ok, true)
const runtime = await runtimeResponse.text()
assert.match(runtime, /campaign-image-crop-v519/)
assert.match(runtime, /input\.id === 'campaign-image'/)
assert.match(runtime, /modal\('画像を正方形に調整'/)

console.log(JSON.stringify({ baseUrl, release: 'campaign-image-crop-v519', ready: true }))
