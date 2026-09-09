import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import { Readable } from 'node:stream'

const require = createRequire('/app/package.json')
const { PrismaClient } = require('@prisma/client')
const { createBillingService } = require('/app/billing.js')
const { createInboundEmailService, INBOUND_DOMAIN } = require('/app/inbound-email.js')
const databaseUrl = new URL(process.env.TEST_DATABASE_URL)
assert.ok(['salon_de_lien_postgres', '127.0.0.1', 'localhost', 'postgres'].includes(databaseUrl.hostname), 'local test database required')
const schema = `inbound_v587_${crypto.randomBytes(8).toString('hex')}`
const control = new PrismaClient({ datasources:{ db:{ url:databaseUrl.href } } })
databaseUrl.searchParams.set('schema', schema)
const prisma = new PrismaClient({ datasources:{ db:{ url:databaseUrl.href } } })
Object.assign(process.env, {
  APP_URL:'https://store-test.invalid',
  BILLING_ONBOARDING_ENABLED:'true',
  STRIPE_SECRET_KEY:'sk_test_local_only',
  STRIPE_WEBHOOK_SECRET:'whsec_local_only',
  STRIPE_PRICE_UME:'price_ume', STRIPE_PRICE_TAKE:'price_take', STRIPE_PRICE_MATSU:'price_matsu',
  ADMIN_AUTH_SECRET:crypto.randomBytes(32).toString('hex'),
})

const sessionProvider = async () => null
const inbound = createInboundEmailService({ prisma, crypto, sessionProvider })
const billing = database => createBillingService({
  prisma:database, crypto, sessionProvider,
  registrationMailSender:async () => { assert.fail('registration completion must not send mail') },
})
let requestNumber = 0

async function fixture(slug) {
  const token = crypto.randomBytes(32).toString('base64url')
  const id = crypto.randomUUID()
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const email = `${slug}@example.invalid`
  await prisma.$executeRawUnsafe('INSERT INTO "StoreRegistrationVerification" ("id","email","tokenHash","expiresAt") VALUES ($1,$2,$3,NOW()+INTERVAL \'1 hour\')', id, email, tokenHash)
  return { id, token, email, slug }
}

async function register(fixture, database = prisma, origin = process.env.APP_URL) {
  const body = new URLSearchParams({
    verificationToken:fixture.token, organizationName:`Test ${fixture.slug}`, slug:fixture.slug,
    displayName:'Test Owner', password:'Local-owner-587!', storeLoginId:`shared-${fixture.slug}`,
    storePassword:'Local-shared-587!', planKey:'take', termsAccepted:'yes',
  })
  const req = Readable.from([Buffer.from(body.toString())])
  req.method = 'POST'
  req.headers = { origin, host:'store-test.invalid', 'content-type':'application/x-www-form-urlencoded', 'x-forwarded-for':`192.0.2.${++requestNumber}` }
  req.socket = { encrypted:true, remoteAddress:'127.0.0.1' }
  const res = { headers:{}, setHeader(name, value) { this.headers[name.toLowerCase()] = value }, end(body) { this.body = body } }
  assert.equal(await billing(database).handle(req, res, new URL('/admin/register', process.env.APP_URL)), true)
  return res
}

function failingDatabase(pattern) {
  return new Proxy(prisma, { get(target, key) {
    if (key === '$transaction') return callback => target.$transaction(tx => callback(new Proxy(tx, { get(transaction, method) {
      const value = Reflect.get(transaction, method)
      if (['$queryRawUnsafe', '$executeRawUnsafe'].includes(method)) return (sql, ...params) => {
        if (sql.includes(pattern)) throw Object.assign(new Error('Injected local database failure'), { code:'LOCAL_TEST_FAILURE' })
        return value.call(transaction, sql, ...params)
      }
      return typeof value === 'function' ? value.bind(transaction) : value
    } })))
    const value = Reflect.get(target, key)
    return typeof value === 'function' ? value.bind(target) : value
  } })
}

async function snapshot() {
  return prisma.$queryRawUnsafe('SELECT * FROM "OrganizationInboundEmail" ORDER BY "organizationId"')
}

