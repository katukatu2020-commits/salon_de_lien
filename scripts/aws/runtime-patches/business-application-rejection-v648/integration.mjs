import assert from 'node:assert/strict'
import http from 'node:http'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('/app/node_modules/@prisma/client')
const {
  createBusinessAccountApprovalService,
  rejectionEmail,
} = require('/app/business-account-approvals-v643.js')
const crypto = require('node:crypto')

const databaseUrl = process.env.TEST_DATABASE_URL
if (!databaseUrl) throw new Error('TEST_DATABASE_URL is required')

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
const operator = { subject: 'operations@example.jp' }
const request = { headers: { host: 'localhost:3000', origin: 'http://localhost:3000' }, socket: {} }
const attempts = []
let failDealerMailOnce = true

async function resetDatabase() {
  await prisma.$executeRawUnsafe('DROP SCHEMA public CASCADE')
  await prisma.$executeRawUnsafe('CREATE SCHEMA public')
  await prisma.$executeRawUnsafe(`CREATE TABLE "BusinessInquiry" (
    "id" TEXT PRIMARY KEY,
    "requestKey" TEXT NOT NULL UNIQUE,
    "audience" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "preferredContact" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "operatorNote" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`)
}

async function insertInquiry(id, audience, organizationName, email) {
  await prisma.$executeRawUnsafe(
    'INSERT INTO "BusinessInquiry" ("id","requestKey","audience","organizationName","contactName","email","preferredContact","message","sourcePath") VALUES ($1,$2,$3,$4,$5,$6,\'email\',$7,$8)',
    id,
    'key-' + id,
    audience,
    organizationName,
    '申請 担当者',
    email,
    '新規利用を希望します。',
    '/business/' + audience,
  )
}

function serviceWithMail() {
  return createBusinessAccountApprovalService({
    prisma,
    crypto,
    operatorSession: () => operator,
    adminSessionProvider: async () => null,
    dealerSessionProvider: async () => null,
    renderPlatformPage: (_title, body) => '<html><body>' + body + '</body></html>',
    baseDashboardProvider: async () => ({}),
    renderBaseDashboard: () => '<html><body><main></main></body></html>',
    mailSender: async message => {
      attempts.push(message)
      if (message.to === 'dealer-reject@example.jp' && failDealerMailOnce) {
        failDealerMailOnce = false
        throw new Error('simulated rejection mail failure')
      }
      return 'message-' + attempts.length
    },
  })
}

async function withServiceServer(service, callback) {
  const server = http.createServer(async (req, res) => {
    try {
      const handled = await service.handle(req, res, new URL(req.url || '/', `http://${req.headers.host}`))
      if (!handled) { res.statusCode = 404; res.end('not found') }
    } catch (error) {
      res.statusCode = 500
      res.end(String(error && error.stack || error))
    }
  })
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  const base = `http://127.0.0.1:${server.address().port}`
  const previousAppUrl = process.env.APP_URL
  process.env.APP_URL = base
  try {
    await callback(base)
  } finally {
    if (previousAppUrl === undefined) delete process.env.APP_URL
    else process.env.APP_URL = previousAppUrl
    await new Promise(resolve => server.close(resolve))
  }
}

