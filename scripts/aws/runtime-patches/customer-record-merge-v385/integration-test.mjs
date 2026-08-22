import crypto from 'node:crypto'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3001'
const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 12)
const targetId = `merge_test_target_${suffix}`
const sourceId = `merge_test_source_${suffix}`
const targetAccountId = `merge_test_pa_target_${suffix}`
const sourceAccountId = `merge_test_pa_source_${suffix}`
const transactionId = `merge_test_pt_${suffix}`
const lotId = `merge_test_lot_${suffix}`
const appointmentId = `merge_test_appt_${suffix}`
const saleId = `merge_test_sale_${suffix}`
const targetThreadId = `merge_test_thread_target_${suffix}`
const sourceThreadId = `merge_test_thread_source_${suffix}`
const messageId = `merge_test_message_${suffix}`

function adminCookie(user) {
  const payload = Buffer.from(JSON.stringify({
    version: 2,
    role: user.role,
    userId: user.id,
    organizationId: user.organizationId,
    subject: user.loginId || user.email,
    expiresAt: Math.floor(Date.now() / 1000) + 300,
  })).toString('base64url')
  const signature = crypto.createHmac('sha256', process.env.ADMIN_AUTH_SECRET).update(payload).digest('base64url')
  return `lien_admin_session=${payload}.${signature}`
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

let organizationId
try {
  const admin = await prisma.appUser.findFirst({
    where: { role: { in: ['ADMIN', 'STAFF'] }, active: true, organizationId: { not: null } },
  })
  assert(admin?.organizationId, 'integration test requires an active staff account')
  organizationId = admin.organizationId

  await prisma.customer.createMany({ data: [
    { id: targetId, organizationId, name: `統合先テスト${suffix}`, gender: '女性' },
    { id: sourceId, organizationId, name: `重複テスト${suffix}`, phone: '09000000000' },
  ] })
  await prisma.customerPointAccount.createMany({ data: [
    { id: targetAccountId, customerId: targetId, availablePoints: 100, lifetimeEarned: 100 },
    { id: sourceAccountId, customerId: sourceId, availablePoints: 40, pendingPoints: 5, lifetimeEarned: 45 },
  ] })
  await prisma.pointTransaction.create({ data: {
    id: transactionId,
    customerId: sourceId,
    accountId: sourceAccountId,
    type: 'earn',
    amount: 40,
    balanceAfter: 40,
    sourceType: 'customer-merge-integration-test',
    sourceId: suffix,
    reason: 'customer merge integration test',
  } })
  await prisma.pointLot.create({ data: {
    id: lotId,
    customerId: sourceId,
    earnTransactionId: transactionId,
    originalAmount: 40,
    remainingAmount: 40,
    expiresAt: new Date(Date.now() + 86_400_000),
  } })
  await prisma.appointment.create({ data: {
    id: appointmentId,
    customerId: sourceId,
    scheduledAt: new Date(Date.now() + 86_400_000),
    menu: '統合テスト',
  } })
  await prisma.serviceSale.create({ data: {
    id: saleId,
    customerId: sourceId,
    appointmentId,
    title: '統合テスト会計',
    amount: 5500,
  } })
  await prisma.$executeRawUnsafe(`INSERT INTO "ChatThread" ("id","organizationId","customerId","staffKey","staffName","status","createdAt","updatedAt")
    VALUES ($1,$2,$3,'merge-test-staff','統合テスト担当','open',NOW(),NOW()),($4,$2,$5,'merge-test-staff','統合テスト担当','open',NOW(),NOW())`,
  targetThreadId, organizationId, targetId, sourceThreadId, sourceId)
  await prisma.$executeRawUnsafe(`INSERT INTO "ChatMessage" ("id","threadId","senderType","body","createdAt")
    VALUES ($1,$2,'customer','統合テストメッセージ',NOW())`, messageId, sourceThreadId)

  const response = await fetch(`${baseUrl}/api/admin/customers/${encodeURIComponent(targetId)}/merge`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: adminCookie(admin),
    },
    body: JSON.stringify({
      sourceCustomerId: sourceId,
      confirmationName: `重複テスト${suffix}`,
      confirmed: true,
    }),
  })
  const body = await response.json()
  assert(response.ok, `merge API failed: ${response.status} ${body.error || ''}`)

  const [source, targetAccount, transaction, lot, appointment, sale, message, sourceThread, history] = await Promise.all([
    prisma.customer.findUnique({ where: { id: sourceId } }),
    prisma.customerPointAccount.findUnique({ where: { customerId: targetId } }),
    prisma.pointTransaction.findUnique({ where: { id: transactionId } }),
    prisma.pointLot.findUnique({ where: { id: lotId } }),
    prisma.appointment.findUnique({ where: { id: appointmentId } }),
    prisma.serviceSale.findUnique({ where: { id: saleId } }),
    prisma.$queryRawUnsafe('SELECT * FROM "ChatMessage" WHERE "id"=$1', messageId),
    prisma.$queryRawUnsafe('SELECT * FROM "ChatThread" WHERE "id"=$1', sourceThreadId),
    prisma.$queryRawUnsafe('SELECT * FROM "CustomerMergeHistory" WHERE "sourceCustomerId"=$1', sourceId),
  ])

  assert(source?.storeHiddenAt, 'absorbed customer must be hidden from store screens')
  assert(targetAccount?.availablePoints === 140 && targetAccount?.pendingPoints === 5, 'point balances must be combined')
  assert(transaction?.customerId === targetId && transaction?.accountId === targetAccountId, 'point transaction must move to retained account')
  assert(lot?.customerId === targetId, 'point lot must move to retained customer')
  assert(appointment?.customerId === targetId, 'appointment must move to retained customer')
  assert(sale?.customerId === targetId, 'service sale must move to retained customer')
  assert(message[0]?.threadId === targetThreadId && sourceThread.length === 0, 'chat messages must merge without duplicate thread')
  assert(history.length === 1, 'merge must be recorded exactly once')

  console.log(JSON.stringify({ ok: true, targetId, sourceId, verified: ['points', 'appointment', 'sale', 'chat', 'audit', 'store-hidden'] }))
} finally {
  try { await prisma.$executeRawUnsafe('DELETE FROM "CustomerMergeHistory" WHERE "sourceCustomerId"=$1 OR "targetCustomerId"=$1', sourceId) } catch {}
  if (organizationId) {
    await prisma.customer.deleteMany({ where: { id: { in: [sourceId, targetId] }, organizationId } }).catch(() => {})
  }
  await prisma.$disconnect()
}
