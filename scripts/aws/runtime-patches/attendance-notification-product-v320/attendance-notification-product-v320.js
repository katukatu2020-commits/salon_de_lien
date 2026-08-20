'use strict'

const SESSION_COOKIE = 'lien_admin_session'

function json(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(payload))
}

async function readJson(req, limit = 65536) {
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (Buffer.byteLength(raw, 'utf8') > limit) throw Object.assign(new Error('入力内容が大きすぎます。'), { status: 413 })
  }
  try { return raw ? JSON.parse(raw) : {} } catch { throw Object.assign(new Error('入力内容を確認してください。'), { status: 400 }) }
}

function sameOrigin(req) {
  const origin = String(req.headers.origin || '')
  if (!origin) return false
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()
  return origin === `${protocol}://${host}` || origin === 'https://salon-de-lien.com'
}

function tokyoDate(value = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value)
}

function validMonth(value) {
  const month = String(value || '')
  return /^20\d{2}-(0[1-9]|1[0-2])$/.test(month) ? month : tokyoDate().slice(0, 7)
}

function createAttendanceNotificationProductService({ prisma, crypto, sessionProvider }) {
  async function ensureSchema() {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StaffAttendanceRecord" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "staffKey" TEXT NOT NULL,
      "staffName" TEXT NOT NULL,
      "recordedByUserId" TEXT,
      "workDate" TEXT NOT NULL,
      "clockInAt" TIMESTAMPTZ NOT NULL,
      "breakStartedAt" TIMESTAMPTZ,
      "breakEndedAt" TIMESTAMPTZ,
      "clockOutAt" TIMESTAMPTZ,
      "note" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`)
    await prisma.$executeRawUnsafe(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='StaffAttendanceRecord' AND column_name='userId') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='StaffAttendanceRecord' AND column_name='staffKey') THEN ALTER TABLE "StaffAttendanceRecord" RENAME COLUMN "userId" TO "staffKey"; END IF; END $$`)
    await prisma.$executeRawUnsafe('ALTER TABLE "StaffAttendanceRecord" ADD COLUMN IF NOT EXISTS "staffName" TEXT')
    await prisma.$executeRawUnsafe('ALTER TABLE "StaffAttendanceRecord" ADD COLUMN IF NOT EXISTS "recordedByUserId" TEXT')
    await prisma.$executeRawUnsafe('UPDATE "StaffAttendanceRecord" r SET "staffName"=COALESCE(r."staffName",s."staffName",r."staffKey") FROM "StaffBookingSetting" s WHERE s."organizationId"=r."organizationId" AND s."staffKey"=r."staffKey" AND r."staffName" IS NULL')
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StaffAttendanceRecord_org_date_idx" ON "StaffAttendanceRecord"("organizationId","workDate","clockInAt")')
    await prisma.$executeRawUnsafe('DROP INDEX IF EXISTS "StaffAttendanceRecord_org_user_date_key"')
    await prisma.$executeRawUnsafe('DROP INDEX IF EXISTS "StaffAttendanceRecord_open_shift_key"')
    await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "StaffAttendanceRecord_org_staff_date_key" ON "StaffAttendanceRecord"("organizationId","staffKey","workDate")')
    await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "StaffAttendanceRecord_open_staff_key" ON "StaffAttendanceRecord"("organizationId","staffKey") WHERE "clockOutAt" IS NULL')
    await prisma.$executeRawUnsafe('ALTER TABLE "StaffAttendanceRecord" ADD COLUMN IF NOT EXISTS "breakStartedAt" TIMESTAMPTZ')
    await prisma.$executeRawUnsafe('ALTER TABLE "StaffAttendanceRecord" ADD COLUMN IF NOT EXISTS "breakEndedAt" TIMESTAMPTZ')
    await prisma.$executeRawUnsafe('ALTER TABLE "StaffAttendanceRecord" ADD COLUMN IF NOT EXISTS "note" TEXT')
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StaffAttendancePolicy" (
      "organizationId" TEXT NOT NULL,
      "staffKey" TEXT NOT NULL,
      "plannedStart" TEXT NOT NULL DEFAULT '10:00',
      "plannedEnd" TEXT NOT NULL DEFAULT '19:00',
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY ("organizationId","staffKey")
    )`)
    await prisma.$executeRawUnsafe(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='StaffAttendancePolicy' AND column_name='userId') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='StaffAttendancePolicy' AND column_name='staffKey') THEN ALTER TABLE "StaffAttendancePolicy" RENAME COLUMN "userId" TO "staffKey"; END IF; END $$`)
    await prisma.$executeRawUnsafe('ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT')
  }

  async function attendance(req, res, url, session) {
    if (req.method === 'GET') {
      const month = validMonth(url.searchParams.get('month'))
      const people = await prisma.$queryRawUnsafe(
        'SELECT "staffKey" AS "id","staffKey","staffName" AS "displayName" FROM "StaffBookingSetting" WHERE "organizationId"=$1 AND "active"=TRUE AND "onLeave"=FALSE ORDER BY "createdAt","staffName"',
        session.organizationId,
      )
      const records = await prisma.$queryRawUnsafe('SELECT r.*,r."staffName" AS "displayName" FROM "StaffAttendanceRecord" r WHERE r."organizationId"=$1 AND r."workDate" LIKE $2 ORDER BY r."clockInAt" DESC', session.organizationId, month + '%')
      const today = await prisma.$queryRawUnsafe('SELECT s."staffKey" AS "userId",s."staffKey",s."staffName" AS "displayName",r."id",r."clockInAt",r."breakStartedAt",r."breakEndedAt",r."clockOutAt",r."note",COALESCE(p."plannedStart",\'10:00\') AS "plannedStart",COALESCE(p."plannedEnd",\'19:00\') AS "plannedEnd" FROM "StaffBookingSetting" s LEFT JOIN "StaffAttendanceRecord" r ON r."organizationId"=s."organizationId" AND r."staffKey"=s."staffKey" AND r."workDate"=$2 LEFT JOIN "StaffAttendancePolicy" p ON p."organizationId"=s."organizationId" AND p."staffKey"=s."staffKey" WHERE s."organizationId"=$1 AND s."active"=TRUE AND s."onLeave"=FALSE ORDER BY s."createdAt",s."staffName"', session.organizationId, tokyoDate())
      const policies = await prisma.$queryRawUnsafe('SELECT "staffKey" AS "userId","staffKey","plannedStart","plannedEnd" FROM "StaffAttendancePolicy" WHERE "organizationId"=$1', session.organizationId)
      return json(res, 200, { ok: true, month, canViewAll: true, people, records, today, policies, serverTime: new Date().toISOString() })
    }
    if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Allow', 'GET, POST'); res.end(); return }
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: '安全性を確認できませんでした。' })
    const input = await readJson(req)
    const action = String(input.action || '')
    const staffKey = String(input.staffKey || '')
    const staff = await prisma.$queryRawUnsafe('SELECT "staffKey","staffName" FROM "StaffBookingSetting" WHERE "organizationId"=$1 AND "staffKey"=$2 AND "active"=TRUE AND "onLeave"=FALSE LIMIT 1', session.organizationId, staffKey)
    if (action !== 'save_policy' && !staff.length) return json(res, 404, { ok: false, error: '対象スタッフを選択してください。' })
    if (action === 'clock_in') {
      const existing = await prisma.$queryRawUnsafe('SELECT "id","clockOutAt" FROM "StaffAttendanceRecord" WHERE "organizationId"=$1 AND "staffKey"=$2 AND "workDate"=$3 LIMIT 1', session.organizationId, staffKey, tokyoDate())
      if (existing.length) return json(res, 409, { ok: false, error: existing[0].clockOutAt ? '本日の退勤は記録済みです。' : 'すでに出勤中です。' })
      const id = 'attendance-' + crypto.randomUUID()
      await prisma.$executeRawUnsafe('INSERT INTO "StaffAttendanceRecord" ("id","organizationId","staffKey","staffName","recordedByUserId","workDate","clockInAt") VALUES ($1,$2,$3,$4,$5,$6,NOW())', id, session.organizationId, staffKey, staff[0].staffName, session.userId, tokyoDate())
      return json(res, 201, { ok: true, id, message: '出勤を記録しました。' })
    }
    if (action === 'clock_out') {
      const rows = await prisma.$queryRawUnsafe('UPDATE "StaffAttendanceRecord" SET "clockOutAt"=NOW(),"recordedByUserId"=$3,"updatedAt"=NOW() WHERE "id"=(SELECT "id" FROM "StaffAttendanceRecord" WHERE "organizationId"=$1 AND "staffKey"=$2 AND "clockOutAt" IS NULL ORDER BY "clockInAt" DESC LIMIT 1) RETURNING "id"', session.organizationId, staffKey, session.userId)
      if (!rows.length) return json(res, 409, { ok: false, error: '出勤中の記録がありません。' })
      return json(res, 200, { ok: true, id: rows[0].id, message: '退勤を記録しました。' })
    }
    if (action === 'break_start') {
      const rows = await prisma.$queryRawUnsafe('UPDATE "StaffAttendanceRecord" SET "breakStartedAt"=NOW(),"breakEndedAt"=NULL,"recordedByUserId"=$3,"updatedAt"=NOW() WHERE "id"=(SELECT "id" FROM "StaffAttendanceRecord" WHERE "organizationId"=$1 AND "staffKey"=$2 AND "clockOutAt" IS NULL AND ("breakStartedAt" IS NULL OR "breakEndedAt" IS NOT NULL) ORDER BY "clockInAt" DESC LIMIT 1) RETURNING "id"', session.organizationId, staffKey, session.userId)
      if (!rows.length) return json(res, 409, { ok: false, error: '休憩を開始できる出勤記録がありません。' })
      return json(res, 200, { ok: true, id: rows[0].id, message: '休憩開始を記録しました。' })
    }
    if (action === 'break_end') {
      const rows = await prisma.$queryRawUnsafe('UPDATE "StaffAttendanceRecord" SET "breakEndedAt"=NOW(),"recordedByUserId"=$3,"updatedAt"=NOW() WHERE "id"=(SELECT "id" FROM "StaffAttendanceRecord" WHERE "organizationId"=$1 AND "staffKey"=$2 AND "clockOutAt" IS NULL AND "breakStartedAt" IS NOT NULL AND "breakEndedAt" IS NULL ORDER BY "clockInAt" DESC LIMIT 1) RETURNING "id"', session.organizationId, staffKey, session.userId)
      if (!rows.length) return json(res, 409, { ok: false, error: '休憩中の記録がありません。' })
      return json(res, 200, { ok: true, id: rows[0].id, message: '休憩からの復帰を記録しました。' })
    }
    if (action === 'save_policy') {
      if (session.role !== 'ADMIN') return json(res, 403, { ok: false, error: '始業・終業時刻を変更できるのはオーナーだけです。' })
      const userId = String(input.staffKey || input.userId || '')
      const plannedStart = String(input.plannedStart || '')
      const plannedEnd = String(input.plannedEnd || '')
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(plannedStart) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(plannedEnd) || plannedStart >= plannedEnd) return json(res, 400, { ok: false, error: '始業・終業時刻を確認してください。' })
      const owned = await prisma.$queryRawUnsafe('SELECT "staffKey" FROM "StaffBookingSetting" WHERE "staffKey"=$1 AND "organizationId"=$2 AND "active"=TRUE AND "onLeave"=FALSE LIMIT 1', userId, session.organizationId)
      if (!owned.length) return json(res, 404, { ok: false, error: 'スタッフが見つかりません。' })
      await prisma.$executeRawUnsafe('INSERT INTO "StaffAttendancePolicy" ("organizationId","staffKey","plannedStart","plannedEnd","updatedAt") VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT ("organizationId","staffKey") DO UPDATE SET "plannedStart"=EXCLUDED."plannedStart","plannedEnd"=EXCLUDED."plannedEnd","updatedAt"=NOW()', session.organizationId, userId, plannedStart, plannedEnd)
      return json(res, 200, { ok: true, message: '始業・終業時刻を保存しました。' })
    }
    return json(res, 400, { ok: false, error: '出退勤の操作を確認してください。' })
  }

  async function productImages(res, session) {
    const rows = await prisma.$queryRawUnsafe('SELECT "id","imageUrl" FROM "Product" WHERE "organizationId"=$1 AND "active"=TRUE AND "imageUrl" IS NOT NULL', session.organizationId)
    return json(res, 200, { ok: true, images: rows })
  }

  async function handle(req, res, url) {
    if (!['/api/admin/attendance', '/api/admin/catalog/product-images'].includes(url.pathname)) return false
    const session = await sessionProvider(req)
    if (!session) { json(res, 401, { ok: false, error: 'ログインし直してください。' }); return true }
    try {
      if (url.pathname === '/api/admin/catalog/product-images') {
        if (req.method !== 'GET') { res.statusCode = 405; res.setHeader('Allow', 'GET'); res.end(); return true }
        await productImages(res, session)
      } else await attendance(req, res, url, session)
    } catch (error) {
      console.error('[attendance-product-v320]', { organizationId: session.organizationId, path: url.pathname, error: error && error.message })
      json(res, Number(error.status) || 500, { ok: false, error: Number(error.status) ? error.message : '処理できませんでした。時間をおいて再度お試しください。' })
    }
    return true
  }

  return { ensureSchema, handle }
}

module.exports = { createAttendanceNotificationProductService }
