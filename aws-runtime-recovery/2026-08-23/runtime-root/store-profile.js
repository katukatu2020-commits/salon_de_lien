'use strict'

const fs = require('fs')
const path = require('path')

const SESSION_COOKIE = 'lien_admin_session'

class StoreProfileError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'StoreProfileError'
    this.status = status
  }
}

function safeEqual(crypto, left, right) {
  const a = Buffer.from(String(left || ''))
  const b = Buffer.from(String(right || ''))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function cookies(req) {
  return String(req.headers.cookie || '').split(';').reduce(function (result, part) {
    const index = part.indexOf('=')
    if (index < 1) return result
    const key = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    try { result[key] = decodeURIComponent(value) } catch { result[key] = value }
    return result
  }, {})
}

function sessionFromRequest(req, crypto, secret) {
  const token = cookies(req)[SESSION_COOKIE]
  if (!token || !secret || secret.length < 32) return null
  const [body, received] = token.split('.')
  if (!body || !received) return null
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  if (!safeEqual(crypto, received, expected)) return null
  try {
    const session = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (session.version !== 2 || !['ADMIN', 'STAFF'].includes(session.role)) return null
    if (!session.organizationId || !session.subject || Number(session.expiresAt) <= Math.floor(Date.now() / 1000)) return null
    return session
  } catch { return null }
}

function sameOrigin(req) {
  const origin = String(req.headers.origin || '').trim()
  if (!origin) return false
  const allowed = new Set()
  try { allowed.add(new URL(process.env.APP_URL || 'https://salon-de-lien.com').origin) } catch {}
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()
  if (host) allowed.add(protocol + '://' + host)
  return allowed.has(origin)
}

async function readJson(req, limit = 32768) {
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (Buffer.byteLength(raw, 'utf8') > limit) throw new StoreProfileError('入力内容が大きすぎます。', 413)
  }
  try { return raw ? JSON.parse(raw) : {} } catch { throw new StoreProfileError('送信内容を確認してください。') }
}

function json(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(payload))
}

function verifyScryptPassword(crypto, password, encoded) {
  const parts = String(encoded || '').split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt' || !/^[0-9a-f]{32}$/i.test(parts[1]) || !/^[0-9a-f]{128}$/i.test(parts[2])) return false
  const actual = crypto.scryptSync(String(password || ''), parts[1], 64)
  return safeEqual(crypto, actual.toString('hex'), parts[2].toLowerCase())
}

function normalizedText(value, label, maxLength) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) throw new StoreProfileError(label + 'を入力してください。')
  if (text.length > maxLength) throw new StoreProfileError(label + 'は' + maxLength + '文字以内で入力してください。')
  return text
}

function optionalText(value, label, maxLength) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (text.length > maxLength) throw new StoreProfileError(label + 'は' + maxLength + '文字以内で入力してください。')
  return text || null
}

function normalizedPhone(value) {
  const phone = optionalText(value, '電話番号', 30)
  if (!phone) return null
  if (!/^[0-9+()\-\s]+$/.test(phone) || phone.replace(/\D/g, '').length < 9) throw new StoreProfileError('電話番号を正しく入力してください。')
  return phone
}

function normalizedPostalCode(value) {
  const postalCode = optionalText(value, '郵便番号', 8)
  if (!postalCode) return null
  if (!/^\d{3}-?\d{4}$/.test(postalCode)) throw new StoreProfileError('郵便番号は123-4567の形式で入力してください。')
  const digits = postalCode.replace(/\D/g, '')
  return digits.slice(0, 3) + '-' + digits.slice(3)
}

function normalizedWebsite(value) {
  const websiteUrl = optionalText(value, 'WebサイトURL', 300)
  if (!websiteUrl) return null
  let parsed
  try { parsed = new URL(websiteUrl) } catch { throw new StoreProfileError('WebサイトURLを正しく入力してください。') }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new StoreProfileError('WebサイトURLはhttpまたはhttpsで入力してください。')
  return parsed.toString()
}

