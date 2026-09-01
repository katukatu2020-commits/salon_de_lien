import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { Readable } from 'node:stream'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { createCustomerStoreStaffService } = require('/app/customer-store-staff-v276.js')
const { createCustomerWithdrawalService } = require('/app/customer-withdrawal-v309.js')

function request(method, pathname, body = '', headers = {}) {
  const req = Readable.from(body ? [body] : [])
  req.method = method
  req.url = pathname
  req.headers = { host: 'salon-de-lien.com', 'x-forwarded-proto': 'https', ...headers }
  return req
}

function response() {
  return {
    statusCode: 200,
    headers: new Map(),
    body: '',
    setHeader(name, value) { this.headers.set(String(name).toLowerCase(), value) },
    end(value = '') { this.body += String(value) },
  }
}

const linkedSession = { userId: 'app-user-1', customerId: 'linked-customer-1', organizationId: 'linked-store-1' }
let nickname = 'はなちゃん'
const nicknameQueries = []
const nicknamePrisma = {
  async $queryRawUnsafe(sql, ...args) {
    nicknameQueries.push({ sql, args })
    if (sql.includes('SELECT u."id",u."nickname"')) return [{ id: linkedSession.userId, nickname }]
    return []
  },
  async $executeRawUnsafe(sql, ...args) {
    nicknameQueries.push({ sql, args })
    if (sql.includes('UPDATE "AppUser" SET "nickname"')) {
      nickname = args[0] || ''
      assert.equal(args[1], linkedSession.userId)
      return 1
    }
    return 0
  },
}

const storeService = createCustomerStoreStaffService({
  prisma: nicknamePrisma,
  staffSessionProvider: async () => null,
  customerSessionProvider: async () => linkedSession,
  renderCustomerShell: () => '',
})

const firstGet = response()
assert.equal(await storeService.handle(request('GET', '/api/lien-customer-nickname'), firstGet, new URL('https://salon-de-lien.com/api/lien-customer-nickname')), true)
assert.equal(firstGet.statusCode, 200)
assert.equal(JSON.parse(firstGet.body).nickname, 'はなちゃん')

const post = response()
await storeService.handle(
  request('POST', '/api/lien-customer-nickname', JSON.stringify({ nickname: '共通ニックネーム' }), { origin: 'https://salon-de-lien.com' }),
  post,
  new URL('https://salon-de-lien.com/api/lien-customer-nickname'),
)
assert.equal(post.statusCode, 200)
assert.equal(JSON.parse(post.body).nickname, '共通ニックネーム')

const secondGet = response()
await storeService.handle(request('GET', '/api/lien-customer-nickname'), secondGet, new URL('https://salon-de-lien.com/api/lien-customer-nickname'))
assert.equal(JSON.parse(secondGet.body).nickname, '共通ニックネーム')
assert.ok(nicknameQueries.some(entry => entry.sql.includes('CustomerStoreLink') && entry.args[1] === linkedSession.customerId && entry.args[2] === linkedSession.organizationId))

const executed = []
let withdrawalRequest = null
const withdrawalPrisma = {
  async $queryRawUnsafe(sql, ...args) {
    executed.push({ sql, args })
    if (sql.includes('SELECT u."id" AS "appUserId",u."email"')) {
      return [{ appUserId: linkedSession.userId, email: 'customer@example.com', customerId: linkedSession.customerId, name: '確認 顧客' }]
    }
    if (sql.includes('SELECT COUNT(*)::int AS count')) return [{ count: 0 }]
    if (sql.includes('FROM "CustomerWithdrawalRequest" wr')) {
      return withdrawalRequest ? [{ ...withdrawalRequest, deletedAt: null, active: true }] : []
    }
    return []
  },
  async $executeRawUnsafe(sql, ...args) {
    executed.push({ sql, args })
    return 0
  },
  async $transaction(callback) {
    return callback({
      $executeRawUnsafe: async (sql, ...args) => {
        executed.push({ sql, args })
        if (sql.includes('INSERT INTO "CustomerWithdrawalRequest"')) {
          withdrawalRequest = { id: args[0], customerId: args[1], appUserId: args[2], email: args[3], tokenHash: args[4], expiresAt: args[5], usedAt: null }
        }
        if (sql.includes('WHERE "id"=$1 AND "usedAt" IS NULL AND "expiresAt">NOW()')) return 1
        return 1
      },
    })
  },
}

