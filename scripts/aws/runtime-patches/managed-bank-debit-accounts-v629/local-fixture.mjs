import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { Readable } from 'node:stream'

const require = createRequire(import.meta.url)
const crypto = require('node:crypto')
const { createManagedAccountAccessService } = require('./managed-account-access-v629.js')

process.env.APP_URL = 'https://salon-de-lien.com'

function request(method, pathname, body = '', authorized = true, origin = 'https://salon-de-lien.com') {
  const req = Readable.from(body ? [Buffer.from(body)] : [])
  req.method = method
  req.url = pathname
  req.authorized = authorized
  req.headers = { host: 'salon-de-lien.com', origin, 'x-forwarded-proto': 'https' }
  req.socket = {}
  return req
}

function response() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value },
    end(value) { if (value) this.body += Buffer.isBuffer(value) ? value.toString('utf8') : String(value) },
  }
}

const executions = []
const queries = []
const prisma = {
  async $executeRawUnsafe(sql, ...params) {
    executions.push({ sql: String(sql), params })
    return 1
  },
  async $queryRawUnsafe(sql, ...params) {
    const source = String(sql)
    queries.push({ sql: source, params })
    if (source.includes('FROM "ManagedAccountIssue"')) return []
    if (source.includes('FROM "BillingPlan"')) return [{ planKey: params[0] }]
    if (source.includes('pg_advisory_xact_lock')) return [{ locked: true }]
    if (source.includes('FROM "AppUser"') || source.includes('FROM "WholesaleDealer"')) return []
    return []
  },
  async $transaction(callback) { return callback(this) },
}

const service = createManagedAccountAccessService({
  prisma,
  crypto,
  operatorSession: req => req.authorized ? { subject: 'operator@example.jp' } : null,
  renderPage: (title, body) => '<!doctype html><title>' + title + '</title>' + body,
})

await service.ensureSchema()
assert.ok(executions.some(entry => entry.sql.includes('CREATE TABLE IF NOT EXISTS "ManagedAccountIssue"')))
const salonMigration = executions.find(entry => entry.sql.includes('UPDATE "OrganizationBilling"') && entry.sql.includes('BANK_DEBIT_MANAGED'))
const dealerMigration = executions.find(entry => entry.sql.includes('UPDATE "WholesaleDealerBilling"') && entry.sql.includes('BANK_DEBIT_MANAGED'))
assert.ok(salonMigration)
assert.ok(dealerMigration)
assert.doesNotMatch(salonMigration.sql, /WHERE "stripeSubscriptionId" IS NULL/)
assert.doesNotMatch(dealerMigration.sql, /WHERE "stripeSubscriptionId" IS NULL/)

{
  const req = request('GET', '/platform/accounts', '', false)
  const res = response()
  assert.equal(await service.handle(req, res, new URL(req.url, process.env.APP_URL)), true)
  assert.equal(res.statusCode, 302)
  assert.equal(res.headers.location, '/platform/login')
}

{
  const req = request('GET', '/platform/accounts')
  const res = response()
  await service.handle(req, res, new URL(req.url, process.env.APP_URL))
  assert.equal(res.statusCode, 200)
  assert.match(res.body, /アカウント発行/)
  assert.match(res.body, /運営発行ID/)
  assert.match(res.body, /銀行口座振替/)
  assert.doesNotMatch(res.body, /Stripe/)
  assert.match(res.body, /action="\/api\/platform\/accounts\/salon"/)
  assert.match(res.body, /action="\/api\/platform\/accounts\/dealer"/)
}

{
  const body = new URLSearchParams({
    organizationName: '検証サロン',
    displayName: '検証 オーナー',
    loginId: 'salon-issued-01',
    email: 'salon@example.jp',
    password: 'temporary-password-01',
    planKey: 'take',
  }).toString()
  const req = request('POST', '/api/platform/accounts/salon', body)
  const res = response()
  await service.handle(req, res, new URL(req.url, process.env.APP_URL))
  assert.equal(res.statusCode, 303)
  assert.match(res.headers.location, /created=salon&loginId=salon-issued-01/)
  assert.ok(executions.some(entry => entry.sql.includes('INSERT INTO "OrganizationBilling"') && entry.sql.includes('BANK_DEBIT_MANAGED')))
  const userInsert = executions.find(entry => entry.sql.includes('INSERT INTO "AppUser"'))
  assert.equal(userInsert.params[3], 'salon-issued-01')
  assert.match(userInsert.params[5], /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/)
  assert.notEqual(userInsert.params[5], 'temporary-password-01')
}

{
  const body = new URLSearchParams({
    dealerName: '検証ディーラー',
    representativeName: '検証 担当者',
    loginId: 'dealer-issued-01',
    email: 'dealer@example.jp',
    password: 'temporary-password-02',
  }).toString()
  const req = request('POST', '/api/platform/accounts/dealer', body)
  const res = response()
  await service.handle(req, res, new URL(req.url, process.env.APP_URL))
  assert.equal(res.statusCode, 303)
  assert.match(res.headers.location, /created=dealer&loginId=dealer-issued-01/)
  assert.ok(executions.some(entry => entry.sql.includes('INSERT INTO "WholesaleDealerBilling"') && entry.sql.includes('BANK_DEBIT_MANAGED')))
  const dealerInsert = executions.find(entry => entry.sql.includes('INSERT INTO "WholesaleDealer"'))
  assert.equal(dealerInsert.params[3], 'dealer-issued-01')
  assert.match(dealerInsert.params[6], /^DLR-[0-9A-F]{12}$/)
}

{
  const req = request('POST', '/api/platform/accounts/salon', 'loginId=invalid id', true, 'https://attacker.invalid')
  const res = response()
  await service.handle(req, res, new URL(req.url, process.env.APP_URL))
  assert.equal(res.statusCode, 303)
  assert.equal(res.headers.location, '/platform/accounts?error=input')
}

assert.ok(queries.filter(entry => entry.sql.includes('managed_account_issue_v629')).length >= 2)
console.log(JSON.stringify({ release: 'managed-bank-debit-accounts-v629', localFixtureVerified: true, issuedAccountTypes: ['salon', 'dealer'] }))