function normalizedEmail(value) {
  const email = String(value || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new StoreProfileError('メールアドレスを正しく入力してください。')
  return email
}

const DEFAULT_BUSINESS_OPEN_MINUTES = 600
const DEFAULT_BUSINESS_CLOSE_MINUTES = 1140
const DEFAULT_CLOSED_WEEKDAYS = [1]
const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function minutesToTime(minutes) {
  const value = Number(minutes)
  if (!Number.isInteger(value) || value < 0 || value > 1440) return ''
  if (value === 1440) return '24:00'
  return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0')
}

function timeToMinutes(value, label) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || '').trim())
  if (!match) throw new StoreProfileError(label + 'を時刻形式で入力してください。')
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 24 || minute > 59 || (hour === 24 && minute !== 0)) throw new StoreProfileError(label + 'を正しく入力してください。')
  const total = hour * 60 + minute
  if (total % 30 !== 0) throw new StoreProfileError(label + 'は30分単位で入力してください。')
  return total
}

function normalizedClosedWeekdays(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(',')
  const weekdays = [...new Set(values.filter(item => String(item).trim() !== '').map(Number))].sort((left, right) => left - right)
  if (weekdays.some(day => !Number.isInteger(day) || day < 0 || day > 6)) throw new StoreProfileError('定休日を確認してください。')
  return weekdays
}

function normalizedBusinessSchedule(data) {
  const openMinutes = timeToMinutes(data.businessOpen || minutesToTime(DEFAULT_BUSINESS_OPEN_MINUTES), '営業開始時刻')
  const closeMinutes = timeToMinutes(data.businessClose || minutesToTime(DEFAULT_BUSINESS_CLOSE_MINUTES), '営業終了時刻')
  if (openMinutes >= closeMinutes) throw new StoreProfileError('営業終了時刻は営業開始時刻より後に設定してください。')
  if (closeMinutes - openMinutes < 60) throw new StoreProfileError('営業時間は1時間以上で設定してください。')
  const closedWeekdays = normalizedClosedWeekdays(data.closedWeekdays)
  return {
    openMinutes,
    closeMinutes,
    closedWeekdays,
    businessHours: minutesToTime(openMinutes) + '〜' + minutesToTime(closeMinutes),
    closedDays: closedWeekdays.length ? '毎週' + closedWeekdays.map(day => WEEKDAY_LABELS[day] + '曜日').join('・') : '定休日なし',
  }
}

