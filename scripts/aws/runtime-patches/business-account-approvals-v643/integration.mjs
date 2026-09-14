import assert from 'node:assert/strict'
import http from 'node:http'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('/app/node_modules/@prisma/client')
const { createBusinessAccountApprovalService, verifyPassword } = require('/app/business-account-approvals-v643.js')
const crypto = require('node:crypto')

const databaseUrl = process.env.TEST_DATABASE_URL
if (!databaseUrl) throw new Error('TEST_DATABASE_URL is required')
process.env.APP_URL = 'http://localhost:3000'
process.env.ADMIN_AUTH_SECRET = 'admin-v643-secret-012345678901234567890123456789'
process.env.DEALER_AUTH_SECRET = 'dealer-v643-secret-01234567890123456789012345678'

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
const request = { headers: { host: 'localhost:3000', origin: 'http://localhost:3000' }, socket: {} }
const operator = { subject: 'operations@example.jp' }
const messages = []

async function resetDatabase() {
  await prisma.$executeRawUnsafe('DROP SCHEMA public CASCADE')
  await prisma.$executeRawUnsafe('CREATE SCHEMA public')
  await prisma.$executeRawUnsafe('CREATE TABLE "BillingPlan" ("planKey" TEXT PRIMARY KEY,"active" BOOLEAN NOT NULL DEFAULT TRUE)')
  await prisma.$executeRawUnsafe('INSERT INTO "BillingPlan" ("planKey","active") VALUES (\'ume\',TRUE),(\'take\',TRUE),(\'matsu\',TRUE)')
  await prisma.$executeRawUnsafe('CREATE TABLE "Organization" ("id" TEXT PRIMARY KEY,"slug" TEXT UNIQUE NOT NULL,"name" TEXT NOT NULL,"publicCode" TEXT UNIQUE,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())')
  await prisma.$executeRawUnsafe('CREATE TABLE "AppUser" ("id" TEXT PRIMARY KEY,"organizationId" TEXT,"email" TEXT NOT NULL,"loginId" TEXT,"displayName" TEXT,"passwordHash" TEXT,"role" TEXT NOT NULL,"active" BOOLEAN NOT NULL DEFAULT TRUE,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())')
  await prisma.$executeRawUnsafe('CREATE TABLE "OrganizationBilling" ("organizationId" TEXT PRIMARY KEY,"planKey" TEXT NOT NULL,"onboardingStatus" TEXT NOT NULL,"subscriptionStatus" TEXT NOT NULL,"billingRequiredAt" TIMESTAMPTZ NOT NULL,"createdAt" TIMESTAMPTZ NOT NULL,"updatedAt" TIMESTAMPTZ NOT NULL)')
  await prisma.$executeRawUnsafe('CREATE TABLE "WholesaleDealer" ("id" TEXT PRIMARY KEY,"name" TEXT NOT NULL,"representativeName" TEXT,"loginId" TEXT NOT NULL,"email" TEXT,"passwordHash" TEXT,"dealerCode" TEXT,"active" BOOLEAN NOT NULL DEFAULT TRUE,"authVersion" INTEGER NOT NULL DEFAULT 1,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())')
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX "WholesaleDealer_login_lower_key" ON "WholesaleDealer"(LOWER("loginId"))')
  await prisma.$executeRawUnsafe('CREATE TABLE "WholesaleDealerBilling" ("dealerId" TEXT PRIMARY KEY,"planKey" TEXT NOT NULL,"displayName" TEXT NOT NULL,"monthlyAmount" INTEGER NOT NULL,"currency" TEXT NOT NULL,"onboardingStatus" TEXT NOT NULL,"subscriptionStatus" TEXT NOT NULL,"billingRequiredAt" TIMESTAMPTZ NOT NULL,"createdAt" TIMESTAMPTZ NOT NULL,"updatedAt" TIMESTAMPTZ NOT NULL)')
  await prisma.$executeRawUnsafe('CREATE TABLE "ManagedAccountIssue" ("id" TEXT PRIMARY KEY,"accountType" TEXT NOT NULL,"targetId" TEXT NOT NULL,"accountName" TEXT NOT NULL,"loginId" TEXT NOT NULL,"contactEmail" TEXT NOT NULL,"operatorEmail" TEXT NOT NULL,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())')
  await prisma.$executeRawUnsafe('CREATE TABLE "BusinessInquiry" ("id" TEXT PRIMARY KEY,"requestKey" TEXT NOT NULL UNIQUE,"audience" TEXT NOT NULL,"organizationName" TEXT NOT NULL,"contactName" TEXT NOT NULL,"email" TEXT NOT NULL,"phone" TEXT,"preferredContact" TEXT NOT NULL,"message" TEXT NOT NULL,"sourcePath" TEXT NOT NULL,"status" TEXT NOT NULL DEFAULT \'new\',"operatorNote" TEXT,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())')
}