try {
  await control.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
  for (const sql of [
    'CREATE TABLE "Organization" ("id" TEXT PRIMARY KEY,"slug" TEXT UNIQUE,"name" TEXT,"publicCode" TEXT UNIQUE,"createdAt" TIMESTAMPTZ DEFAULT NOW(),"updatedAt" TIMESTAMPTZ DEFAULT NOW())',
    'CREATE TABLE "AppUser" ("id" TEXT PRIMARY KEY,"organizationId" TEXT REFERENCES "Organization"("id"),"email" TEXT UNIQUE,"loginId" TEXT UNIQUE,"displayName" TEXT,"passwordHash" TEXT,"role" TEXT,"active" BOOLEAN,"isSharedStoreAccount" BOOLEAN,"createdAt" TIMESTAMPTZ,"updatedAt" TIMESTAMPTZ)',
    'CREATE TABLE "OrganizationBilling" ("organizationId" TEXT PRIMARY KEY REFERENCES "Organization"("id"),"planKey" TEXT,"onboardingStatus" TEXT,"subscriptionStatus" TEXT,"billingRequiredAt" TIMESTAMPTZ,"createdAt" TIMESTAMPTZ,"updatedAt" TIMESTAMPTZ)',
    'CREATE TABLE "StoreRegistrationVerification" ("id" TEXT PRIMARY KEY,"email" TEXT,"tokenHash" TEXT UNIQUE,"expiresAt" TIMESTAMPTZ,"consumedAt" TIMESTAMPTZ,"updatedAt" TIMESTAMPTZ)',
    'CREATE TABLE "BillingPlan" ("planKey" TEXT PRIMARY KEY,"active" BOOLEAN,"sortOrder" INTEGER)',
    'INSERT INTO "BillingPlan" VALUES (\'take\',TRUE,1)',
    'INSERT INTO "Organization" ("id","slug","name") VALUES (\'existing\',\'existing\',\'Existing Store\')',
  ]) await prisma.$executeRawUnsafe(sql)

  await inbound.ensureSchema()
  const existing = await inbound.statusForOrganization('existing')
  assert.ok(existing.address.endsWith(`@${INBOUND_DOMAIN}`))
  assert.equal(existing.active, true)
  await prisma.$executeRawUnsafe('UPDATE "OrganizationInboundEmail" SET "status"=\'disabled\',"lastError"=\'preserved\' WHERE "organizationId"=\'existing\'')
  const beforeBackfill = await snapshot()
  await inbound.ensureSchema()
  assert.deepEqual(await snapshot(), beforeBackfill)

  const first = await fixture('first-store')
  const firstResponse = await register(first)
  assert.equal(firstResponse.headers.location, '/admin/settings?registered=1')
  assert.ok(firstResponse.headers['set-cookie'])
  const rows = await prisma.$queryRawUnsafe('SELECT o."id",o."createdAt",i."address",i."createdAt" AS "issuedAt",i."status" FROM "Organization" o JOIN "OrganizationInboundEmail" i ON i."organizationId"=o."id" WHERE o."slug"=$1', first.slug)
  assert.equal(rows.length, 1, 'mail must exist before registration succeeds')
  assert.equal(rows[0].createdAt.getTime(), rows[0].issuedAt.getTime())
  assert.equal(rows[0].status, 'active')
  assert.notEqual(rows[0].address, existing.address)
  const registeredAddress = rows[0].address
  const beforeReplay = await snapshot()
  assert.equal((await register(first)).headers.location, '/admin/register?error=expired')
  assert.deepEqual(await snapshot(), beforeReplay)

  const rejected = await fixture('rejected-store')
  assert.equal((await register(rejected, prisma, 'https://other.invalid')).statusCode, 403)
  assert.deepEqual(await snapshot(), beforeReplay)

  for (const [slug, pattern] of [
    ['issuance-failure', 'INSERT INTO "OrganizationInboundEmail"'],
    ['late-failure', 'UPDATE "StoreRegistrationVerification"'],
  ]) {
    const candidate = await fixture(slug)
    const before = await snapshot()
    const response = await register(candidate, failingDatabase(pattern))
    assert.ok(response.headers.location.endsWith('&error=server'))
    assert.equal(response.headers['set-cookie'], undefined)
    assert.equal((await prisma.$queryRawUnsafe('SELECT "id" FROM "Organization" WHERE "slug"=$1', slug)).length, 0)
    assert.equal((await prisma.$queryRawUnsafe('SELECT "id" FROM "AppUser" WHERE "email"=$1', candidate.email)).length, 0)
    assert.equal((await prisma.$queryRawUnsafe('SELECT "consumedAt" FROM "StoreRegistrationVerification" WHERE "id"=$1', candidate.id))[0].consumedAt, null)
    assert.deepEqual(await snapshot(), before)
    assert.equal((await register(candidate)).headers.location, '/admin/settings?registered=1', 'rolled back registration can be retried')
  }

  await prisma.$executeRawUnsafe('INSERT INTO "Organization" ("id","slug","name") VALUES (\'concurrent\',\'concurrent\',\'Concurrent Store\')')
  const issued = await Promise.all(Array.from({ length:8 }, () => inbound.issueAddressForOrganization('concurrent')))
  assert.equal(new Set(issued.map(row => row.address)).size, 1)
  assert.notEqual(issued[0].address, registeredAddress)

  await prisma.$executeRawUnsafe('INSERT INTO "Organization" ("id","slug","name") VALUES (\'collision\',\'collision\',\'Collision Store\')')
  let collisionAttempt = 0
  const collisionCrypto = { ...crypto, randomBytes(size) {
    collisionAttempt += 1
    return collisionAttempt === 1 ? Buffer.from(registeredAddress.split('@')[0].slice(8), 'hex') : crypto.randomBytes(size)
  } }
  const collisionIssuer = createInboundEmailService({ prisma, crypto:collisionCrypto, sessionProvider })
  const collision = await collisionIssuer.issueAddressForOrganization('collision')
  assert.ok(collisionAttempt >= 2)
  assert.notEqual(collision.address, registeredAddress)
  const beforeRestart = await snapshot()
  await inbound.ensureSchema()
  assert.deepEqual(await snapshot(), beforeRestart)
  console.log(JSON.stringify({ release:'store-inbound-auto-v587', registrationAtomic:true, failureRollback:true, retry:true, replayRejected:true, concurrentIssuance:true, collisionRetry:true, existingPreserved:true, backfillIdempotent:true }))
} finally {
  await prisma.$disconnect()
  await control.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
  await control.$disconnect()
}
