'use strict'
const crypto = require('node:crypto')
const fs = require('node:fs')
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }) }
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
function dateKey(value) {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) fail('日付を確認してください。')
  const d = new Date(value + 'T00:00:00Z')
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== value) fail('日付を確認してください。')
  return value
}
function maximumDate(date = today()) {
  const [y, m, d] = dateKey(date).split('-').map(Number)
  const last = new Date(Date.UTC(y, m + 3, 0)).getUTCDate()
  return new Date(Date.UTC(y, m + 2, Math.min(d, last))).toISOString().slice(0, 10)
}
const weekdays = value => (Array.isArray(value) ? value : String(value || '').split(',').filter(Boolean)).map(Number)
const timeMinutes = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value)) ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : null
const physical = row => (row.staffKey || row.key) !== 'free' && (row.staffName || row.name) !== 'フリー'
function effectiveRows(rows, date, plan) {
  const weekday = new Date(dateKey(date) + 'T00:00:00Z').getUTCDay()
  return rows.map(row => {
    const key = row.staffKey || row.key
    const policy = plan.policies.find(p => p.staffKey === key)
    const override = plan.overrides.find(p => p.staffKey === key && p.date === date)
    const defaultStart = timeMinutes(policy?.plannedStart) ?? Number(row.workStartMinutes)
    const defaultEnd = timeMinutes(policy?.plannedEnd) ?? Number(row.workEndMinutes)
    const isDayOff = override ? override.isDayOff : weekdays(row.closedWeekdays).includes(weekday)
    const start = override?.startMinutes ?? defaultStart, end = override?.endMinutes ?? defaultEnd
    return { ...row, isDayOff, mode: override ? (isDayOff ? 'off' : 'work') : 'default', defaultStart, defaultEnd,
      plannedStartMinutes: start, plannedEndMinutes: end,
      workStartMinutes: isDayOff ? 0 : start, workEndMinutes: isDayOff ? 0 : end,
      closedWeekdays: isDayOff ? String(weekday) : '' }
  })
}
async function loadPlan(db, org, from, to = from) {
  const policies = await db.$queryRawUnsafe('SELECT "staffKey","plannedStart","plannedEnd" FROM "StaffAttendancePolicy" WHERE "organizationId"=$1 ORDER BY "staffKey"', org)
  const overrides = await db.$queryRawUnsafe('SELECT * FROM "StaffDailySchedule" WHERE "organizationId"=$1 AND "date">=$2 AND "date"<=$3 ORDER BY "date","staffKey"', org, from, to)
  return { policies, overrides }
}
async function baseRows(db, org) {
  return db.$queryRawUnsafe('SELECT "staffKey","staffName","maxConcurrentAppointments","workStartMinutes","workEndMinutes","closedWeekdays" FROM "StaffBookingSetting" WHERE "organizationId"=$1 AND "active"=TRUE AND "onLeave"=FALSE ORDER BY "createdAt","staffName"', org)
}
async function rowsForDate(db, org, date, rows) {
  return effectiveRows(rows || await baseRows(db, org), date, await loadPlan(db, org, date))
}
async function lock(db, org, date) {
  await db.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `staff-work:${org}:${date}`)
}
function revision(plan, date) {
  return crypto.createHash('sha256').update(JSON.stringify([plan.policies, plan.overrides.filter(row => row.date === date)])).digest('hex')
}
function validateChanges(input, rows, now = today()) {
  const date = dateKey(input.date)
  if (date < now || date > maximumDate(now)) fail('勤務予定は本日から3か月先まで登録できます。')
  if (!Array.isArray(input.staff) || !input.staff.length || input.staff.length > 200) fail('スタッフを確認してください。')
  const seen = new Set()
  return input.staff.map(row => {
    if (!row || typeof row !== 'object') fail('スタッフを確認してください。')
    if (!rows.some(r => r.staffKey === row.staffKey && physical(r)) || seen.has(row.staffKey)) fail('スタッフを確認してください。')
    seen.add(row.staffKey)
    if (!['default', 'work', 'off'].includes(row.mode)) fail('勤務区分を確認してください。')
    if (row.mode === 'default') return { staffKey: row.staffKey, mode: row.mode }
    const start = row.startMinutes, end = row.endMinutes
    if (![start, end].every(v => Number.isInteger(v) && v >= 0 && v <= 1440 && (row.mode === 'off' || v % 5 === 0)) || start >= end) fail('勤務時間は5分単位で、終了を開始より後に設定してください。')
    return { staffKey: row.staffKey, mode: row.mode, startMinutes: start, endMinutes: end }
  })
}
const normalizeName = value => String(value || '').normalize('NFKC').replace(/[\s\u3000]/g, '')
async function assertExistingBookings(db, org, date, staff, previous = null) {
  const appointments = await db.$queryRawUnsafe(`SELECT a."id",a."staffName",a."scheduledAt",a."durationMinutes" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId"
    WHERE c."organizationId"=$1 AND c."deletedAt" IS NULL AND a."scheduledAt">=$2::timestamptz AND a."scheduledAt"<$3::timestamptz
    AND (a."status" IS NULL OR a."status" NOT IN ('キャンセル','無断キャンセル'))`, org, date + 'T00:00:00+09:00', date + 'T24:00:00+09:00')
  for (const appointment of appointments) {
    const minutes = timeMinutes(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(appointment.scheduledAt)))
    const candidates = normalizeName(appointment.staffName) === 'フリー' || !appointment.staffName ? staff : staff.filter(row => normalizeName(row.staffName) === normalizeName(appointment.staffName))
    const allowed = row => !row.isDayOff && minutes >= row.workStartMinutes && minutes + Number(appointment.durationMinutes || 60) <= row.workEndMinutes
    const previousCandidates = previous?.filter(row => !appointment.staffName || normalizeName(appointment.staffName) === 'フリー' || normalizeName(row.staffName) === normalizeName(appointment.staffName))
    if (candidates.length && !candidates.some(allowed) && (!previousCandidates || previousCandidates.some(allowed))) fail('勤務時間外になる既存予約があります。先に予約日時・担当者を変更してください。', 409)
  }
}
function createService({ prisma, sessionProvider, json }) {
  async function ensureSchema() {
    for (const statement of fs.readFileSync(__dirname + '/staff-work-calendar-v704.sql', 'utf8').split(';').filter(s => s.trim())) await prisma.$executeRawUnsafe(statement)
  }
  async function get(org, url, role) {
    const now = today(), max = maximumDate(now)
    const month = url.searchParams.get('month') || now.slice(0, 7)
    if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month) || month < now.slice(0, 7) || month > max.slice(0, 7)) fail('表示月は今月から3か月先まで選択してください。')
    const [y, m] = month.split('-').map(Number), count = new Date(Date.UTC(y, m, 0)).getUTCDate()
    const from = month + '-01', to = month + '-' + count
    const [base, plan, profiles, storeDays] = await Promise.all([
      baseRows(prisma, org), loadPlan(prisma, org, from, to),
      prisma.$queryRawUnsafe('SELECT "businessOpenMinutes","businessCloseMinutes","closedWeekdays" FROM "OrganizationStoreProfile" WHERE "organizationId"=$1', org),
      prisma.$queryRawUnsafe('SELECT "date","isClosed","openMinutes","closeMinutes" FROM "OrganizationDailySchedule" WHERE "organizationId"=$1 AND "date">=$2 AND "date"<=$3', org, from, to),
    ])
    const profile = profiles[0] || {}
    const days = Array.from({ length: count }, (_, i) => {
      const date = month + '-' + String(i + 1).padStart(2, '0')
      const rows = effectiveRows(base.filter(physical), date, plan)
      const store = storeDays.find(row => row.date === date)
      const storeClosed = store ? store.isClosed : weekdays(profile.closedWeekdays).includes(new Date(date + 'T00:00:00Z').getUTCDay())
      return { date, editable: date >= now && date <= max, revision: revision(plan, date), staff: rows,
        working: rows.filter(row => !row.isDayOff).length, off: rows.filter(row => row.isDayOff).length,
        storeClosed, openMinutes: store?.openMinutes ?? profile.businessOpenMinutes ?? 600, closeMinutes: store?.closeMinutes ?? profile.businessCloseMinutes ?? 1140 }
    })
    return { month, today: now, maximumDate: max, canEdit: role === 'ADMIN', days }
  }
  async function save(org, actor, input) {
    return prisma.$transaction(async db => {
      const date = dateKey(input.date)
      await lock(db, org, date)
      const base = await baseRows(db, org), changes = validateChanges(input, base)
      const plan = await loadPlan(db, org, date)
      if (typeof input.revision !== 'string' || input.revision !== revision(plan, date)) fail('別の画面で勤務予定が更新されました。再読み込みして確認してください。', 409)
      const updatedKeys = new Set(changes.map(row => row.staffKey))
      const overrides = plan.overrides.filter(row => !updatedKeys.has(row.staffKey))
      for (const row of changes) if (row.mode !== 'default') overrides.push({ ...row, date, isDayOff: row.mode === 'off' })
      await assertExistingBookings(db, org, date, effectiveRows(base.filter(physical), date, { ...plan, overrides }), effectiveRows(base.filter(physical), date, plan))
      for (const row of changes) {
        if (row.mode === 'default') await db.$executeRawUnsafe('DELETE FROM "StaffDailySchedule" WHERE "organizationId"=$1 AND "staffKey"=$2 AND "date"=$3', org, row.staffKey, date)
        else await db.$executeRawUnsafe(`INSERT INTO "StaffDailySchedule" ("organizationId","staffKey","date","isDayOff","startMinutes","endMinutes","updatedByUserId") VALUES ($1,$2,$3,$4,$5,$6,$7)
          ON CONFLICT ("organizationId","staffKey","date") DO UPDATE SET "isDayOff"=EXCLUDED."isDayOff","startMinutes"=EXCLUDED."startMinutes","endMinutes"=EXCLUDED."endMinutes","updatedByUserId"=EXCLUDED."updatedByUserId","updatedAt"=NOW()`, org, row.staffKey, date, row.mode === 'off', row.startMinutes, row.endMinutes, actor)
      }
      return { ok: true, date }
    }, { timeout: 15000 })
  }
  async function handle(req, res, url) {
    if (url.pathname !== '/api/admin/staff-work-calendar') return false
    try {
      const session = await sessionProvider(req)
      if (!session?.organizationId || !['ADMIN', 'STAFF'].includes(session.role)) fail('ログインしてください。', 401)
      if (req.method === 'GET') json(res, 200, await get(session.organizationId, url, session.role))
      else if (req.method === 'POST') {
        if (session.role !== 'ADMIN') fail('勤務予定を変更できるのはオーナーのみです。', 403)
        const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
        const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()
        if (req.headers.origin !== protocol + '://' + host) fail('不正なリクエストです。', 403)
        let raw = ''
        for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 65536) fail('入力内容が大きすぎます。', 413) }
        let input
        try { input = JSON.parse(raw) } catch { fail('入力内容を確認してください。') }
        if (!input || typeof input !== 'object') fail('入力内容を確認してください。')
        json(res, 200, await save(session.organizationId, session.userId, input))
      } else json(res, 405, { error: 'Method not allowed' })
    } catch (error) {
      console.error('[staff-work-calendar-v704]', error.message)
      json(res, error.status || 500, { error: error.status ? error.message : '勤務予定を保存・取得できませんでした。再度お試しください。' })
    }
    return true
  }
  return { ensureSchema, handle }
}
module.exports = { createService, today, maximumDate, dateKey, effectiveRows, loadPlan, rowsForDate, baseRows, lock, revision, validateChanges, assertExistingBookings }
