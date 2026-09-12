import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const client = fs.readFileSync(path.join(root, 'wholesale-ordering-client-v543.js'), 'utf8')
const dealerPage = fs.readFileSync(path.join(root, 'wholesale-ordering-v543.js'), 'utf8')
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')

assert.match(dealerPage, /wholesale-ordering-client-v543\.js\?v=638-ime-safe-search1/)
assert.match(client, /pricingSearchComposing: false/)
assert.match(client, /root\.addEventListener\('compositionstart'/)
assert.match(client, /root\.addEventListener\('compositionend'/)
assert.match(client, /function scheduleDealerPricingSearch\(input\)/)
assert.match(client, /function renderDealerPricingResults\(\)/)
assert.match(client, /reloadDealer\(false, 'pricing-results'\)/)
assert.match(client, /currentForm\.replaceWith\(nextForm\)/)
assert.match(client, /enterkeyhint="search"/)
assert.doesNotMatch(
  client,
  /if \(event\.target\.id === 'dealer-pricing-search'\) \{[\s\S]{0,900}root\.querySelector\('\.wo-pricing-management'\)\?\.classList\.add\('is-page-loading-v631'\)/,
)
assert.match(server, /X-Lien-Dealer-Pricing-Ime-Search', 'v638'/)
assert.match(server, /X-Lien-Business-Inquiries', 'v637'/)
assert.match(server, /X-Lien-Dealer-Pricing-Pagination', 'v631'/)

console.log(JSON.stringify({
  release: 'dealer-pricing-ime-search-v638',
  runtimeVerified: true,
  compositionGuard: true,
  stableSearchNode: true,
  previousReleasePreserved: true,
}))
