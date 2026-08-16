'use strict'

const { Prisma } = require('@prisma/client')

const CLOSED_STATUSES = ['会計完了', '来店完了', 'キャンセル', '無断キャンセル']
const BOOKING_PROVIDERS = new Set(['phone', 'walk_in', 'manual'])
const CUSTOMER_CODE_PATTERN = /^C-R-\d{3,}$/
const DEFAULT_OPEN = 600
const DEFAULT_CLOSE = 1140
const LEGACY_STAFF = [
  { staffKey: 'tanizaki', staffName: '谷崎 太二', maxConcurrentAppointments: 2 },
  { staffKey: 'watanabe', staffName: '渡邊 浩明', maxConcurrentAppointments: 1 },
  { staffKey: 'asano', staffName: '浅野 清美', maxConcurrentAppointments: 1 },
  { staffKey: 'kobayashi', staffName: '小林 美奈子', maxConcurrentAppointments: 1 },
  { staffKey: 'kaori', staffName: 'kaori', maxConcurrentAppointments: 1 },
]

class RequestError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

function forwardedValue(value) {
  return String(value || '').split(',')[0].trim()
}

function sameOrigin(req) {
  const origin = String(req.headers.origin || '')
  if (!origin) return true
  const host = forwardedValue(req.headers['x-forwarded-host']) || forwardedValue(req.headers.host)
  const protocol = forwardedValue(req.headers['cloudfront-forwarded-proto']) || forwardedValue(req.headers['x-forwarded-proto']) || 'http'
  return Boolean(host && origin === `${protocol}://${host}`)
}

async function readJson(req, maxBytes = 64 * 1024) {
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBytes) throw new RequestError('入力内容が長すぎます。', 413)
    chunks.push(chunk)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') }
  catch { throw new RequestError('入力内容を読み取れませんでした。') }
}

function cleanText(value, maxLength, required = false) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (required && !text) throw new RequestError('必須項目を入力してください。')
  if (text.length > maxLength) throw new RequestError(`入力は${maxLength}文字以内にしてください。`)
  return text || null
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.startsWith('81') && digits.length >= 11 ? `0${digits.slice(2)}` : digits
}

function normalizeStaff(value) {
  return String(value || '').normalize('NFKC').replace(/[\s　]+/g, '').toLowerCase()
}

function validateDate(value) {
  const date = String(value || '')
  if (!/^20\d{2}-(0[1-9]|1[0-2])-([012]\d|3[01])$/.test(date)) throw new RequestError('予約日を確認してください。')
  return date
}

function validateTime(startMinutes, durationMinutes) {
  if (!Number.isInteger(startMinutes) || startMinutes % 15 !== 0) throw new RequestError('開始時刻は15分単位で指定してください。')
  if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 540 || durationMinutes % 15 !== 0) {
    throw new RequestError('施術時間は15分単位で指定してください。')
  }
}

function appointmentDate(date, startMinutes) {
  const value = new Date(`${date}T${String(Math.floor(startMinutes / 60)).padStart(2, '0')}:${String(startMinutes % 60).padStart(2, '0')}:00+09:00`)
  if (Number.isNaN(value.getTime())) throw new RequestError('予約日時を確認してください。')
  return value
}

function jstDateKey(value) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value)
}

function jstMinutes(value) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(value)
  return Number(parts.find(part => part.type === 'hour')?.value || 0) * 60 + Number(parts.find(part => part.type === 'minute')?.value || 0)
}

function overlaps(leftStart, leftDuration, rightStart, rightDuration) {
  return leftStart < rightStart + rightDuration && rightStart < leftStart + leftDuration
}

function appointmentJson(appointment, customerName) {
  return {
    id: appointment.id,
    customerId: appointment.customerId,
    ...(customerName ? { customerName } : {}),
    scheduledAt: appointment.scheduledAt.toISOString(),
    durationMinutes: appointment.durationMinutes,
    menu: appointment.menu,
    staffName: appointment.staffName,
    estimatedPrice: appointment.estimatedPrice,
    status: appointment.status,
    source: appointment.source,
    bookingProvider: appointment.bookingProvider,
    updatedAt: appointment.updatedAt.toISOString(),
  }
}

