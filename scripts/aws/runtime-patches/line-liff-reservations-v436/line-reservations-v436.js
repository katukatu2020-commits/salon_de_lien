'use strict'

const CLOSED_STATUSES = new Set(['会計完了', '来店完了', 'キャンセル', '無断キャンセル'])
const LINE_API = 'https://api.line.me'
const TOKYO_OFFSET = '+09:00'
const DEFAULT_OPEN_MINUTES = 600
const DEFAULT_CLOSE_MINUTES = 1140
const SLOT_INTERVAL_MINUTES = 30
const MINIMUM_START_GAP_MINUTES = 30
const MAX_BODY_BYTES = 256 * 1024

class LineReservationError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

function sendJson(res, status, value) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(value))
}

function sendHtml(res, status, value, nonce) {
  res.statusCode = status
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'self' 'nonce-${nonce}' https://static.line-scdn.net https://liffsdk.line-scdn.net; connect-src 'self' https://api.line.me https://access.line.me https://liffsdk.line-scdn.net; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-src https://access.line.me; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`)
  res.end(value)
}

async function readRawBody(req, maxBytes = MAX_BODY_BYTES) {
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBytes) throw new LineReservationError('送信内容が大きすぎます。', 413)
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

function parseJson(buffer) {
  try { return JSON.parse(buffer.toString('utf8') || '{}') }
  catch { throw new LineReservationError('送信内容を読み取れませんでした。') }
}

function forwarded(value) {
  return String(value || '').split(',')[0].trim()
}

function requestOrigin(req) {
  const configured = String(process.env.APP_URL || '').replace(/\/$/, '')
  if (configured) return configured
  const host = forwarded(req.headers['x-forwarded-host']) || forwarded(req.headers.host)
  const protocol = forwarded(req.headers['cloudfront-forwarded-proto']) || forwarded(req.headers['x-forwarded-proto']) || 'https'
  if (!host) throw new LineReservationError('公開URLを特定できませんでした。', 500)
  return `${protocol}://${host}`
}

function sameOrigin(req) {
  const origin = String(req.headers.origin || '')
  return !origin || origin === requestOrigin(req)
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

function cleanText(value, maxLength, label, required = false) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (required && !text) throw new LineReservationError(`${label}を入力してください。`)
  if (text.length > maxLength) throw new LineReservationError(`${label}は${maxLength}文字以内で入力してください。`)
  return text || null
}

function normalizeJapanesePhone(value) {
  const digits = String(value || '').normalize('NFKC').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('81') && digits.length >= 11) return `0${digits.slice(2)}`
  return digits
}

function normalizePersonName(value) {
  return String(value || '').normalize('NFKC').replace(/[\s　]+/g, '').toLowerCase()
}

function normalizeStaff(value) {
  return normalizePersonName(value).replace(/[邊辺]/g, '邉')
}

function deriveEncryptionKey() {
  const material = String(process.env.INTEGRATION_SECRET_ENCRYPTION_KEY || process.env.ADMIN_AUTH_SECRET || '')
  if (material.length < 32) throw new LineReservationError('連携情報の暗号化キーが設定されていません。', 503)
  return require('crypto').createHash('sha256').update(material).digest()
}

function encryptSecret(value, cryptoModule = require('crypto')) {
  const iv = cryptoModule.randomBytes(12)
  const cipher = cryptoModule.createCipheriv('aes-256-gcm', deriveEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()])
  return `v1:${iv.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${encrypted.toString('base64url')}`
}

function decryptSecret(value, cryptoModule = require('crypto')) {
  const [version, iv, tag, encrypted] = String(value || '').split(':')
  if (version !== 'v1' || !iv || !tag || !encrypted) throw new LineReservationError('保存済みのLINE連携情報を復号できません。', 500)
  const decipher = cryptoModule.createDecipheriv('aes-256-gcm', deriveEncryptionKey(), Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8')
}

function verifyWebhookSignature(rawBody, signature, channelSecret, cryptoModule = require('crypto')) {
  if (!signature || !channelSecret) return false
  const expected = cryptoModule.createHmac('sha256', channelSecret).update(rawBody).digest('base64')
  const left = Buffer.from(String(signature))
  const right = Buffer.from(expected)
  return left.length === right.length && cryptoModule.timingSafeEqual(left, right)
}

function tokyoDateKey(value) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(value)
}

function validateDateKey(value, now = new Date()) {
  const date = String(value || '')
  if (!/^20\d{2}-(0[1-9]|1[0-2])-([012]\d|3[01])$/.test(date)) throw new LineReservationError('予約日を確認してください。')
  const parsed = new Date(`${date}T00:00:00${TOKYO_OFFSET}`)
  if (Number.isNaN(parsed.getTime()) || tokyoDateKey(parsed) !== date) throw new LineReservationError('予約日を確認してください。')
  const today = tokyoDateKey(now)
  const limit = tokyoDateKey(new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000))
  if (date < today) throw new LineReservationError('過去の日付は予約できません。')
  if (date > limit) throw new LineReservationError('予約日は90日以内で選択してください。')
  return date
}

function appointmentDate(date, startMinutes) {
  const hours = String(Math.floor(startMinutes / 60)).padStart(2, '0')
  const minutes = String(startMinutes % 60).padStart(2, '0')
  const result = new Date(`${date}T${hours}:${minutes}:00${TOKYO_OFFSET}`)
  if (Number.isNaN(result.getTime())) throw new LineReservationError('予約日時を確認してください。')
  return result
}

function jstMinutes(value) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(value)
  return Number(parts.find(part => part.type === 'hour')?.value || 0) * 60 + Number(parts.find(part => part.type === 'minute')?.value || 0)
}

function minutesLabel(value) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}

function weekday(date) {
  return new Date(`${date}T00:00:00Z`).getUTCDay()
}

function closedWeekdays(value) {
  return [...new Set(String(value || '').split(',').filter(Boolean).map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))]
}

function overlaps(leftStart, leftDuration, rightStart, rightDuration) {
  return leftStart < rightStart + rightDuration && rightStart < leftStart + leftDuration
}

function isActiveAppointment(appointment) {
  return !CLOSED_STATUSES.has(String(appointment.status || ''))
}

