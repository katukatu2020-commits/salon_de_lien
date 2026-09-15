import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const server = read('server.js')
const service = read('style-admin-controls-v618.js')
const adminClient = read('public/style-admin-controls-v618.js')
const customerService = read('style-community-controls-v610.js')

assert.match(service, /const PAGE_SIZE = 15 \/\* style-admin-pagination-v647 \*\//)
assert.doesNotMatch(service, /const PAGE_SIZE = 12 \/\* style-list-performance-v640 \*\//)
assert.match(customerService, /const PAGE_SIZE = 12 \/\* style-list-performance-v640 \*\//)
assert.match(adminClient, /window\.__orimiaStyleAdminPaginationV647 = true/)
assert.doesNotMatch(adminClient, /listRoot\.scrollIntoView\(/)
assert.match(adminClient, /data-page-v618/)
assert.match(adminClient, /writeListFilters\(next\)\s+loadList\(\{ preserveViewport: true \}\)/)
assert.match(adminClient, /function restorePaginationViewportV647\(top\)/)
assert.match(adminClient, /const preservedScrollYV647 = options\.preserveViewport \? window\.scrollY : null/)
assert.match(server, /style-admin-controls-v618\.js\?v=647-pagination1/)
assert.match(server, /X-Lien-Style-Admin-Pagination', 'v647'/)
assert.match(server, /X-Lien-Dealer-Password-Change', 'v646'/)
assert.match(server, /X-Lien-Style-List-Performance', 'v640'/)

console.log(JSON.stringify({
  release: 'style-admin-pagination-v647',
  runtimeVerified: true,
  staffPageSize: 15,
  customerPageSize: 12,
  forcedPaginationScrollRemoved: true,
}))
