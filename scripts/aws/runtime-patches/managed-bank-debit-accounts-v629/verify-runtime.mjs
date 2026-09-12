import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const manifestPath = '/tmp/managed-bank-debit-accounts-v629-changes.json'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const count = (source, value) => source.split(value).length - 1

assert.ok(fs.existsSync(manifestPath), 'v629 change manifest is missing')
const changes = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
assert.deepEqual(
  [...new Set(changes.map(change => change.file))].sort(),
  [
    '.next/server/app/admin/login/page.js',
    '.next/server/app/admin/owner-analytics/page.js',
    '.next/server/app/api/auth/login/route.js',
    'audience-sites.js',
    'billing.js',
    'managed-account-access-v629.js',
    'platform-operator.js',
    'server.js',
    'wholesale-ordering-client-v543.js',
    'wholesale-ordering-v543.js',
  ],
  'v629 modified an unexpected runtime file',
)

const server = read('server.js')
const billing = read('billing.js')
const audience = read('audience-sites.js')
const platform = read('platform-operator.js')
const managed = read('managed-account-access-v629.js')
const adminLoginRoute = read('.next/server/app/api/auth/login/route.js')
const adminLogin = read('.next/server/app/admin/login/page.js')
const ownerAnalytics = read('.next/server/app/admin/owner-analytics/page.js')
const wholesale = read('wholesale-ordering-v543.js')
const wholesaleClient = read('wholesale-ordering-client-v543.js')
const migration = fs.readFileSync('/tmp/lien-v629/migrate-existing-billing.mjs', 'utf8')

assert.equal(count(server, 'X-Lien-Managed-Bank-Accounts'), 1)
assert.match(server, /X-Lien-Managed-Bank-Accounts', 'v629'/)
assert.match(server, /createManagedAccountAccessService/)
assert.match(server, /await managedAccountAccessV629\.ensureSchema\(\)/)
assert.ok(server.indexOf('managedAccountAccessV629.handle') < server.indexOf('platformOperator.handle'), 'managed routes must precede the platform catch-all')
assert.match(server, /X-Lien-List-Pagination', 'v628'/)

assert.match(platform, /href="\/platform\/accounts">アカウント発行/)
assert.match(platform, /pageShell,/)
assert.doesNotMatch(platform, /データの変更機能を持たない運営者権限画面/)

assert.match(billing, /async function enforceAccess\(\) \{\s+return false/)
assert.match(billing, /url\.pathname === '\/admin\/register'/)
assert.match(billing, /\/admin\/login\?managed=1/)
assert.match(billing, /paymentMethod: 'bank_debit'/)
assert.match(billing, /BANK_DEBIT_MANAGED/)
const billingHandle = billing.slice(billing.indexOf('  async function handle(req, res, url) {'), billing.indexOf('  return {\n    ensureSchema,'))
assert.doesNotMatch(billingHandle, /handleWebhook|handleCheckout|handlePortal|handlePlanChange|registrationPage|registerOrganization/)
assert.match(billingHandle, /startsWith\('\/api\/admin\/billing\/'\)/)
assert.match(billingHandle, /ignored: true, paymentMethod: 'bank_debit'/)

assert.equal(count(adminLogin, '運営発行ID'), 2)
assert.doesNotMatch(adminLogin, /新規店舗登録はこちら|href:"\/admin\/register"/)
assert.match(adminLogin, /美容室アカウントは、契約確認後にORIMIA運営が発行します/)
assert.match(adminLoginRoute, /loginId:\{equals:f,mode:"insensitive"\}/)
assert.doesNotMatch(adminLoginRoute, /OR:\[\{email:\{equals:f,mode:"insensitive"\}\},\{loginId:/)
assert.doesNotMatch(ownerAnalytics, /href: "\/admin\/owner-analytics\?section=billing"/)
assert.match(ownerAnalytics, /grid w-full grid-cols-2 gap-1/)

assert.doesNotMatch(audience, /link\('\/dealer\/register'/)
assert.doesNotMatch(audience, /onboarding \? '\/admin\/register'/)
assert.match(audience, /銀行口座振替/)
assert.match(audience, /運営発行ID/)

assert.match(managed, /CREATE TABLE IF NOT EXISTS "ManagedAccountIssue"/)
assert.match(managed, /managed_account_issue_v629/)
assert.match(managed, /INSERT INTO "OrganizationBilling"[\s\S]*BANK_DEBIT_MANAGED/)
assert.match(managed, /INSERT INTO "WholesaleDealerBilling"[\s\S]*BANK_DEBIT_MANAGED/)
assert.match(managed, /operatorSession\(req\)/)
assert.match(managed, /validSameOrigin\(req\)/)
assert.match(managed, /運営発行ID/)

assert.match(migration, /sk_test_/)
assert.match(migration, /Live Stripe subscription detected/)
assert.match(migration, /stripe\.subscriptions\.cancel\(subscriptionId, \{ invoice_now: false, prorate: false \}\)/)
assert.equal(count(migration, '"stripeSubscriptionId"=NULL'), 2)
assert.match(migration, /managed_bank_debit_migration_v629/)

assert.match(wholesale, /<span>運営発行ID<\/span>/)
assert.match(wholesale, /LOWER\("loginId"\)=LOWER\(\$1\) LIMIT 1/)
assert.doesNotMatch(wholesale, /<span>ログインIDまたはメールアドレス<\/span>/)
assert.doesNotMatch(wholesale, /href="\/dealer\/register"/)
assert.doesNotMatch(wholesale, /\['billing', '\/dealer\/billing'/)
assert.match(wholesale, /pathname === '\/dealer\/billing'[\s\S]{0,180}redirect\(res, '\/dealer\/orders'/)
assert.match(wholesale, /pathname\.startsWith\('\/api\/dealer\/billing\/'\)/)
assert.match(wholesale, /function dealerBillingAllowed\(\) \{\s+return true/)
assert.equal(count(wholesale, "'BANK_DEBIT_MANAGED','active'"), 2)
assert.doesNotMatch(wholesaleClient, /dealerBilling|\/dealer\/billing|start-billing-checkout|open-billing-portal|pollDealerBilling|Stripe|クレジットカード/)

console.log(JSON.stringify({
  release: 'managed-bank-debit-accounts-v629',
  runtimeVerified: true,
  publicBusinessRegistrationDisabled: true,
  cardOnboardingDisabled: true,
  operatorIssuanceEnabled: true,
  paymentMethod: 'bank_debit',
  changedRuntimeFiles: 10,
}))
