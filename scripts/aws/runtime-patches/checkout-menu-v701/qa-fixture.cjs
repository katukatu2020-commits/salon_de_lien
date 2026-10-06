'use strict'
const assert = require('node:assert/strict')
const { PrismaClient } = require('/app/node_modules/@prisma/client')
const db = new PrismaClient()
async function main() {
  assert.equal(process.env.ORIMIA_ISOLATED_QA, 'v680')
  const [{ db: name }] = await db.$queryRawUnsafe('SELECT current_database() AS db')
  assert.equal(name, 'orimia_qa_v680_20260926')
  const suffix = process.argv[2] || Date.now().toString()
  assert.match(suffix, /^[a-z0-9-]+$/)
  const customerId = 'qa701-customer-' + suffix, id = 'qa701-appointment-' + suffix
  await db.customer.create({ data: { id: customerId, organizationId: 'org_showcase_yohaku', name: '会計検証701', assignedStaffName: '雨宮 透' } })
  await db.appointment.create({ data: { id, customerId, scheduledAt: new Date('2026-10-20T02:00:00Z'), durationMinutes: 60, staffName: '雨宮 透', menu: '頭皮リセットスパ', estimatedPrice: 4400, status: '予約確定', bookingProvider: 'hotpepper', note: '取込内容要確認: 検証用の予約です。' } })
  console.log(JSON.stringify({ id, customerId }))
}
main().catch(error => { console.error(error.message); process.exitCode = 1 }).finally(() => db.$disconnect())
