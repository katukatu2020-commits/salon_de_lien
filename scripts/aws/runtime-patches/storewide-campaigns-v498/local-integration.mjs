import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import crypto from 'node:crypto'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const require = createRequire('/app/server.js')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const campaignId = `v498-local-${crypto.randomUUID()}`
const title = `V498全顧客表示テスト-${campaignId.slice(-8)}`

try {
  await prisma.$executeRawUnsafe(`INSERT INTO "CustomerCampaign" (
    "id","organizationId","title","summary","body","startsAt","endsAt","status",
    "audienceGender","audienceMinAge","audienceMaxAge","audienceMatchedCount","createdAt","updatedAt"
  ) VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP-INTERVAL '1 minute',CURRENT_TIMESTAMP+INTERVAL '1 day',
    'published','female',99,100,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
  campaignId, 'org_showcase_yohaku', title, '新規登録後にも表示', '配信先レコードなしでも店舗登録者へ表示')

  const beforeRows = await prisma.$queryRawUnsafe(
    'SELECT COUNT(*)::int AS count FROM "CustomerCampaignRecipient" WHERE "campaignId"=$1',
    campaignId,
  )
  assert.equal(Number(beforeRows[0]?.count || 0), 0)

  const login = await fetch(`${baseUrl}/api/customer-auth/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/home' }),
  })
  assert.equal(login.status, 303)
  const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
  assert.match(cookie, /^[^=]+=/)

  const home = await fetch(`${baseUrl}/u/home`, { headers: { cookie, 'Cache-Control': 'no-cache' } })
  assert.equal(home.status, 200)
  assert.match(await home.text(), new RegExp(title))

  const campaigns = await fetch(`${baseUrl}/u/campaigns`, { headers: { cookie, 'Cache-Control': 'no-cache' } })
  assert.equal(campaigns.status, 200)
  assert.match(await campaigns.text(), new RegExp(title))

  const afterRows = await prisma.$queryRawUnsafe(
    'SELECT COUNT(*)::int AS count FROM "CustomerCampaignRecipient" WHERE "campaignId"=$1 AND "customerId"=$2',
    campaignId,
    'showcase-yohaku-customer-001',
  )
  assert.equal(Number(afterRows[0]?.count || 0), 1)

  console.log(JSON.stringify({
    home: home.status,
    campaigns: campaigns.status,
    recipientBefore: 0,
    recipientAfterView: 1,
    visibleOnHome: true,
    visibleOnCampaigns: true,
  }))
} finally {
  await prisma.$executeRawUnsafe('DELETE FROM "CustomerCampaign" WHERE "id"=$1', campaignId)
  await prisma.$disconnect()
}
