import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || path.dirname(fileURLToPath(import.meta.url))
const servicePath = path.join(root, 'wholesale-ordering-v543.js')
const service = fs.readFileSync(servicePath, 'utf8')
const client = fs.readFileSync(path.join(root, 'wholesale-ordering-client-v543.js'), 'utf8')
const css = fs.readFileSync(path.join(root, 'wholesale-ordering-v543.css'), 'utf8')
const billing = fs.readFileSync(path.join(root, 'billing.js'), 'utf8')
const billingHelpersStart = service.indexOf('function positiveInteger')
const billingHelpersEnd = service.indexOf('function stripeObjectId')
assert.ok(billingHelpersStart >= 0 && billingHelpersEnd > billingHelpersStart)
const { buildDealerCheckoutParams, dealerBillingConfig } = Function(
  'process',
  `'use strict'; const DEALER_PLAN_KEY='dealer'; ${service.slice(billingHelpersStart, billingHelpersEnd)}; return { buildDealerCheckoutParams, dealerBillingConfig }`,
)(process)

const config = dealerBillingConfig({
  DEALER_BILLING_ONBOARDING_ENABLED:'true',
  STRIPE_SECRET_KEY:'sk_test_runtime_v584',
  STRIPE_WEBHOOK_SECRET:'whsec_runtime_v584',
  STRIPE_PRICE_DEALER:'price_dealer_v584',
  APP_URL:'https://example.test',
  NODE_ENV:'production',
  DEALER_MONTHLY_AMOUNT:'9800',
  DEALER_SUBSCRIPTION_TRIAL_DAYS:'30',
})
assert.equal(config.ready, true)
assert.equal(config.priceId, 'price_dealer_v584')
assert.equal(config.monthlyAmount, 9800)

const checkout = buildDealerCheckoutParams({
  appUrl:'https://example.test',
  customerId:'cus_v584',
  dealerId:'dealer_v584',
  priceId:'price_dealer_v584',
  trialDays:30,
})
assert.equal(checkout.mode, 'subscription')
assert.equal(checkout.payment_method_collection, 'always')
assert.deepEqual(checkout.payment_method_types, ['card'])
assert.equal(checkout.subscription_data.trial_period_days, 30)
assert.equal(checkout.metadata.billingAccountType, 'dealer')
assert.equal(checkout.subscription_data.metadata.dealerId, 'dealer_v584')
assert.match(checkout.success_url, /^https:\/\/example\.test\/dealer\/billing\?checkout=success/)

for (const invariant of [
  'CREATE TABLE IF NOT EXISTS "WholesaleDealerBilling"',
  '"representativeName" TEXT',
  '"invoiceRegistrationNumber" TEXT',
  '/api/dealer/profile',
  '/api/dealer/billing/status',
  '/api/dealer/billing/checkout',
  '/api/dealer/billing/portal',
  'DEALER_BILLING_ALLOWED_STATUSES',
  "billingUrl: '/dealer/billing'",
  "['company', 'billing'].includes(dealerPageMatch[1])",
  "billingAccountType: 'dealer'",
  "payment_method_collection: 'always'",
]) assert.ok(service.includes(invariant), `service invariant missing: ${invariant}`)

for (const invariant of [
  '会社・店舗情報',
  'システム利用料',
  'dealer-company-form',
  'dealer-billing-agreement',
  'start-billing-checkout',
  'response.status === 402',
]) assert.ok(client.includes(invariant), `client invariant missing: ${invariant}`)

for (const invariant of [
  'locateDealerBillingForSubscription',
  'syncAnySubscriptionById',
  '"WholesaleDealerBilling"',
  "billingAccountType === 'dealer'",
  '"OrganizationBilling"',
]) assert.ok(billing.includes(invariant), `billing invariant missing: ${invariant}`)

assert.match(service, /UNIQUE\("contractId", "dealerProductId"\)/)
assert.match(service, /CHECK \("discountRate" BETWEEN 0 AND 100\)/)
assert.match(client, /return salon\.data\.catalogProducts \|\| \[\]/)
assert.doesNotMatch(client, /return local\.concat\(catalog\)/)
assert.match(css, /dealer-company-billing-v584/)
assert.match(css, /\.wo-company-grid/)
assert.match(css, /\.wo-billing-layout/)
assert.match(css, /grid-template-columns: repeat\(6, minmax\(0, 1fr\)\)/)

console.log(JSON.stringify({
  release:'dealer-company-billing-v584',
  sourceChecks:true,
  companyProfile:true,
  cardSubscription:true,
  paymentGate:true,
  webhookRouting:true,
  salonBillingPreserved:true,
}))
