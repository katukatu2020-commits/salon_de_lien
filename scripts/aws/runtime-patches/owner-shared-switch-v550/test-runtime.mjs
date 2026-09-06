import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { COOKIE_NAME, createOwnerSharedSwitchService, signSharedSession } = require('./owner-shared-switch-v550.js')
const secret = 'owner-shared-switch-v550-test-secret-123456789'
const now = Date.now()
const owner = {
  userId: 'owner-1',
  role: 'ADMIN',
  organizationId: 'org-1',
  expiresAt: Math.floor(now / 1000) + 3600,
}
const shared = {
  id: 'shared-1',
  email: 'store@example.invalid',
  loginId: 'store-example',
  displayName: 'Example 店舗共通',
  role: 'STAFF',
  active: true,
}

function request(method, origin = 'https://salon-de-lien.com') {
  return {
    method,
    headers: {
      origin,
      host: 'internal-alb.local',
      'x-forwarded-host': 'internal-alb.local',
      'x-forwarded-proto': 'https',
    },
    socket: { encrypted: false },
  }
}

function response() {
  return {
    statusCode: 0,
    headers: {},
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value },
    end(value = '') { this.body = String(value) },
  }
}

function service(session, rows = [shared]) {
  return createOwnerSharedSwitchService({
    prisma: { async $queryRawUnsafe() { return rows } },
    crypto,
    staffSession: async () => session,
  })
}

function payload(res) {
  return JSON.parse(res.body || '{}')
}

const previousSecret = process.env.ADMIN_AUTH_SECRET
process.env.ADMIN_AUTH_SECRET = secret

const signed = signSharedSession({ crypto, secret, ownerSession: owner, account: shared, now })
const [body, signature] = signed.token.split('.')
assert.equal(signature, crypto.createHmac('sha256', secret).update(body).digest('base64url'))
assert.deepEqual(JSON.parse(Buffer.from(body, 'base64url').toString('utf8')), signed.payload)
assert.equal(signed.payload.role, 'STAFF')
assert.equal(signed.payload.userId, shared.id)
assert.equal(signed.payload.expiresAt, owner.expiresAt)

const endpoint = new URL('https://internal-alb.local/api/admin/shared-account-switch')
const ownerGet = response()
assert.equal(await service(owner).handle(request('GET'), ownerGet, endpoint), true)
assert.equal(ownerGet.statusCode, 200)
assert.equal(payload(ownerGet).canSwitch, true)
assert.equal(payload(ownerGet).account.loginId, shared.loginId)

const switched = response()
await service(owner).handle(request('POST'), switched, endpoint)
assert.equal(switched.statusCode, 200)
assert.equal(payload(switched).role, 'STAFF')
assert.match(switched.headers['set-cookie'], new RegExp(`^${COOKIE_NAME}=`))
assert.match(switched.headers['set-cookie'], /HttpOnly; SameSite=Lax; Priority=High; Secure$/)

const staff = { ...owner, role: 'STAFF', userId: shared.id }
const staffGet = response()
await service(staff).handle(request('GET'), staffGet, endpoint)
assert.equal(staffGet.statusCode, 200)
assert.equal(payload(staffGet).canSwitch, false)

const reverseAttempt = response()
await service(staff).handle(request('POST'), reverseAttempt, endpoint)
assert.equal(reverseAttempt.statusCode, 403)
assert.match(payload(reverseAttempt).error, /オーナーアカウントからのみ/)

const crossSite = response()
await service(owner).handle(request('POST', 'https://attacker.example'), crossSite, endpoint)
assert.equal(crossSite.statusCode, 403)
assert.match(payload(crossSite).error, /安全のため/)

const unavailable = response()
await service(owner, []).handle(request('POST'), unavailable, endpoint)
assert.equal(unavailable.statusCode, 409)
assert.match(payload(unavailable).error, /利用可能な店舗共通アカウント/)

if (previousSecret == null) delete process.env.ADMIN_AUTH_SECRET
else process.env.ADMIN_AUTH_SECRET = previousSecret

console.log(JSON.stringify({ release: 'owner-shared-switch-v550', signed: true, ownerOnly: true, oneWay: true, originProtected: true }))
