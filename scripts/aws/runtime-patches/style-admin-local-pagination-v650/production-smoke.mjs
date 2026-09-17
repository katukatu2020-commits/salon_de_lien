import assert from 'node:assert/strict'

const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(base + '/api/health/ready', { cache: 'no-store' })
assert.equal(ready.status, 200)
for (const [header, value] of [
  ['x-lien-style-admin-local-pagination', 'v650'],
  ['x-lien-style-admin-scroll-stability', 'v649'],
  ['x-lien-business-application-rejection', 'v648'],
  ['x-lien-style-admin-pagination', 'v647'],
]) assert.equal(ready.headers.get(header), value, `${header} is not ready`)

const client = await fetch(base + '/style-admin-controls-v618.js?v=650-local1', { cache: 'no-store' })
assert.equal(client.status, 200)
const source = await client.text()
assert.match(source, /window\.__orimiaStyleAdminLocalPaginationV650 = true/)
assert.match(source, /requestedPageV650: next\.page/)
assert.match(source, /filters\.page = options\.requestedPageV650/)
assert.doesNotMatch(source, /writeListFilters\(next\)\s+loadList\(\{ paginationViewportV649 \}\)/)

const page = await fetch(base + '/admin/community', { cache: 'no-store', redirect: 'manual' })
assert.ok([302, 303, 307, 308].includes(page.status), `Protected style page returned ${page.status}`)

const api = await fetch(base + '/api/lien-style-admin-v618', { cache: 'no-store', redirect: 'manual' })
assert.equal(api.status, 401)

console.log(JSON.stringify({
  release: 'style-admin-local-pagination-v650',
  productionSmokeVerified: true,
  releaseHeadersVerified: true,
  localPaginationRuntimeVerified: true,
  protectedRoutesVerified: true,
}))