function serviceWith(sender) {
  return createBusinessAccountApprovalService({
    prisma,
    crypto,
    operatorSession: () => operator,
    adminSessionProvider: async () => null,
    dealerSessionProvider: async () => null,
    renderPlatformPage: (_title, body) => '<html><body>' + body + '</body></html>',
    baseDashboardProvider: async () => ({}),
    renderBaseDashboard: () => '<html><body><main></main></body></html>',
    mailSender: sender,
  })
}

function initialPassword(message) {
  const match = String(message.textBody).match(/初期パスワード: ([^\n]+)/)
  assert.ok(match, 'approval email must contain a temporary password')
  return match[1]
}

function signedSession(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return body + '.' + crypto.createHmac('sha256', secret).update(body).digest('base64url')
}

async function guardedGet(serviceInstance, path, cookie) {
  const server = http.createServer(async (req, res) => {
    const handled = await serviceInstance.handle(req, res, new URL(req.url || '/', `http://${req.headers.host}`))
    if (!handled) { res.statusCode = 404; res.end() }
  })
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  try {
    return await fetch(`http://127.0.0.1:${server.address().port}${path}`, { headers: { cookie }, redirect: 'manual' })
  } finally {
    await new Promise(resolve => server.close(resolve))
  }
}

await resetDatabase()
const service = serviceWith(async message => { messages.push(message); return 'message-' + messages.length })
await service.ensureSchema()

await prisma.$executeRawUnsafe('INSERT INTO "BusinessInquiry" ("id","requestKey","audience","organizationName","contactName","email","phone","preferredContact","message","sourcePath") VALUES (\'inq-salon\',\'key-salon\',\'salon\',\'検証サロン\',\'山田 花子\',\'salon@example.jp\',\'09000000000\',\'email\',\'導入を希望します\',\'/business/salon\')')
const salonResult = await service.approveInquiry('inq-salon', new URLSearchParams({ accountName: '検証サロン', contactName: '山田 花子', contactEmail: 'salon@example.jp', planKey: 'take' }), operator, request)
assert.equal(salonResult.mail.sent, true)
assert.equal(messages.length, 1)
const salonAccessRows = await prisma.$queryRawUnsafe('SELECT * FROM "ManagedBusinessAccess" WHERE "inquiryId"=\'inq-salon\'')
assert.equal(salonAccessRows.length, 1)
assert.equal(salonAccessRows[0].mustChangePassword, true)
assert.equal(salonAccessRows[0].approvalMailStatus, 'SENT')
assert.match(salonAccessRows[0].loginId, /^salon-[a-f0-9]{12}$/)
const salonUsers = await prisma.$queryRawUnsafe('SELECT * FROM "AppUser" WHERE "id"=$1', salonAccessRows[0].principalId)
const salonInitialPassword = initialPassword(messages[0])
assert.equal(verifyPassword(crypto, salonInitialPassword, salonUsers[0].passwordHash), true)
const inquiryAfterApproval = await prisma.$queryRawUnsafe('SELECT "status" FROM "BusinessInquiry" WHERE "id"=\'inq-salon\'')
assert.equal(inquiryAfterApproval[0].status, 'closed')
await assert.rejects(() => service.approveInquiry('inq-salon', new URLSearchParams({ accountName: '検証サロン', contactName: '山田 花子', contactEmail: 'salon@example.jp', planKey: 'take' }), operator, request), error => error.code === 'already')

