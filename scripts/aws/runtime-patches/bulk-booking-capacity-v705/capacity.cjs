'use strict'
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }) }
function dateKey(value) {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) fail('対象期間を確認してください。')
  const date = new Date(value + 'T00:00:00Z')
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) fail('対象期間を確認してください。')
  return value
}
function selection(input) {
  const from = dateKey(input.from), to = dateKey(input.to)
  const count = (Date.parse(to) - Date.parse(from)) / 86400000 + 1
  if (count < 1 || count > 366) fail('対象期間は開始日から366日以内で指定してください。')
  if (!Array.isArray(input.weekdays) || !input.weekdays.length || input.weekdays.length > 7 || !input.weekdays.every(day => Number.isInteger(day) && day >= 0 && day <= 6) || new Set(input.weekdays).size !== input.weekdays.length) fail('対象の曜日を選択してください。')
  if (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 99) fail('受付可能数は1〜99で設定してください。')
  const dates = []
  for (let index = 0; index < count; index++) {
    const day = new Date(Date.parse(from) + index * 86400000)
    if (input.weekdays.includes(day.getUTCDay())) dates.push(day.toISOString().slice(0, 10))
  }
  if (!dates.length) fail('対象となる日がありません。期間・曜日を確認してください。')
  return { dates, capacity: input.capacity }
}
function authorize(session, req) {
  if (!session?.organizationId || session.role !== 'ADMIN') fail('受付可能数を変更できるのはオーナーのみです。', 403)
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()
  if (req.headers.origin !== protocol + '://' + host) fail('不正なリクエストです。', 403)
}
function peakForDate(date, appointments) {
  const start = Date.parse(date + 'T00:00:00+09:00'), end = start + 86400000, events = []
  for (const appointment of appointments) {
    const from = new Date(appointment.scheduledAt).getTime()
    const to = from + Math.max(1, Number(appointment.durationMinutes) || 60) * 60000
    if (from >= end || to <= start) continue
    events.push([Math.max(from, start), 1], [Math.min(to, end), -1])
  }
  // End events precede starts at the same instant: adjacent appointments do not overlap.
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  let concurrent = 0, peak = 0
  for (const [, change] of events) { concurrent += change; peak = Math.max(peak, concurrent) }
  return peak
}
async function save({ prisma, session, req, input, businessSchedule, defaultDailyCapacity, scheduleForDate, lock }) {
  authorize(session, req)
  const { dates, capacity } = selection(input), org = session.organizationId
  return prisma.$transaction(async db => {
    for (const date of dates) await lock(db, org, date)
    const base = await businessSchedule(org, db), defaultCapacity = await defaultDailyCapacity(org, db)
    const rows = await db.$queryRawUnsafe('SELECT "date","isClosed","openMinutes","closeMinutes","capacity" FROM "OrganizationDailySchedule" WHERE "organizationId"=$1 AND "date">=$2 AND "date"<=$3', org, dates[0], dates.at(-1))
    const lookup = new Map(rows.map(row => [row.date, row]))
    const appointments = await db.$queryRawUnsafe(`SELECT a."scheduledAt",a."durationMinutes" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId"
      WHERE c."organizationId"=$1 AND c."deletedAt" IS NULL AND a."scheduledAt"<$3::timestamptz
      AND a."scheduledAt" + COALESCE(a."durationMinutes",60) * INTERVAL '1 minute' > $2::timestamptz
      AND (a."status" IS NULL OR a."status" NOT IN ('キャンセル','無断キャンセル'))`, org, dates[0] + 'T00:00:00+09:00', dates.at(-1) + 'T24:00:00+09:00')
    const days = dates.map(date => ({ date, ...scheduleForDate(base, lookup.get(date), date, defaultCapacity) }))
    for (const day of days) {
      const peak = peakForDate(day.date, appointments)
      if (capacity < day.capacity && capacity < peak) fail(day.date + 'は同時刻に' + peak + '件の予約があります。受付可能数を' + peak + '以上にしてください。変更は保存されていません。', 409)
    }
    for (const day of days) {
      // Existing date-specific hours and holidays must never be overwritten by this operation.
      await db.$executeRawUnsafe(`INSERT INTO "OrganizationDailySchedule" ("organizationId","date","isClosed","openMinutes","closeMinutes","capacity","updatedByUserId","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
        ON CONFLICT ("organizationId","date") DO UPDATE SET "capacity"=EXCLUDED."capacity","updatedByUserId"=EXCLUDED."updatedByUserId","updatedAt"=NOW()`, org, day.date, day.isClosed, day.openMinutes, day.closeMinutes, capacity, session.userId || null)
    }
    return { success: true, count: dates.length, dates, capacity }
  }, { timeout: 30000 })
}
module.exports = { dateKey, selection, authorize, peakForDate, save }
