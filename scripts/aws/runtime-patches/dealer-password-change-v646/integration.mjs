import assert from 'node:assert/strict'
import http from 'node:http'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('/app/node_modules/@prisma/client')
const { createBusinessAccountApprovalService, passwordHash, verifyPassword } = require('/app/business-account-approvals-v643.js')
const crypto = require('node:crypto')

const databaseUrl = process.env.TEST_DATABASE_URL
if (!databaseUrl) throw new Error('TEST_DATABASE_URL is required')

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
const dealer = { id: 'dealer-existing-v646', name: 'Existing Dealer', loginId: 'existing-dealer' }
const currentPassword = 'ExistingDealer!2026'
const nextPassword = 'ExistingDealer!2027'

await prisma.$executeRawUnsafe('DROP SCHEMA public CASCADE')
await prisma.$executeRawUnsafe('CREATE SCHEMA public')
await prisma.$executeRawUnsafe(`CREATE TABLE "WholesaleDealer" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "loginId" TEXT NOT NULL,
  "passwordHash" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "authVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`)
await prisma.$executeRawUnsafe(
  'INSERT INTO "WholesaleDealer" ("id","name","loginId","passwordHash","active","authVersion") VALUES ($1,$2,$3,$4,TRUE,7)',
  dealer.id,
  dealer.name,
  dealer.loginId,
  passwordHash(crypto, currentPassword),
)

const service = createBusinessAccountApprovalService({
  prisma,
  crypto,
  operatorSession: () => null,
  adminSessionProvider: async () => null,
  dealerSessionProvider: async () => ({ ...dealer, authVersion: 7 }),
  renderPlatformPage: (_title, body) => '<html><body>' + body + '</body></html>',
  baseDashboardProvider: async () => ({}),
  renderBaseDashboard: () => '<html><body><main></main></body></html>',
  mailSender: async () => 'unused',
})
await service.ensureSchema()

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`)
    if (await service.handle(req, res, url)) return
    res.statusCode = 404
    res.end('not found')
  } catch (error) {
    res.statusCode = 500
    res.end(String(error && (error.stack || error)))
  }
})
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
const origin = `http://127.0.0.1:${server.address().port}`

async function postPassword(values) {
  return fetch(origin + '/api/dealer/managed-password-change', {
    method: 'POST',
    redirect: 'manual',
    headers: { origin, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(values),
  })
}

try {
  const page = await fetch(origin + '/dealer/password-change', { redirect: 'manual' })
  assert.equal(page.status, 200)
  const html = await page.text()
  assert.match(html, /<h1>パスワード変更<\/h1>/)
  assert.match(html, new RegExp(dealer.loginId))
  assert.match(html, /name="currentPassword"/)
  assert.match(html, /name="newPasswordConfirm"/)

  const managedBefore = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS "count" FROM "ManagedBusinessAccess"')
  assert.equal(managedBefore[0].count, 0)

  const rejected = await postPassword({ currentPassword: 'wrong-password', newPassword: nextPassword, newPasswordConfirm: nextPassword })
  assert.equal(rejected.status, 303)
  assert.equal(rejected.headers.get('location'), '/dealer/password-change?error=current')
  const unchanged = (await prisma.$queryRawUnsafe('SELECT "passwordHash","authVersion" FROM "WholesaleDealer" WHERE "id"=$1', dealer.id))[0]
  assert.equal(verifyPassword(crypto, currentPassword, unchanged.passwordHash), true)
  assert.equal(unchanged.authVersion, 7)

  const changed = await postPassword({ currentPassword, newPassword: nextPassword, newPasswordConfirm: nextPassword })
  assert.equal(changed.status, 303)
  assert.equal(changed.headers.get('location'), '/dealer/login?reset=complete')
  assert.match(changed.headers.get('set-cookie') || '', /orimia_dealer_session=.*Max-Age=0/)

  const updated = (await prisma.$queryRawUnsafe('SELECT "passwordHash","authVersion" FROM "WholesaleDealer" WHERE "id"=$1', dealer.id))[0]
  assert.equal(verifyPassword(crypto, nextPassword, updated.passwordHash), true)
  assert.equal(verifyPassword(crypto, currentPassword, updated.passwordHash), false)
  assert.equal(updated.authVersion, 8)

  const actions = await prisma.$queryRawUnsafe('SELECT "accountType","targetId","action","detailJson" FROM "BusinessAccountAction"')
  assert.equal(actions.length, 1)
  assert.equal(actions[0].accountType, 'DEALER')
  assert.equal(actions[0].targetId, dealer.id)
  assert.equal(actions[0].action, 'PASSWORD_CHANGED')
  assert.equal(actions[0].detailJson.managedAccount, false)

  const managedAfter = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS "count" FROM "ManagedBusinessAccess"')
  assert.equal(managedAfter[0].count, 0)

  console.log(JSON.stringify({
    release: 'dealer-password-change-v646',
    existingDealerPage: true,
    currentPasswordValidated: true,
    passwordUpdated: true,
    authVersion: updated.authVersion,
    sessionRevoked: true,
    auditRecorded: true,
  }))
} finally {
  await new Promise(resolve => server.close(resolve))
  await prisma.$disconnect()
}
