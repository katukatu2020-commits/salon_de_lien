import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { createStaffBreakCheckoutMenuService } = require('/app/staff-breaks-checkout-menu-v442.js')

function request(body) {
  const payload = Buffer.from(JSON.stringify(body))
  return {
    method: 'PATCH',
    headers: {},
    async *[Symbol.asyncIterator]() { yield payload },
  }
}

function response() {
  return {
    statusCode: 0,
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    end(value) { this.body = JSON.parse(value) },
  }
}

function prismaMock({ appointments = [] } = {}) {
  const calls = []
  const prisma = {
    calls,
    appointment: { async findMany() { return appointments } },
    async $executeRawUnsafe(sql, ...args) { calls.push({ type: 'execute', sql, args }); return [] },
    async $queryRawUnsafe(sql, ...args) {
      calls.push({ type: 'query', sql, args })
      if (sql.includes('FROM "StaffBookingSetting"')) {
        return [{
          staffKey: 'staff-1', staffName: '高瀬 美月', maxConcurrentAppointments: 1,
          workStartMinutes: 480, workEndMinutes: 1140, closedWeekdays: [],
        }]
      }
      if (sql.includes('SELECT "id","organizationId" FROM "StaffScheduleBreak"')) return [{ id: 'break-1', organizationId: 'org-1' }]
      if (sql.includes('AND "id"<>$4 FOR UPDATE')) return []
      if (sql.includes('UPDATE "StaffScheduleBreak"')) {
        return [{
          id: 'break-1', staffKey: args[0], staffName: args[1], dateKey: args[2],
          startMinutes: args[3], durationMinutes: args[4], note: null, createdAt: new Date('2026-08-29T00:00:00Z'),
        }]
      }
      return []
    },
    async $transaction(callback) { return callback(prisma) },
  }
  return prisma
}

function service(prisma) {
  return createStaffBreakCheckoutMenuService({
    prisma,
    crypto: { randomUUID: () => 'unused' },
    staffSession: async () => ({ role: 'ADMIN', organizationId: 'org-1', userId: 'user-1' }),
    clientScript: '',
  })
}

{
  const prisma = prismaMock()
  const res = response()
  const handled = await service(prisma).handle(
    request({ date: '2026-08-29', startMinutes: 780, durationMinutes: 45, staffKey: 'staff-1', staffName: '高瀬 美月' }),
    res,
    new URL('https://salon-de-lien.com/api/admin/staff-breaks/break-1'),
  )
  assert.equal(handled, true)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.success, true)
  assert.equal(res.body.break.startMinutes, 780)
  assert.equal(res.body.break.durationMinutes, 45)
  const update = prisma.calls.find(call => call.sql.includes('UPDATE "StaffScheduleBreak"'))
  assert.ok(update, 'the existing break must be updated instead of recreated')
  assert.deepEqual(update.args.slice(0, 5), ['staff-1', '高瀬 美月', '2026-08-29', 780, 45])
}

{
  const prisma = prismaMock()
  const res = response()
  await service(prisma).handle(
    request({ date: '2026-08-29', startMinutes: 785, durationMinutes: 45, staffKey: 'staff-1', staffName: '高瀬 美月' }),
    res,
    new URL('https://salon-de-lien.com/api/admin/staff-breaks/break-1'),
  )
  assert.equal(res.statusCode, 400)
  assert.match(res.body.error, /開始時刻/)
  assert.equal(prisma.calls.some(call => call.sql.includes('UPDATE "StaffScheduleBreak"')), false)
}

console.log('shift LINE and break interaction v461 transaction tests passed (2 cases)')