await service.changePassword('SALON', { userId: salonAccessRows[0].principalId }, new URLSearchParams({ currentPassword: salonInitialPassword, newPassword: 'NewSalonPass!2026', newPasswordConfirm: 'NewSalonPass!2026' }), 'salon@example.jp')
const changedSalon = await prisma.$queryRawUnsafe('SELECT u."passwordHash",m."mustChangePassword" FROM "AppUser" u JOIN "ManagedBusinessAccess" m ON m."principalId"=u."id" WHERE u."id"=$1', salonAccessRows[0].principalId)
assert.equal(changedSalon[0].mustChangePassword, false)
assert.equal(verifyPassword(crypto, 'NewSalonPass!2026', changedSalon[0].passwordHash), true)

await service.setAccountStatus('SALON', salonAccessRows[0].targetId, 'SUSPENDED', operator)
let salonState = await prisma.$queryRawUnsafe('SELECT u."active",b."subscriptionStatus",m."accessStatus" FROM "AppUser" u JOIN "OrganizationBilling" b ON b."organizationId"=u."organizationId" JOIN "ManagedBusinessAccess" m ON m."principalId"=u."id" WHERE u."id"=$1', salonAccessRows[0].principalId)
assert.equal(salonState[0].active, false)
assert.equal(salonState[0].subscriptionStatus, 'paused')
assert.equal(salonState[0].accessStatus, 'SUSPENDED')
const nowSeconds = Math.floor(Date.now() / 1000)
const staleAdminToken = signedSession({ version: 2, role: 'ADMIN', userId: salonAccessRows[0].principalId, organizationId: salonAccessRows[0].targetId, issuedAt: nowSeconds, expiresAt: nowSeconds + 3600, sessionId: 'stale-admin' }, process.env.ADMIN_AUTH_SECRET)
const blockedAdmin = await guardedGet(service, '/admin/customers', `lien_admin_session=${staleAdminToken}`)
assert.equal(blockedAdmin.status, 302)
assert.match(blockedAdmin.headers.get('location'), /error=suspended/)
assert.match(blockedAdmin.headers.get('set-cookie'), /Max-Age=0/)
await service.setAccountStatus('SALON', salonAccessRows[0].targetId, 'ACTIVE', operator)
salonState = await prisma.$queryRawUnsafe('SELECT u."active",b."subscriptionStatus",m."accessStatus" FROM "AppUser" u JOIN "OrganizationBilling" b ON b."organizationId"=u."organizationId" JOIN "ManagedBusinessAccess" m ON m."principalId"=u."id" WHERE u."id"=$1', salonAccessRows[0].principalId)
assert.equal(salonState[0].active, true)
assert.equal(salonState[0].subscriptionStatus, 'active')
assert.equal(salonState[0].accessStatus, 'ACTIVE')

await prisma.$executeRawUnsafe('INSERT INTO "BusinessInquiry" ("id","requestKey","audience","organizationName","contactName","email","preferredContact","message","sourcePath") VALUES (\'inq-dealer\',\'key-dealer\',\'dealer\',\'検証ディーラー\',\'佐藤 太郎\',\'dealer@example.jp\',\'email\',\'ディーラー利用希望\',\'/business/dealer\')')
const dealerResult = await service.approveInquiry('inq-dealer', new URLSearchParams({ accountName: '検証ディーラー', contactName: '佐藤 太郎', contactEmail: 'dealer@example.jp' }), operator, request)
assert.equal(dealerResult.mail.sent, true)
const dealerAccess = (await prisma.$queryRawUnsafe('SELECT * FROM "ManagedBusinessAccess" WHERE "inquiryId"=\'inq-dealer\''))[0]
assert.match(dealerAccess.loginId, /^dealer-[a-f0-9]{12}$/)
const originalDealer = (await prisma.$queryRawUnsafe('SELECT "authVersion","passwordHash" FROM "WholesaleDealer" WHERE "id"=$1', dealerAccess.targetId))[0]
assert.equal(verifyPassword(crypto, initialPassword(messages[1]), originalDealer.passwordHash), true)
await service.reissueCredentials('inq-dealer', operator, request)
const reissuedDealer = (await prisma.$queryRawUnsafe('SELECT d."authVersion",d."passwordHash",m."approvalMailStatus",m."mustChangePassword" FROM "WholesaleDealer" d JOIN "ManagedBusinessAccess" m ON m."targetId"=d."id" WHERE d."id"=$1', dealerAccess.targetId))[0]
assert.equal(reissuedDealer.authVersion, originalDealer.authVersion + 1)
assert.equal(reissuedDealer.approvalMailStatus, 'SENT')
assert.equal(reissuedDealer.mustChangePassword, true)
assert.equal(verifyPassword(crypto, initialPassword(messages[2]), reissuedDealer.passwordHash), true)