function createAppointmentOperationsService({ prisma, crypto, sessionProvider, customerSessionProvider, runtimeScript }) {
  async function ensureSchema() {
    await prisma.$executeRawUnsafe('ALTER TABLE "AppUser" ADD COLUMN IF NOT EXISTS "customerPublicCode" TEXT')
    await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "AppUser_customerPublicCode_key" ON "AppUser" ("customerPublicCode") WHERE "customerPublicCode" IS NOT NULL')
    await prisma.$executeRawUnsafe('CREATE SEQUENCE IF NOT EXISTS "CustomerPublicCodeSeq" AS BIGINT START WITH 36 INCREMENT BY 1')
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CustomerStoreLink" (
      "id" TEXT PRIMARY KEY,
      "appUserId" TEXT NOT NULL REFERENCES "AppUser"("id") ON DELETE CASCADE,
      "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
      "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CustomerStoreLink_appUser_org_key" UNIQUE ("appUserId", "organizationId"),
      CONSTRAINT "CustomerStoreLink_customerId_key" UNIQUE ("customerId")
    )`)
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerStoreLink_org_created_idx" ON "CustomerStoreLink" ("organizationId", "createdAt")')
  }

  async function storeHours(db, organizationId) {
    try {
      const rows = await db.$queryRawUnsafe('SELECT "businessOpenMinutes","businessCloseMinutes" FROM "OrganizationStoreProfile" WHERE "organizationId"=$1 LIMIT 1', organizationId)
      const row = rows[0]
      return {
        openMinutes: Number.isInteger(Number(row?.businessOpenMinutes)) ? Number(row.businessOpenMinutes) : DEFAULT_OPEN,
        closeMinutes: Number.isInteger(Number(row?.businessCloseMinutes)) ? Number(row.businessCloseMinutes) : DEFAULT_CLOSE,
      }
    } catch {
      return { openMinutes: DEFAULT_OPEN, closeMinutes: DEFAULT_CLOSE }
    }
  }

  async function resolveStaff(db, organizationId, requestedName) {
    const requested = cleanText(requestedName, 80, true)
    const hours = await storeHours(db, organizationId)
    if (normalizeStaff(requested) === normalizeStaff('フリー')) {
      return { staffKey: 'free', staffName: 'フリー', maxConcurrentAppointments: 1, workStartMinutes: hours.openMinutes, workEndMinutes: hours.closeMinutes }
    }
    let settings = await db.staffBookingSetting.findMany({
      where: { organizationId },
      select: { staffKey: true, staffName: true, maxConcurrentAppointments: true, workStartMinutes: true, workEndMinutes: true },
    })
    if (organizationId === 'org_salon_de_lien') {
      const existing = new Set(settings.map(row => row.staffKey))
      settings = settings.concat(LEGACY_STAFF.filter(row => !existing.has(row.staffKey)).map(row => ({ ...row, workStartMinutes: hours.openMinutes, workEndMinutes: hours.closeMinutes })))
    }
    const token = normalizeStaff(requested)
    const row = settings.find(item => normalizeStaff(item.staffName) === token || normalizeStaff(item.staffKey) === token)
    if (!row) throw new RequestError('登録済みのスタッフを選択してください。')
    return {
      ...row,
      maxConcurrentAppointments: Math.max(1, Number(row.maxConcurrentAppointments) || 1),
      workStartMinutes: Number.isInteger(Number(row.workStartMinutes)) ? Number(row.workStartMinutes) : hours.openMinutes,
      workEndMinutes: Number.isInteger(Number(row.workEndMinutes)) ? Number(row.workEndMinutes) : hours.closeMinutes,
    }
  }

  async function assertAvailability(db, { organizationId, appointmentId = null, customerId, date, startMinutes, durationMinutes, staff }) {
    if (startMinutes < staff.workStartMinutes || startMinutes + durationMinutes > staff.workEndMinutes) {
      throw new RequestError('スタッフの受付時間外です。スタッフ設定を確認してください。')
    }
    const dayStart = new Date(`${date}T00:00:00+09:00`)
    const dayEnd = new Date(`${date}T24:00:00+09:00`)
    const rows = await db.appointment.findMany({
      where: {
        ...(appointmentId ? { id: { not: appointmentId } } : {}),
        scheduledAt: { gte: dayStart, lt: dayEnd },
        status: { notIn: CLOSED_STATUSES },
        customer: { organizationId, deletedAt: null },
      },
      select: { id: true, customerId: true, scheduledAt: true, durationMinutes: true, staffName: true },
    })
    const clashing = rows.filter(row => overlaps(startMinutes, durationMinutes, jstMinutes(row.scheduledAt), row.durationMinutes || 60))
    if (clashing.some(row => row.customerId === customerId)) throw new RequestError('同じお客様の予約が同じ時間帯にあります。')
    const staffToken = normalizeStaff(staff.staffName)
    for (let slot = startMinutes; slot < startMinutes + durationMinutes; slot += 15) {
      const count = rows.filter(row => normalizeStaff(row.staffName || 'フリー') === staffToken && overlaps(slot, 15, jstMinutes(row.scheduledAt), row.durationMinutes || 60)).length
      if (count + 1 > staff.maxConcurrentAppointments) throw new RequestError(`${staff.staffName}の受付可能数を超えています。`)
    }
  }

  async function ensurePublicCode(db, userId, customerId) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await db.$transaction(async tx => {
          const users = await tx.$queryRawUnsafe('SELECT "id","customerPublicCode" FROM "AppUser" WHERE "id"=$1 AND "customerId"=$2 AND "role"=\'CUSTOMER\' AND "active"=true FOR UPDATE', userId, customerId)
          const user = users[0]
          if (!user) throw new RequestError('お客様アカウントを確認できませんでした。', 401)
          if (user.customerPublicCode) return user.customerPublicCode
          const sequence = await tx.$queryRawUnsafe('SELECT nextval(\'"CustomerPublicCodeSeq"\') AS value')
          const serial = String(sequence[0].value).padStart(3, '0')
          const code = `C-R-${serial}`
          const updated = await tx.$queryRawUnsafe('UPDATE "AppUser" SET "customerPublicCode"=$1,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$2 AND "customerPublicCode" IS NULL RETURNING "customerPublicCode"', code, userId)
          return updated[0]?.customerPublicCode || code
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      } catch (error) {
        if (attempt === 4) throw error
      }
    }
    throw new RequestError('お客様コードを発行できませんでした。', 500)
  }

  async function customerForCode(tx, organizationId, rawCode) {
    const code = String(rawCode || '').trim().toUpperCase()
    if (!CUSTOMER_CODE_PATTERN.test(code)) throw new RequestError('お客様コードは C-R-036 の形式で入力してください。')
    const users = await tx.$queryRawUnsafe(`SELECT u."id" AS "appUserId",u."customerId",c."organizationId",c."name",c."gender",c."birthYear",c."birthDate",c."phone",c."servicePreference",c."staffAssignmentType",c."assignedStaffName"
      FROM "AppUser" u JOIN "Customer" c ON c."id"=u."customerId"
      WHERE u."customerPublicCode"=$1 AND u."role"='CUSTOMER' AND u."active"=true AND c."deletedAt" IS NULL FOR UPDATE OF u`, code)
    const source = users[0]
    if (!source) throw new RequestError('このお客様コードは見つかりませんでした。', 404)
    if (source.organizationId === organizationId) return tx.customer.findUniqueOrThrow({ where: { id: source.customerId }, select: { id: true, name: true } })
    const links = await tx.$queryRawUnsafe(`SELECT l."customerId",c."name" FROM "CustomerStoreLink" l JOIN "Customer" c ON c."id"=l."customerId" WHERE l."appUserId"=$1 AND l."organizationId"=$2 AND c."deletedAt" IS NULL LIMIT 1`, source.appUserId, organizationId)
    if (links[0]) return { id: links[0].customerId, name: links[0].name }
    const customer = await tx.customer.create({
      data: {
        organizationId,
        name: source.name,
        gender: source.gender,
        birthYear: source.birthYear,
        birthDate: source.birthDate,
        phone: source.phone,
        servicePreference: source.servicePreference,
        staffAssignmentType: source.staffAssignmentType,
        assignedStaffName: source.assignedStaffName,
        memo: `お客様アプリコード ${code} で店舗へ追加`,
      },
      select: { id: true, name: true },
    })
    await tx.$executeRawUnsafe('INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId") VALUES ($1,$2,$3,$4)', crypto.randomUUID(), source.appUserId, organizationId, customer.id)
    return customer
  }

  async function resolveManualCustomer(tx, organizationId, body) {
    const mode = String(body.customerMode || 'existing')
    if (mode === 'existing') {
      const customerId = cleanText(body.customerId, 100, true)
      const customer = await tx.customer.findFirst({ where: { id: customerId, organizationId, deletedAt: null }, select: { id: true, name: true } })
      if (!customer) throw new RequestError('お客様が見つかりません。', 404)
      return customer
    }
    if (mode === 'code') return customerForCode(tx, organizationId, body.customerPublicCode)
    if (mode !== 'new') throw new RequestError('お客様の登録方法を確認してください。')
    const name = cleanText(body.newCustomerName, 80, true)
    const phone = cleanText(body.newCustomerPhone, 32)
    if (phone) {
      const normalized = normalizePhone(phone)
      const candidates = await tx.customer.findMany({ where: { organizationId, deletedAt: null, phone: { not: null } }, select: { id: true, name: true, phone: true } })
      const duplicate = candidates.find(customer => normalizePhone(customer.phone) === normalized)
      if (duplicate) throw new RequestError(`同じ電話番号の「${duplicate.name}」様が登録済みです。既存顧客から選択してください。`, 409)
    }
    return tx.customer.create({ data: { organizationId, name, phone, staffAssignmentType: 'free', memo: '電話・店頭予約から初回登録' }, select: { id: true, name: true } })
  }

  async function patchSchedule(req, res, url) {
    if (!sameOrigin(req)) throw new RequestError('不正なリクエストです。', 403)
    const session = await sessionProvider(req)
    if (!session || !['ADMIN', 'STAFF'].includes(session.role) || !session.organizationId) throw new RequestError('ログインが必要です。', 401)
    const appointmentId = decodeURIComponent(url.pathname.match(/^\/api\/admin\/appointments\/([^/]+)\/schedule$/)?.[1] || '')
    if (!appointmentId) return false
    const body = await readJson(req)
    const date = validateDate(body.date)
    const startMinutes = Number(body.startMinutes)
    const durationMinutes = Number(body.durationMinutes)
    validateTime(startMinutes, durationMinutes)
    const scheduledAt = appointmentDate(date, startMinutes)
    const expectedUpdatedAt = body.updatedAt ? new Date(body.updatedAt) : null
    if (expectedUpdatedAt && Number.isNaN(expectedUpdatedAt.getTime())) throw new RequestError('更新日時を確認してください。')
    const appointment = await prisma.$transaction(async tx => {
      await tx.$queryRawUnsafe('SELECT a."id" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" WHERE a."id"=$1 AND c."organizationId"=$2 AND c."deletedAt" IS NULL FOR UPDATE', appointmentId, session.organizationId)
      const current = await tx.appointment.findFirst({ where: { id: appointmentId, customer: { organizationId: session.organizationId, deletedAt: null } }, select: { id: true, customerId: true, status: true, updatedAt: true } })
      if (!current) throw new RequestError('予約が見つかりません。', 404)
      if (CLOSED_STATUSES.includes(current.status)) throw new RequestError('完了・キャンセル済みの予約は移動できません。')
      if (expectedUpdatedAt && current.updatedAt.getTime() !== expectedUpdatedAt.getTime()) throw new RequestError('別の端末で予約が更新されました。画面を再読み込みしてください。', 409)
      const staff = await resolveStaff(tx, session.organizationId, body.staffName)
      await assertAvailability(tx, { organizationId: session.organizationId, appointmentId, customerId: current.customerId, date, startMinutes, durationMinutes, staff })
      return tx.appointment.update({ where: { id: appointmentId }, data: { scheduledAt, durationMinutes, staffName: staff.staffName } })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    sendJson(res, 200, { success: true, appointment: appointmentJson(appointment) })
    return true
  }

  async function createManual(req, res) {
    if (!sameOrigin(req)) throw new RequestError('不正なリクエストです。', 403)
    const session = await sessionProvider(req)
    if (!session || !['ADMIN', 'STAFF'].includes(session.role) || !session.organizationId) throw new RequestError('ログインが必要です。', 401)
    const body = await readJson(req)
    const date = validateDate(body.date)
    const startMinutes = Number(body.startMinutes)
    const durationMinutes = Number(body.durationMinutes)
    validateTime(startMinutes, durationMinutes)
    const menu = cleanText(body.menu, 120, true)
    const note = cleanText(body.note, 500)
    const priceText = String(body.estimatedPrice ?? '').trim()
    const estimatedPrice = priceText === '' ? null : Number(priceText)
    if (estimatedPrice !== null && (!Number.isInteger(estimatedPrice) || estimatedPrice < 0 || estimatedPrice > 1000000)) throw new RequestError('見込み金額を確認してください。')
    const bookingProvider = String(body.bookingProvider || '')
    if (!BOOKING_PROVIDERS.has(bookingProvider)) throw new RequestError('予約経路を確認してください。')
    const scheduledAt = appointmentDate(date, startMinutes)
    const result = await prisma.$transaction(async tx => {
      const customer = await resolveManualCustomer(tx, session.organizationId, body)
      const staff = await resolveStaff(tx, session.organizationId, body.staffName)
      await assertAvailability(tx, { organizationId: session.organizationId, customerId: customer.id, date, startMinutes, durationMinutes, staff })
      const source = bookingProvider === 'phone' ? '電話予約（手動）' : bookingProvider === 'walk_in' ? '店頭予約（手動）' : '手動登録'
      const appointment = await tx.appointment.create({ data: { customerId: customer.id, scheduledAt, durationMinutes, menu, staffName: staff.staffName, estimatedPrice, status: '予約確定', source, bookingProvider, note } })
      await tx.contactLog.create({ data: { customerId: customer.id, channel: bookingProvider === 'phone' ? '電話' : '店頭', purpose: '予約登録', message: [`${source}: ${scheduledAt.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`, `メニュー: ${menu}`, `担当: ${staff.staffName}`, estimatedPrice !== null ? `見込み金額: ${estimatedPrice.toLocaleString('ja-JP')}円` : null, note ? `メモ: ${note}` : null].filter(Boolean).join('\n'), outcome: '予約確定' } })
      return { appointment, customer }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    sendJson(res, 200, { success: true, appointment: appointmentJson(result.appointment, result.customer.name) })
    return true
  }

  async function customerCode(req, res) {
    const session = await customerSessionProvider(req)
    if (!session?.userId || !session?.customerId) throw new RequestError('ログインが必要です。', 401)
    const code = await ensurePublicCode(prisma, session.userId, session.customerId)
    sendJson(res, 200, { code })
    return true
  }

  async function handle(req, res, url) {
    try {
      if (url.pathname === '/customer-runtime-v267.js' && req.method === 'GET') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        res.setHeader('Cache-Control', 'private, no-store')
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.end(runtimeScript)
        return true
      }
      if (url.pathname === '/api/lien-customer-code' && req.method === 'GET') return await customerCode(req, res)
      if (url.pathname === '/api/admin/appointments/manual' && req.method === 'POST') return await createManual(req, res)
      if (/^\/api\/admin\/appointments\/[^/]+\/schedule$/.test(url.pathname) && req.method === 'PATCH') return await patchSchedule(req, res, url)
      return false
    } catch (error) {
      const status = error instanceof RequestError ? error.status : error?.code === 'P2034' ? 409 : 400
      const message = error instanceof Error ? error.message : '処理に失敗しました。'
      sendJson(res, status, { error: message })
      return true
    }
  }

  return { ensureSchema, handle, ensurePublicCode }
}

module.exports = { createAppointmentOperationsService, normalizePhone, normalizeStaff, CUSTOMER_CODE_PATTERN }
