import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const servicePath = `${root}/attendance-history-editor-v497.js`
const require = createRequire(import.meta.url)
const { createAttendanceNotificationProductService, __test } = require(servicePath)

const valid = __test.validateClosedInterval('2026-08-29T22:00', '2026-08-30T02:00', new Date('2026-08-30T12:00:00+09:00'))
assert.equal(valid.workDate, '2026-08-29')
assert.equal(valid.clockOutAt.getTime() - valid.clockInAt.getTime(), 4 * 60 * 60 * 1000)
assert.throws(() => __test.validateClosedInterval('2026-08-30T10:00', '2026-08-30T09:00'), /退勤時刻/)
assert.throws(() => __test.validateClosedInterval('2026-02-30T10:00', '2026-02-30T11:00'), /出勤時刻/)

function response() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = String(value) },
    end(value = '') { this.body += String(value) },
  }
}

function request(method, body) {
  const raw = body === undefined ? [] : [Buffer.from(JSON.stringify(body))]
  return {
    method,
    headers: { origin: 'https://salon-de-lien.com', host: 'salon-de-lien.com', 'x-forwarded-proto': 'https' },
    async *[Symbol.asyncIterator]() { for (const chunk of raw) yield chunk },
  }
}

const session = { userId: 'owner-1', organizationId: 'org-1', role: 'ADMIN' }
const getQueries = []
const getPrisma = {
  async $executeRawUnsafe() { return 0 },
  async $queryRawUnsafe(sql) {
    getQueries.push(sql)
    if (sql.includes('FROM "StaffBookingSetting"') && sql.includes('AS "displayName"') && !sql.includes('LEFT JOIN LATERAL')) return [{ id: 'staff-1', staffKey: 'staff-1', displayName: '担当者' }]
    if (sql.includes('SELECT r.*')) return []
    if (sql.includes('GROUP BY r."staffKey"')) return []
    if (sql.includes('LEFT JOIN LATERAL')) return [{ userId: 'staff-1', staffKey: 'staff-1', displayName: '担当者', id: 'open-1', workDate: '2026-08-29', clockInAt: '2026-08-29T23:00:00.000Z', clockOutAt: null }]
    if (sql.includes('FROM "StaffAttendancePolicy"')) return []
    throw new Error(`unexpected GET query: ${sql.slice(0, 100)}`)
  },
}
const getService = createAttendanceNotificationProductService({ prisma: getPrisma, crypto: { randomUUID: () => 'test' }, sessionProvider: async () => session })
const getRes = response()
assert.equal(await getService.handle(request('GET'), getRes, new URL('https://salon-de-lien.com/api/admin/attendance?month=2026-08')), true)
assert.equal(getRes.statusCode, 200)
assert.equal(JSON.parse(getRes.body).today[0].workDate, '2026-08-29')
assert.ok(getQueries.some(sql => sql.includes('(x."clockOutAt" IS NULL OR x."workDate"=$2)')), 'cross-day open shift must be selected for the clock view')

const updateQueries = []
const updatePrisma = {
  async $executeRawUnsafe() { return 1 },
  async $queryRawUnsafe(sql) {
    updateQueries.push(sql)
    if (sql.includes('FROM "StaffBookingSetting"')) return [{ staffKey: 'staff-1', staffName: '担当者' }]
    if (sql.includes('SELECT "id","staffKey","breakStartedAt"')) return [{ id: 'record-1', staffKey: 'staff-1', breakStartedAt: null, breakEndedAt: null, breakSeconds: 0 }]
    if (sql.includes('COALESCE("clockOutAt"')) return []
    if (sql.startsWith('UPDATE "StaffAttendanceRecord"')) return [{ id: 'record-1' }]
    throw new Error(`unexpected update query: ${sql.slice(0, 100)}`)
  },
}
const updateService = createAttendanceNotificationProductService({ prisma: updatePrisma, crypto: { randomUUID: () => 'test' }, sessionProvider: async () => session })
const updateRes = response()
await updateService.handle(request('POST', {
  action: 'save_record',
  staffKey: 'staff-1',
  recordId: 'record-1',
  clockInLocal: '2026-08-29T10:00',
  clockOutLocal: '2026-08-29T18:00',
}), updateRes, new URL('https://salon-de-lien.com/api/admin/attendance'))
assert.equal(updateRes.statusCode, 200)
assert.equal(JSON.parse(updateRes.body).message, '勤務時間を更新しました。')
assert.ok(updateQueries.some(sql => sql.includes('"manuallyEditedAt"=NOW()')), 'manual edit audit timestamp must be persisted')

const source = fs.readFileSync(servicePath, 'utf8')
const clockOutSql = source.match(/if \(action === 'clock_out'\)[\s\S]*?if \(action === 'break_start'\)/)?.[0] || ''
assert.match(clockOutSql, /"clockOutAt" IS NULL/)
assert.doesNotMatch(clockOutSql, /"workDate"=/)
assert.match(source, /同じスタッフの勤務時間が重複しています。/)

console.log('attendance-history-editor-v497 behavior tests passed')
