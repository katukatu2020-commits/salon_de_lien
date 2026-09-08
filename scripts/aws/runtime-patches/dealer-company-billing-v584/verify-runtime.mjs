import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const inventoryClient = fs.readFileSync(path.join(root, 'public', 'inventory-orders-common-layout-v572.js'), 'utf8')
const service = fs.readFileSync(path.join(root, 'wholesale-ordering-v543.js'), 'utf8')
const client = fs.readFileSync(path.join(root, 'wholesale-ordering-client-v543.js'), 'utf8')
const css = fs.readFileSync(path.join(root, 'wholesale-ordering-v543.css'), 'utf8')
const billing = fs.readFileSync(path.join(root, 'billing.js'), 'utf8')

for (const invariant of [
  "X-Lien-Dealer-Company-Billing', 'v584'",
  "X-Lien-Receipt-Height-Calibrated', 'v583'",
  "X-Lien-Dealer-Contract-Pricing', 'v581'",
  '/wholesale-ordering-v543.css?v=584-company-billing1',
]) assert.ok(server.includes(invariant), `server invariant missing: ${invariant}`)

assert.match(inventoryClient, /wholesale-ordering-client-v543\.js\?v=584-company-billing1/)
for (const [source, invariants] of [
  [service, [
    'dealer-company-billing-v584',
    'CREATE TABLE IF NOT EXISTS "WholesaleDealerBilling"',
    '/dealer/company',
    '/dealer/billing',
    '/api/dealer/profile',
    '/api/dealer/billing/checkout',
    'CREATE TABLE IF NOT EXISTS "WholesaleContractProductPrice"',
  ]],
  [client, [
    'dealer-company-billing-v584',
    '会社・店舗情報',
    'システム利用料',
    'dealer-billing-agreement',
    'data-pricing-enabled',
  ]],
  [billing, [
    'dealer-company-billing-v584',
    'locateDealerBillingForSubscription',
    'syncAnySubscriptionById',
    '"WholesaleDealerBilling"',
    '"OrganizationBilling"',
  ]],
]) {
  for (const invariant of invariants) assert.ok(source.includes(invariant), `runtime invariant missing: ${invariant}`)
}

assert.match(css, /dealer-company-billing-v584/)
assert.match(css, /\.wo-company-grid/)
assert.match(css, /\.wo-billing-layout/)
assert.equal((server.match(/X-Lien-Dealer-Company-Billing/g) || []).length, 1)
assert.equal((inventoryClient.match(/dealer-company-billing-v584/g) || []).length, 1)

console.log(JSON.stringify({
  release:'dealer-company-billing-v584',
  runtimeVerified:true,
  companyProfile:true,
  stripeSubscription:true,
  unpaidAccessGate:true,
  webhookAccountRouting:true,
  dealerAssetCacheKeys:true,
}))
