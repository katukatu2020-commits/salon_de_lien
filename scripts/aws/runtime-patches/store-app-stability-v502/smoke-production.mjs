import assert from 'node:assert/strict'

await import('../store-app-stability-v501/smoke-production.mjs')

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = { 'Cache-Control': 'no-cache', 'User-Agent': 'ORIMIA-store-app-cache-v502-smoke/1.0' }
const ready = await fetch(`${baseUrl}/api/health/ready`, { headers })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-store-app-stability'), 'v501')
assert.equal(ready.headers.get('x-lien-store-app-cache-activation'), 'v502')

const login = await fetch(`${baseUrl}/admin/login?store-cache-smoke=v502`, {
  redirect: 'manual',
  headers: { ...headers, Accept: 'text/html' },
})
assert.equal(login.status, 200)
const html = await login.text()
assert.match(html, /\/_next\/static\/chunks\/app\/layout-runtime-v502\.js/)
assert.doesNotMatch(html, /\/_next\/static\/chunks\/app\/layout-runtime-v450\.js/)

const chunk = await fetch(`${baseUrl}/_next/static/chunks/app/layout-runtime-v502.js`, { headers })
assert.equal(chunk.status, 200)
const source = await chunk.text()
assert.match(source, /store-app-stability-v502-inline/)
assert.match(source, /window\.__storeAppStabilityV501/)
assert.match(source, /window\.__orimiaBrandV501/)
assert.match(source, /DOMContentLoaded/)
assert.doesNotMatch(source, /store-app-stability-v501-loader/)

console.log(JSON.stringify({ cacheActivation: 'v502', htmlChunk: 'layout-runtime-v502.js' }))