function createStoreProfileService({ prisma, crypto }) {
  const secret = () => String(process.env.ADMIN_AUTH_SECRET || '')
  let schemaPromise = null

  async function ensureSchema() {
    if (!schemaPromise) {
      schemaPromise = (async function () {
        await prisma.$executeRawUnsafe('ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "publicCode" TEXT')
        await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Organization_publicCode_key" ON "Organization"("publicCode")')
        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "OrganizationStoreProfile" (
        "organizationId" TEXT PRIMARY KEY,
        "ownerName" TEXT,
        "phone" TEXT,
        "postalCode" TEXT,
        "prefecture" TEXT,
        "city" TEXT,
        "addressLine1" TEXT,
        "addressLine2" TEXT,
        "businessHours" TEXT,
        "closedDays" TEXT,
        "websiteUrl" TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`)
        await prisma.$executeRawUnsafe('ALTER TABLE "OrganizationStoreProfile" ADD COLUMN IF NOT EXISTS "businessOpenMinutes" INTEGER NOT NULL DEFAULT 600')
        await prisma.$executeRawUnsafe('ALTER TABLE "OrganizationStoreProfile" ADD COLUMN IF NOT EXISTS "businessCloseMinutes" INTEGER NOT NULL DEFAULT 1140')
        await prisma.$executeRawUnsafe('ALTER TABLE "OrganizationStoreProfile" ADD COLUMN IF NOT EXISTS "closedWeekdays" TEXT NOT NULL DEFAULT \'1\'')
        await prisma.$executeRawUnsafe('ALTER TABLE "OrganizationStoreProfile" DROP CONSTRAINT IF EXISTS "OrganizationStoreProfile_business_hours_check"')
        await prisma.$executeRawUnsafe('ALTER TABLE "OrganizationStoreProfile" ADD CONSTRAINT "OrganizationStoreProfile_business_hours_check" CHECK ("businessOpenMinutes" >= 0 AND "businessCloseMinutes" <= 1440 AND "businessOpenMinutes" < "businessCloseMinutes")')
      })().catch(function (error) {
        schemaPromise = null
        throw error
      })
    }
    return schemaPromise
  }

  async function currentUser(session) {
    const selectors = []
    if (session.userId) selectors.push({ id: session.userId })
    selectors.push({ loginId: session.subject }, { email: session.subject })
    return prisma.appUser.findFirst({
      where: {
        organizationId: session.organizationId,
        active: true,
        OR: selectors,
      },
      select: { id: true, email: true, loginId: true, displayName: true, role: true, passwordHash: true },
    })
  }

  async function profile(session) {
    await ensureSchema()
    const [organization, user, staffCountRows, menuRows, inboundRows, storeRows] = await Promise.all([
      prisma.$queryRawUnsafe(
        'SELECT "id","name","slug","publicCode","updatedAt" FROM "Organization" WHERE "id"=$1 LIMIT 1',
        session.organizationId,
      ).then(rows => rows[0] || null), /* customer-card-store-profile-v352 */
      currentUser(session),
      prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "StaffBookingSetting" WHERE "organizationId"=$1 AND "active"=TRUE', session.organizationId),
      prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE "active"=true)::int AS active FROM "SalonMenu" WHERE "organizationId"=$1 AND ($2::boolean OR "source"<>\'kanzashi\')', session.organizationId, session.organizationId === 'org_salon_de_lien'),
      prisma.$queryRawUnsafe('SELECT "address","lastReceivedAt" FROM "OrganizationInboundEmail" WHERE "organizationId"=$1 LIMIT 1', session.organizationId).catch(() => []),
      prisma.$queryRawUnsafe('SELECT "ownerName","phone","postalCode","prefecture","city","addressLine1","addressLine2","businessHours","closedDays","websiteUrl","businessOpenMinutes","businessCloseMinutes","closedWeekdays" FROM "OrganizationStoreProfile" WHERE "organizationId"=$1 LIMIT 1', session.organizationId),
    ])
    if (!organization || !user) throw new StoreProfileError('店舗情報を確認できませんでした。', 404)
    const inbound = inboundRows[0] || null
    const store = storeRows[0] || {}
    const openMinutes = Number.isInteger(Number(store.businessOpenMinutes)) ? Number(store.businessOpenMinutes) : DEFAULT_BUSINESS_OPEN_MINUTES
    const closeMinutes = Number.isInteger(Number(store.businessCloseMinutes)) ? Number(store.businessCloseMinutes) : DEFAULT_BUSINESS_CLOSE_MINUTES
    const closedWeekdays = normalizedClosedWeekdays(store.closedWeekdays == null ? DEFAULT_CLOSED_WEEKDAYS : store.closedWeekdays)
    return {
      organizationId: organization.id,
      storeName: organization.name,
      slug: organization.slug,
      storeCode: organization.publicCode || '',
      ownerEmail: user.email,
      loginId: user.loginId || user.email,
      ownerDisplayName: user.displayName || '',
      currentUserName: user.displayName || user.loginId || user.email,
      ownerName: store.ownerName || user.displayName || '',
      phone: store.phone || '',
      postalCode: store.postalCode || '',
      prefecture: store.prefecture || '',
      city: store.city || '',
      addressLine1: store.addressLine1 || '',
      addressLine2: store.addressLine2 || '',
      businessHours: store.businessHours || minutesToTime(openMinutes) + '〜' + minutesToTime(closeMinutes),
      closedDays: store.closedDays || (closedWeekdays.length ? '毎週' + closedWeekdays.map(day => WEEKDAY_LABELS[day] + '曜日').join('・') : '定休日なし'),
      businessSchedule: {
        openMinutes,
        closeMinutes,
        openTime: minutesToTime(openMinutes),
        closeTime: minutesToTime(closeMinutes),
        closedWeekdays,
      },
      websiteUrl: store.websiteUrl || '',
      role: user.role,
      canEdit: user.role === 'ADMIN',
      updatedAt: organization.updatedAt,
      setup: {
        staffCount: session.organizationId === 'org_salon_de_lien'
          ? Math.max(Number(staffCountRows[0] && staffCountRows[0].count || 0), 5)
          : Number(staffCountRows[0] && staffCountRows[0].count || 0),
        menuCount: Number(menuRows[0] && menuRows[0].total || 0),
        activeMenuCount: Number(menuRows[0] && menuRows[0].active || 0),
        inboundAddress: inbound && inbound.address || null,
        lastInboundAt: inbound && inbound.lastReceivedAt || null,
      },
    }
  }

  async function updateStore(session, data) {
    if (session.role !== 'ADMIN') throw new StoreProfileError('店舗情報の変更はオーナーのみ行えます。', 403)
    await ensureSchema()
    const storeName = normalizedText(data.storeName, '店舗名', 100)
    const ownerName = optionalText(data.ownerName, 'オーナー名', 100)
    const phone = normalizedPhone(data.phone)
    const postalCode = normalizedPostalCode(data.postalCode)
    const prefecture = optionalText(data.prefecture, '都道府県', 30)
    const city = optionalText(data.city, '市区町村', 100)
    const addressLine1 = optionalText(data.addressLine1, '番地', 160)
    const addressLine2 = optionalText(data.addressLine2, '建物名・部屋番号', 160)
    const schedule = normalizedBusinessSchedule(data)
    const businessHours = schedule.businessHours
    const closedDays = schedule.closedDays
    const websiteUrl = normalizedWebsite(data.websiteUrl)
    const organization = await prisma.organization.update({
      where: { id: session.organizationId },
      data: { name: storeName },
      select: { id: true, name: true },
    })
    await prisma.$executeRawUnsafe(
      `INSERT INTO "OrganizationStoreProfile" ("organizationId","ownerName","phone","postalCode","prefecture","city","addressLine1","addressLine2","businessHours","closedDays","websiteUrl","businessOpenMinutes","businessCloseMinutes","closedWeekdays","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
       ON CONFLICT ("organizationId") DO UPDATE SET
         "ownerName"=EXCLUDED."ownerName","phone"=EXCLUDED."phone","postalCode"=EXCLUDED."postalCode",
         "prefecture"=EXCLUDED."prefecture","city"=EXCLUDED."city","addressLine1"=EXCLUDED."addressLine1",
         "addressLine2"=EXCLUDED."addressLine2","businessHours"=EXCLUDED."businessHours",
         "closedDays"=EXCLUDED."closedDays","websiteUrl"=EXCLUDED."websiteUrl",
         "businessOpenMinutes"=EXCLUDED."businessOpenMinutes","businessCloseMinutes"=EXCLUDED."businessCloseMinutes",
         "closedWeekdays"=EXCLUDED."closedWeekdays","updatedAt"=NOW()`,
      session.organizationId,
      ownerName,
      phone,
      postalCode,
      prefecture,
      city,
      addressLine1,
      addressLine2,
      businessHours,
      closedDays,
      websiteUrl,
      schedule.openMinutes,
      schedule.closeMinutes,
      schedule.closedWeekdays.join(','),
    )
    await prisma.$executeRawUnsafe(
      'UPDATE "StaffBookingSetting" SET "workStartMinutes"=$2,"workEndMinutes"=$3,"updatedAt"=NOW() WHERE "organizationId"=$1',
      session.organizationId,
      schedule.openMinutes,
      schedule.closeMinutes,
    ).catch(() => {})
    return { organizationId: organization.id, storeName: organization.name, ownerName, phone, postalCode, prefecture, city, addressLine1, addressLine2, businessHours, closedDays, websiteUrl, businessSchedule: { openMinutes: schedule.openMinutes, closeMinutes: schedule.closeMinutes, openTime: minutesToTime(schedule.openMinutes), closeTime: minutesToTime(schedule.closeMinutes), closedWeekdays: schedule.closedWeekdays } }
  }

  async function updateOwnerEmail(session, data) {
    if (session.role !== 'ADMIN') throw new StoreProfileError('メールアドレスの変更はオーナーのみ行えます。', 403)
    const email = normalizedEmail(data.email)
    const currentPassword = String(data.currentPassword || '')
    if (!currentPassword) throw new StoreProfileError('現在のパスワードを入力してください。')
    const user = await currentUser(session)
    if (!user || user.role !== 'ADMIN') throw new StoreProfileError('オーナーアカウントを確認できませんでした。', 403)
    if (!verifyScryptPassword(crypto, currentPassword, user.passwordHash)) throw new StoreProfileError('現在のパスワードが正しくありません。', 403)
    const duplicate = await prisma.appUser.findFirst({
      where: {
        id: { not: user.id },
        role: { in: ['ADMIN', 'STAFF', 'MANUFACTURER'] },
        OR: [{ email: { equals: email, mode: 'insensitive' } }, { loginId: { equals: email, mode: 'insensitive' } }],
      },
      select: { id: true },
    })
    if (duplicate) throw new StoreProfileError('このメールアドレスは別のアカウントで使用されています。', 409)
    await prisma.appUser.update({ where: { id: user.id }, data: { email }, select: { id: true } })
    return { ownerEmail: email, loginId: user.loginId || user.email }
  }

  async function handle(req, res, url) {
    if (['/commercial-admin-v101.js', '/commercial-admin-v115.js', '/commercial-admin-v116.js', '/commercial-admin-v117.js', '/commercial-admin-v118.js', '/commercial-admin-v119.js', '/commercial-admin-v122.js', '/commercial-admin-v123.js', '/commercial-admin-v124.js', '/commercial-admin-v126.js', '/commercial-admin-v127.js', '/commercial-admin-v128.js', '/commercial-admin-v129.js', '/commercial-admin-v130.js', '/commercial-admin-v136.js'].includes(url.pathname) && req.method === 'GET') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
      res.setHeader('Cache-Control', 'private, no-store')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.end(fs.readFileSync(path.join(__dirname, 'commercial-admin-v101.js')))
      return true
    }
    if (url.pathname === '/admin-staff-experience-v276.js' && req.method === 'GET') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
      res.setHeader('Cache-Control', 'private, no-store')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.end(fs.readFileSync(path.join(__dirname, 'admin-staff-experience-v276.js')))
      return true
    }
    if (url.pathname !== '/api/admin/store-profile') return false
    const session = sessionFromRequest(req, crypto, secret())
    if (!session) { json(res, 401, { ok: false, error: 'ログインし直してください。' }); return true }
    try {
      if (req.method === 'GET') {
        json(res, 200, { ok: true, profile: await profile(session) })
        return true
      }
      if (req.method !== 'POST') {
        res.statusCode = 405
        res.setHeader('Allow', 'GET, POST')
        res.end()
        return true
      }
      if (!sameOrigin(req)) throw new StoreProfileError('安全性を確認できないため更新できませんでした。', 403)
      const data = await readJson(req)
      const result = data.action === 'update-store'
        ? await updateStore(session, data)
        : data.action === 'update-owner-email'
          ? await updateOwnerEmail(session, data)
          : (() => { throw new StoreProfileError('更新内容を確認してください。') })()
      json(res, 200, { ok: true, result, profile: await profile(session) })
    } catch (error) {
      const status = error instanceof StoreProfileError ? error.status : error && error.code === 'P2002' ? 409 : 500
      if (status === 500) console.error('[store-profile] failed', { organizationId: session.organizationId, error: error && error.message })
      json(res, status, { ok: false, error: status === 500 ? '店舗情報を更新できませんでした。時間をおいて再度お試しください。' : status === 409 && !(error instanceof StoreProfileError) ? 'この情報はすでに使用されています。' : error.message })
    }
    return true
  }

  return { ensureSchema, handle, profile, updateStore, updateOwnerEmail, sessionFromRequest: req => sessionFromRequest(req, crypto, secret()) }
}

module.exports = { createStoreProfileService, StoreProfileError, verifyScryptPassword, normalizedBusinessSchedule, normalizedClosedWeekdays, minutesToTime, timeToMinutes }
