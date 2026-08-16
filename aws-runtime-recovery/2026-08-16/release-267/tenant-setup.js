'use strict'

const fs = require('fs')
const path = require('path')
const { createInboundEmailService } = require('./inbound-email')

const LEGACY_ORGANIZATION_ID = 'org_salon_de_lien'
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
const MAX_GMAIL_MESSAGES_PER_SYNC = 200
const DEFAULT_BUSINESS_OPEN_MINUTES = 600
const DEFAULT_BUSINESS_CLOSE_MINUTES = 1140
const DEFAULT_CLOSED_WEEKDAYS = [1]
const LEGACY_BOOKING_STAFF = [
  { staffKey: 'tanizaki', staffName: '谷崎 太二', maxConcurrentAppointments: 2 },
  { staffKey: 'watanabe', staffName: '渡邊 浩明', maxConcurrentAppointments: 1 },
  { staffKey: 'asano', staffName: '浅野 清美', maxConcurrentAppointments: 1 },
  { staffKey: 'kobayashi', staffName: '小林 美奈子', maxConcurrentAppointments: 1 },
  { staffKey: 'kaori', staffName: 'kaori', maxConcurrentAppointments: 1 },
]

function legacyStaffRowsForSchedule(schedule) {
  return LEGACY_BOOKING_STAFF.map(staff => ({
    ...staff,
    workStartMinutes: schedule.openMinutes,
    workEndMinutes: schedule.closeMinutes,
  }))
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('81') && digits.length >= 11) return `0${digits.slice(2)}`
  return digits
}

function sha256(crypto, value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex')
}

function base64UrlDecode(value, charset = 'utf-8') {
  if (!value) return ''
  const buffer = Buffer.from(String(value).replace(/-/g, '+').replace(/_/g, '/'), 'base64')
  try { return new TextDecoder(charset).decode(buffer) }
  catch { return buffer.toString('utf8') }
}

function htmlToText(value) {
  return String(value || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|div|li|tr|td|th|dt|dd|section)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\r/g, '')
    .replace(/[\t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function gmailPayloadText(payload) {
  const candidates = []
  function visit(part) {
    if (!part) return
    if (part.body?.data) {
      const contentType = (part.headers || []).find(item => String(item.name || '').toLowerCase() === 'content-type')?.value || ''
      const charset = contentType.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1] || 'utf-8'
      candidates.push({ mimeType: part.mimeType || '', text: base64UrlDecode(part.body.data, charset) })
    }
    for (const child of part.parts || []) visit(child)
  }
  visit(payload)
  const plain = candidates.find(item => item.mimeType.startsWith('text/plain'))
  if (plain) return htmlToText(plain.text)
  const html = candidates.find(item => item.mimeType.startsWith('text/html'))
  return htmlToText(html?.text || '')
}

function normalizeLines(value) {
  return htmlToText(value).normalize('NFKC').split('\n').map(line => line.trim())
}

function extractSection(body, labels, options = {}) {
  const lines = normalizeLines(body)
  const normalizedLabels = labels.map(label => label.normalize('NFKC'))
  for (const label of normalizedLabels) {
    for (let index = 0; index < lines.length; index += 1) {
      let clean = lines[index].replace(/^[■◇◆●・\s]+/, '').trim()
      if (/^[（(]/.test(clean)) clean = clean.slice(1).replace(/[）)]\s*$/, '').trim()
      if (clean !== label && !clean.startsWith(`${label}:`) && !clean.startsWith(`${label}：`)) continue
      const inline = clean.slice(label.length).replace(/^\s*[:：]\s*/, '').trim()
      const values = inline ? [inline] : []
      for (let next = index + 1; next < lines.length; next += 1) {
        if (/^[■◇◆●]/.test(lines[next])) break
        if (lines[next]) values.push(lines[next])
        if (!options.multiline && values.length) break
      }
      return values.join('\n').trim() || null
    }
  }
  return null
}

function parseJstDate(value) {
  const text = String(value || '').normalize('NFKC')
  const match = text.match(/(20\d{2})\s*(?:年|[./-])\s*(\d{1,2})\s*(?:月|[./-])\s*(\d{1,2})\s*日?(?:\s*\([^)]*\))?\s*(\d{1,2})\s*[:時]\s*(\d{1,2})?\s*分?/)
  if (!match) return null
  const [, year, month, day, hour, minute = '0'] = match.map((part, index) => index ? Number(part) : part)
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  const date = new Date(Date.UTC(year, month - 1, day, hour - 9, minute))
  return Number.isNaN(date.getTime()) ? null : date
}

function parseDuration(value) {
  const text = String(value || '').normalize('NFKC')
  const minutesOnly = text.match(/(\d+)\s*分/)
  const hours = Number(text.match(/(\d+)\s*時間/)?.[1] || 0)
  const minutes = Number(minutesOnly?.[1] || 0)
  const total = hours * 60 + minutes
  return total > 0 && total <= 720 ? total : null
}

function parseYen(value) {
  const matches = Array.from(String(value || '').normalize('NFKC').matchAll(/(?:¥|￥)?\s*([\d,]+)\s*円/g))
  const amounts = matches.map(match => Number(match[1].replace(/,/g, ''))).filter(Number.isSafeInteger)
  return amounts.length ? amounts.at(-1) : null
}

function firstCouponTitle(value) {
  if (!value || /利用なし|クーポンなし/.test(value)) return null
  return String(value).split('\n').map(line => line.trim()).filter(Boolean).find(line => !/^\[[^\]]+\](?:\s*\[[^\]]+\])*$/.test(line)) || null
}

const RESERVATION_STAFF_LABELS = [
  '予約時担当スタイリスト名', '予約時担当スタイリスト', '予約時担当スタッフ名', '予約時担当スタッフ',
  '予約時スタイリスト名', '予約時スタイリスト', '予約時指名スタッフ', '予約時指名',
  'ご指名担当者名', 'ご指名担当者', '指名担当者名', '指名担当者',
  '担当スタイリスト名', '担当スタイリスト', '担当スタッフ名', '担当スタッフ',
  '指名スタイリスト', '指名スタッフ', '施術担当者', '施術担当',
  'スタイリスト名', 'スタイリスト', '予約担当者', '担当者名', '担当者', 'ご指名', 'スタッフ', '担当', '指名',
]

