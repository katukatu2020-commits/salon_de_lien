const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createStaffBreakCheckoutMenuService } = require('/app/staff-breaks-checkout-menu-v442.js')
const valid = { date: '2026-10-23', startMinutes: 660, durationMinutes: 60, staffKey: 'staff-1', staffName: 'Test Staff' }
async function run({ body = valid, role = 'STAFF', organizationId = 'org-1', origin = 'https://salon-de-lien.com', overlaps = [], appointments = [] } = {}) {
  const calls = []
  const prisma = {
    appointment: { async findMany(query) { assert.equal(query.where.customer.organizationId, organizationId); return appointments } },
    async $executeRawUnsafe(sql, ...args) { calls.push({ sql, args }); return [] },
    async $queryRawUnsafe(sql, ...args) {
      calls.push({ sql, args })
      if (sql.includes('FROM "StaffBookingSetting"')) return [{ staffKey: 'staff-1', staffName: 'Test Staff', workStartMinutes: 600, workEndMinutes: 1140 }]
      if (sql.includes('SELECT "id","organizationId"')) {
        assert.ok(sql.includes('"organizationId"=$2 FOR UPDATE'))
        return args[1] === 'org-1' ? [{ id: 'break-1', organizationId: 'org-1' }] : []
      }
      if (sql.includes('AND "id"<>$4 FOR UPDATE')) return overlaps
      if (sql.includes('UPDATE "StaffScheduleBreak"')) {
        assert.equal(args[6], organizationId)
        return [{ id: 'break-1', staffKey: args[0], staffName: args[1], dateKey: args[2], startMinutes: args[3], durationMinutes: args[4], createdAt: new Date() }]
      }
      return []
    },
    async $transaction(fn, options) { assert.equal(options.isolationLevel, 'Serializable'); return fn(prisma) },
  }
  const service = createStaffBreakCheckoutMenuService({ prisma, crypto: {}, clientScript: '', staffSession: async () => role ? { role, organizationId, userId: 'user-1' } : null })
  const req = { method: 'PATCH', headers: { origin, host: 'salon-de-lien.com', 'x-forwarded-proto': 'https' }, async *[Symbol.asyncIterator]() { yield Buffer.from(JSON.stringify(body)) } }
  const res = { setHeader() {}, end(value) { this.body = JSON.parse(value) } }
  await service.handle(req, res, new URL('https://salon-de-lien.com/api/admin/staff-breaks/break-1'))
  return { ...res, writes: calls.filter(c => c.sql.includes('UPDATE "StaffScheduleBreak"')) }
}
test('authorized staff moves existing break inside serializable transaction', async () => {
  const result = await run(); assert.equal(result.statusCode, 200); assert.equal(result.writes.length, 1); assert.equal(result.body.break.startMinutes, 660)
})
test('both resize directions persist start and duration without recreating breaks', async () => {
  for (const [startMinutes, durationMinutes] of [[645, 75], [660, 90], [675, 45]]) {
    const r = await run({ body: { ...valid, startMinutes, durationMinutes } }); assert.equal(r.statusCode, 200); assert.equal(r.body.break.durationMinutes, durationMinutes)
  }
})
for (const [name, options, status] of [
  ['unauthenticated', { role: null }, 401],
  ['customer', { role: 'CUSTOMER' }, 401],
  ['other organization', { organizationId: 'org-2' }, 404],
  ['cross origin', { origin: 'https://unrelated.example' }, 403],
  ['non-grid time', { body: { ...valid, startMinutes: 661 } }, 400],
  ['zero duration', { body: { ...valid, durationMinutes: 0 } }, 400],
  ['outside staff hours', { body: { ...valid, startMinutes: 585 } }, 400],
  ['overlapping break', { overlaps: [{ startMinutes: 675, durationMinutes: 60 }] }, 400],
  ['overlapping appointment', { appointments: [{ scheduledAt: new Date('2026-10-23T11:30:00+09:00'), durationMinutes: 60, staffName: 'Test Staff' }] }, 400],
]) test(name + ' cannot change a break', async () => {
  const r = await run(options); assert.equal(r.statusCode, status); assert.equal(r.writes.length, 0)
})
