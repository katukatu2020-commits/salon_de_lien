'use strict'
const { PrismaClient } = require('/app/node_modules/@prisma/client')
const db = new PrismaClient()
const org = 'org_showcase_yohaku', id = 'qa704-work-calendar-appointment'
async function run() {
  if (process.env.ORIMIA_ISOLATED_QA !== 'v680') throw Error('Isolated QA only')
  const [row] = await db.$queryRawUnsafe('SELECT current_database() AS db')
  if (row.db !== 'orimia_qa_v680_20260926') throw Error('Wrong database')
  if (process.argv[2] === 'guard') return
  if (process.argv[2] === 'busy') {
    const rows = await db.$queryRawUnsafe(`SELECT a."scheduledAt" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" WHERE c."organizationId"=$1 AND a."scheduledAt">NOW() AND (a."status" IS NULL OR a."status" NOT IN ('キャンセル','無断キャンセル'))`, org)
    console.log(JSON.stringify([...new Set(rows.map(row => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(row.scheduledAt))))]))
    return
  }
  if (process.argv[2] === 'seed') {
    const [customer] = await db.$queryRawUnsafe('SELECT "id" FROM "Customer" WHERE "organizationId"=$1 AND "deletedAt" IS NULL ORDER BY "id" LIMIT 1', org)
    await db.appointment.create({ data: { id, customerId: customer.id, scheduledAt: new Date(process.argv[3] + 'T12:00:00+09:00'), durationMinutes: 60, staffName: process.argv[4], menu: 'QA704勤務予定検証', status: '予約確定', source: 'QA704勤務予定検証' } })
  } else if (process.argv[2] === 'cleanup') {
    await db.appointment.deleteMany({ where: { id, source: 'QA704勤務予定検証', customer: { organizationId: org } } })
  } else throw Error('Unknown fixture action')
}
run().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => db.$disconnect())