try {
  await resetDatabase()
  const service = serviceWithMail()
  await service.ensureSchema()

  await insertInquiry('inq-reject-salon', 'salon', '検証サロン', 'salon-reject@example.jp')
  const salonReason = '審査に必要な店舗情報が不足しています。\n必要書類をご確認のうえ、改めてお問い合わせください。'
  const salonResult = await service.rejectInquiry(
    'inq-reject-salon',
    new URLSearchParams({ reason: salonReason }),
    operator,
    request,
  )
  assert.equal(salonResult.mail.sent, true)
  assert.equal(attempts[0].to, 'salon-reject@example.jp')
  assert.match(attempts[0].subject, /ご利用申請結果/)
  assert.match(attempts[0].textBody, /審査に必要な店舗情報が不足/)
  assert.match(attempts[0].htmlBody, /お問い合わせフォームを開く/)

  const salonRejection = (await prisma.$queryRawUnsafe('SELECT * FROM "BusinessInquiryRejection" WHERE "inquiryId"=$1', 'inq-reject-salon'))[0]
  assert.equal(salonRejection.audience, 'salon')
  assert.equal(salonRejection.reason, salonReason)
  assert.equal(salonRejection.mailStatus, 'SENT')
  assert.equal(salonRejection.rejectedBy, operator.subject)
  assert.ok(salonRejection.mailSentAt)

  const salonInquiry = (await prisma.$queryRawUnsafe('SELECT "status","operatorNote" FROM "BusinessInquiry" WHERE "id"=$1', 'inq-reject-salon'))[0]
  assert.equal(salonInquiry.status, 'closed')
  assert.match(salonInquiry.operatorNote, /^却下理由:/)

  const listed = await service.loadInquiries(new URL('http://localhost/platform/inquiries'))
  const listedSalon = listed.rows.find(row => row.id === 'inq-reject-salon')
  assert.equal(listedSalon.rejectionReason, salonReason)
  assert.equal(listedSalon.rejectionMailStatus, 'SENT')

  await assert.rejects(
    () => service.rejectInquiry('inq-reject-salon', new URLSearchParams({ reason: '二重却下' }), operator, request),
    error => error.code === 'rejected',
  )
  await assert.rejects(
    () => service.approveInquiry('inq-reject-salon', new URLSearchParams({ accountName: '検証サロン', contactName: '申請 担当者', contactEmail: 'salon-reject@example.jp', planKey: 'take' }), operator, request),
    error => error.code === 'rejected',
  )
  await assert.rejects(
    () => service.rejectInquiry('inq-reject-salon', new URLSearchParams({ reason: '   ' }), operator, request),
    error => error.code === 'input',
  )

  await insertInquiry('inq-reject-dealer', 'dealer', '検証ディーラー', 'dealer-reject@example.jp')
  const dealerResult = await service.rejectInquiry(
    'inq-reject-dealer',
    new URLSearchParams({ reason: '取引条件を確認できないため、今回は見送ります。' }),
    operator,
    request,
  )
  assert.equal(dealerResult.mail.sent, false)
  let dealerRejection = (await prisma.$queryRawUnsafe('SELECT * FROM "BusinessInquiryRejection" WHERE "inquiryId"=$1', 'inq-reject-dealer'))[0]
  assert.equal(dealerRejection.mailStatus, 'FAILED')
  assert.match(dealerRejection.mailError, /simulated rejection mail failure/)

  const resendResult = await service.resendRejection('inq-reject-dealer', operator, request)
  assert.equal(resendResult.mail.sent, true)
  dealerRejection = (await prisma.$queryRawUnsafe('SELECT * FROM "BusinessInquiryRejection" WHERE "inquiryId"=$1', 'inq-reject-dealer'))[0]
  assert.equal(dealerRejection.mailStatus, 'SENT')
  assert.equal(dealerRejection.mailError, null)
  assert.match(attempts.at(-1).subject, /再送/)

  await insertInquiry('inq-approved', 'salon', '承認済みサロン', 'approved@example.jp')
  await prisma.$executeRawUnsafe(`INSERT INTO "ManagedBusinessAccess" ("id","inquiryId","accountType","targetId","principalId","accountName","loginId","contactEmail","approvedBy") VALUES ('mba-approved','inq-approved','SALON','org-approved','user-approved','承認済みサロン','salon-approved','approved@example.jp','operations@example.jp')`)
  await assert.rejects(
    () => service.rejectInquiry('inq-approved', new URLSearchParams({ reason: '承認後の却下は不可' }), operator, request),
    error => error.code === 'already',
  )

  await insertInquiry('inq-route', 'dealer', 'API経由ディーラー', 'route-reject@example.jp')
  await withServiceServer(service, async base => {
    const crossOrigin = await fetch(base + '/api/platform/inquiries/inq-route/reject', {
      method: 'POST',
      headers: { origin: 'https://malicious.example', 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ reason: 'この要求は拒否される必要があります。' }),
      redirect: 'manual',
    })
    assert.equal(crossOrigin.status, 403)
    assert.equal((await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS "count" FROM "BusinessInquiryRejection" WHERE "inquiryId"=$1', 'inq-route'))[0].count, 0)

    const response = await fetch(base + '/api/platform/inquiries/inq-route/reject', {
      method: 'POST',
      headers: { origin: base, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ reason: 'API経由の却下理由です。' }),
      redirect: 'manual',
    })
    assert.equal(response.status, 303)
    assert.equal(response.headers.get('location'), '/platform/inquiries?rejected=1&mail=sent')
  })
  const routeRejection = (await prisma.$queryRawUnsafe('SELECT "reason","mailStatus" FROM "BusinessInquiryRejection" WHERE "inquiryId"=$1', 'inq-route'))[0]
  assert.equal(routeRejection.reason, 'API経由の却下理由です。')
  assert.equal(routeRejection.mailStatus, 'SENT')

  const safeEmail = rejectionEmail({ audience: 'salon', organizationName: '<b>テスト</b>', contactEmail: 'safe@example.jp', reason: '<script>alert(1)</script>' }, 'https://salon-de-lien.com')
  assert.doesNotMatch(safeEmail.htmlBody, /<script>alert/)
  assert.match(safeEmail.htmlBody, /&lt;script&gt;/)

  const actions = await prisma.$queryRawUnsafe('SELECT "action","targetId" FROM "BusinessAccountAction" ORDER BY "createdAt"')
  assert.equal(actions.filter(row => row.action === 'REJECT_APPLICATION').length, 3)
  assert.equal(actions.some(row => row.action === 'REJECTION_MAIL_RESENT' && row.targetId === 'inq-reject-dealer'), true)

  console.log(JSON.stringify({
    release: 'business-application-rejection-v648',
    salonRejection: true,
    dealerRejection: true,
    automaticMail: true,
    failedMailRecovery: true,
    duplicateDecisionBlocked: true,
    protectedPostRoute: true,
    auditTrail: true,
    attempts: attempts.length,
  }))
} finally {
  await prisma.$disconnect()
}
