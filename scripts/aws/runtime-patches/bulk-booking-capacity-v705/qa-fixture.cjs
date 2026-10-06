'use strict'
const fs = require('node:fs')
const { PrismaClient } = require('/app/node_modules/@prisma/client')
const db = new PrismaClient(), org = 'org_showcase_yohaku', from = '2026-10-31', to = '2026-11-09', backup = '/tmp/qa705-schedules.json'
const source = 'QA705受付可能数検証'
async function run() {
  if (process.env.ORIMIA_ISOLATED_QA !== 'v680') throw Error('Isolated QA only')
  const [database] = await db.$queryRawUnsafe('SELECT current_database() AS db')
  if (database.db !== 'orimia_qa_v680_20260926') throw Error('Wrong database')
  const action = process.argv[2]
  if (action === 'guard') return
  if (action === 'prepare') {
    if (fs.existsSync(backup)) throw Error('Restore previous QA snapshot first')
    const busy = await db.appointment.count({ where: { customer: { organizationId: org }, scheduledAt: { gte: new Date(from + 'T00:00:00+09:00'), lt: new Date(to + 'T24:00:00+09:00') } } })
    if (busy) throw Error('Choose an unbooked QA date range')
    const days = await db.$queryRawUnsafe('SELECT * FROM "OrganizationDailySchedule" WHERE "organizationId"=$1 AND "date">=$2 AND "date"<=$3 ORDER BY "date"', org, from, to)
    fs.writeFileSync(backup, JSON.stringify({ org, from, to, days }), { flag: 'wx' })
    for (const [date, closed] of [['2026-11-03', false], ['2026-11-04', true]]) await db.$executeRawUnsafe(`INSERT INTO "OrganizationDailySchedule" ("organizationId","date","isClosed","openMinutes","closeMinutes","capacity") VALUES ($1,$2,$3,660,1020,5) ON CONFLICT ("organizationId","date") DO UPDATE SET "isClosed"=$3,"openMinutes"=660,"closeMinutes"=1020,"capacity"=5`, org, date, closed)
  } else if (action === 'seed') {
    const [customer] = await db.$queryRawUnsafe('SELECT "id" FROM "Customer" WHERE "organizationId"=$1 AND "deletedAt" IS NULL ORDER BY "id" LIMIT 1', org)
    for (const [index, staffName] of ['雨宮 透','高瀬 美月','真鍋 蓮'].entries()) await db.appointment.create({ data: { id: 'qa705-capacity-' + index, customerId: customer.id, scheduledAt: new Date('2026-11-05T12:' + String(index * 15).padStart(2, '0') + ':00+09:00'), durationMinutes: 60, staffName, menu: source, status: '予約確定', source } })
  } else if (action === 'restore') {
    await db.appointment.deleteMany({ where: { source, id: { startsWith: 'qa705-capacity-' }, customer: { organizationId: org } } })
    if (!fs.existsSync(backup)) return
    const snapshot = JSON.parse(fs.readFileSync(backup, 'utf8'))
    if (snapshot.org !== org || snapshot.from !== from || snapshot.to !== to) throw Error('Wrong QA snapshot')
    await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('DELETE FROM "OrganizationDailySchedule" WHERE "organizationId"=$1 AND "date">=$2 AND "date"<=$3', org, from, to)
      for (const day of snapshot.days) await tx.$executeRawUnsafe('INSERT INTO "OrganizationDailySchedule" ("organizationId","date","isClosed","openMinutes","closeMinutes","capacity","updatedByUserId","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8::timestamptz,$9::timestamptz)', org, day.date, day.isClosed, day.openMinutes, day.closeMinutes, day.capacity, day.updatedByUserId, day.createdAt, day.updatedAt)
    })
    fs.unlinkSync(backup)
  } else throw Error('Unknown fixture action')
}
run().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => db.$disconnect())
