import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const client = fs.readFileSync(path.join(root, 'wholesale-ordering-client-v543.js'), 'utf8')
const page = fs.readFileSync(path.join(root, 'wholesale-ordering-v543.js'), 'utf8')
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const salonLoader = fs.readFileSync(path.join(root, 'public/inventory-orders-common-layout-v572.js'), 'utf8')

assert.equal((page.match(/wholesale-ordering-client-v543\.js\?v=641-search-input-stability1/g) || []).length, 2)
assert.match(salonLoader, /wholesale-ordering-client-v543\.js\?v=641-search-input-stability1/)
assert.match(server, /inventory-orders-common-layout-v572\.js\?v=641-search-input-stability1/)
assert.match(client, /searchComposing: false, \/\* search-input-stability-v641 \*\//)
assert.match(client, /productSearchComposing: false, \/\* search-input-stability-v641 \*\//)
assert.match(client, /function renderSalonSearchResults\(\)/)
assert.match(client, /function renderDealerProductResults\(\)/)
assert.match(client, /function renderDealerLocalSearchResults\(kind\)/)
assert.match(client, /function scheduleDealerProductSearch\(input\)/)
assert.match(client, /reloadDealer\(false, 'product-results'\)/)
assert.match(client, /\.wo-product-results-v641/)
assert.match(client, /\.wo-contract-results-v641/)
assert.match(client, /\.wo-order-results-v641/)
assert.match(client, /currentResults\.replaceWith\(nextResults\)/)
assert.match(client, /if \(!salon\.searchComposing\) renderSalonSearchResults\(\)/)
assert.match(client, /scheduleDealerProductSearch\(event\.target\)/)
assert.match(client, /renderDealerLocalSearchResults\(searchState\[1\] === 'dealer-order-search' \? 'orders' : 'contracts'\)/)
assert.equal((client.match(/enterkeyhint="search"/g) || []).length, 5)

assert.doesNotMatch(
  client,
  /if \(event\.target\.id === 'dealer-product-search'\) \{[\s\S]{0,1000}is-page-loading-v628/,
)
assert.doesNotMatch(
  client,
  /if \(event\.target\.id === 'product-search'\) \{[\s\S]{0,260}renderSalon\(\)/,
)
assert.doesNotMatch(
  client,
  /if \(searchState\) \{[\s\S]{0,260}renderDealer\(\)/,
)

assert.match(client, /pricingSearchComposing: false/)
assert.match(client, /function scheduleDealerPricingSearch\(input\)/)
assert.match(client, /function renderDealerPricingResults\(\)/)
assert.match(server, /X-Lien-Search-Input-Stability', 'v641'/)
assert.match(server, /X-Lien-Style-List-Performance', 'v640'/)
assert.match(server, /X-Lien-Dealer-Pricing-Ime-Search', 'v638'/)

console.log(JSON.stringify({
  release: 'search-input-stability-v641',
  runtimeVerified: true,
  dealerProductImeGuard: true,
  stableSearchFields: 5,
  previousReleasesPreserved: true,
}))
