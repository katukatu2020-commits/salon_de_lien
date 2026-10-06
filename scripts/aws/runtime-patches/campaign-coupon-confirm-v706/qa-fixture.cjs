'use strict'
const { PrismaClient } = require('/app/node_modules/@prisma/client')
const db = new PrismaClient(), org = 'org_showcase_yohaku', title = 'QA-v706 配信確認'
async function run() {
  if (process.env.ORIMIA_ISOLATED_QA !== 'v680') throw Error('Isolated QA only')
  const [database] = await db.$queryRawUnsafe('SELECT current_database() AS db')
  if (database.db !== 'orimia_qa_v680_20260926') throw Error('Wrong database')
  if (process.argv[2] === 'customers') return console.log(JSON.stringify(await db.customer.findMany({ where: { organizationId: org, deletedAt: null, storeHiddenAt: null }, select: { id: true, name: true }, orderBy: { id: 'asc' }, take: 2 })))
  const rows = await db.customerBroadcast.findMany({ where: { organizationId: org, title }, include: { recipients: true } })
  if (process.argv[2] === 'status') return console.log(JSON.stringify(rows))
  if (process.argv[2] !== 'restore') throw Error('Unknown fixture action')
  await db.$transaction(async tx => {
    const ids = rows.map(row => row.id), coupons = rows.flatMap(row => row.recipients.map(r => r.couponIssueId).filter(Boolean))
    await tx.customerBroadcastRecipient.deleteMany({ where: { broadcastId: { in: ids } } })
    await tx.customerBroadcast.deleteMany({ where: { organizationId: org, id: { in: ids } } })
    await tx.couponIssue.deleteMany({ where: { id: { in: coupons }, customer: { organizationId: org } } })
  })
}
run().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => db.$disconnect())