await service.setAccountStatus('DEALER', dealerAccess.targetId, 'SUSPENDED', operator)
let dealerState = (await prisma.$queryRawUnsafe('SELECT d."active",b."subscriptionStatus",m."accessStatus" FROM "WholesaleDealer" d JOIN "WholesaleDealerBilling" b ON b."dealerId"=d."id" JOIN "ManagedBusinessAccess" m ON m."targetId"=d."id" WHERE d."id"=$1', dealerAccess.targetId))[0]
assert.equal(dealerState.active, false)
assert.equal(dealerState.subscriptionStatus, 'paused')
assert.equal(dealerState.accessStatus, 'SUSPENDED')
const staleDealerToken = signedSession({ version: 1, dealerId: dealerAccess.targetId, loginId: dealerAccess.loginId, authVersion: 1, issuedAt: nowSeconds, expiresAt: nowSeconds + 3600, sessionId: 'stale-dealer' }, process.env.DEALER_AUTH_SECRET)
const blockedDealer = await guardedGet(service, '/dealer/orders', `orimia_dealer_session=${staleDealerToken}`)
assert.equal(blockedDealer.status, 302)
assert.match(blockedDealer.headers.get('location'), /error=suspended/)
assert.match(blockedDealer.headers.get('set-cookie'), /Max-Age=0/)
await service.setAccountStatus('DEALER', dealerAccess.targetId, 'ACTIVE', operator)
dealerState = (await prisma.$queryRawUnsafe('SELECT d."active",b."subscriptionStatus",m."accessStatus" FROM "WholesaleDealer" d JOIN "WholesaleDealerBilling" b ON b."dealerId"=d."id" JOIN "ManagedBusinessAccess" m ON m."targetId"=d."id" WHERE d."id"=$1', dealerAccess.targetId))[0]
assert.equal(dealerState.active, true)
assert.equal(dealerState.subscriptionStatus, 'active')
assert.equal(dealerState.accessStatus, 'ACTIVE')

await prisma.$executeRawUnsafe('INSERT INTO "BusinessInquiry" ("id","requestKey","audience","organizationName","contactName","email","preferredContact","message","sourcePath") VALUES (\'inq-mail-fail\',\'key-mail-fail\',\'dealer\',\'メール失敗検証\',\'鈴木 次郎\',\'mail-fail@example.jp\',\'email\',\'検証\',\'/business/dealer\')')
const failingService = serviceWith(async () => { throw new Error('simulated transport failure') })
const failedResult = await failingService.approveInquiry('inq-mail-fail', new URLSearchParams({ accountName: 'メール失敗検証', contactName: '鈴木 次郎', contactEmail: 'mail-fail@example.jp' }), operator, request)
assert.equal(failedResult.mail.sent, false)
const failedAccess = (await prisma.$queryRawUnsafe('SELECT "approvalMailStatus","approvalMailError" FROM "ManagedBusinessAccess" WHERE "inquiryId"=\'inq-mail-fail\''))[0]
assert.equal(failedAccess.approvalMailStatus, 'FAILED')
assert.match(failedAccess.approvalMailError, /simulated transport failure/)

const dashboard = await service.loadDashboardAccounts()
assert.equal(dashboard.salons.some(row => row.id === salonAccessRows[0].targetId && row.status === 'ACTIVE'), true)
assert.equal(dashboard.dealers.some(row => row.id === dealerAccess.targetId && row.status === 'ACTIVE'), true)
const actions = await prisma.$queryRawUnsafe('SELECT "action" FROM "BusinessAccountAction" ORDER BY "createdAt"')
for (const expected of ['APPROVE_AND_ISSUE', 'PASSWORD_CHANGED', 'SUSPEND', 'RESUME', 'CREDENTIALS_REISSUED']) {
  assert.equal(actions.some(row => row.action === expected), true, `missing audit action ${expected}`)
}

console.log(JSON.stringify({ release: 'business-account-approvals-v643', salonApproved: true, dealerApproved: true, passwordChange: true, suspension: true, mailRecovery: true, messages: messages.length }))
await prisma.$disconnect()
