import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { Readable } from 'node:stream'
const require = createRequire('/app/package.json')
const { createBillingService } = require('/app/billing.js')
Object.assign(process.env, {
  NODE_ENV: 'production', APP_URL: 'https://registration-test.invalid', BILLING_ONBOARDING_ENABLED: 'true',
  STRIPE_SECRET_KEY: 'sk_test_local_only', STRIPE_WEBHOOK_SECRET: 'whsec_local_only',
  STRIPE_PRICE_UME: 'price_ume', STRIPE_PRICE_TAKE: 'price_take', STRIPE_PRICE_MATSU: 'price_matsu',
  ADMIN_AUTH_SECRET: 'local-store-registration-test-secret-at-least-32-characters',
})
const token = 'v'.repeat(43)
const plans = ['ume', 'take', 'matsu'].map((planKey, index) => ({ planKey, displayName: ['梅', '竹', '松'][index], monthlyAmount: [5500, 8800, 13200][index], staffLimit: index === 2 ? null : (index + 1) * 3, customerLimit: index === 2 ? null : (index + 1) * 300, smsLimit: (index + 1) * 100 }))
let knownAccount = false
let sentMail = null
let writes = 0
const prisma = {
  async $queryRawUnsafe(sql, ...args) {
    if (sql.includes('FROM "StoreRegistrationVerification"')) return args[0] === crypto.createHash('sha256').update(token).digest('hex') ? [{ id: 'verification', email: 'owner@example.invalid' }] : []
    if (sql.includes('FROM "BillingPlan"')) return plans
    if (sql.includes('FROM "AppUser"')) return knownAccount ? [{ id: 'existing' }] : []
    throw new Error('Unexpected query: ' + sql)
  },
  async $executeRawUnsafe() { writes++; return 1 },
  async $transaction(fn) { return fn(prisma) },
}
const service = createBillingService({ prisma, crypto, sessionProvider: async () => null, registrationMailSender: async value => { sentMail = value } })
let requestId = 0
async function request(route, body) {
  const req = Readable.from(body ? [Buffer.from(new URLSearchParams(body).toString())] : [])
  req.method = body ? 'POST' : 'GET'
  req.headers = { origin: process.env.APP_URL, host: 'registration-test.invalid', 'content-type': 'application/x-www-form-urlencoded', 'x-forwarded-for': `192.0.2.${++requestId}` }
  req.socket = { encrypted: true, remoteAddress: '127.0.0.1' }
  const res = { headers: {}, setHeader(name, value) { this.headers[name.toLowerCase()] = value }, end(value) { this.body = value } }
  assert.equal(await service.handle(req, res, new URL(route, process.env.APP_URL)), true)
  return res
}
const out = '/tmp/lien-v592-fixtures'
fs.mkdirSync(out, { recursive: true })
const dealerSource = fs.readFileSync('/app/wholesale-ordering-v543.js', 'utf8')
const dealerDocument = vm.runInNewContext(dealerSource + '\n;dealerRegistrationRequestPage({})', { require, module: { exports: {} }, __dirname: '/app', process, Buffer, URL })
fs.writeFileSync(`${out}/dealer.html`, dealerDocument)
const documents = {}
for (const [name, route, expected] of [
  ['entry', '/admin/register', '登録メールアドレス'],
  ['sent', '/admin/register?sent=1', '確認メールを送信しました'],
  ['registered', '/admin/register?registered=1', 'このメールアドレスは登録済みです'],
  ['error', '/admin/register?error=input', '入力内容を確認してください'],
  ['expired', '/admin/register?token=invalid', '確認リンクが無効か'],
  ['setup', '/admin/register?token=' + token, '店舗・オーナー情報'],
]) {
  const response = await request(route)
  assert.equal(response.statusCode, 200)
  assert(response.body.includes(expected))
  assert(response.body.includes('data-store-registration="v592"'))
  assert(response.body.includes('/wholesale-ordering-v543.css?v=585-product-ui1'))
  assert(!response.body.includes('registrationIntro'))
  assert(!response.body.includes('benefitCard'))
  documents[name] = response.body
  fs.writeFileSync(`${out}/${name}.html`, response.body)
}
assert(documents.entry.includes('action="/admin/register"'))
assert(documents.entry.includes('確認用URLは60分間'))
assert(!documents.entry.includes(' disabled'))
assert(documents.entry.includes('maxlength="254"'))
for (const field of ['verificationToken', 'organizationName', 'slug', 'displayName', 'password', 'storeLoginId', 'storePassword', 'planKey', 'termsAccepted']) assert(documents.setup.includes(`name="${field}"`), field)
assert(documents.setup.includes('value="' + token + '"'))
assert.equal((documents.setup.match(/type="radio"/g) || []).length, 3)
assert(documents.setup.includes('無料トライアル'))
assert(documents.setup.includes('Stripe'))
assert.equal(writes, 0, 'viewing registration must not write data')
const invalid = await request('/admin/register', { email: 'invalid' })
assert.equal(invalid.statusCode, 303)
assert.equal(invalid.headers.location, '/admin/register?error=input')
assert.equal(writes, 0)
const post = await request('/admin/register', { email: 'owner@example.invalid' })
assert.equal(post.statusCode, 303)
assert.equal(post.headers.location, '/admin/register?sent=1')
assert.equal(sentMail.to, 'owner@example.invalid')
assert.equal(sentMail.expiresMinutes, 60)
assert(sentMail.verificationUrl.startsWith(process.env.APP_URL + '/admin/register?token='))
assert.equal(writes, 2, 'only invalidate/create the verification, not an organization')
knownAccount = true
assert.equal((await request('/admin/register', { email: 'owner@example.invalid' })).headers.location, '/admin/register?registered=1')
process.env.BILLING_ONBOARDING_ENABLED = 'false'
const disabled = await request('/admin/register')
assert.equal(disabled.statusCode, 503)
assert(disabled.body.includes(' disabled'))
fs.writeFileSync(`${out}/disabled.html`, disabled.body)
console.log(JSON.stringify({ release: 'store-registration-layout-v592', states: 7, verifiedFormPreserved: true, mailContractPreserved: true, viewHasNoSideEffects: true, noExternalMailOrStripe: true }))