const RESERVATION_STAFF_ALIASES = [
  { name: '谷崎 太二', aliases: ['谷崎太二', '谷崎', '谷崎店長', '店長谷崎'] },
  { name: '渡邊 浩明', aliases: ['渡邊浩明', '渡辺浩明', '渡邊', '渡辺'] },
  { name: '浅野 清美', aliases: ['浅野清美', '浅野'] },
  { name: '小林 美奈子', aliases: ['小林美奈子', '小林'] },
  { name: 'kaori', aliases: ['kaori', 'カオリ'] },
]

function compactReservationStaff(value) {
  return String(value || '').normalize('NFKC').replace(/[\s　・:：()（）]/g, '').toLowerCase()
}

function cleanReservationStaff(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/^指名あり\s*[:：]?\s*/, '')
    .replace(/\s*(?:様|さん|氏)\s*$/, '')
    .replace(/\s*[（(](?:指名|担当|スタイリスト)[^）)]*[）)]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function knownReservationStaff(value) {
  const compact = compactReservationStaff(value)
  return RESERVATION_STAFF_ALIASES.find(staff => staff.aliases.some(alias => compact.includes(compactReservationStaff(alias)))) || null
}

function parseReservationStaffName(text) {
  const values = RESERVATION_STAFF_LABELS
    .map(label => extractSection(text, [label]))
    .map(cleanReservationStaff)
    .filter(Boolean)
  const freePattern = /^(?:フリー|指名なし|指定なし|希望なし|おまかせ|お任せ|なし)(?:[（(].*[）)])?$/
  const genericPattern = /^(?:-|ー|未定|あり|指名あり|希望あり)$/

  for (const value of values) {
    const known = knownReservationStaff(value)
    if (known) return known.name
  }
  for (const line of normalizeLines(text).filter(line => /担当|指名|スタイリスト|スタッフ/.test(line))) {
    const known = knownReservationStaff(line)
    if (known) return known.name
  }
  for (const value of values) {
    const compact = compactReservationStaff(value)
    if (!freePattern.test(compact) && !genericPattern.test(compact)) return value
  }
  return values.some(value => freePattern.test(compactReservationStaff(value))) ? 'フリー' : null
}

function parseReservationMail({ subject = '', body = '', sender = '', messageId = '' }) {
  const text = htmlToText(body)
  const customerRaw = extractSection(text, ['お客様名（カナ）', 'お客様名', '氏名', '来店者名', '予約者名'])
  const customerName = String(customerRaw || '').replace(/\s*[（(][^）)]*[）)]\s*$/, '').replace(/\s+/g, ' ').trim()
  const scheduledAt = parseJstDate(extractSection(text, ['来店日時', '予約日時']))
  if (!customerName || !scheduledAt) return { ok: false, error: '氏名または来店日時を読み取れませんでした。' }
  const menu = extractSection(text, ['予約時メニュー', 'メニュー', '施術メニュー'], { multiline: true })
  const couponRaw = extractSection(text, ['予約時クーポン', 'ご利用クーポン', '利用クーポン'], { multiline: true })
  const coupon = firstCouponTitle(couponRaw)
  const priceText = extractSection(text, ['お支払い予定金額', '予約時合計金額', '合計金額', 'メニュー金額', '料金'])
  const durationText = extractSection(text, ['合計施術時間', '施術時間目安', '施術時間', '所要時間'])
  const staffName = parseReservationStaffName(text)
  const phone = extractSection(text, ['電話番号', '携帯電話番号', 'ご連絡先電話番号'])
  const bookingReference = extractSection(text, ['予約番号', '受付番号', '予約No', '予約NO']) || text.match(/kanzashi\.com\/reservation\/(\d+)/i)?.[1] || null
  const combined = `${subject}\n${sender}\n${text}`
  const provider = /HOT\s*PEPPER|SALON\s*BOARD|ホットペッパー/i.test(combined) ? 'hotpepper' : /kanzashi|かんざし/i.test(combined) ? 'kanzashi' : 'gmail'
  const cancelled = /キャンセル|取消/.test(`${subject}\n${text}`)
  return {
    ok: true,
    value: {
      customerName,
      phone: phone ? phone.replace(/[^\d+()-]/g, '') : null,
      scheduledAt,
      menu: [menu?.split('\n')[0] || null, coupon ? `クーポン: ${coupon}` : null].filter(Boolean).join(' / ') || null,
      estimatedPrice: parseYen(priceText) ?? parseYen(couponRaw) ?? parseYen(menu),
      staffName: staffName?.replace(/\s+/g, ' ').trim() || null,
      durationMinutes: parseDuration(durationText || menu),
      bookingReference,
      provider,
      status: cancelled ? 'キャンセル' : '仮予約',
      subject,
      messageId,
    },
  }
}

