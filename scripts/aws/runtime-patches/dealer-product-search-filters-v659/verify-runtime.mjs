import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const snapshot = process.argv[2] === 'snapshot'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const server = read('server.js')
const dealerService = read('wholesale-ordering-v543.js')
const dealerClient = read('wholesale-ordering-client-v543.js')
const dealerCss = read('wholesale-ordering-v543.css')

assert.match(server, /X-Lien-Dealer-Monthly-Calendar', 'v658'/)
assert.match(dealerService, /dealer-monthly-calendar-v658/)

if (snapshot) {
  assert.doesNotMatch(server, /X-Lien-Dealer-Product-Search-Filters/)
  assert.doesNotMatch(dealerService, /dealerSearchVariantsV659/)
  assert.doesNotMatch(dealerClient, /pricingSelection: new Set/)
  assert.doesNotMatch(dealerCss, /dealer-product-search-filters-v659/)
  console.log(JSON.stringify({ snapshot: true, parent: 'v658' }))
  process.exit(0)
}

assert.match(server, /X-Lien-Dealer-Product-Search-Filters', 'v659'/)
assert.match(dealerService, /function dealerSearchVariantsV659/)
assert.match(dealerService, /dealerHalfKanaMapV659/)
assert.match(dealerService, /jsonb_array_elements_text\(\$2::jsonb\)/)
assert.match(dealerService, /productManufacturer/)
assert.match(dealerService, /pricingManufacturer/)
assert.match(dealerService, /COALESCE\("category",''\)=\$4/)
assert.match(dealerService, /productFilters:/)
assert.match(dealerService, /wholesale-ordering-client-v543\.js\?v=659-product-search-filters1/)
assert.match(dealerService, /wholesale-ordering-v543\.css\?v=659-product-search-filters1/)

assert.match(dealerClient, /productManufacturer:/)
assert.match(dealerClient, /pricingCategory:/)
assert.match(dealerClient, /pricingSelection: new Set/)
assert.match(dealerClient, /id="dealer-product-manufacturer-filter"/)
assert.match(dealerClient, /id="dealer-pricing-category-filter"/)
assert.match(dealerClient, /data-pricing-selected/)
assert.match(dealerClient, /data-pricing-enabled/)
assert.match(dealerClient, /data-action="select-visible-pricing"/)
assert.match(dealerClient, /data-action="clear-pricing-selection"/)
assert.match(dealerClient, /dealer\.pricingSelection\.add/)
assert.match(dealerClient, /dealer\.pricingSelection\.clear/)

assert.match(dealerCss, /dealer-product-search-filters-v659/)
assert.match(dealerCss, /\.wo-product-filters-v659/)
assert.match(dealerCss, /\.wo-pricing-selection-v659/)
assert.match(dealerCss, /#dealer-pricing-form/)
assert.match(dealerCss, /@media \(max-width: 620px\)/)

let depth = 0
for (let index = 0; index < dealerCss.length; index += 1) {
  if (dealerCss[index] === '{') depth += 1
  if (dealerCss[index] === '}') {
    depth -= 1
    assert.ok(depth >= 0, `unexpected closing CSS brace at ${index}`)
  }
}
assert.equal(depth, 0, 'dealer stylesheet braces must balance')

console.log(JSON.stringify({
  release: 'dealer-product-search-filters-v659',
  runtimeVerified: true,
  halfwidthKanaSearch: true,
  manufacturerAndCategoryFilters: true,
  independentBulkSelection: true,
}))
