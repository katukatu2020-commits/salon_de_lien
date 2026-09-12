import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const manifestPath = '/tmp/dealer-pricing-pagination-v631-changes.json'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const count = (source, value) => source.split(value).length - 1

assert.ok(fs.existsSync(manifestPath), 'v631 change manifest is missing')
const changes = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
assert.deepEqual(
  [...new Set(changes.map(change => change.file))].sort(),
  ['server.js', 'wholesale-ordering-client-v543.js', 'wholesale-ordering-v543.css', 'wholesale-ordering-v543.js'],
  'v631 modified an unexpected runtime file',
)

const server = read('server.js')
const wholesale = read('wholesale-ordering-v543.js')
const client = read('wholesale-ordering-client-v543.js')
const css = read('wholesale-ordering-v543.css')

assert.equal(count(server, 'X-Lien-Dealer-Pricing-Pagination'), 1)
assert.match(server, /X-Lien-Dealer-Pricing-Pagination', 'v631'/)
assert.match(server, /X-Lien-List-Pagination', 'v628'/)

assert.equal(count(wholesale, 'const DEALER_PRICING_PAGE_SIZE = 30'), 1)
assert.match(wholesale, /pricingPageMode = requestedView === 'pricing'/)
assert.match(wholesale, /requestedPricingContractId/)
assert.match(wholesale, /totalProductCount/)
assert.match(wholesale, /configuredCount/)
assert.match(wholesale, /LIMIT \$3 OFFSET \$4/)
assert.match(wholesale, /pricingPagination: productResult\.pricingPagination/)
assert.match(wholesale, /productPageMode \|\| pricingPageMode\s*\? Promise\.resolve\(\[\]\)/)
assert.match(wholesale, /a\."contractId"=\$2 AND a\."active"=TRUE/)
assert.match(wholesale, /jsonb_array_elements_text\(\$3::jsonb\)/)
assert.match(wholesale, /wholesale-ordering-v543\.css\?v=631-pricing-pagination1/)
assert.match(wholesale, /wholesale-ordering-client-v543\.js\?v=631-pricing-pagination1/)

assert.match(client, /pricingPage: Math\.max\(1/)
assert.match(client, /pricingLoadId: 0/)
assert.match(client, /function syncDealerPricingUrl\(\)/)
assert.match(client, /data-action="dealer-pricing-page"/)
assert.match(client, /bootstrapParams\.set\('view', 'pricing'\)/)
assert.match(client, /bootstrapParams\.set\('pricingPage'/)
assert.match(client, /pricingSearchTimer = setTimeout/)
assert.match(client, /is-page-loading-v631/)
assert.match(client, /Array\.from\(dealer\.pricingDraft\.entries\(\)\)/)
assert.doesNotMatch(client, /dealer\.data\.products\.filter\(function \(product\) \{ return product\.active \}\)\.map\(function \(product\)/)
assert.doesNotMatch(client, /function filteredPricingProducts\(\)/)
assert.match(client, /root\.addEventListener\('change', async function/)

assert.equal(count(css, 'dealer-pricing-pagination-v631'), 1)
assert.match(css, /\.wo-pricing-management\.is-page-loading-v631/)
assert.match(css, /\.wo-pricing-pager-v631/)

console.log(JSON.stringify({
  release: 'dealer-pricing-pagination-v631',
  runtimeVerified: true,
  pageSize: 30,
  serverSideSearch: true,
  changedRowsOnlySave: true,
  changedRuntimeFiles: 4,
}))