function slotAvailable({ startMinutes, durationMinutes, staff, allStaff, appointments, capacityOverrides = [] }) {
  if (startMinutes < staff.workStartMinutes || startMinutes + durationMinutes > staff.workEndMinutes) return false
  const activeStaff = allStaff.filter(candidate => startMinutes >= candidate.workStartMinutes && startMinutes + durationMinutes <= candidate.workEndMinutes)
  if (!activeStaff.length) return false
  const capacity = activeStaff.reduce((sum, candidate) => sum + candidate.maxConcurrentAppointments, 0)
  const staffToken = normalizeStaff(staff.staffName)
  const selectedAppointments = appointments.filter(item => normalizeStaff(item.staffName || 'フリー') === staffToken)
  if (selectedAppointments.some(item => Math.abs(item.startMinutes - startMinutes) < MINIMUM_START_GAP_MINUTES)) return false
  for (let cursor = startMinutes; cursor < startMinutes + durationMinutes; cursor += 10) {
    const totalOverlap = appointments.filter(item => overlaps(cursor, 10, item.startMinutes, item.durationMinutes)).length
    const overrideStart = Math.floor(cursor / 30) * 30
    const override = capacityOverrides.find(item => item.slotStartMinutes === overrideStart)
    if (override && totalOverlap >= override.capacity) return false
    if (totalOverlap >= capacity) return false
    const staffOverlap = selectedAppointments.filter(item => overlaps(cursor, 10, item.startMinutes, item.durationMinutes)).length
    if (staffOverlap >= staff.maxConcurrentAppointments) return false
  }
  return true
}

function createRateLimiter() {
  const entries = new Map()
  return function check(key, limit, windowMs) {
    const now = Date.now()
    const current = entries.get(key)
    if (!current || current.resetAt <= now) {
      entries.set(key, { count: 1, resetAt: now + windowMs })
      return true
    }
    current.count += 1
    if (entries.size > 2000) {
      for (const [entryKey, entry] of entries) if (entry.resetAt <= now) entries.delete(entryKey)
    }
    return current.count <= limit
  }
}

