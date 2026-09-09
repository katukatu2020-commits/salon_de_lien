'use strict'
async function customerSummaryV601(prisma, session, membershipCode) {
  const [customers, visits, appointments, accounts] = await Promise.all([
    prisma.$queryRawUnsafe('SELECT "name" FROM "Customer" WHERE "organizationId"=$1 AND "id"=$2 AND "deletedAt" IS NULL',session.organizationId,session.customerId),
    prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS "count",MAX(v."visitedAt") AS "lastVisit" FROM "Visit" v JOIN "Customer" c ON c."id"=v."customerId" WHERE c."organizationId"=$1 AND c."id"=$2',session.organizationId,session.customerId),
    prisma.$queryRawUnsafe('SELECT a."id",a."scheduledAt",a."menu",a."staffName" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" WHERE c."organizationId"=$1 AND c."id"=$2 AND a."scheduledAt">=CURRENT_TIMESTAMP AND a."status" NOT IN (\'キャンセル\',\'キャンセル済み\',\'無断キャンセル\',\'来店済み\') ORDER BY a."scheduledAt" LIMIT 1',session.organizationId,session.customerId),
    prisma.$queryRawUnsafe('SELECT "availablePoints" FROM "CustomerPointAccount" WHERE "customerId"=$1',session.customerId),
  ])
  if (!customers[0]) return null
  return { name:customers[0].name, membershipCode, visitCount:visits[0]?.count || 0, lastVisit:visits[0]?.lastVisit || null, appointment:appointments[0] || null, points:accounts[0]?.availablePoints || 0 }
}
module.exports = { customerSummaryV601 }
