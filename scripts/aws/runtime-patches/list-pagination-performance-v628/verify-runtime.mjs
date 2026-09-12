import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const manifestPath = '/tmp/list-pagination-performance-v628-changes.json'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const count = (source, value) => source.split(value).length - 1

assert.ok(fs.existsSync(manifestPath), 'v628 change manifest is missing')
const changes = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
assert.deepEqual(
  [...new Set(changes.map(change => change.file))].sort(),
  [
    'public/style-admin-controls-v618.css',
    'public/style-admin-controls-v618.js',
    'server.js',
    'style-admin-controls-v618.js',
    'wholesale-ordering-client-v543.js',
    'wholesale-ordering-v543.css',
    'wholesale-ordering-v543.js',
  ],
  'v628 modified an unexpected runtime file',
)

const server = read('server.js')
const wholesale = read('wholesale-ordering-v543.js')
const wholesaleClient = read('wholesale-ordering-client-v543.js')
const wholesaleCss = read('wholesale-ordering-v543.css')
const styleService = read('style-admin-controls-v618.js')
const styleClient = read('public/style-admin-controls-v618.js')
const styleCss = read('public/style-admin-controls-v618.css')

assert.equal(count(server, 'X-Lien-List-Pagination'), 1)
assert.match(server, /X-Lien-List-Pagination', 'v628'/)
assert.match(server, /X-Lien-Password-Visibility', 'v627'/)
assert.match(server, /style-admin-controls-v618\.css\?v=628-pagination1/)
assert.match(server, /style-admin-controls-v618\.js\?v=628-pagination1/)

assert.equal(count(wholesale, 'const DEALER_PRODUCT_PAGE_SIZE = 30'), 1)
assert.match(wholesale, /async function dealerBootstrap\(session, url\)/)
assert.match(wholesale, /productPageMode = Boolean/)
assert.match(wholesale, /COUNT\(\*\)::int AS "count"/)
assert.match(wholesale, /LIMIT \$3 OFFSET \$4/)
assert.match(wholesale, /productPagination: productResult\.pagination/)
assert.match(wholesale, /productPageMode\s*\? Promise\.resolve\(\[\]\)/)
assert.match(wholesale, /dealerBootstrap\(session, url\)/)
assert.match(wholesale, /wholesale-ordering-v543\.css\?v=628-pagination1/)
assert.match(wholesale, /wholesale-ordering-client-v543\.js\?v=628-pagination1/)
assert.doesNotMatch(wholesale, /async function dealerBootstrap\(session\) \{/)

assert.match(wholesaleClient, /function syncDealerProductUrl\(\)/)
assert.match(wholesaleClient, /data-action="dealer-product-page"/)
assert.match(wholesaleClient, /productSearchTimer = setTimeout/)
assert.match(wholesaleClient, /bootstrapParams\.set\('view', 'products'\)/)
assert.match(wholesaleClient, /productLoadId/)
assert.match(wholesaleClient, /is-page-loading-v628/)
assert.doesNotMatch(wholesaleClient, /const products = dealer\.data\.products\.filter\(function \(product\) \{\n      if \(!product\.active\) return false/)

assert.equal(count(wholesaleCss, 'list-pagination-performance-v628: dealer product catalog'), 1)
assert.match(wholesaleCss, /\.wo-list-pager-v628/)
assert.match(wholesaleCss, /@media \(max-width: 620px\)/)

assert.equal(count(styleService, 'const PAGE_SIZE = 20'), 1)
assert.doesNotMatch(styleService, /const PAGE_SIZE = 50/)
assert.match(styleClient, /let listAbortController = null/)
assert.match(styleClient, /new AbortController\(\)/)
assert.match(styleClient, /signal: controller\.signal/)
assert.match(styleClient, /activateAfterHydrationV628/)
assert.doesNotMatch(styleClient, /setTimeout\(activateList, 3000\)/)
assert.match(styleClient, /index > 3/)
assert.equal(count(styleCss, 'list-pagination-performance-v628: style catalog'), 1)
assert.match(styleCss, /content-visibility: auto/)

console.log(JSON.stringify({
  release: 'list-pagination-performance-v628',
  runtimeVerified: true,
  dealerPageSize: 30,
  stylePageSize: 20,
  changedRuntimeFiles: 7,
  productPageOmitsOrderAndPricingPayloads: true,
}))