function createTenantSetupService({ prisma, sessionProvider, customerSessionProvider, crypto }) {
  let syncing = false
  const inboundEmail = createInboundEmailService({ prisma, sessionProvider, crypto, parseReservationMail, normalizePhone })

  function json(res, status, value) {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify(value))
  }

  async function readJson(req, limit = 32768) {
    let raw = ''
    for await (const chunk of req) {
      raw += chunk
      if (raw.length > limit) throw new Error('request_too_large')
    }
    return raw ? JSON.parse(raw) : {}
  }

  function authSecret() {
    const value = String(process.env.ADMIN_AUTH_SECRET || '')
    if (value.length < 32) throw new Error('ADMIN_AUTH_SECRET is not configured')
    return value
  }

  function encryptionKey() {
    return crypto.createHash('sha256').update(`gmail-tenant-refresh-token:${authSecret()}`).digest()
  }

  function encrypt(value) {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
    const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()])
    return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.')
  }

  function decrypt(value) {
    const [version, ivText, tagText, bodyText] = String(value || '').split('.')
    if (version !== 'v1' || !bodyText) throw new Error('invalid_encrypted_token')
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivText, 'base64url'))
    decipher.setAuthTag(Buffer.from(tagText, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(bodyText, 'base64url')), decipher.final()]).toString('utf8')
  }

  function signState(payload) {
    const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
    const signature = crypto.createHmac('sha256', authSecret()).update(body).digest('base64url')
    return `${body}.${signature}`
  }

  function verifyState(value) {
    const [body, received] = String(value || '').split('.')
    if (!body || !received) return null
    const expected = crypto.createHmac('sha256', authSecret()).update(body).digest('base64url')
    if (expected.length !== received.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))) return null
    try {
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
      return payload.expiresAt > Date.now() ? payload : null
    } catch { return null }
  }

  async function ensureSchema() {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "OrganizationStoreProfile" (
      "organizationId" TEXT PRIMARY KEY,
      "ownerName" TEXT,"phone" TEXT,"postalCode" TEXT,"prefecture" TEXT,"city" TEXT,"addressLine1" TEXT,"addressLine2" TEXT,
      "businessHours" TEXT,"closedDays" TEXT,"websiteUrl" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`)
    await prisma.$executeRawUnsafe('ALTER TABLE "OrganizationStoreProfile" ADD COLUMN IF NOT EXISTS "businessOpenMinutes" INTEGER NOT NULL DEFAULT 600')
    await prisma.$executeRawUnsafe('ALTER TABLE "OrganizationStoreProfile" ADD COLUMN IF NOT EXISTS "businessCloseMinutes" INTEGER NOT NULL DEFAULT 1140')
    await prisma.$executeRawUnsafe('ALTER TABLE "OrganizationStoreProfile" ADD COLUMN IF NOT EXISTS "closedWeekdays" TEXT NOT NULL DEFAULT \'1\'')
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "OrganizationGmailConnection" (
      "organizationId" TEXT PRIMARY KEY,
      "sourceEmail" TEXT NOT NULL,
      "connectedEmail" TEXT,
      "encryptedRefreshToken" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "connectedAt" TIMESTAMPTZ,
      "lastSyncAt" TIMESTAMPTZ,
      "lastError" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`)
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "GmailIngestMessage" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "gmailMessageId" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "appointmentId" TEXT,
      "errorMessage" TEXT,
      "processedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE("organizationId", "gmailMessageId")
    )`)
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "GmailIngestMessage_org_processed_idx" ON "GmailIngestMessage"("organizationId","processedAt")')
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "SalonMenu" (
      "id" TEXT PRIMARY KEY,"organizationId" TEXT NOT NULL,"name" TEXT NOT NULL,"category" TEXT NOT NULL,"description" TEXT,
      "durationMinutes" INTEGER NOT NULL,"priceYen" INTEGER NOT NULL,"source" TEXT NOT NULL DEFAULT 'manual',"sourceKey" TEXT,
      "active" BOOLEAN NOT NULL DEFAULT TRUE,"sortOrder" INTEGER NOT NULL DEFAULT 0,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE("organizationId","name")
    )`)
    const legacyMenuNumberRepairs = [
      ['カット＋デザインストレートパーマ+インプライムトリートメント', '37.カット＋デザインストレートパーマ+インプライムトリートメント'],
      ['カット＋デザインストレートパーマ+Ａｕｊｕａトリートメント', '38.カット＋デザインストレートパーマ+Ａｕｊｕａトリートメント'],
      ['インプライムトリートメント', '39.インプライムトリートメント'],
      ['Aujuaトリートメント', '40.Aujuaトリートメント'],
      ['フェイシャルエステ30分コース', '57.フェイシャルエステ30分コース'],
      ['フェイシャルエステ40分コース', '58.フェイシャルエステ40分コース'],
      ['フェイシャルエステ〜極美〜', '59.フェイシャルエステ〜極美〜'],
    ]
    for (const [currentName, numberedName] of legacyMenuNumberRepairs) {
      await prisma.$executeRawUnsafe(
        'UPDATE "SalonMenu" SET "name"=$3,"sourceKey"=CASE WHEN "sourceKey"=$2 THEN $3 ELSE "sourceKey" END,"updatedAt"=NOW() WHERE "organizationId"=$1 AND "name"=$2 AND NOT EXISTS (SELECT 1 FROM "SalonMenu" existing WHERE existing."organizationId"=$1 AND existing."name"=$3)',
        LEGACY_ORGANIZATION_ID,
        currentName,
        numberedName
      )
    }
    await inboundEmail.ensureSchema()
  }

  async function staffRows(organizationId) {
    const rows = await prisma.$queryRawUnsafe('SELECT "staffKey","staffName","maxConcurrentAppointments","workStartMinutes","workEndMinutes" FROM "StaffBookingSetting" WHERE "organizationId"=$1 ORDER BY "createdAt","staffName"', organizationId)
    if (rows.length || organizationId !== LEGACY_ORGANIZATION_ID) return rows
    const schedule = await businessSchedule(organizationId)
    return legacyStaffRowsForSchedule(schedule)
  }

  async function businessSchedule(organizationId, database = prisma) {
    const rows = await database.$queryRawUnsafe(
      'SELECT "businessOpenMinutes","businessCloseMinutes","closedWeekdays" FROM "OrganizationStoreProfile" WHERE "organizationId"=$1 LIMIT 1',
      organizationId,
    ).catch(() => [])
    const row = rows[0] || {}
    const openMinutes = Number.isInteger(Number(row.businessOpenMinutes)) ? Number(row.businessOpenMinutes) : DEFAULT_BUSINESS_OPEN_MINUTES
    const closeMinutes = Number.isInteger(Number(row.businessCloseMinutes)) ? Number(row.businessCloseMinutes) : DEFAULT_BUSINESS_CLOSE_MINUTES
    const closedWeekdays = [...new Set(String(row.closedWeekdays == null ? DEFAULT_CLOSED_WEEKDAYS.join(',') : row.closedWeekdays).split(',').map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))].sort((left, right) => left - right)
    return { openMinutes, closeMinutes, closedWeekdays }
  }

  function weekdayForDate(date) {
    const match = /^(20\d{2})-(\d{2})-(\d{2})$/.exec(String(date || ''))
    if (!match) return -1
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).getUTCDay()
  }

  function scheduleAllows({ schedule, date, startMinutes, durationMinutes }) {
    return !schedule.closedWeekdays.includes(weekdayForDate(date)) && startMinutes >= schedule.openMinutes && startMinutes + durationMinutes <= schedule.closeMinutes
  }

  async function connectionRow(organizationId) {
    return (await prisma.$queryRawUnsafe('SELECT "organizationId","sourceEmail","connectedEmail","status","connectedAt","lastSyncAt","lastError" FROM "OrganizationGmailConnection" WHERE "organizationId"=$1 LIMIT 1', organizationId))[0] || null
  }

  async function setupStatus(req, res) {
    const session = await sessionProvider(req)
    if (!session) return json(res, 401, { error: 'ログインが必要です。' })
    const [staff, menuCountRows, connection, inbound, schedule] = await Promise.all([
      staffRows(session.organizationId),
      prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "SalonMenu" WHERE "organizationId"=$1 AND "active"=true AND ($2::boolean OR "source"<>'kanzashi')`, session.organizationId, session.organizationId === LEGACY_ORGANIZATION_ID),
      connectionRow(session.organizationId),
      inboundEmail.statusForOrganization(session.organizationId),
      businessSchedule(session.organizationId),
    ])
    const legacy = session.organizationId === LEGACY_ORGANIZATION_ID
    return json(res, 200, {
      organizationId: session.organizationId,
      role: session.role,
      legacy,
      staffCount: legacy ? Math.max(staff.length, 5) : staff.length,
      staff,
      menuCount: Number(menuCountRows[0]?.count || 0),
      businessSchedule: schedule,
      inbound,
      gmail: connection ? {
        connected: connection.status === 'connected',
        sourceEmail: connection.sourceEmail,
        connectedEmail: connection.connectedEmail,
        connectedAt: connection.connectedAt,
        lastSyncAt: connection.lastSyncAt,
        lastError: connection.lastError,
      } : {
        connected: legacy && Boolean(process.env.GMAIL_OAUTH_REFRESH_TOKEN && process.env.GMAIL_RESERVATION_EMAIL),
        sourceEmail: legacy ? process.env.GMAIL_RESERVATION_EMAIL || null : null,
        connectedEmail: legacy ? process.env.GMAIL_RESERVATION_EMAIL || null : null,
        connectedAt: null,
        lastSyncAt: null,
        lastError: null,
      },
    })
  }

  async function addStaff(req, res) {
    const session = await sessionProvider(req)
    if (!session) return json(res, 401, { error: 'ログインが必要です。' })
    if (session.role !== 'ADMIN') return json(res, 403, { error: 'スタッフ追加はオーナーのみ操作できます。' })
    const data = await readJson(req)
    const name = String(data.name || '').replace(/\s+/g, ' ').trim()
    const capacity = Number(data.capacity || 1)
    if (!name || name.length > 80) return json(res, 400, { error: 'スタッフ名を入力してください。' })
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 9) return json(res, 400, { error: '同時受付数は1〜9で入力してください。' })
    const duplicate = await prisma.$queryRawUnsafe(`SELECT "id" FROM "StaffBookingSetting" WHERE "organizationId"=$1 AND regexp_replace("staffName", '\\s', '', 'g')=regexp_replace($2, '\\s', '', 'g') LIMIT 1`, session.organizationId, name)
    if (duplicate[0]) return json(res, 409, { error: '同じ名前のスタッフがすでに登録されています。' })
    const staffKey = `staff-${crypto.randomUUID()}`
    await prisma.$executeRawUnsafe('INSERT INTO "StaffBookingSetting" ("id","organizationId","staffKey","staffName","maxConcurrentAppointments","workStartMinutes","workEndMinutes","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,600,1140,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)', crypto.randomUUID(), session.organizationId, staffKey, name, capacity)
    return json(res, 201, { success: true, staffKey, name, capacity })
  }

  function requestOrigin(req) {
    const configuredUrl = String(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '').trim()
    if (configuredUrl) {
      try {
        const configured = new URL(configuredUrl)
        if (configured.protocol === 'https:' || configured.protocol === 'http:') return configured.origin
      } catch (error) {
        console.error('Configured public application URL is invalid', error.message)
      }
    }
    const forwarded = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim()
    const protocol = forwarded || (req.socket.encrypted ? 'https' : 'http')
    return `${protocol}://${req.headers.host || 'salon-de-lien.com'}`
  }

  function tenantGmailClientId() {
    return String(process.env.TENANT_GMAIL_OAUTH_CLIENT_ID || process.env.GMAIL_OAUTH_CLIENT_ID || '').trim()
  }

  function tenantGmailClientSecret() {
    return String(process.env.TENANT_GMAIL_OAUTH_CLIENT_SECRET || process.env.GMAIL_OAUTH_CLIENT_SECRET || '').trim()
  }

  async function gmailStart(req, res, url) {
    const session = await sessionProvider(req)
    if (!session) { res.statusCode = 302; res.setHeader('Location', '/admin/login'); return res.end() }
    if (session.role !== 'ADMIN') return json(res, 403, { error: 'Gmail連携はオーナーのみ操作できます。' })
    const sourceEmail = String(url.searchParams.get('email') || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sourceEmail)) return json(res, 400, { error: '予約メールを受信するGmailアドレスを入力してください。' })
    const clientId = tenantGmailClientId()
    if (!clientId) return json(res, 503, { error: 'Google OAuthクライアントが設定されていません。' })
    await prisma.$executeRawUnsafe(`INSERT INTO "OrganizationGmailConnection" ("organizationId","sourceEmail","status","updatedAt") VALUES ($1,$2,'pending',CURRENT_TIMESTAMP) ON CONFLICT ("organizationId") DO UPDATE SET "sourceEmail"=EXCLUDED."sourceEmail","status"='pending',"lastError"=NULL,"updatedAt"=CURRENT_TIMESTAMP`, session.organizationId, sourceEmail)
    const redirectUri = `${requestOrigin(req)}/api/lien-tenant-setup/gmail/callback`
    const state = signState({ organizationId: session.organizationId, userId: session.userId, sourceEmail, redirectUri, nonce: crypto.randomUUID(), expiresAt: Date.now() + 10 * 60 * 1000 })
    const authorize = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authorize.searchParams.set('client_id', clientId)
    authorize.searchParams.set('redirect_uri', redirectUri)
    authorize.searchParams.set('response_type', 'code')
    authorize.searchParams.set('scope', GMAIL_SCOPE)
    authorize.searchParams.set('access_type', 'offline')
    authorize.searchParams.set('prompt', 'consent')
    authorize.searchParams.set('include_granted_scopes', 'true')
    authorize.searchParams.set('login_hint', sourceEmail)
    authorize.searchParams.set('state', state)
    res.statusCode = 302
    res.setHeader('Location', authorize.toString())
    return res.end()
  }

  async function exchangeCode(code, redirectUri) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: tenantGmailClientId(), client_secret: tenantGmailClientSecret(), redirect_uri: redirectUri, grant_type: 'authorization_code' }),
      signal: AbortSignal.timeout(15000),
    })
    const payload = await response.json()
    if (!response.ok || !payload.access_token) throw new Error(payload.error_description || payload.error || 'Google認証情報を取得できませんでした。')
    return payload
  }

  async function gmailProfile(accessToken) {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15000) })
    const payload = await response.json()
    if (!response.ok || !payload.emailAddress) throw new Error(payload.error?.message || 'Gmailアカウントを確認できませんでした。')
    return payload
  }

  async function gmailCallback(req, res, url) {
    const state = verifyState(url.searchParams.get('state'))
    const session = await sessionProvider(req)
    if (!state || !session || session.userId !== state.userId || session.organizationId !== state.organizationId) {
      res.statusCode = 302; res.setHeader('Location', '/admin/appointments?setup=gmail-error&reason=session'); return res.end()
    }
    if (url.searchParams.get('error')) {
      await prisma.$executeRawUnsafe(`UPDATE "OrganizationGmailConnection" SET "status"='error',"lastError"=$2,"updatedAt"=CURRENT_TIMESTAMP WHERE "organizationId"=$1`, state.organizationId, String(url.searchParams.get('error')).slice(0, 500))
      res.statusCode = 302; res.setHeader('Location', '/admin/appointments?setup=gmail-error&reason=denied'); return res.end()
    }
    try {
      const token = await exchangeCode(String(url.searchParams.get('code') || ''), state.redirectUri)
      if (!token.refresh_token) throw new Error('更新トークンを取得できませんでした。Googleの同意画面から再度接続してください。')
      const profile = await gmailProfile(token.access_token)
      if (profile.emailAddress.toLowerCase() !== state.sourceEmail.toLowerCase()) throw new Error(`入力したアドレス（${state.sourceEmail}）と認証したGmail（${profile.emailAddress}）が一致しません。`)
      await prisma.$executeRawUnsafe(`UPDATE "OrganizationGmailConnection" SET "connectedEmail"=$2,"encryptedRefreshToken"=$3,"status"='connected',"connectedAt"=CURRENT_TIMESTAMP,"lastError"=NULL,"updatedAt"=CURRENT_TIMESTAMP WHERE "organizationId"=$1`, state.organizationId, profile.emailAddress.toLowerCase(), encrypt(token.refresh_token))
      await syncOrganization(state.organizationId).catch(async error => {
        await prisma.$executeRawUnsafe('UPDATE "OrganizationGmailConnection" SET "lastError"=$2,"updatedAt"=CURRENT_TIMESTAMP WHERE "organizationId"=$1', state.organizationId, String(error.message || error).slice(0, 1000))
      })
      res.statusCode = 302; res.setHeader('Location', '/admin/appointments?setup=gmail-connected'); return res.end()
    } catch (error) {
      await prisma.$executeRawUnsafe(`UPDATE "OrganizationGmailConnection" SET "status"='error',"lastError"=$2,"updatedAt"=CURRENT_TIMESTAMP WHERE "organizationId"=$1`, state.organizationId, String(error.message || error).slice(0, 1000))
      res.statusCode = 302; res.setHeader('Location', '/admin/appointments?setup=gmail-error'); return res.end()
    }
  }

  async function accessToken(refreshToken) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: tenantGmailClientId(), client_secret: tenantGmailClientSecret(), refresh_token: refreshToken, grant_type: 'refresh_token' }),
      signal: AbortSignal.timeout(15000),
    })
    const payload = await response.json()
    if (!response.ok || !payload.access_token) throw new Error(payload.error_description || payload.error || 'Gmailアクセストークンを更新できませんでした。')
    return payload.access_token
  }

  async function gmailGet(access, endpoint) {
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${endpoint}`, { headers: { Authorization: `Bearer ${access}` }, signal: AbortSignal.timeout(20000) })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error?.message || 'Gmail APIの取得に失敗しました。')
    return payload
  }

  async function findOrCreateCustomer(organizationId, parsed, hash) {
    const customers = await prisma.customer.findMany({ where: { organizationId, deletedAt: null }, select: { id: true, name: true, phone: true }, take: 5000 })
    const phone = normalizePhone(parsed.phone)
    const samePhone = phone ? customers.find(customer => normalizePhone(customer.phone) === phone) : null
    const compactName = parsed.customerName.replace(/\s/g, '')
    const sameName = customers.find(customer => customer.name.replace(/\s/g, '') === compactName)
    if (samePhone || sameName) return samePhone || sameName
    return prisma.customer.create({ data: { id: `gmail-customer-${hash.slice(0, 20)}`, organizationId, name: parsed.customerName, phone: parsed.phone || null, memo: 'Gmail予約メールから登録。内容確認後に正式な顧客情報へ更新してください。' }, select: { id: true, name: true, phone: true } })
  }

  async function ingestMessage(organizationId, gmailMessage) {
    const headers = Object.fromEntries((gmailMessage.payload?.headers || []).map(item => [String(item.name || '').toLowerCase(), item.value || '']))
    const body = gmailPayloadText(gmailMessage.payload)
    const parsedResult = parseReservationMail({ subject: headers.subject, sender: headers.from, body, messageId: gmailMessage.id })
    const recordId = `gmail-ingest-${sha256(crypto, `${organizationId}:${gmailMessage.id}`).slice(0, 24)}`
    if (!parsedResult.ok) {
      await prisma.$executeRawUnsafe(`INSERT INTO "GmailIngestMessage" ("id","organizationId","gmailMessageId","status","errorMessage","processedAt") VALUES ($1,$2,$3,'ignored:staff-parser-v3',$4,CURRENT_TIMESTAMP) ON CONFLICT ("organizationId","gmailMessageId") DO UPDATE SET "status"='ignored:staff-parser-v3',"errorMessage"=EXCLUDED."errorMessage","processedAt"=CURRENT_TIMESTAMP`, recordId, organizationId, gmailMessage.id, parsedResult.error)
      return { imported: false, ignored: true }
    }
    const parsed = parsedResult.value
    const messageHash = sha256(crypto, gmailMessage.id || `${headers.subject}\n${body}`)
    const customer = await findOrCreateCustomer(organizationId, parsed, sha256(crypto, `${organizationId}:${parsed.phone || `${parsed.customerName}:${messageHash}`}`))
    let appointmentId = parsed.bookingReference ? `gmail-appt-${sha256(crypto, `${organizationId}:booking:${parsed.bookingReference}`).slice(0, 24)}` : `gmail-appt-${sha256(crypto, `${organizationId}:message:${messageHash}`).slice(0, 24)}`
    if (parsed.status === 'キャンセル' && !parsed.bookingReference) {
      const existing = await prisma.appointment.findFirst({ where: { customerId: customer.id, scheduledAt: parsed.scheduledAt, status: { notIn: ['キャンセル', '無断キャンセル', '来店済み'] } }, orderBy: { updatedAt: 'desc' }, select: { id: true } })
      if (existing) appointmentId = existing.id
    }
    const existing = await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { id: true, estimatedPrice: true, staffName: true } })
    const estimatedPrice = parsed.status === 'キャンセル' && existing?.estimatedPrice != null ? existing.estimatedPrice : (parsed.estimatedPrice ?? existing?.estimatedPrice ?? null)
    const mergedStaffName = parsed.staffName ?? existing?.staffName ?? null
    const note = [parsed.bookingReference ? `予約番号: ${parsed.bookingReference}` : null, mergedStaffName ? `担当: ${mergedStaffName}` : null, parsed.durationMinutes ? `所要時間: ${parsed.durationMinutes}分` : null, parsed.subject ? `メール件名: ${parsed.subject}` : null, `予約元: ${parsed.provider}`, 'Gmail予約メールから抽出。元メール本文は保存していません。'].filter(Boolean).join('\n')
    const appointment = await prisma.appointment.upsert({
      where: { id: appointmentId },
      update: { customerId: customer.id, scheduledAt: parsed.scheduledAt, durationMinutes: parsed.durationMinutes, menu: parsed.menu, staffName: mergedStaffName, estimatedPrice, status: parsed.status, source: `gmail:${messageHash}`, bookingProvider: parsed.provider, note },
      create: { id: appointmentId, customerId: customer.id, scheduledAt: parsed.scheduledAt, durationMinutes: parsed.durationMinutes, menu: parsed.menu, staffName: parsed.staffName, estimatedPrice, status: parsed.status, source: `gmail:${messageHash}`, bookingProvider: parsed.provider, note },
      select: { id: true },
    })
    await prisma.$executeRawUnsafe(`INSERT INTO "GmailIngestMessage" ("id","organizationId","gmailMessageId","status","appointmentId","processedAt") VALUES ($1,$2,$3,'imported:staff-parser-v3',$4,CURRENT_TIMESTAMP) ON CONFLICT ("organizationId","gmailMessageId") DO UPDATE SET "status"='imported:staff-parser-v3',"appointmentId"=EXCLUDED."appointmentId","errorMessage"=NULL,"processedAt"=CURRENT_TIMESTAMP`, recordId, organizationId, gmailMessage.id, appointment.id)
    return { imported: true, appointmentId: appointment.id }
  }

  async function syncOrganization(organizationId) {
    const connection = (await prisma.$queryRawUnsafe(`SELECT * FROM "OrganizationGmailConnection" WHERE "organizationId"=$1 AND "status"='connected' LIMIT 1`, organizationId))[0]
    if (!connection?.encryptedRefreshToken) return { imported: 0, ignored: 0, skipped: 0 }
    try {
      const access = await accessToken(decrypt(connection.encryptedRefreshToken))
      let pageToken = null
      let ids = []
      do {
        const params = new URLSearchParams({ maxResults: '100', q: 'newer_than:60d (subject:予約 OR subject:キャンセル OR from:kanzashi.com OR from:beauty.hotpepper.jp)' })
        if (pageToken) params.set('pageToken', pageToken)
        const list = await gmailGet(access, `messages?${params}`)
        ids.push(...(list.messages || []).map(item => item.id))
        pageToken = list.nextPageToken || null
      } while (pageToken && ids.length < MAX_GMAIL_MESSAGES_PER_SYNC)
      ids = ids.slice(0, MAX_GMAIL_MESSAGES_PER_SYNC)
      const knownRows = ids.length ? await prisma.$queryRawUnsafe(`SELECT "gmailMessageId" FROM "GmailIngestMessage" WHERE "organizationId"=$1 AND "gmailMessageId"=ANY($2::text[]) AND "status" IN ('imported:staff-parser-v3','ignored:staff-parser-v3')`, organizationId, ids) : []
      const known = new Set(knownRows.map(row => row.gmailMessageId))
      let imported = 0, ignored = 0
      for (const id of ids.filter(id => !known.has(id))) {
        const message = await gmailGet(access, `messages/${encodeURIComponent(id)}?format=full`)
        const result = await ingestMessage(organizationId, message)
        imported += result.imported ? 1 : 0
        ignored += result.ignored ? 1 : 0
      }
      await prisma.$executeRawUnsafe('UPDATE "OrganizationGmailConnection" SET "lastSyncAt"=CURRENT_TIMESTAMP,"lastError"=NULL,"updatedAt"=CURRENT_TIMESTAMP WHERE "organizationId"=$1', organizationId)
      return { imported, ignored, skipped: known.size }
    } catch (error) {
      await prisma.$executeRawUnsafe('UPDATE "OrganizationGmailConnection" SET "lastError"=$2,"updatedAt"=CURRENT_TIMESTAMP WHERE "organizationId"=$1', organizationId, String(error.message || error).slice(0, 1000))
      throw error
    }
  }

  async function manualSync(req, res) {
    const session = await sessionProvider(req)
    if (!session) return json(res, 401, { error: 'ログインが必要です。' })
    try { return json(res, 200, { success: true, ...(await syncOrganization(session.organizationId)) }) }
    catch (error) { return json(res, 502, { error: String(error.message || error) }) }
  }

  function jstDateKey(date) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
  }

  function jstMinutes(date) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
    return 60 * Number(parts.find(part => part.type === 'hour')?.value || 0) + Number(parts.find(part => part.type === 'minute')?.value || 0)
  }

  function appointmentDate(dateKey, minutes) {
    const hour = String(Math.floor(minutes / 60)).padStart(2, '0')
    const minute = String(minutes % 60).padStart(2, '0')
    return new Date(`${dateKey}T${hour}:${minute}:00+09:00`)
  }

  function overlaps(startA, durationA, startB, durationB) {
    return startA < startB + durationB && startB < startA + durationA
  }

  async function tenantMenu(organizationId, key) {
    return (await prisma.$queryRawUnsafe(`SELECT "id","name","durationMinutes","priceYen" FROM "SalonMenu" WHERE "organizationId"=$1 AND "id"=$2 AND "active"=true AND ($3::boolean OR "source"<>'kanzashi') LIMIT 1`, organizationId, key, organizationId === LEGACY_ORGANIZATION_ID))[0] || null
  }

  function appointmentMatchesStaff(appointment, staff) {
    return String(appointment.staffName || '').replace(/\s/g, '') === String(staff.staffName || '').replace(/\s/g, '')
  }

  function staffCanAccept({ staff, appointments, startMinutes, durationMinutes }) {
    if (startMinutes < Number(staff.workStartMinutes) || startMinutes + durationMinutes > Number(staff.workEndMinutes)) return false
    const overlapping = appointments.filter(appointment => appointmentMatchesStaff(appointment, staff) && overlaps(startMinutes, durationMinutes, jstMinutes(appointment.scheduledAt), Number(appointment.durationMinutes || 60)))
    return overlapping.length < Number(staff.maxConcurrentAppointments || 1)
  }

  function freeCanAccept({ staff, appointments, startMinutes, durationMinutes }) {
    const working = staff.filter(row => startMinutes >= Number(row.workStartMinutes) && startMinutes + durationMinutes <= Number(row.workEndMinutes))
    if (!working.length) return false
    const totalCapacity = working.reduce((sum, row) => sum + Number(row.maxConcurrentAppointments || 1), 0)
    const overlapping = appointments.filter(appointment => overlaps(startMinutes, durationMinutes, jstMinutes(appointment.scheduledAt), Number(appointment.durationMinutes || 60)))
    return overlapping.length < totalCapacity
  }

  function sameOrigin(req) {
    const origin = String(req.headers.origin || '')
    if (!origin) return true
    try { return new URL(origin).host === String(req.headers.host || '') } catch { return false }
  }

  async function customerAvailability(req, res, url, session) {
    const month = String(url.searchParams.get('month') || '')
    const staffKey = String(url.searchParams.get('staff') || 'free')
    const menuKey = String(url.searchParams.get('menu') || '')
    if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) return json(res, 400, { error: '予約条件を確認してください。' })
    const [menu, staff, schedule] = await Promise.all([tenantMenu(session.organizationId, menuKey), staffRows(session.organizationId), businessSchedule(session.organizationId)])
    if (!menu || !staff.length || (staffKey !== 'free' && !staff.some(row => row.staffKey === staffKey))) return json(res, 400, { error: 'メニューまたはスタッフを確認してください。' })
    const start = new Date(`${month}-01T00:00:00+09:00`)
    const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1)
    const today = jstDateKey(new Date())
    const maximum = new Date(); maximum.setUTCDate(maximum.getUTCDate() + 90)
    const maximumDate = jstDateKey(maximum)
    const [appointments, overrides] = await Promise.all([
      prisma.appointment.findMany({ where: { scheduledAt: { gte: start, lt: end }, status: { notIn: ['キャンセル', '無断キャンセル'] }, customer: { organizationId: session.organizationId, deletedAt: null } }, select: { scheduledAt: true, durationMinutes: true, staffName: true } }),
      prisma.$queryRawUnsafe('SELECT "date","slotStart","remaining" FROM "BookingCapacityOverride" WHERE "organizationId"=$1 AND "date">=$2 AND "date"<$3', session.organizationId, `${month}-01`, jstDateKey(end)),
    ])
    const [year, monthNumber] = month.split('-').map(Number)
    const dates = Array.from({ length: new Date(Date.UTC(year, monthNumber, 0)).getUTCDate() }, (_, index) => `${year}-${String(monthNumber).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`)
    const days = dates.map(date => {
      if (date < today || date > maximumDate) return { date, available: false, slots: [], schedule }
      if (schedule.closedWeekdays.includes(weekdayForDate(date))) return { date, available: false, slots: [], closed: true, schedule }
      const dayAppointments = appointments.filter(appointment => jstDateKey(appointment.scheduledAt) === date)
      const candidates = staffKey === 'free' ? staff : staff.filter(row => row.staffKey === staffKey)
      const earliest = date === today ? jstMinutes(new Date()) + 60 : 0
      const slots = []
      for (let minutes = schedule.openMinutes; minutes + Number(menu.durationMinutes) <= schedule.closeMinutes; minutes += 30) {
        if (minutes < earliest) continue
        const blocked = overrides.some(row => row.date === date && Number(row.remaining) === 0 && Number(row.slotStart) >= minutes && Number(row.slotStart) < minutes + Number(menu.durationMinutes))
        if (blocked) continue
        const available = staffKey === 'free'
          ? freeCanAccept({ staff: candidates, appointments: dayAppointments, startMinutes: minutes, durationMinutes: Number(menu.durationMinutes) })
          : candidates.some(row => staffCanAccept({ staff: row, appointments: dayAppointments, startMinutes: minutes, durationMinutes: Number(menu.durationMinutes) }))
        if (available) slots.push(minutes)
      }
      return { date, available: slots.length > 0, slots, schedule }
    })
    return json(res, 200, { month, staffKey, menuKey: menu.id, today, maximumDate, schedule, days })
  }

  async function customerBook(req, res, session) {
    if (!sameOrigin(req)) return json(res, 403, { error: '不正なリクエストです。' })
    const data = await readJson(req)
    const staffKey = String(data.staffKey || 'free')
    const menuKey = String(data.menuKey || '')
    const date = String(data.date || '')
    const startMinutes = Number(data.startMinutes)
    if (!/^20\d{2}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(startMinutes) || startMinutes % 30 !== 0 || date < jstDateKey(new Date())) return json(res, 400, { error: '予約日時を確認してください。' })
    const [menu, staff, schedule] = await Promise.all([tenantMenu(session.organizationId, menuKey), staffRows(session.organizationId), businessSchedule(session.organizationId)])
    if (!menu || !staff.length || (staffKey !== 'free' && !staff.some(row => row.staffKey === staffKey))) return json(res, 400, { error: 'メニューまたはスタッフを確認してください。' })
    if (!scheduleAllows({ schedule, date, startMinutes, durationMinutes: Number(menu.durationMinutes) })) return json(res, 400, { error: schedule.closedWeekdays.includes(weekdayForDate(date)) ? '選択した日は定休日です。別の日を選んでください。' : '選択した時間は営業時間外です。別の時間を選んでください。' })
    try {
      const result = await prisma.$transaction(async transaction => {
        const customer = await transaction.customer.findFirst({ where: { id: session.customerId, organizationId: session.organizationId, deletedAt: null }, select: { id: true, name: true } })
        if (!customer) throw new Error('お客様情報が見つかりません。')
        const dayStart = appointmentDate(date, 0)
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
        const [appointments, capacityBlocks] = await Promise.all([
          transaction.appointment.findMany({ where: { scheduledAt: { gte: dayStart, lt: dayEnd }, status: { notIn: ['キャンセル', '無断キャンセル'] }, customer: { organizationId: session.organizationId, deletedAt: null } }, select: { customerId: true, scheduledAt: true, durationMinutes: true, staffName: true } }),
          transaction.$queryRawUnsafe('SELECT "slotStart" FROM "BookingCapacityOverride" WHERE "organizationId"=$1 AND "date"=$2 AND "remaining"=0 AND "slotStart">=$3 AND "slotStart"<$4', session.organizationId, date, startMinutes, startMinutes + Number(menu.durationMinutes)),
        ])
        if (capacityBlocks.length) throw new Error('この時間は受付を終了しました。別の時間を選んでください。')
        if (appointments.some(appointment => appointment.customerId === customer.id && overlaps(startMinutes, Number(menu.durationMinutes), jstMinutes(appointment.scheduledAt), Number(appointment.durationMinutes || 60)))) throw new Error('同じ時間帯にすでに予約があります。')
        const available = staffKey === 'free'
          ? freeCanAccept({ staff, appointments, startMinutes, durationMinutes: Number(menu.durationMinutes) })
          : staff.filter(row => row.staffKey === staffKey).some(row => staffCanAccept({ staff: row, appointments, startMinutes, durationMinutes: Number(menu.durationMinutes) }))
        if (!available) throw new Error('選択した時間は埋まりました。別の時間を選んでください。')
        const selected = staff.find(row => row.staffKey === staffKey)
        const staffName = staffKey === 'free' ? 'フリー' : selected.staffName
        const scheduledAt = appointmentDate(date, startMinutes)
        const appointment = await transaction.appointment.create({ data: { customerId: customer.id, scheduledAt, durationMinutes: Number(menu.durationMinutes), menu: menu.name, staffName, estimatedPrice: Number(menu.priceYen), status: '予約確定', source: 'お客様アプリ予約', bookingProvider: 'customer_app', note: staffKey === 'free' ? 'お客様アプリから予約（指名なし・店舗で振り分け）' : 'お客様アプリから予約（担当者指名）' } })
        await transaction.contactLog.create({ data: { customerId: customer.id, channel: 'お客様アプリ', purpose: '予約登録', message: `${date} ${String(Math.floor(startMinutes / 60)).padStart(2, '0')}:${String(startMinutes % 60).padStart(2, '0')} / ${menu.name} / 担当 ${staffName}`, outcome: '予約確定' } })
        return { appointment, customerName: customer.name }
      }, { isolationLevel: 'Serializable' })
      return json(res, 200, { success: true, appointment: { id: result.appointment.id, customerName: result.customerName, scheduledAt: result.appointment.scheduledAt.toISOString(), durationMinutes: result.appointment.durationMinutes, menu: result.appointment.menu, staffName: result.appointment.staffName } })
    } catch (error) { return json(res, 400, { error: String(error.message || error) }) }
  }

  async function pollConnectedOrganizations() {
    if (syncing) return
    syncing = true
    try {
      const rows = await prisma.$queryRawUnsafe(`SELECT "organizationId" FROM "OrganizationGmailConnection" WHERE "status"='connected' ORDER BY COALESCE("lastSyncAt",TIMESTAMPTZ '1970-01-01') ASC LIMIT 20`)
      for (const row of rows) await syncOrganization(row.organizationId).catch(error => console.error('tenant Gmail sync failed', row.organizationId, error.message))
    } finally { syncing = false }
  }

  async function handle(req, res, url) {
    if (url.pathname === '/tenant-setup-client.js' && req.method === 'GET') {
      const file = path.join(__dirname, 'tenant-setup-client.js')
      res.statusCode = 200; res.setHeader('Content-Type', 'application/javascript; charset=utf-8'); res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.end(fs.readFileSync(file)); return true
    }
    if (await inboundEmail.handle(req, res, url)) return true
    if (url.pathname === '/api/lien-tenant-setup/status' && req.method === 'GET') { await setupStatus(req, res); return true }
    if (url.pathname === '/api/lien-tenant-setup/staff' && req.method === 'POST') { await addStaff(req, res); return true }
    if (url.pathname === '/api/lien-tenant-setup/gmail/start' && req.method === 'GET') { await gmailStart(req, res, url); return true }
    if (url.pathname === '/api/lien-tenant-setup/gmail/callback' && req.method === 'GET') { await gmailCallback(req, res, url); return true }
    if (url.pathname === '/api/lien-tenant-setup/gmail/sync' && req.method === 'POST') { await manualSync(req, res); return true }
    if (url.pathname === '/api/customer/appointments/availability' && req.method === 'GET' && customerSessionProvider) {
      const session = await customerSessionProvider(req)
      if (session) { await customerAvailability(req, res, url, session); return true }
    }
    if (url.pathname === '/api/customer/appointments' && req.method === 'POST' && customerSessionProvider) {
      const session = await customerSessionProvider(req)
      if (session) { await customerBook(req, res, session); return true }
    }
    return false
  }

  function renderNext(req, res, url, nextHandle) {
    // tenant-runtime-v105-no-html-mutation: altering the server-rendered HTML
    // outside React causes intermittent hydration failures on client routes.
    // The cache-busted admin layout chunk now loads the optional helpers only
    // after hydration, so the Next.js response must pass through byte-for-byte.
    return nextHandle(req, res)
  }

  function startPolling() {
    if (process.env.TENANT_GMAIL_SYNC_DISABLED === 'true') return
    const initial = setTimeout(pollConnectedOrganizations, 15000); initial.unref()
    const timer = setInterval(pollConnectedOrganizations, 5 * 60 * 1000); timer.unref()
  }

  return { ensureSchema, handle, renderNext, startPolling, syncOrganization, businessSchedule }
}

module.exports = { createTenantSetupService, parseReservationMail, normalizePhone, legacyStaffRowsForSchedule }