const originalFetch = globalThis.fetch
const previousToken = process.env.POSTMARK_SERVER_TOKEN
const previousFrom = process.env.POSTMARK_FROM_EMAIL
let mailedToken = ''
process.env.POSTMARK_SERVER_TOKEN = 'test-token'
process.env.POSTMARK_FROM_EMAIL = 'noreply@example.com'
globalThis.fetch = async (_url, options) => {
  const payload = JSON.parse(options.body)
  assert.equal(payload.To, 'customer@example.com')
  const match = String(payload.TextBody).match(/\/u\/withdrawal\/([A-Za-z0-9_-]{43})/)
  assert.ok(match)
  mailedToken = match[1]
  return { ok: true, status: 200, async json() { return { ErrorCode: 0, MessageID: 'message-1' } } }
}

try {
  const withdrawalService = createCustomerWithdrawalService({ prisma: withdrawalPrisma, crypto, sessionProvider: async () => linkedSession })
  const requestResult = response()
  await withdrawalService.handle(
    request('POST', '/api/customer-auth/withdrawal/request', '', { origin: 'https://salon-de-lien.com' }),
    requestResult,
    new URL('https://salon-de-lien.com/api/customer-auth/withdrawal/request'),
  )
  assert.equal(requestResult.statusCode, 303)
  assert.equal(requestResult.headers.get('location'), 'https://salon-de-lien.com/u/profile?withdrawal=sent')
  assert.equal(withdrawalRequest.customerId, linkedSession.customerId)
  assert.equal(withdrawalRequest.appUserId, linkedSession.userId)
  assert.ok(executed.some(entry => entry.sql.includes('CustomerStoreLink') && entry.args[0] === linkedSession.userId))

  const confirmResult = response()
  await withdrawalService.handle(
    request('POST', '/api/customer-auth/withdrawal/confirm', new URLSearchParams({ token: mailedToken }).toString(), { origin: 'https://salon-de-lien.com' }),
    confirmResult,
    new URL('https://salon-de-lien.com/api/customer-auth/withdrawal/confirm'),
  )
  assert.equal(confirmResult.statusCode, 303)
  assert.equal(confirmResult.headers.get('location'), 'https://salon-de-lien.com/u/withdrawal/completed')
  assert.ok(executed.some(entry => entry.sql.includes('UPDATE "Customer" c') && entry.sql.includes('CustomerStoreLink')))
  assert.ok(executed.some(entry => entry.sql.includes('UPDATE "AppUser"') && entry.sql.includes('WHERE "id"=$1') && entry.args[0] === linkedSession.userId))
  assert.ok(executed.some(entry => entry.sql.includes('DELETE FROM "CustomerPhoneIdentity" p') && entry.sql.includes('CustomerStoreLink')))
  assert.ok(executed.some(entry => entry.sql.includes('UPDATE "CustomerPortalAccess" p') && entry.sql.includes('CustomerStoreLink')))
} finally {
  globalThis.fetch = originalFetch
  if (previousToken === undefined) delete process.env.POSTMARK_SERVER_TOKEN
  else process.env.POSTMARK_SERVER_TOKEN = previousToken
  if (previousFrom === undefined) delete process.env.POSTMARK_FROM_EMAIL
  else process.env.POSTMARK_FROM_EMAIL = previousFrom
}

console.log(JSON.stringify({ release: 'customer-account-lifecycle-v532', linkedNickname: true, linkedWithdrawal: true, accountWideConfirmation: true }))
