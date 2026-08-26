import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')
const { encryptSecret } = require('./line-reservations-v436')

const baseUrl = process.env.LINE_TEST_BASE_URL || 'http://localhost:3096'
const prisma = new PrismaClient()
const webhookKey = `test_${crypto.randomBytes(24).toString('base64url')}`
let organizationId = null

try {
  const candidates = await prisma.$queryRawUnsafe(`SELECT o."id",o."slug",o."publicCode"
    FROM "Organization" o LEFT JOIN "OrganizationLineConnection" c ON c."organizationId"=o."id"
    WHERE c."organizationId" IS NULL ORDER BY o."createdAt" LIMIT 1`)
  assert.ok(candidates[0], 'an organization without a LINE connection is required for integration testing')
  const organization = candidates[0]
  organizationId = organization.id
  const storeCode = organization.publicCode || organization.slug
  const channelSecret = 'integration-test-channel-secret-0123456789'
  await prisma.$executeRawUnsafe(`INSERT INTO "OrganizationLineConnection" (
    "organizationId","messagingChannelId","lineLoginChannelId","liffId","encryptedChannelSecret","encryptedAccessToken","webhookKey","status","botUserId","displayName"
  ) VALUES ($1,'2001234567','2007654321','2007654321-TestLiff',$2,$3,$4,'active','Utestdestination','Integration test')`,
  organizationId, encryptSecret(channelSecret), encryptSecret('integration-test-access-token-that-is-not-sent'), webhookKey)

  const page = await fetch(`${baseUrl}/line/booking/${encodeURIComponent(storeCode)}`)
  assert.equal(page.status, 200)
  assert.match(page.headers.get('content-security-policy') || '', /liffsdk\.line-scdn\.net/)
  assert.match(page.headers.get('cache-control') || '', /no-store/)
  const html = await page.text()
  assert.match(html, /ONLINE BOOKING/)
  assert.match(html, /2007654321-TestLiff/)

  const unauthenticated = await fetch(`${baseUrl}/api/lien-line-booking/config?store=${encodeURIComponent(storeCode)}`)
  assert.equal(unauthenticated.status, 401)

  const rawBody = JSON.stringify({ destination: 'Utestdestination', events: [] })
  const signature = crypto.createHmac('sha256', channelSecret).update(rawBody).digest('base64')
  const webhook = await fetch(`${baseUrl}/api/integrations/line/webhook/${webhookKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-line-signature': signature }, body: rawBody,
  })
  assert.equal(webhook.status, 200)

  const rejected = await fetch(`${baseUrl}/api/integrations/line/webhook/${webhookKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-line-signature': 'invalid' }, body: rawBody,
  })
  assert.equal(rejected.status, 401)

  console.log('LINE LIFF runtime integration test passed')
} finally {
  if (organizationId) await prisma.$executeRawUnsafe('DELETE FROM "OrganizationLineConnection" WHERE "organizationId"=$1 AND "webhookKey"=$2', organizationId, webhookKey).catch(() => {})
  await prisma.$disconnect()
}