function createLineReservationService({ prisma, crypto, staffSession, settingsClientScript }) {
  const rateLimit = createRateLimiter()

  async function ensureSchema() {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "OrganizationLineConnection" (
      "organizationId" TEXT PRIMARY KEY REFERENCES "Organization"("id") ON DELETE CASCADE,
      "messagingChannelId" TEXT NOT NULL,
      "lineLoginChannelId" TEXT NOT NULL,
      "liffId" TEXT NOT NULL,
      "encryptedChannelSecret" TEXT NOT NULL,
      "encryptedAccessToken" TEXT NOT NULL,
      "webhookKey" TEXT NOT NULL UNIQUE,
      "status" TEXT NOT NULL DEFAULT 'active',
      "botUserId" TEXT,
      "basicId" TEXT,
      "displayName" TEXT,
      "lastVerifiedAt" TIMESTAMP(3),
      "lastWebhookAt" TIMESTAMP(3),
      "lastError" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "OrganizationLineConnection_status_idx" ON "OrganizationLineConnection"("status")')
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CustomerLineIdentity" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
      "customerId" TEXT REFERENCES "Customer"("id") ON DELETE SET NULL,
      "lineUserId" TEXT NOT NULL,
      "displayName" TEXT,
      "pictureUrl" TEXT,
      "followed" BOOLEAN NOT NULL DEFAULT TRUE,
      "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CustomerLineIdentity_org_line_key" UNIQUE ("organizationId","lineUserId")
    )`)
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerLineIdentity_customer_idx" ON "CustomerLineIdentity"("customerId")')
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "LineWebhookEvent" (
      "webhookEventId" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
      "eventType" TEXT NOT NULL,
      "lineUserId" TEXT,
      "status" TEXT NOT NULL DEFAULT 'received',
      "error" TEXT,
      "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "processedAt" TIMESTAMP(3)
    )`)
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "LineWebhookEvent_org_received_idx" ON "LineWebhookEvent"("organizationId","receivedAt" DESC)')
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "LineBookingRequest" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
      "lineUserId" TEXT NOT NULL,
      "idempotencyKey" TEXT NOT NULL,
      "appointmentId" TEXT REFERENCES "Appointment"("id") ON DELETE SET NULL,
      "status" TEXT NOT NULL DEFAULT 'processing',
      "error" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "LineBookingRequest_org_line_idempotency_key" UNIQUE ("organizationId","lineUserId","idempotencyKey")
    )`)
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "LineBookingRequest_org_created_idx" ON "LineBookingRequest"("organizationId","createdAt" DESC)')
  }

  async function owner(req) {
    const session = await staffSession(req)
    if (!session || session.role !== 'ADMIN' || !session.organizationId) throw new LineReservationError('オーナーとしてログインしてください。', 401)
    return session
  }

  async function connectionForOrganization(organizationId) {
    const rows = await prisma.$queryRawUnsafe('SELECT * FROM "OrganizationLineConnection" WHERE "organizationId"=$1 LIMIT 1', organizationId)
    return rows[0] || null
  }

  async function connectionForWebhookKey(webhookKey) {
    const rows = await prisma.$queryRawUnsafe('SELECT c.*,o."slug",o."publicCode",o."name" AS "organizationName" FROM "OrganizationLineConnection" c JOIN "Organization" o ON o."id"=c."organizationId" WHERE c."webhookKey"=$1 AND c."status"=\'active\' LIMIT 1', webhookKey)
    return rows[0] || null
  }

  async function connectionForStoreCode(storeCode) {
    const rows = await prisma.$queryRawUnsafe(`SELECT c.*,o."slug",o."publicCode",o."name" AS "organizationName"
      FROM "OrganizationLineConnection" c JOIN "Organization" o ON o."id"=c."organizationId"
      WHERE (LOWER(o."slug")=LOWER($1) OR UPPER(COALESCE(o."publicCode",''))=UPPER($1)) AND c."status"='active' LIMIT 1`, storeCode)
    return rows[0] || null
  }

  async function botInfo(accessToken) {
    const response = await fetch(`${LINE_API}/v2/bot/info`, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(8000) })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data.userId) throw new LineReservationError(`チャネルアクセストークンを確認できませんでした${data.message ? `: ${data.message}` : '。'}`)
    return data
  }

  function settingsPayload(req, organization, connection) {
    const base = requestOrigin(req)
    const storeCode = organization.publicCode || organization.slug
    return {
      connected: Boolean(connection),
      status: connection?.status || 'not_configured',
      messagingChannelId: connection?.messagingChannelId || '',
      lineLoginChannelId: connection?.lineLoginChannelId || '',
      liffId: connection?.liffId || '',
      hasChannelSecret: Boolean(connection?.encryptedChannelSecret),
      hasAccessToken: Boolean(connection?.encryptedAccessToken),
      bot: connection ? { displayName: connection.displayName || null, basicId: connection.basicId || null, userId: connection.botUserId || null } : null,
      lastVerifiedAt: connection?.lastVerifiedAt || null,
      lastWebhookAt: connection?.lastWebhookAt || null,
      lastError: connection?.lastError || null,
      webhookUrl: connection?.webhookKey ? `${base}/api/integrations/line/webhook/${connection.webhookKey}` : '',
      liffEndpointUrl: `${base}/line/booking/${encodeURIComponent(storeCode)}`,
      liffUrl: connection?.liffId ? `https://liff.line.me/${connection.liffId}` : '',
    }
  }

  async function lineSettings(req, res) {
    const session = await owner(req)
    const organizations = await prisma.$queryRawUnsafe('SELECT "id","slug","publicCode" FROM "Organization" WHERE "id"=$1 LIMIT 1', session.organizationId)
    const organization = organizations[0]
    if (!organization) throw new LineReservationError('店舗を確認できませんでした。', 404)
    const current = await connectionForOrganization(session.organizationId)
    if (req.method === 'GET') return sendJson(res, 200, settingsPayload(req, organization, current))
    if (req.method !== 'POST') throw new LineReservationError('許可されていない操作です。', 405)
    if (!sameOrigin(req)) throw new LineReservationError('不正なリクエストです。', 403)
    const body = parseJson(await readRawBody(req, 64 * 1024))
    const messagingChannelId = cleanText(body.messagingChannelId, 40, 'Messaging APIチャネルID', true)
    const lineLoginChannelId = cleanText(body.lineLoginChannelId, 40, 'LINE LoginチャネルID', true)
    const liffId = cleanText(body.liffId, 120, 'LIFF ID', true)
    if (!/^\d{6,20}$/.test(messagingChannelId)) throw new LineReservationError('Messaging APIチャネルIDは数字で入力してください。')
    if (!/^\d{6,20}$/.test(lineLoginChannelId)) throw new LineReservationError('LINE LoginチャネルIDは数字で入力してください。')
    if (!/^\d{6,20}-[A-Za-z0-9_-]{4,100}$/.test(liffId)) throw new LineReservationError('LIFF IDの形式を確認してください。')
    const channelSecret = cleanText(body.channelSecret, 512, 'チャネルシークレット') || (current ? decryptSecret(current.encryptedChannelSecret, crypto) : null)
    const accessToken = cleanText(body.accessToken, 4096, 'チャネルアクセストークン') || (current ? decryptSecret(current.encryptedAccessToken, crypto) : null)
    if (!channelSecret || channelSecret.length < 16) throw new LineReservationError('チャネルシークレットを入力してください。')
    if (!accessToken || accessToken.length < 40) throw new LineReservationError('チャネルアクセストークンを入力してください。')
    const info = await botInfo(accessToken)
    const webhookKey = current?.webhookKey || crypto.randomBytes(24).toString('base64url')
    await prisma.$executeRawUnsafe(`INSERT INTO "OrganizationLineConnection" (
      "organizationId","messagingChannelId","lineLoginChannelId","liffId","encryptedChannelSecret","encryptedAccessToken","webhookKey","status","botUserId","basicId","displayName","lastVerifiedAt","lastError","createdAt","updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8,$9,$10,CURRENT_TIMESTAMP,NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    ON CONFLICT ("organizationId") DO UPDATE SET
      "messagingChannelId"=EXCLUDED."messagingChannelId","lineLoginChannelId"=EXCLUDED."lineLoginChannelId","liffId"=EXCLUDED."liffId",
      "encryptedChannelSecret"=EXCLUDED."encryptedChannelSecret","encryptedAccessToken"=EXCLUDED."encryptedAccessToken","status"='active',
      "botUserId"=EXCLUDED."botUserId","basicId"=EXCLUDED."basicId","displayName"=EXCLUDED."displayName","lastVerifiedAt"=CURRENT_TIMESTAMP,"lastError"=NULL,"updatedAt"=CURRENT_TIMESTAMP`,
      session.organizationId, messagingChannelId, lineLoginChannelId, liffId, encryptSecret(channelSecret, crypto), encryptSecret(accessToken, crypto), webhookKey, info.userId, info.basicId || null, info.displayName || null)
    const saved = await connectionForOrganization(session.organizationId)
    sendJson(res, 200, { success: true, ...settingsPayload(req, organization, saved) })
  }

  async function verifyIdToken(connection, idToken) {
    if (!idToken || idToken.length > 5000) throw new LineReservationError('LINEログインを確認できませんでした。', 401)
    const payload = new URLSearchParams({ id_token: idToken, client_id: connection.lineLoginChannelId })
    const response = await fetch(`${LINE_API}/oauth2/v2.1/verify`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: payload, signal: AbortSignal.timeout(8000),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data.sub || String(data.aud) !== String(connection.lineLoginChannelId)) throw new LineReservationError('LINEログインの有効期限が切れています。もう一度開き直してください。', 401)
    return { lineUserId: String(data.sub), displayName: cleanText(data.name, 120, 'LINE表示名'), pictureUrl: cleanText(data.picture, 1000, 'LINE画像URL') }
  }

  async function lineIdentity(req, connection) {
    const bearer = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1]
    return verifyIdToken(connection, bearer)
  }

  async function storeBookingData(connection) {
    const organizations = await prisma.$queryRawUnsafe(`SELECT o."id",o."name",o."iconImageUrl",p."businessOpenMinutes",p."businessCloseMinutes",p."closedWeekdays"
      FROM "Organization" o LEFT JOIN "OrganizationStoreProfile" p ON p."organizationId"=o."id" WHERE o."id"=$1 LIMIT 1`, connection.organizationId)
    const organization = organizations[0]
    const menus = await prisma.$queryRawUnsafe('SELECT "id","name","category","description","durationMinutes","priceYen" FROM "SalonMenu" WHERE "organizationId"=$1 AND "active"=TRUE ORDER BY "sortOrder","name"', connection.organizationId)
    const staff = await prisma.$queryRawUnsafe(`SELECT s."staffKey",s."staffName",s."maxConcurrentAppointments",s."workStartMinutes",s."workEndMinutes",s."closedWeekdays",
      COALESCE(p."introduction",'') AS "introduction",COALESCE(p."roleLabel",'') AS "roleLabel"
      FROM "StaffBookingSetting" s LEFT JOIN "StaffProfileSetting" p ON p."organizationId"=s."organizationId" AND p."userId"=s."userId"
      LEFT JOIN "AppUser" u ON u."id"=s."userId"
      WHERE s."organizationId"=$1 AND s."active"=TRUE AND s."onLeave"=FALSE AND (u."id" IS NULL OR u."active"=TRUE)
      ORDER BY s."createdAt",s."staffName"`, connection.organizationId)
    return {
      organization: {
        id: organization.id,
        name: organization.name,
        openMinutes: Number(organization.businessOpenMinutes ?? DEFAULT_OPEN_MINUTES),
        closeMinutes: Number(organization.businessCloseMinutes ?? DEFAULT_CLOSE_MINUTES),
        closedWeekdays: closedWeekdays(organization.closedWeekdays),
      },
      menus: menus.map(menu => ({ ...menu, durationMinutes: Number(menu.durationMinutes), priceYen: Number(menu.priceYen) })),
      staff: staff.map(item => ({
        key: item.staffKey, name: item.staffName, introduction: item.introduction, roleLabel: item.roleLabel,
        maxConcurrentAppointments: Math.max(1, Number(item.maxConcurrentAppointments) || 1),
        workStartMinutes: Number(item.workStartMinutes ?? organization.businessOpenMinutes ?? DEFAULT_OPEN_MINUTES),
        workEndMinutes: Number(item.workEndMinutes ?? organization.businessCloseMinutes ?? DEFAULT_CLOSE_MINUTES),
        closedWeekdays: closedWeekdays(item.closedWeekdays),
      })),
    }
  }

  async function dayAppointments(db, organizationId, date) {
    const start = new Date(`${date}T00:00:00${TOKYO_OFFSET}`)
    const end = new Date(`${date}T24:00:00${TOKYO_OFFSET}`)
    const rows = await db.appointment.findMany({
      where: { scheduledAt: { gte: start, lt: end }, customer: { organizationId, deletedAt: null } },
      select: { id: true, customerId: true, scheduledAt: true, durationMinutes: true, staffName: true, status: true },
    })
    return rows.filter(isActiveAppointment).map(item => ({ ...item, startMinutes: jstMinutes(item.scheduledAt), durationMinutes: Number(item.durationMinutes) || 60 }))
  }

  function workingStaffForDate(data, date) {
    const day = weekday(date)
    if (data.organization.closedWeekdays.includes(day)) return []
    return data.staff.filter(staff => !staff.closedWeekdays.includes(day))
  }

  async function availability(connection, date, menuId, requestedStaffKey, db = prisma) {
    const data = await storeBookingData(connection)
    const menu = data.menus.find(item => item.id === menuId)
    if (!menu) throw new LineReservationError('メニューを選び直してください。', 404)
    const staffForDate = workingStaffForDate(data, date)
    if (!staffForDate.length) return { menu, slots: [], staff: null }
    const selected = requestedStaffKey === 'free' ? null : staffForDate.find(item => item.key === requestedStaffKey)
    if (requestedStaffKey !== 'free' && !selected) throw new LineReservationError('選択したスタッフはこの日予約できません。')
    const appointments = await dayAppointments(db, connection.organizationId, date)
    const capacityOverrides = await db.bookingCapacityOverride.findMany({
      where: { organizationId: connection.organizationId, dateKey: date },
      select: { slotStartMinutes: true, capacity: true },
    }).catch(() => [])
    const candidates = selected ? [selected] : staffForDate
    const firstCandidateMinute = selected ? selected.workStartMinutes : Math.min(...candidates.map(item => item.workStartMinutes))
    const lastCandidateMinute = selected ? selected.workEndMinutes : Math.max(...candidates.map(item => item.workEndMinutes))
    const first = Math.ceil(Math.max(data.organization.openMinutes, firstCandidateMinute) / SLOT_INTERVAL_MINUTES) * SLOT_INTERVAL_MINUTES
    const last = Math.min(data.organization.closeMinutes, lastCandidateMinute)
    const now = new Date()
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
    const earliestToday = jstMinutes(now) + 60
    const slots = []
    for (let start = first; start + menu.durationMinutes <= last; start += SLOT_INTERVAL_MINUTES) {
      if (date === today && start < earliestToday) continue
      const availableStaff = candidates.filter(staff => slotAvailable({ startMinutes: start, durationMinutes: menu.durationMinutes, staff, allStaff: staffForDate, appointments, capacityOverrides }))
      if (availableStaff.length) slots.push({ startMinutes: start, label: minutesLabel(start), availableStaffKeys: availableStaff.map(item => item.key) })
    }
    return { menu, slots, staff: selected || null, candidates: staffForDate }
  }

  async function publicConfig(req, res, url) {
    const storeCode = cleanText(url.searchParams.get('store'), 120, '店舗コード', true)
    const connection = await connectionForStoreCode(storeCode)
    if (!connection) throw new LineReservationError('LINE予約を利用できる店舗が見つかりません。', 404)
    await lineIdentity(req, connection)
    const data = await storeBookingData(connection)
    sendJson(res, 200, {
      store: { code: connection.publicCode || connection.slug, name: data.organization.name, closedWeekdays: data.organization.closedWeekdays },
      menus: data.menus,
      staff: [{ key: 'free', name: '指名なし', introduction: '空いているスタッフが担当します。', roleLabel: '' }, ...data.staff],
    })
  }

  async function publicAvailability(req, res, url) {
    const storeCode = cleanText(url.searchParams.get('store'), 120, '店舗コード', true)
    const connection = await connectionForStoreCode(storeCode)
    if (!connection) throw new LineReservationError('LINE予約を利用できる店舗が見つかりません。', 404)
    const identity = await lineIdentity(req, connection)
    const key = `${connection.organizationId}:${identity.lineUserId}:availability`
    if (!rateLimit(key, 90, 60 * 1000)) throw new LineReservationError('操作が集中しています。少し待ってからお試しください。', 429)
    const date = validateDateKey(url.searchParams.get('date'))
    const menuId = cleanText(url.searchParams.get('menuId'), 120, 'メニュー', true)
    const staffKey = cleanText(url.searchParams.get('staffKey'), 120, 'スタッフ', true)
    const result = await availability(connection, date, menuId, staffKey)
    sendJson(res, 200, { slots: result.slots })
  }

  async function findOrCreateCustomer(tx, connection, identity, body) {
    const existingIdentity = await tx.$queryRawUnsafe('SELECT "customerId" FROM "CustomerLineIdentity" WHERE "organizationId"=$1 AND "lineUserId"=$2 LIMIT 1 FOR UPDATE', connection.organizationId, identity.lineUserId)
    if (existingIdentity[0]?.customerId) {
      const customer = await tx.customer.findFirst({ where: { id: existingIdentity[0].customerId, organizationId: connection.organizationId, deletedAt: null }, select: { id: true, name: true, phone: true } })
      if (customer) return customer
    }
    const name = cleanText(body.customerName, 80, 'お名前', true)
    const phone = cleanText(body.phone, 32, '電話番号', true)
    const normalizedPhone = normalizeJapanesePhone(phone)
    if (!/^0[5789]0\d{8}$/.test(normalizedPhone) && !/^0\d{9}$/.test(normalizedPhone)) throw new LineReservationError('電話番号を確認してください。')
    const candidates = await tx.customer.findMany({ where: { organizationId: connection.organizationId, deletedAt: null, phone: { not: null } }, select: { id: true, name: true, phone: true } })
    let customer = candidates.find(item => normalizeJapanesePhone(item.phone) === normalizedPhone && normalizePersonName(item.name) === normalizePersonName(name)) || null
    if (!customer) customer = await tx.customer.create({ data: { organizationId: connection.organizationId, name, phone, staffAssignmentType: 'free', memo: 'LINE公式アカウントから予約登録' }, select: { id: true, name: true, phone: true } })
    await tx.$executeRawUnsafe(`INSERT INTO "CustomerLineIdentity" ("id","organizationId","customerId","lineUserId","displayName","pictureUrl","followed","lastSeenAt","createdAt","updatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,TRUE,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      ON CONFLICT ("organizationId","lineUserId") DO UPDATE SET "customerId"=EXCLUDED."customerId","displayName"=EXCLUDED."displayName","pictureUrl"=EXCLUDED."pictureUrl","followed"=TRUE,"lastSeenAt"=CURRENT_TIMESTAMP,"updatedAt"=CURRENT_TIMESTAMP`,
      crypto.randomUUID(), connection.organizationId, customer.id, identity.lineUserId, identity.displayName, identity.pictureUrl)
    return customer
  }

  async function sendLineMessage(connection, endpoint, payload) {
    const token = decryptSecret(connection.encryptedAccessToken, crypto)
    const response = await fetch(`${LINE_API}/v2/bot/message/${endpoint}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(`LINE message failed (${response.status})${data.message ? `: ${data.message}` : ''}`)
    }
  }

  async function book(req, res) {
    if (!sameOrigin(req)) throw new LineReservationError('不正なリクエストです。', 403)
    const body = parseJson(await readRawBody(req))
    const storeCode = cleanText(body.storeCode, 120, '店舗コード', true)
    const connection = await connectionForStoreCode(storeCode)
    if (!connection) throw new LineReservationError('LINE予約を利用できる店舗が見つかりません。', 404)
    const identity = await lineIdentity(req, connection)
    if (!rateLimit(`${connection.organizationId}:${identity.lineUserId}:book`, 8, 15 * 60 * 1000)) throw new LineReservationError('予約操作が続いています。少し待ってからお試しください。', 429)
    const idempotencyKey = cleanText(body.idempotencyKey, 120, '送信識別子', true)
    if (!/^[A-Za-z0-9_-]{16,120}$/.test(idempotencyKey)) throw new LineReservationError('送信識別子を確認できませんでした。画面を開き直してください。')
    const date = validateDateKey(body.date)
    const menuId = cleanText(body.menuId, 120, 'メニュー', true)
    const requestedStaffKey = cleanText(body.staffKey, 120, 'スタッフ', true)
    const startMinutes = Number(body.startMinutes)
    if (!Number.isInteger(startMinutes) || startMinutes % SLOT_INTERVAL_MINUTES !== 0) throw new LineReservationError('予約時刻を選び直してください。')
    const note = cleanText(body.note, 400, 'ご要望')
    let result
    try {
      result = await prisma.$transaction(async tx => {
        await tx.$queryRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `line:${connection.organizationId}:${date}`)
        const prior = await tx.$queryRawUnsafe('SELECT "appointmentId","status" FROM "LineBookingRequest" WHERE "organizationId"=$1 AND "lineUserId"=$2 AND "idempotencyKey"=$3 LIMIT 1 FOR UPDATE', connection.organizationId, identity.lineUserId, idempotencyKey)
        if (prior[0]?.appointmentId && prior[0].status === 'completed') {
          const appointment = await tx.appointment.findUnique({ where: { id: prior[0].appointmentId } })
          if (appointment) return { appointment, idempotent: true }
        }
        if (!prior.length) await tx.$executeRawUnsafe('INSERT INTO "LineBookingRequest" ("id","organizationId","lineUserId","idempotencyKey","status") VALUES ($1,$2,$3,$4,\'processing\')', crypto.randomUUID(), connection.organizationId, identity.lineUserId, idempotencyKey)
        const customer = await findOrCreateCustomer(tx, connection, identity, body)
        const available = await availability(connection, date, menuId, requestedStaffKey, tx)
        const slot = available.slots.find(item => item.startMinutes === startMinutes)
        if (!slot) throw new LineReservationError('選択した時間は埋まりました。別の時間を選んでください。', 409)
        const selectedStaffKey = requestedStaffKey === 'free' ? slot.availableStaffKeys[0] : requestedStaffKey
        const staff = available.candidates.find(item => item.key === selectedStaffKey)
        if (!staff) throw new LineReservationError('担当スタッフを選び直してください。')
        const scheduledAt = appointmentDate(date, startMinutes)
        const appointment = await tx.appointment.create({ data: {
          customerId: customer.id, scheduledAt, durationMinutes: available.menu.durationMinutes, menu: available.menu.name,
          estimatedPrice: available.menu.priceYen, status: '予約確定', source: 'LINE公式アカウント（LIFF）', bookingProvider: 'line',
          staffName: requestedStaffKey === 'free' ? 'フリー' : staff.name, note,
        } })
        await tx.contactLog.create({ data: {
          customerId: customer.id, channel: 'LINE', purpose: '予約登録', outcome: '予約確定',
          message: [`LINE予約: ${scheduledAt.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`, `メニュー: ${available.menu.name}`, `担当: ${requestedStaffKey === 'free' ? '指名なし' : staff.name}`, note ? `ご要望: ${note}` : null].filter(Boolean).join('\n'),
        } })
        await tx.$executeRawUnsafe('UPDATE "LineBookingRequest" SET "appointmentId"=$1,"status"=\'completed\',"error"=NULL,"updatedAt"=CURRENT_TIMESTAMP WHERE "organizationId"=$2 AND "lineUserId"=$3 AND "idempotencyKey"=$4', appointment.id, connection.organizationId, identity.lineUserId, idempotencyKey)
        await tx.$executeRawUnsafe(`INSERT INTO "StaffSystemNotification" ("id","organizationId","type","title","body","href","entityType","entityId","source")
          VALUES ($1,$2,'line_booking','LINEから新しい予約が入りました',$3,$4,'appointment',$5,'line_liff')
          ON CONFLICT ("organizationId","type","entityId") DO NOTHING`, crypto.randomUUID(), connection.organizationId, `${customer.name}様 / ${date} ${minutesLabel(startMinutes)} / ${available.menu.name}`, `/admin/appointments?date=${date}`, appointment.id)
        return { appointment, customer, menu: available.menu, staffName: requestedStaffKey === 'free' ? '指名なし' : staff.name, idempotent: false }
      }, { isolationLevel: 'Serializable', timeout: 15000 })
    } catch (error) {
      if (error?.code === 'P2034') throw new LineReservationError('同じ時間に別の予約が入りました。空き時間を更新してください。', 409)
      throw error
    }
    if (!result.idempotent) {
      const dateText = result.appointment.scheduledAt.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })
      sendLineMessage(connection, 'push', { to: identity.lineUserId, messages: [{ type: 'text', text: `ご予約を承りました。\n\n${dateText}\n${result.menu.name}\n担当: ${result.staffName}\n\n変更やキャンセルは店舗へご連絡ください。` }] }).catch(error => console.error('[line-reservation] confirmation push failed', { organizationId: connection.organizationId, appointmentId: result.appointment.id, message: error.message }))
    }
    sendJson(res, 200, { success: true, idempotent: result.idempotent, appointment: { id: result.appointment.id, scheduledAt: result.appointment.scheduledAt, menu: result.appointment.menu, staffName: result.appointment.staffName } })
  }

  function liffPage(connection) {
    const nonce = crypto.randomBytes(18).toString('base64url')
    const storeCode = connection.publicCode || connection.slug
    const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#fbf7f0"><title>LINE予約 | ${escapeHtml(connection.organizationName)}</title><script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script><style>
*{box-sizing:border-box}html{background:#fbf7f0}body{margin:0;background:#fbf7f0;color:#2f2a25;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans JP",sans-serif;-webkit-font-smoothing:antialiased}button,input,select,textarea{font:inherit}.shell{min-height:100dvh;padding:0 0 calc(32px + env(safe-area-inset-bottom))}.top{position:sticky;top:0;z-index:10;border-bottom:1px solid #e8ded2;background:rgba(255,253,249,.94);padding:14px 18px;backdrop-filter:blur(14px)}.brand{display:flex;align-items:center;gap:12px;max-width:720px;margin:auto}.mark{display:grid;width:42px;height:42px;place-items:center;border-radius:50%;background:#8f4f42;color:#fff;font-family:Georgia,serif;font-size:20px}.brand strong{display:block;font-family:Georgia,"Yu Mincho",serif;font-size:18px}.brand small{display:block;margin-top:2px;color:#8b8178}.wrap{max-width:720px;margin:auto;padding:24px 16px}.eyebrow{color:#8f4f42;font-size:12px;font-weight:800}.hero h1{margin:8px 0 10px;font-family:Georgia,"Yu Mincho",serif;font-size:30px;font-weight:600}.hero p{margin:0;color:#71665e;line-height:1.8}.steps{display:flex;gap:6px;margin:24px 0}.steps span{height:4px;flex:1;border-radius:99px;background:#eadfd4}.steps span.on{background:#8f4f42}.card{margin-top:16px;border:1px solid #e8ded2;border-radius:20px;background:#fff;padding:20px;box-shadow:0 14px 38px rgba(62,43,34,.07)}.card h2{margin:0 0 16px;font-size:18px}.field{display:grid;gap:8px;margin-top:16px}.field label{font-size:13px;font-weight:700}.field input,.field select,.field textarea{width:100%;min-height:50px;border:1px solid #ded1c6;border-radius:13px;background:#fff;padding:11px 13px;color:#2f2a25;outline:none}.field textarea{min-height:88px;resize:vertical}.field input:focus,.field select:focus,.field textarea:focus{border-color:#8f4f42;box-shadow:0 0 0 4px rgba(233,201,190,.45)}.staff-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.staff{min-height:82px;border:1px solid #e4d8cd;border-radius:14px;background:#fff;padding:12px;text-align:left;color:#2f2a25}.staff.selected{border:2px solid #8f4f42;background:#fff7f5;padding:11px}.staff strong{display:block}.staff small{display:block;margin-top:4px;color:#7c7168;line-height:1.45}.slots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.slot{min-height:46px;border:1px solid #dfd2c7;border-radius:12px;background:#fff;font-weight:700}.slot.selected{border-color:#8f4f42;background:#8f4f42;color:#fff}.primary{width:100%;min-height:52px;margin-top:20px;border:0;border-radius:999px;background:#8f4f42;color:#fff;font-weight:800;box-shadow:0 10px 25px rgba(143,79,66,.25)}.primary:disabled{opacity:.5;box-shadow:none}.secondary{width:100%;min-height:48px;margin-top:10px;border:1px solid #dfd2c7;border-radius:999px;background:#fff;color:#2f2a25;font-weight:700}.notice{margin-top:14px;border-radius:13px;background:#f6efe6;padding:12px 14px;color:#6e625a;font-size:13px;line-height:1.65}.error{margin-top:14px;border:1px solid #e7b9b4;border-radius:13px;background:#fff2f1;padding:12px 14px;color:#8d3029;font-size:13px;line-height:1.6}.success{text-align:center;padding:26px 8px}.success .check{display:grid;width:72px;height:72px;margin:0 auto 18px;place-items:center;border-radius:50%;background:#e5f0e5;color:#537853;font-size:34px}.success h2{font-family:Georgia,"Yu Mincho",serif;font-size:26px}.hidden{display:none!important}.spinner{display:inline-block;width:18px;height:18px;margin-right:8px;border:2px solid rgba(255,255,255,.45);border-top-color:#fff;border-radius:50%;vertical-align:-4px;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:380px){.staff-grid{grid-template-columns:1fr}.slots{grid-template-columns:repeat(2,minmax(0,1fr))}.hero h1{font-size:27px}}@media(prefers-reduced-motion:reduce){.spinner{animation:none}}
</style></head><body><div class="shell"><header class="top"><div class="brand"><span class="mark">L</span><div><strong>${escapeHtml(connection.organizationName)}</strong><small>LINE予約</small></div></div></header><main class="wrap"><section class="hero"><span class="eyebrow">ONLINE BOOKING</span><h1>サロン予約</h1><p>メニューと担当者を選び、空いている時間からご予約いただけます。</p></section><div class="steps"><span class="on"></span><span></span><span></span></div><section id="loading" class="card"><h2>予約画面を準備しています</h2><p class="notice">LINEアカウントを確認しています。</p></section><form id="booking" class="hidden"><section class="card"><h2>1. メニューを選ぶ</h2><div class="field"><label for="menu">ご希望のメニュー</label><select id="menu" required></select></div></section><section class="card"><h2>2. 担当者を選ぶ</h2><div id="staff" class="staff-grid"></div></section><section class="card"><h2>3. 日時を選ぶ</h2><div class="field"><label for="date">予約日</label><input id="date" type="date" required></div><div class="field"><label>空き時間</label><div id="slots" class="slots"><p class="notice">日付を選択してください。</p></div></div></section><section class="card"><h2>お客様情報</h2><div class="field"><label for="name">お名前</label><input id="name" autocomplete="name" maxlength="80" required></div><div class="field"><label for="phone">電話番号</label><input id="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="32" required></div><div class="field"><label for="note">ご要望（任意）</label><textarea id="note" maxlength="400" placeholder="施術に関するご希望があればご記入ください"></textarea></div><button id="submit" class="primary" type="submit">予約内容を確定する</button><p id="error" class="error hidden" role="alert"></p></section></form><section id="complete" class="card success hidden"><div class="check">✓</div><h2>ご予約を承りました</h2><p id="completeText" class="notice"></p><button id="close" class="secondary" type="button">LINEへ戻る</button></section></main></div><script nonce="${nonce}">
const STORE=${JSON.stringify(storeCode)}
const LIFF_ID=${JSON.stringify(connection.liffId)}
let token = ''
let config = null
let selectedStaff = 'free'
let selectedStart = null
let submitKey = ''
const $ = selector => document.querySelector(selector)

function replaceChildren(root, ...children) {
  root.replaceChildren(...children)
}

function textElement(tagName, className, text) {
  const element = document.createElement(tagName)
  if (className) element.className = className
  element.textContent = String(text || '')
  return element
}

function messageBlock(className, text) {
  return textElement('p', className, text)
}

function makeSubmitKey() {
  if (self.crypto && typeof self.crypto.randomUUID === 'function') return self.crypto.randomUUID().replace(/-/g, '')
  const bytes = new Uint8Array(24)
  self.crypto.getRandomValues(bytes)
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('')
}

const request = async (path, options = {}) => {
  const response = await fetch(path, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: 'Bearer ' + token },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw Error(data.error || '通信に失敗しました。')
  return data
}

function showError(message) {
  $('#error').textContent = String(message || '処理に失敗しました。')
  $('#error').classList.remove('hidden')
}

const minDate = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date())

const maxDate = () => {
  const date = new Date()
  date.setDate(date.getDate() + 90)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date)
}

function renderStaff() {
  const root = $('#staff')
  const buttons = config.staff.map(item => {
    const button = document.createElement('button')
    button.className = 'staff' + (item.key === selectedStaff ? ' selected' : '')
    button.type = 'button'
    button.dataset.key = String(item.key)
    button.append(
      textElement('strong', '', item.name),
      textElement('small', '', item.roleLabel || item.introduction || '予約可能な時間を確認します。'),
    )
    button.addEventListener('click', () => {
      selectedStaff = String(item.key)
      selectedStart = null
      renderStaff()
      loadSlots()
    })
    return button
  })
  replaceChildren(root, ...buttons)
}

async function loadSlots() {
  selectedStart = null
  const date = $('#date').value
  const menuId = $('#menu').value
  if (!date || !menuId) return
  const root = $('#slots')
  replaceChildren(root, messageBlock('notice', '空き時間を確認しています。'))
  try {
    const data = await request('/api/lien-line-booking/availability?store=' + encodeURIComponent(STORE) + '&date=' + encodeURIComponent(date) + '&menuId=' + encodeURIComponent(menuId) + '&staffKey=' + encodeURIComponent(selectedStaff))
    if (!data.slots.length) {
      replaceChildren(root, messageBlock('notice', 'この日は空きがありません。別の日をお選びください。'))
      return
    }
    const buttons = data.slots.map(slot => {
      const button = textElement('button', 'slot', slot.label)
      button.type = 'button'
      button.dataset.start = String(slot.startMinutes)
      button.addEventListener('click', () => {
        selectedStart = Number(slot.startMinutes)
        root.querySelectorAll('button').forEach(item => item.classList.toggle('selected', item === button))
      })
      return button
    })
    replaceChildren(root, ...buttons)
  } catch (error) {
    replaceChildren(root, messageBlock('error', error.message))
  }
}

async function boot() {
  try {
    await liff.init({ liffId: LIFF_ID })
    if (!liff.isLoggedIn()) {
      liff.login({ redirectUri: location.href })
      return
    }
    token = liff.getIDToken()
    if (!token) throw Error('LINEログインを確認できませんでした。')
    config = await request('/api/lien-line-booking/config?store=' + encodeURIComponent(STORE))
    if (!config.menus.length) throw Error('予約できるメニューが登録されていません。')
    const menuSelect = $('#menu')
    replaceChildren(menuSelect, ...config.menus.map(menu => new Option(
      String(menu.name) + '（' + Number(menu.durationMinutes) + '分・' + Number(menu.priceYen).toLocaleString('ja-JP') + '円）',
      String(menu.id),
    )))
    renderStaff()
    const date = $('#date')
    date.min = minDate()
    date.max = maxDate()
    date.value = date.min
    date.addEventListener('change', loadSlots)
    menuSelect.addEventListener('change', loadSlots)
    $('#loading').classList.add('hidden')
    $('#booking').classList.remove('hidden')
    loadSlots()
  } catch (error) {
    const root = $('#loading')
    replaceChildren(root, textElement('h2', '', '予約画面を開けませんでした'), messageBlock('error', error.message))
  }
}

$('#booking').addEventListener('submit', async event => {
  event.preventDefault()
  $('#error').classList.add('hidden')
  if (selectedStart === null) return showError('空き時間を選択してください。')
  const button = $('#submit')
  button.disabled = true
  replaceChildren(button, textElement('span', 'spinner', ''), document.createTextNode('予約を確定しています'))
  if (!submitKey) submitKey = makeSubmitKey()
  try {
    const data = await request('/api/lien-line-booking/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeCode: STORE,
        idempotencyKey: submitKey,
        menuId: $('#menu').value,
        staffKey: selectedStaff,
        date: $('#date').value,
        startMinutes: selectedStart,
        customerName: $('#name').value,
        phone: $('#phone').value,
        note: $('#note').value,
      }),
    })
    $('#booking').classList.add('hidden')
    $('#complete').classList.remove('hidden')
    const appointment = data.appointment
    $('#completeText').textContent = new Date(appointment.scheduledAt).toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo', dateStyle: 'long', timeStyle: 'short',
    }) + ' / ' + String(appointment.menu || '')
  } catch (error) {
    showError(error.message)
    button.disabled = false
    button.textContent = '予約内容を確定する'
  }
})

$('#close').addEventListener('click', () => {
  if (liff.isInClient()) liff.closeWindow()
  else location.href = 'https://line.me'
})

boot()
</script></body></html>`
    return { html, nonce }
  }

  async function bookingPage(req, res, url) {
    const match = url.pathname.match(/^\/line\/booking\/([^/]+)$/)
    if (!match) return false
    const connection = await connectionForStoreCode(decodeURIComponent(match[1]))
    if (!connection) {
      const nonce = crypto.randomBytes(18).toString('base64url')
      sendHtml(res, 404, '<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LINE予約</title><body style="margin:0;background:#fbf7f0;color:#2f2a25;font-family:sans-serif"><main style="max-width:560px;margin:15vh auto;padding:24px"><h1>LINE予約を準備中です</h1><p>店舗へお問い合わせください。</p></main></body></html>', nonce)
      return true
    }
    const page = liffPage(connection)
    sendHtml(res, 200, page.html, page.nonce)
    return true
  }

  async function lineProfile(connection, lineUserId) {
    try {
      const token = decryptSecret(connection.encryptedAccessToken, crypto)
      const response = await fetch(`${LINE_API}/v2/bot/profile/${encodeURIComponent(lineUserId)}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) })
      if (!response.ok) return {}
      return response.json()
    } catch { return {} }
  }

  async function processWebhookEvent(connection, event) {
    const webhookEventId = cleanText(event.webhookEventId, 200, 'WebhookイベントID') || crypto.createHash('sha256').update(JSON.stringify(event)).digest('hex')
    const lineUserId = cleanText(event.source?.userId, 120, 'LINEユーザーID')
    const inserted = await prisma.$queryRawUnsafe('INSERT INTO "LineWebhookEvent" ("webhookEventId","organizationId","eventType","lineUserId","status") VALUES ($1,$2,$3,$4,\'received\') ON CONFLICT ("webhookEventId") DO NOTHING RETURNING "webhookEventId"', webhookEventId, connection.organizationId, String(event.type || 'unknown'), lineUserId)
    if (!inserted.length) return
    try {
      if (lineUserId && ['follow', 'message', 'unfollow'].includes(event.type)) {
        const profile = event.type === 'unfollow' ? {} : await lineProfile(connection, lineUserId)
        await prisma.$executeRawUnsafe(`INSERT INTO "CustomerLineIdentity" ("id","organizationId","lineUserId","displayName","pictureUrl","followed","lastSeenAt","createdAt","updatedAt")
          VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
          ON CONFLICT ("organizationId","lineUserId") DO UPDATE SET "displayName"=COALESCE(EXCLUDED."displayName","CustomerLineIdentity"."displayName"),"pictureUrl"=COALESCE(EXCLUDED."pictureUrl","CustomerLineIdentity"."pictureUrl"),"followed"=EXCLUDED."followed","lastSeenAt"=CURRENT_TIMESTAMP,"updatedAt"=CURRENT_TIMESTAMP`,
          crypto.randomUUID(), connection.organizationId, lineUserId, profile.displayName || null, profile.pictureUrl || null, event.type !== 'unfollow')
      }
      if (event.replyToken && (event.type === 'follow' || (event.type === 'message' && event.message?.type === 'text' && /予約/.test(String(event.message.text || ''))))) {
        const liffUrl = `https://liff.line.me/${connection.liffId}`
        const text = event.type === 'follow'
          ? `${connection.organizationName}を友だち追加いただきありがとうございます。\nご予約は下のURLから、空き時間を確認してお取りいただけます。\n${liffUrl}`
          : `ご予約はこちらから承ります。\nメニュー・担当者・空き時間を選んでください。\n${liffUrl}`
        await sendLineMessage(connection, 'reply', { replyToken: event.replyToken, messages: [{ type: 'text', text }] })
      }
      await prisma.$executeRawUnsafe('UPDATE "LineWebhookEvent" SET "status"=\'processed\',"processedAt"=CURRENT_TIMESTAMP,"error"=NULL WHERE "webhookEventId"=$1', webhookEventId)
    } catch (error) {
      await prisma.$executeRawUnsafe('UPDATE "LineWebhookEvent" SET "status"=\'failed\',"processedAt"=CURRENT_TIMESTAMP,"error"=$2 WHERE "webhookEventId"=$1', webhookEventId, String(error.message || error).slice(0, 1000)).catch(() => {})
      console.error('[line-reservation] webhook event failed', { organizationId: connection.organizationId, webhookEventId, message: error.message })
    }
  }

  async function webhook(req, res, url) {
    const match = url.pathname.match(/^\/api\/integrations\/line\/webhook\/([A-Za-z0-9_-]{20,80})$/)
    if (!match || req.method !== 'POST') return false
    const ip = forwarded(req.headers['x-forwarded-for']) || req.socket?.remoteAddress || 'unknown'
    if (!rateLimit(`webhook:${ip}`, 600, 60 * 1000)) throw new LineReservationError('Too many requests', 429)
    const connection = await connectionForWebhookKey(match[1])
    if (!connection) throw new LineReservationError('Webhook not found', 404)
    const rawBody = await readRawBody(req)
    const channelSecret = decryptSecret(connection.encryptedChannelSecret, crypto)
    if (!verifyWebhookSignature(rawBody, req.headers['x-line-signature'], channelSecret, crypto)) throw new LineReservationError('Invalid signature', 401)
    const payload = parseJson(rawBody)
    if (connection.botUserId && payload.destination && payload.destination !== connection.botUserId) throw new LineReservationError('Invalid destination', 403)
    const events = Array.isArray(payload.events) ? payload.events : []
    await prisma.$executeRawUnsafe('UPDATE "OrganizationLineConnection" SET "lastWebhookAt"=CURRENT_TIMESTAMP,"lastError"=NULL,"updatedAt"=CURRENT_TIMESTAMP WHERE "organizationId"=$1', connection.organizationId)
    sendJson(res, 200, {})
    setImmediate(() => Promise.allSettled(events.map(event => processWebhookEvent(connection, event))))
    return true
  }

  async function handle(req, res, url) {
    try {
      if (url.pathname === '/line-settings-client-v436.js' && req.method === 'GET') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        res.setHeader('Cache-Control', 'public, max-age=300')
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.end(settingsClientScript)
        return true
      }
      if (await webhook(req, res, url)) return true
      if (/^\/line\/booking\/[^/]+$/.test(url.pathname) && req.method === 'GET') return await bookingPage(req, res, url)
      if (url.pathname === '/api/lien-line-settings') return await lineSettings(req, res)
      if (url.pathname === '/api/lien-line-booking/config' && req.method === 'GET') return await publicConfig(req, res, url)
      if (url.pathname === '/api/lien-line-booking/availability' && req.method === 'GET') return await publicAvailability(req, res, url)
      if (url.pathname === '/api/lien-line-booking/book' && req.method === 'POST') return await book(req, res)
      return false
    } catch (error) {
      const status = error instanceof LineReservationError ? error.status : error?.code === 'P2034' ? 409 : 500
      const message = error instanceof LineReservationError ? error.message : 'LINE予約の処理に失敗しました。'
      if (status >= 500) console.error('[line-reservation] request failed', { path: url.pathname, message: error?.message, code: error?.code })
      if (!res.headersSent) sendJson(res, status, { error: message })
      return true
    }
  }

  return { ensureSchema, handle }
}

module.exports = {
  createLineReservationService,
  decryptSecret,
  encryptSecret,
  normalizeJapanesePhone,
  slotAvailable,
  validateDateKey,
  verifyWebhookSignature,
}
