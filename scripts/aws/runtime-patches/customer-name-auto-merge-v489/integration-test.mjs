import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { PrismaClient } from '@prisma/client'

const require = createRequire(import.meta.url)
const servicePath = process.env.LIEN_CUSTOMER_NAME_MERGE_SERVICE || '/app/customer-name-auto-merge-v489.js'
const { createCustomerNameAutoMergeService } = require(servicePath)
const prisma = new PrismaClient()
const service = createCustomerNameAutoMergeService({ prisma, crypto: { randomUUID } })

try {
  await service.ensureSchema()
  await prisma.organization.createMany({
    data: [
      { id: 'org-name-merge-a', slug: 'name-merge-a', name: 'Name merge A' },
      { id: 'org-name-merge-b', slug: 'name-merge-b', name: 'Name merge B' },
    ],
  })
  const target = await prisma.customer.create({
    data: { id: 'customer-target', organizationId: 'org-name-merge-a', name: '山本 小太郎', memo: '既存カルテ', createdAt: new Date('2024-01-01T00:00:00Z') },
  })
  const source = await prisma.customer.create({
    data: { id: 'customer-source', organizationId: 'org-name-merge-a', name: '山本－小太郎', phone: '090-1234-5678', memo: '予約時情報', createdAt: new Date('2025-01-01T00:00:00Z') },
  })
  const otherStore = await prisma.customer.create({
    data: { id: 'customer-other-store', organizationId: 'org-name-merge-b', name: '山本-小太郎' },
  })

  const appointment = await prisma.appointment.create({
    data: { id: 'appointment-source', customerId: source.id, scheduledAt: new Date('2026-09-01T01:00:00Z'), menu: 'カット', status: '予約確定' },
  })
  await prisma.visit.create({ data: { id: 'visit-source', customerId: source.id, visitedAt: new Date('2026-08-01T01:00:00Z') } })
  await prisma.serviceSale.create({ data: { id: 'sale-source', customerId: source.id, appointmentId: appointment.id, title: 'カット', amount: 5500 } })

  const targetAccount = await prisma.customerPointAccount.create({ data: { id: 'points-target', customerId: target.id, availablePoints: 10, lifetimeEarned: 10 } })
  const sourceAccount = await prisma.customerPointAccount.create({ data: { id: 'points-source', customerId: source.id, availablePoints: 20, lifetimeEarned: 20 } })
  const pointTransaction = await prisma.pointTransaction.create({
    data: { id: 'point-source', customerId: source.id, accountId: sourceAccount.id, type: 'earn', amount: 20, balanceAfter: 20, sourceType: 'test', sourceId: 'source', reason: 'integration test' },
  })
  await prisma.pointLot.create({ data: { id: 'lot-source', customerId: source.id, earnTransactionId: pointTransaction.id, originalAmount: 20, remainingAmount: 20, expiresAt: new Date('2027-01-01T00:00:00Z') } })

  await prisma.$executeRawUnsafe(`INSERT INTO "ChatThread" ("id","organizationId","customerId","staffKey","staffName","createdAt","updatedAt") VALUES
    ('thread-target','org-name-merge-a',$1,'staff-a','担当A',NOW(),NOW()),
    ('thread-source','org-name-merge-a',$2,'staff-a','担当A',NOW(),NOW())`, target.id, source.id)
  await prisma.$executeRawUnsafe(`INSERT INTO "ChatMessage" ("id","threadId","senderType","body","createdAt") VALUES ('message-source','thread-source','customer','統合対象メッセージ',NOW())`)
  await prisma.$executeRawUnsafe(`INSERT INTO "CustomerLineIdentity" ("id","organizationId","customerId","lineUserId","followed","lastSeenAt","createdAt","updatedAt") VALUES ('line-source','org-name-merge-a',$1,'line-user-source',TRUE,NOW(),NOW(),NOW())`, source.id)

  await prisma.$executeRawUnsafe(`INSERT INTO "CustomerCampaign" ("id","organizationId","title","summary","body","startsAt","endsAt","status","createdAt","updatedAt")
    VALUES ('campaign-test','org-name-merge-a','test','test','test','2026-01-01','2027-01-01','published',NOW(),NOW())`)
  await prisma.$executeRawUnsafe(`INSERT INTO "CustomerCampaignRecipient" ("id","campaignId","customerId","deliveredAt") VALUES
    ('recipient-target','campaign-test',$1,NOW()),('recipient-source','campaign-test',$2,NOW())`, target.id, source.id)

  const resolved = await prisma.$transaction(transaction => service.resolveOrCreate(transaction, {
    organizationId: 'org-name-merge-a',
    existingCustomerId: source.id,
    preferredCustomerId: target.id,
    name: ' 山本－小太郎 ',
    phone: '090-1234-5678',
    actorLabel: 'integration-test',
  }), { isolationLevel: 'Serializable', timeout: 30000 })

  assert.equal(resolved.id, target.id)
  const [targetAfter, sourceAfterRows, movedAppointment, movedSale, movedVisit, pointsAfter, movedPoint, movedLot, targetThreads, movedMessageRows, lineIdentityRows, recipients, history, otherStoreAfterRows] = await Promise.all([
    prisma.customer.findUnique({ where: { id: target.id } }),
    prisma.$queryRawUnsafe('SELECT "storeHiddenAt" FROM "Customer" WHERE "id"=$1', source.id),
    prisma.appointment.findUnique({ where: { id: appointment.id } }),
    prisma.serviceSale.findUnique({ where: { id: 'sale-source' } }),
    prisma.visit.findUnique({ where: { id: 'visit-source' } }),
    prisma.customerPointAccount.findUnique({ where: { id: targetAccount.id } }),
    prisma.pointTransaction.findUnique({ where: { id: pointTransaction.id } }),
    prisma.pointLot.findUnique({ where: { id: 'lot-source' } }),
    prisma.$queryRawUnsafe('SELECT "id" FROM "ChatThread" WHERE "customerId"=$1', target.id),
    prisma.$queryRawUnsafe('SELECT "threadId" FROM "ChatMessage" WHERE "id"=\'message-source\''),
    prisma.$queryRawUnsafe('SELECT "customerId" FROM "CustomerLineIdentity" WHERE "id"=\'line-source\''),
    prisma.$queryRawUnsafe('SELECT "customerId" FROM "CustomerCampaignRecipient" WHERE "campaignId"=\'campaign-test\''),
    prisma.$queryRawUnsafe('SELECT * FROM "CustomerMergeHistory" WHERE "sourceCustomerId"=$1', source.id),
    prisma.$queryRawUnsafe('SELECT "storeHiddenAt" FROM "Customer" WHERE "id"=$1', otherStore.id),
  ])
  assert.equal(targetAfter.phone, '090-1234-5678')
  assert.match(targetAfter.memo, /既存カルテ/)
  assert.match(targetAfter.memo, /予約時情報/)
  assert.ok(sourceAfterRows[0].storeHiddenAt)
  assert.equal(movedAppointment.customerId, target.id)
  assert.equal(movedSale.customerId, target.id)
  assert.equal(movedVisit.customerId, target.id)
  assert.equal(pointsAfter.availablePoints, 30)
  assert.equal(movedPoint.customerId, target.id)
  assert.equal(movedPoint.accountId, targetAccount.id)
  assert.equal(movedLot.customerId, target.id)
  assert.equal(targetThreads.length, 1)
  assert.equal(movedMessageRows[0].threadId, targetThreads[0].id)
  assert.equal(lineIdentityRows[0].customerId, target.id)
  assert.equal(recipients.length, 1)
  assert.equal(recipients[0].customerId, target.id)
  assert.equal(history.length, 1)
  assert.equal(otherStoreAfterRows[0].storeHiddenAt, null)

  const secondResolution = await prisma.$transaction(transaction => service.resolveOrCreate(transaction, {
    organizationId: 'org-name-merge-a', name: '山本‐小太郎', actorLabel: 'integration-test-repeat',
  }), { isolationLevel: 'Serializable', timeout: 30000 })
  assert.equal(secondResolution.id, target.id)
  assert.equal(await prisma.customer.count({ where: { organizationId: 'org-name-merge-a', deletedAt: null, storeHiddenAt: null } }), 1)

  console.log('customer name auto merge v489 PostgreSQL integration test passed')
} finally {
  await prisma.$disconnect()
}
