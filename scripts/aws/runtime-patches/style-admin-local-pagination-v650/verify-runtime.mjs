import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const mode = process.argv[2] || 'verify'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const server = read('server.js')
const client = read('public/style-admin-controls-v618.js')

if (mode === 'snapshot') {
  assert.match(server, /X-Lien-Style-Admin-Scroll-Stability', 'v649'/)
  assert.match(server, /style-admin-controls-v618\.js\?v=649-scroll1/)
  assert.match(client, /window\.__orimiaStyleAdminScrollStabilityV649 = true/)
  assert.match(client, /writeListFilters\(next\)\s+loadList\(\{ paginationViewportV649 \}\)/)
  assert.doesNotMatch(client, /__orimiaStyleAdminLocalPaginationV650/)
  console.log(JSON.stringify({ release: 'style-admin-local-pagination-v650', mode, parent: 'v649', ok: true }))
  process.exit(0)
}

assert.match(server, /X-Lien-Style-Admin-Local-Pagination', 'v650'/)
assert.match(server, /style-admin-controls-v618\.js\?v=650-local1/)
assert.match(client, /window\.__orimiaStyleAdminLocalPaginationV650 = true/)
assert.match(client, /loadList\(\{ paginationViewportV649, requestedPageV650: next\.page \}\)/)
assert.match(client, /filters\.page = options\.requestedPageV650/)
assert.match(client, /if \(!options\.requestedPageV650\) writeListFilters\(canonical, false\)/)
assert.doesNotMatch(client, /writeListFilters\(next\)\s+loadList\(\{ paginationViewportV649 \}\)/)

console.log(JSON.stringify({ release: 'style-admin-local-pagination-v650', mode, localPageState: true, urlNavigationRemoved: true, v649LayoutHoldPreserved: true }))
