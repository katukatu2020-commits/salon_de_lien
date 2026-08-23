const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const sharp = require('sharp')

class CustomerStoreStaffError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

function cookies(req) {
  return String(req.headers.cookie || '').split(';').map(value => value.trim()).filter(Boolean).reduce((result, value) => {
    const index = value.indexOf('=')
    if (index < 1) return result
    try { result[decodeURIComponent(value.slice(0, index))] = decodeURIComponent(value.slice(index + 1)) } catch {}
    return result
  }, {})
}

function sameOrigin(req) {
  const origin = String(req.headers.origin || '').trim()
  if (!origin) return false
  const allowed = new Set()
  try { allowed.add(new URL(process.env.APP_URL || 'https://salon-de-lien.com').origin) } catch {}
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  const protocol = String(req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https')).split(',')[0].trim()
  if (host) allowed.add(protocol + '://' + host)
  return allowed.has(origin)
}

async function readJson(req, limit = 65536) {
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (Buffer.byteLength(raw, 'utf8') > limit) throw new CustomerStoreStaffError('入力内容が大きすぎます。', 413)
  }
  try { return raw ? JSON.parse(raw) : {} } catch { throw new CustomerStoreStaffError('入力内容を確認してください。') }
}

function json(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(payload))
}

function text(value, maxLength, label, required = false) {
  const result = String(value || '').replace(/\s+/g, ' ').trim()
  if (required && !result) throw new CustomerStoreStaffError(label + 'を入力してください。')
  if (result.length > maxLength) throw new CustomerStoreStaffError(label + 'は' + maxLength + '文字以内で入力してください。')
  return result
}

function email(value) {
  const result = String(value || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result) || result.length > 254) throw new CustomerStoreStaffError('メールアドレスを確認してください。')
  return result
}

function loginId(value) {
  const result = String(value || '').trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(result)) throw new CustomerStoreStaffError('ログインIDは半角英数字・記号（._-）で3〜64文字にしてください。')
  return result
}

function passwordHash(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw new CustomerStoreStaffError('パスワードは8〜128文字で入力してください。')
  const salt = crypto.randomBytes(16).toString('hex')
  return `scrypt$${salt}$${crypto.scryptSync(password, salt, 64).toString('hex')}`
}

function slug(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

function decodeImage(dataUrl) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=\r\n]+)$/i.exec(String(dataUrl || ''))
  if (!match) throw new CustomerStoreStaffError('JPEG・PNG・WebP画像を選択してください。')
  const buffer = Buffer.from(match[2], 'base64')
  if (!buffer.length || buffer.length > 3 * 1024 * 1024) throw new CustomerStoreStaffError('画像は3MB以下にしてください。')
  const mime = match[1].toLowerCase()
  const valid = mime === 'image/jpeg'
    ? buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
    : mime === 'image/png'
      ? buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      : buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP'
  if (!valid) throw new CustomerStoreStaffError('画像ファイルの内容を確認してください。')
  return { buffer, mime, extension: mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1] }
}

async function decodeSquareImage(dataUrl) {
  const image = decodeImage(dataUrl)
  const metadata = await sharp(image.buffer).metadata()
  if (!metadata.width || !metadata.height || metadata.width !== metadata.height) throw new CustomerStoreStaffError('正方形の画像を選択してください。')
  const buffer = await sharp(image.buffer).rotate().resize(512, 512, { fit: 'cover' }).webp({ quality: 86 }).toBuffer()
  return { buffer, mime: 'image/webp', extension: 'webp' }
}

function signCustomerSession(session, subject, customerId, organizationId) {
  const secret = process.env.CUSTOMER_AUTH_SECRET || process.env.ADMIN_AUTH_SECRET
  if (!secret || secret.length < 32) throw new CustomerStoreStaffError('セッション設定を確認できません。', 500)
  const issuedAt = Math.floor(Date.now() / 1000)
  const days = Math.min(90, Math.max(1, Number(process.env.CUSTOMER_SESSION_DAYS) || 30))
  const payload = {
    version: 1,
    subject: String(subject || '').trim().toLowerCase(),
    role: 'CUSTOMER',
    customerId,
    organizationId,
    userId: session.userId,
    issuedAt,
    expiresAt: issuedAt + days * 86400,
    sessionId: crypto.randomUUID(),
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return { token: `${encoded}.${crypto.createHmac('sha256', secret).update(encoded).digest('base64url')}`, maxAge: days * 86400 }
}

function createCustomerStoreStaffService({ prisma, staffSessionProvider, customerSessionProvider, renderCustomerShell }) {
  const bucket = String(process.env.S3_PRIVATE_ASSETS_BUCKET || '').trim()
  const s3 = globalThis.__lienStaffAvatarS3 || new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' })
  globalThis.__lienStaffAvatarS3 = s3
  let schemaPromise = null

  async function ensureSchema() {
    if (!schemaPromise) schemaPromise = (async () => {
      await prisma.$executeRawUnsafe('ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "publicCode" TEXT')
      await prisma.$executeRawUnsafe('ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "iconImageUrl" TEXT')
      await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "StaffSystemNotification" ("id" TEXT PRIMARY KEY,"organizationId" TEXT NOT NULL,"type" TEXT NOT NULL,"title" TEXT NOT NULL,"body" TEXT,"href" TEXT,"entityType" TEXT,"entityId" TEXT NOT NULL,"source" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)')
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "StaffSystemNotification_org_type_entity_key" ON "StaffSystemNotification"("organizationId","type","entityId")')
      await prisma.$executeRawUnsafe('ALTER TABLE "AppUser" ADD COLUMN IF NOT EXISTS "nickname" TEXT')
      await prisma.$executeRawUnsafe('ALTER TABLE "StaffBookingSetting" ADD COLUMN IF NOT EXISTS "userId" TEXT')
      await prisma.$executeRawUnsafe('ALTER TABLE "StaffBookingSetting" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT TRUE')
      await prisma.$executeRawUnsafe('ALTER TABLE "StaffBookingSetting" ADD COLUMN IF NOT EXISTS "onLeave" BOOLEAN NOT NULL DEFAULT FALSE')
      await prisma.$executeRawUnsafe(`ALTER TABLE "StaffBookingSetting" ADD COLUMN IF NOT EXISTS "closedWeekdays" TEXT NOT NULL DEFAULT ''`)
      await prisma.$executeRawUnsafe('ALTER TABLE "StaffProfileSetting" ADD COLUMN IF NOT EXISTS "profileImageKey" TEXT')
      await prisma.$executeRawUnsafe('ALTER TABLE "StaffProfileSetting" ADD COLUMN IF NOT EXISTS "roleLabel" TEXT')
      await prisma.$executeRawUnsafe('ALTER TABLE "StaffProfileSetting" ADD COLUMN IF NOT EXISTS "specialties" TEXT')
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Organization_publicCode_key" ON "Organization"("publicCode") WHERE "publicCode" IS NOT NULL')
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StaffBookingSetting_org_active_leave_idx" ON "StaffBookingSetting"("organizationId","active","onLeave")')
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StaffBookingSetting_org_user_idx" ON "StaffBookingSetting"("organizationId","userId")')
      await prisma.$executeRawUnsafe('UPDATE "Organization" SET "publicCode"=CASE WHEN "id"=\'org_salon_de_lien\' THEN \'LIEN-SALON\' WHEN "id"=\'org_showcase_yohaku\' THEN \'LIEN-YOHAKU\' ELSE \'STORE-\'||UPPER(SUBSTRING(MD5("id") FROM 1 FOR 8)) END WHERE "publicCode" IS NULL')
    })().catch(error => { schemaPromise = null; throw error })
    return schemaPromise
  }

  async function directory(organizationId, includeInactive = false) {
    await ensureSchema()
    const rows = await prisma.$queryRawUnsafe(
      `SELECT s."staffKey" AS "key",s."staffName" AS "settingName",s."userId",s."active",s."onLeave",
              s."maxConcurrentAppointments",s."workStartMinutes",s."workEndMinutes",s."closedWeekdays",
              u."displayName",u."email",u."loginId",u."role",
              p."introduction",p."profileImageKey",p."roleLabel",p."specialties"
       FROM "StaffBookingSetting" s
       LEFT JOIN "AppUser" u ON u."id"=s."userId" AND u."organizationId"=s."organizationId"
       LEFT JOIN "StaffProfileSetting" p ON p."userId"=s."userId" AND p."organizationId"=s."organizationId"
       WHERE s."organizationId"=$1 ${includeInactive ? '' : 'AND s."active"=TRUE AND s."onLeave"=FALSE AND (u."id" IS NULL OR u."active"=TRUE)'}
       ORDER BY s."createdAt",s."staffName"`,
      organizationId,
    )
    return rows.map(row => ({
      key: row.key,
      name: String(row.displayName || row.settingName || '').trim(),
      userId: row.userId || null,
      email: includeInactive ? row.email || null : undefined,
      loginId: includeInactive ? row.loginId || null : undefined,
      accountRole: includeInactive ? row.role || null : undefined,
      role: row.roleLabel || (row.role === 'ADMIN' ? 'オーナー・スタイリスト' : 'スタイリスト'),
      specialties: String(row.specialties || '').trim(),
      introduction: String(row.introduction || '').trim(),
      active: row.active !== false,
      onLeave: row.onLeave === true,
      closedWeekdays: [...new Set(String(row.closedWeekdays || '').split(',').filter(value => value.trim() !== '').map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))].sort((left, right) => left - right),
      maxConcurrentAppointments: Number(row.maxConcurrentAppointments || 1),
      workStartMinutes: Number(row.workStartMinutes || 600),
      workEndMinutes: Number(row.workEndMinutes || 1140),
      hasAvatar: Boolean(row.profileImageKey),
      avatarUrl: row.profileImageKey ? `/api/lien-staff-avatar?staffKey=${encodeURIComponent(row.key)}` : null,
    }))
  }

  async function currentStaff(req) {
    const session = await staffSessionProvider(req)
    if (!session) throw new CustomerStoreStaffError('ログインし直してください。', 401)
    return session
  }

  async function currentCustomer(req) {
    const session = await customerSessionProvider(req)
    if (!session) throw new CustomerStoreStaffError('ログインし直してください。', 401)
    return session
  }

  async function audienceSession(req) {
    const customer = await customerSessionProvider(req)
    if (customer) return { session: customer, audience: 'customer' }
    const staff = await staffSessionProvider(req)
    if (staff) return { session: staff, audience: 'staff' }
    throw new CustomerStoreStaffError('ログインし直してください。', 401)
  }

  async function staffDirectoryApi(req, res) {
    const { session } = await audienceSession(req)
    const staff = await directory(session.organizationId, false)
    const profiles = Object.fromEntries(staff.map(item => [item.key, item.introduction]))
    json(res, 200, { staff, profiles })
  }

  async function avatarRow(organizationId, staffKey) {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT s."staffKey",s."userId",p."profileImageKey"
       FROM "StaffBookingSetting" s LEFT JOIN "StaffProfileSetting" p
       ON p."organizationId"=s."organizationId" AND p."userId"=s."userId"
       WHERE s."organizationId"=$1 AND s."staffKey"=$2 LIMIT 1`,
      organizationId,
      staffKey,
    )
    return rows[0] || null
  }

  async function staffAvatar(req, res, url) {
    if (!bucket) throw new CustomerStoreStaffError('画像ストレージが設定されていません。', 503)
    const { session } = await audienceSession(req)
    const row = await avatarRow(session.organizationId, String(url.searchParams.get('staffKey') || ''))
    if (!row || !row.profileImageKey) throw new CustomerStoreStaffError('プロフィール画像が見つかりません。', 404)
    const signed = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: row.profileImageKey }), { expiresIn: 300 })
    res.statusCode = 302
    res.setHeader('Location', signed)
    res.setHeader('Cache-Control', 'private, no-store')
    res.end()
  }

  async function staffProfile(req, res) {
    const session = await currentStaff(req)
    await ensureSchema()
    if (req.method === 'GET') {
      const all = await directory(session.organizationId, true)
      const mine = all.find(item => item.userId === session.userId) || null
      return json(res, 200, { profile: mine, staff: session.role === 'ADMIN' ? all : undefined })
    }
    if (!sameOrigin(req)) throw new CustomerStoreStaffError('安全性を確認できませんでした。', 403)
    const data = await readJson(req, 5 * 1024 * 1024)
    const all = await directory(session.organizationId, true)
    const target = session.role === 'ADMIN' && data.staffKey ? all.find(item => item.key === data.staffKey) : all.find(item => item.userId === session.userId)
    if (!target || !target.userId) throw new CustomerStoreStaffError('スタッフ情報が見つかりません。', 404)
    if (session.role !== 'ADMIN' && target.userId !== session.userId) throw new CustomerStoreStaffError('このプロフィールは変更できません。', 403)
    if (data.action === 'avatar') {
      if (!bucket) throw new CustomerStoreStaffError('画像ストレージが設定されていません。', 503)
      const image = await decodeSquareImage(data.imageDataUrl)
      const objectKey = `private/staff-profile-icons/${session.organizationId}/${target.userId}/${crypto.randomUUID()}.${image.extension}`
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: objectKey, Body: image.buffer, ContentType: image.mime, CacheControl: 'private, no-store', ServerSideEncryption: 'AES256' }))
      const old = await prisma.$queryRawUnsafe('SELECT "profileImageKey" FROM "StaffProfileSetting" WHERE "organizationId"=$1 AND "userId"=$2 LIMIT 1', session.organizationId, target.userId)
      await prisma.$executeRawUnsafe('INSERT INTO "StaffProfileSetting" ("id","organizationId","userId","introduction","profileImageKey","updatedAt") VALUES ($1,$2,$3,\'\',$4,NOW()) ON CONFLICT ("organizationId","userId") DO UPDATE SET "profileImageKey"=EXCLUDED."profileImageKey","updatedAt"=NOW()', crypto.randomUUID(), session.organizationId, target.userId, objectKey)
      if (old[0]?.profileImageKey && old[0].profileImageKey !== objectKey) await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: old[0].profileImageKey })).catch(() => {})
      return json(res, 200, { ok: true, avatarUrl: `/api/lien-staff-avatar?staffKey=${encodeURIComponent(target.key)}&v=${Date.now()}` })
    }
    if (data.action === 'remove-avatar') {
      const old = await prisma.$queryRawUnsafe('SELECT "profileImageKey" FROM "StaffProfileSetting" WHERE "organizationId"=$1 AND "userId"=$2 LIMIT 1', session.organizationId, target.userId)
      await prisma.$executeRawUnsafe('UPDATE "StaffProfileSetting" SET "profileImageKey"=NULL,"updatedAt"=NOW() WHERE "organizationId"=$1 AND "userId"=$2', session.organizationId, target.userId)
      if (old[0]?.profileImageKey) await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: old[0].profileImageKey })).catch(() => {})
      return json(res, 200, { ok: true })
    }
    const displayName = text(data.displayName, 80, '表示名', true)
    const roleLabel = text(data.roleLabel, 80, '役職')
    const specialties = text(data.specialties, 160, '得意な施術')
    const introduction = text(data.introduction, 300, '紹介文')
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe('UPDATE "AppUser" SET "displayName"=$1,"updatedAt"=NOW() WHERE "id"=$2 AND "organizationId"=$3', displayName, target.userId, session.organizationId)
      await tx.$executeRawUnsafe('UPDATE "StaffBookingSetting" SET "staffName"=$1,"updatedAt"=NOW() WHERE "organizationId"=$2 AND "userId"=$3', displayName, session.organizationId, target.userId)
      await tx.$executeRawUnsafe('INSERT INTO "StaffProfileSetting" ("id","organizationId","userId","introduction","roleLabel","specialties","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,NOW()) ON CONFLICT ("organizationId","userId") DO UPDATE SET "introduction"=EXCLUDED."introduction","roleLabel"=EXCLUDED."roleLabel","specialties"=EXCLUDED."specialties","updatedAt"=NOW()', crypto.randomUUID(), session.organizationId, target.userId, introduction, roleLabel || null, specialties || null)
      await tx.$executeRawUnsafe('UPDATE "ChatThread" SET "staffName"=$1,"updatedAt"=NOW() WHERE "organizationId"=$2 AND "staffKey"=$3', displayName, session.organizationId, target.key)
    })
    return json(res, 200, { ok: true, profile: (await directory(session.organizationId, true)).find(item => item.key === target.key) })
  }

  function normalizeStaffClosedWeekdays(value) {
    const source = (Array.isArray(value) ? value : String(value || '').split(',')).filter(item => String(item).trim() !== '')
    return [...new Set(source.map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))].sort((left, right) => left - right).join(',')
  }

  async function staffManagement(req, res) {
    const session = await currentStaff(req)
    if (session.role !== 'ADMIN') throw new CustomerStoreStaffError('スタッフ管理はオーナーのみ利用できます。', 403)
    await ensureSchema()
    if (req.method === 'GET') return json(res, 200, { staff: await directory(session.organizationId, true) })
    if (!sameOrigin(req)) throw new CustomerStoreStaffError('安全性を確認できませんでした。', 403)
    const data = await readJson(req)
    if (req.method === 'POST') {
      const name = text(data.displayName, 80, 'スタッフ名', true)
      const accountEmail = email(data.email)
      const accountLoginId = loginId(data.loginId)
      const key = slug(data.staffKey || accountLoginId)
      if (!key) throw new CustomerStoreStaffError('スタッフ識別キーを確認してください。')
      const duplicate = await prisma.$queryRawUnsafe('SELECT "id" FROM "AppUser" WHERE LOWER("email")=$1 OR LOWER(COALESCE("loginId",\'\'))=$2 LIMIT 1', accountEmail, accountLoginId)
      if (duplicate[0]) throw new CustomerStoreStaffError('このメールアドレスまたはログインIDは登録済みです。', 409)
      const settingDuplicate = await prisma.$queryRawUnsafe('SELECT "id","userId" FROM "StaffBookingSetting" WHERE "organizationId"=$1 AND "staffKey"=$2 LIMIT 1', session.organizationId, key)
      if (settingDuplicate[0]?.userId) throw new CustomerStoreStaffError('このスタッフ識別キーは使用されています。', 409)
      const userId = crypto.randomUUID()
      const roleLabel = text(data.roleLabel, 80, '役職') || 'スタイリスト'
      const specialties = text(data.specialties, 160, '得意な施術')
      const introduction = text(data.introduction, 300, '紹介文')
      const capacity = Math.min(9, Math.max(1, Number(data.maxConcurrentAppointments) || 1))
      const closedWeekdays = normalizeStaffClosedWeekdays(data.closedWeekdays)
      const scheduleRows = await prisma.$queryRawUnsafe('SELECT "businessOpenMinutes","businessCloseMinutes" FROM "OrganizationStoreProfile" WHERE "organizationId"=$1 LIMIT 1', session.organizationId).catch(() => [])
      const workStartMinutes = Number.isInteger(Number(scheduleRows[0]?.businessOpenMinutes)) ? Number(scheduleRows[0].businessOpenMinutes) : 600
      const workEndMinutes = Number.isInteger(Number(scheduleRows[0]?.businessCloseMinutes)) ? Number(scheduleRows[0].businessCloseMinutes) : 1140
      await prisma.$transaction(async tx => {
        await tx.$executeRawUnsafe('INSERT INTO "AppUser" ("id","organizationId","email","loginId","displayName","passwordHash","role","active","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,\'STAFF\',TRUE,NOW(),NOW())', userId, session.organizationId, accountEmail, accountLoginId, name, passwordHash(String(data.password || '')))
        if (settingDuplicate[0]) await tx.$executeRawUnsafe('UPDATE "StaffBookingSetting" SET "staffName"=$1,"userId"=$2,"active"=TRUE,"onLeave"=FALSE,"maxConcurrentAppointments"=$3,"closedWeekdays"=$4,"updatedAt"=NOW() WHERE "id"=$5 AND "organizationId"=$6', name, userId, capacity, closedWeekdays, settingDuplicate[0].id, session.organizationId)
        else await tx.$executeRawUnsafe('INSERT INTO "StaffBookingSetting" ("id","organizationId","staffKey","staffName","userId","active","onLeave","maxConcurrentAppointments","workStartMinutes","workEndMinutes","closedWeekdays","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,TRUE,FALSE,$6,$7,$8,$9,NOW(),NOW())', crypto.randomUUID(), session.organizationId, key, name, userId, capacity, workStartMinutes, workEndMinutes, closedWeekdays)
        await tx.$executeRawUnsafe('INSERT INTO "StaffProfileSetting" ("id","organizationId","userId","introduction","roleLabel","specialties","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())', crypto.randomUUID(), session.organizationId, userId, introduction, roleLabel, specialties || null)
      })
      return json(res, 201, { ok: true, staff: await directory(session.organizationId, true) })
    }
    const key = String(data.staffKey || '')
    const target = (await directory(session.organizationId, true)).find(item => item.key === key)
    if (!target) throw new CustomerStoreStaffError('スタッフが見つかりません。', 404)
    if (target.userId === session.userId && (req.method === 'DELETE' || data.active === false)) throw new CustomerStoreStaffError('ログイン中のアカウントは停止できません。')
    if (target.accountRole === 'ADMIN' && (req.method === 'DELETE' || data.active === false)) throw new CustomerStoreStaffError('オーナーアカウントはスタッフ管理から停止できません。')
    if (req.method === 'DELETE') {
      await prisma.$transaction(async tx => {
        await tx.$executeRawUnsafe('UPDATE "StaffBookingSetting" SET "active"=FALSE,"onLeave"=FALSE,"updatedAt"=NOW() WHERE "organizationId"=$1 AND "staffKey"=$2', session.organizationId, key)
        if (target.userId) await tx.$executeRawUnsafe('UPDATE "AppUser" SET "active"=FALSE,"updatedAt"=NOW() WHERE "id"=$1 AND "organizationId"=$2 AND "role"=\'STAFF\'', target.userId, session.organizationId)
      })
      return json(res, 200, { ok: true, staff: await directory(session.organizationId, true) })
    }
    const name = text(data.displayName || target.name, 80, 'スタッフ名', true)
    const active = data.active !== false
    const onLeave = active && data.onLeave === true
    const capacity = Math.min(9, Math.max(1, Number(data.maxConcurrentAppointments) || target.maxConcurrentAppointments || 1))
    const closedWeekdays = normalizeStaffClosedWeekdays(data.closedWeekdays)
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe('UPDATE "StaffBookingSetting" SET "staffName"=$1,"active"=$2,"onLeave"=$3,"maxConcurrentAppointments"=$4,"closedWeekdays"=$5,"updatedAt"=NOW() WHERE "organizationId"=$6 AND "staffKey"=$7', name, active, onLeave, capacity, closedWeekdays, session.organizationId, key)
      if (target.userId) await tx.$executeRawUnsafe('UPDATE "AppUser" SET "displayName"=$1,"active"=$2,"updatedAt"=NOW() WHERE "id"=$3 AND "organizationId"=$4', name, active, target.userId, session.organizationId)
    })
    return json(res, 200, { ok: true, staff: await directory(session.organizationId, true) })
  }

  async function nickname(req, res) {
    const session = await currentCustomer(req)
    await ensureSchema()
    if (req.method === 'GET') {
      const rows = await prisma.$queryRawUnsafe('SELECT "nickname" FROM "AppUser" WHERE "id"=$1 AND "customerId"=$2 AND "organizationId"=$3 AND "role"=\'CUSTOMER\' AND "active"=TRUE LIMIT 1', session.userId, session.customerId, session.organizationId)
      if (!rows[0]) throw new CustomerStoreStaffError('会員情報が見つかりません。', 404)
      return json(res, 200, { nickname: rows[0].nickname || '' })
    }
    if (!sameOrigin(req)) throw new CustomerStoreStaffError('安全性を確認できませんでした。', 403)
    const data = await readJson(req)
    const value = text(data.nickname, 30, 'ニックネーム', true)
    await prisma.$executeRawUnsafe('UPDATE "AppUser" SET "nickname"=$1,"updatedAt"=NOW() WHERE "id"=$2 AND "customerId"=$3 AND "organizationId"=$4 AND "role"=\'CUSTOMER\'', value, session.userId, session.customerId, session.organizationId)
    return json(res, 200, { ok: true, nickname: value })
  }

  async function communityNickname(req, res, url) {
    const session = await currentCustomer(req)
    const postId = String(url.searchParams.get('postId') || '').trim()
    if (!postId || postId.length > 160) throw new CustomerStoreStaffError('投稿を確認できません。', 400)
    const rows = await prisma.$queryRawUnsafe(
      `SELECT NULLIF(BTRIM(u."nickname"),'') AS "nickname"
       FROM "VisitCommunityPost" p
       JOIN "Customer" c ON c."id"=p."customerId" AND c."organizationId"=p."organizationId" AND c."deletedAt" IS NULL
       LEFT JOIN "AppUser" u ON u."customerId"=c."id" AND u."organizationId"=p."organizationId" AND u."role"='CUSTOMER' AND u."active"=TRUE
       WHERE p."id"=$1 AND p."organizationId"=$2 AND p."published"=TRUE LIMIT 1`,
      postId,
      session.organizationId,
    )
    if (!rows[0]) throw new CustomerStoreStaffError('投稿が見つかりません。', 404)
    return json(res, 200, { nickname: rows[0].nickname || null })
  }

  async function linkedStores(session) {
    await ensureSchema()
    return prisma.$queryRawUnsafe(
      `SELECT l."organizationId",l."customerId",o."name",o."publicCode",o."iconImageUrl",TRUE AS "linked",
              CASE WHEN l."organizationId"=$2 THEN TRUE ELSE FALSE END AS "current",l."createdAt"
       FROM "CustomerStoreLink" l JOIN "Organization" o ON o."id"=l."organizationId"
       JOIN "Customer" c ON c."id"=l."customerId" AND c."organizationId"=l."organizationId" AND c."deletedAt" IS NULL
       WHERE l."appUserId"=$1
       UNION ALL
       SELECT o."id",c."id",o."name",o."publicCode",o."iconImageUrl",FALSE,TRUE,c."createdAt"
       FROM "AppUser" u JOIN "Customer" c ON c."id"=u."customerId" AND c."deletedAt" IS NULL
       JOIN "Organization" o ON o."id"=u."organizationId"
       WHERE u."id"=$1 AND u."organizationId"=$2 AND u."role"=\'CUSTOMER\' AND u."active"=TRUE
         AND NOT EXISTS (SELECT 1 FROM "CustomerStoreLink" x WHERE x."appUserId"=u."id")
       ORDER BY "current" DESC,"createdAt"`,
      session.userId,
      session.organizationId,
    )
  }

  async function createSystemNotification(organizationId, type, entityId, title, body, href, source, entityType = null) {
    await prisma.$executeRawUnsafe('INSERT INTO "StaffSystemNotification" ("id","organizationId","type","title","body","href","entityType","entityId","source") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT ("organizationId","type","entityId") DO NOTHING', crypto.randomUUID(), organizationId, type, title, body || null, href || null, entityType, entityId, source || null)
  }

  async function customerStores(req, res) {
    const session = await currentCustomer(req)
    if (req.method === 'GET') return json(res, 200, { stores: await linkedStores(session) })
    if (!sameOrigin(req)) throw new CustomerStoreStaffError('安全性を確認できませんでした。', 403)
    const data = await readJson(req)
    let organizationId = String(data.organizationId || '')
    let customerId = ''
    let linkedNewStore = false
    let linkedStoreName = ''
    let linkedCustomerName = ''
    if (data.action === 'link') {
      const code = String(data.storeCode || '').trim().toUpperCase()
      if (!/^[A-Z0-9-]{5,32}$/.test(code)) throw new CustomerStoreStaffError('店舗識別コードを確認してください。')
      const organizations = await prisma.$queryRawUnsafe('SELECT "id","name" FROM "Organization" WHERE UPPER("publicCode")=$1 LIMIT 1', code)
      if (!organizations[0]) throw new CustomerStoreStaffError('店舗が見つかりません。コードをもう一度ご確認ください。', 404)
      organizationId = organizations[0].id
      linkedStoreName = organizations[0].name
      const existing = await prisma.$queryRawUnsafe('SELECT "customerId" FROM "CustomerStoreLink" WHERE "appUserId"=$1 AND "organizationId"=$2 LIMIT 1', session.userId, organizationId)
      if (existing[0]) customerId = existing[0].customerId
      else {
        const source = await prisma.$queryRawUnsafe(`SELECT c."name",c."gender",c."birthYear",c."birthDate",c."phone",c."servicePreference",c."profileImageUrl",
          h."hairThickness",h."hairVolume",h."hairTexture",h."scalpCondition",h."lifestyle",h."stylingTimeMinutes",h."hairCurl"
          FROM "Customer" c LEFT JOIN "HairProfile" h ON h."customerId"=c."id"
          WHERE c."id"=$1 AND c."organizationId"=$2 AND c."deletedAt" IS NULL LIMIT 1`, session.customerId, session.organizationId)
        if (!source[0]) throw new CustomerStoreStaffError('会員情報が見つかりません。', 404)
        linkedCustomerName = source[0].name
        customerId = crypto.randomUUID()
        await prisma.$transaction(async tx => {
          await tx.$executeRawUnsafe('INSERT INTO "Customer" ("id","organizationId","name","gender","birthYear","birthDate","phone","servicePreference","profileImageUrl","staffAssignmentType","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,\'free\',NOW(),NOW())', customerId, organizationId, source[0].name, source[0].gender, source[0].birthYear, source[0].birthDate, source[0].phone, source[0].servicePreference, source[0].profileImageUrl)
          if ([source[0].hairThickness, source[0].hairVolume, source[0].hairTexture, source[0].scalpCondition, source[0].lifestyle, source[0].stylingTimeMinutes, source[0].hairCurl].some(value => value != null)) {
            await tx.$executeRawUnsafe('INSERT INTO "HairProfile" ("id","customerId","hairThickness","hairVolume","hairTexture","scalpCondition","lifestyle","stylingTimeMinutes","hairCurl","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())', crypto.randomUUID(), customerId, source[0].hairThickness, source[0].hairVolume, source[0].hairTexture, source[0].scalpCondition, source[0].lifestyle, source[0].stylingTimeMinutes, source[0].hairCurl)
          }
          await tx.$executeRawUnsafe('INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId","createdAt") VALUES ($1,$2,$3,$4,NOW())', crypto.randomUUID(), session.userId, organizationId, customerId)
        })
        linkedNewStore = true
      }
    } else if (data.action === 'switch') {
      const existing = await prisma.$queryRawUnsafe('SELECT "customerId" FROM "CustomerStoreLink" WHERE "appUserId"=$1 AND "organizationId"=$2 LIMIT 1', session.userId, organizationId)
      if (!existing[0]) throw new CustomerStoreStaffError('登録済みの店舗ではありません。', 404)
      customerId = existing[0].customerId
    } else throw new CustomerStoreStaffError('操作内容を確認してください。')
    if (linkedNewStore) {
      await createSystemNotification(organizationId, 'store_inflow', customerId, '別店舗からお客様が登録されました', `${linkedStoreName || '店舗'}へ${linkedCustomerName || 'お客様'}様が流入しました。顧客情報をご確認ください。`, `/admin/customers/${encodeURIComponent(customerId)}`, 'customer_store_link', 'customer')
      const linkedCustomer = (await prisma.$queryRawUnsafe('SELECT "name","gender" FROM "Customer" WHERE "id"=$1 AND "organizationId"=$2 LIMIT 1', customerId, organizationId))[0]
      if (linkedCustomer) {
        const same = await prisma.$queryRawUnsafe('SELECT "id" FROM "Customer" WHERE "organizationId"=$1 AND "deletedAt" IS NULL AND "id"<>$2 AND LOWER(REGEXP_REPLACE(BTRIM("name"),\'[\\s　]+\',\'\',\'g\'))=LOWER(REGEXP_REPLACE(BTRIM($3),\'[\\s　]+\',\'\',\'g\')) AND COALESCE("gender",\'\')=COALESCE($4,\'\') LIMIT 1', organizationId, customerId, linkedCustomer.name, linkedCustomer.gender)
        if (same[0]) await createSystemNotification(organizationId, 'duplicate_candidate', `link-${customerId}`, '同一人物の可能性がある顧客が見つかりました', `${linkedCustomer.name}様と同名・同性の顧客が登録済みです。統合が必要か確認してください。`, `/admin/customers/${encodeURIComponent(customerId)}`, 'customer_store_link', 'customer_group')
      }
    }
    const users = await prisma.$queryRawUnsafe('SELECT "loginId","email" FROM "AppUser" WHERE "id"=$1 AND "role"=\'CUSTOMER\' AND "active"=TRUE LIMIT 1', session.userId)
    if (!users[0]) throw new CustomerStoreStaffError('会員情報が見つかりません。', 404)
    await prisma.$executeRawUnsafe('UPDATE "AppUser" SET "organizationId"=$1,"customerId"=$2,"updatedAt"=NOW() WHERE "id"=$3 AND "role"=\'CUSTOMER\' AND "active"=TRUE', organizationId, customerId, session.userId)
    const signed = signCustomerSession(session, users[0].loginId || users[0].email, customerId, organizationId)
    res.setHeader('Set-Cookie', `lien_customer_session=${encodeURIComponent(signed.token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${signed.maxAge}`)
    return json(res, 200, { ok: true, redirect: '/u/home' })
  }

  async function storeIcon(req, res, url) {
    await ensureSchema()
    const { session, audience } = await audienceSession(req)
    const organizationId = String(url.searchParams.get('organizationId') || session.organizationId)
    if (audience === 'staff' && organizationId !== session.organizationId) throw new CustomerStoreStaffError('別店舗の画像は表示できません。', 403)
    if (audience === 'customer' && organizationId !== session.organizationId) {
      const allowed = await prisma.$queryRawUnsafe('SELECT 1 FROM "CustomerStoreLink" WHERE "appUserId"=$1 AND "organizationId"=$2 LIMIT 1', session.userId, organizationId)
      if (!allowed[0]) throw new CustomerStoreStaffError('登録済みの店舗ではありません。', 403)
    }
    const row = (await prisma.$queryRawUnsafe('SELECT "iconImageUrl" FROM "Organization" WHERE "id"=$1 LIMIT 1', organizationId))[0]
    const value = String(row?.iconImageUrl || '')
    if (!value) {
      res.statusCode = 302; res.setHeader('Location', '/brand/salon-customer-service-mark.svg'); res.setHeader('Cache-Control', 'private, no-store'); return res.end()
    }
    if (value.startsWith('private/')) {
      if (!bucket) throw new CustomerStoreStaffError('画像ストレージが設定されていません。', 503)
      const signed = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: value }), { expiresIn: 300 })
      res.statusCode = 302; res.setHeader('Location', signed); res.setHeader('Cache-Control', 'private, no-store'); return res.end()
    }
    const iconTarget = value.startsWith('/') && value !== '/brand/yohaku-mark.svg' ? value : '/brand/salon-customer-service-mark.svg'
    res.statusCode = 302; res.setHeader('Location', iconTarget); res.setHeader('Cache-Control', 'private, no-store'); res.end()
  }
  
  async function updateStoreIcon(req, res) {
    const session = await currentStaff(req)
    if (session.role !== 'ADMIN') throw new CustomerStoreStaffError('オーナーのみ変更できます。', 403)
    if (!sameOrigin(req)) throw new CustomerStoreStaffError('安全性を確認できませんでした。', 403)
    if (!bucket) throw new CustomerStoreStaffError('画像ストレージが設定されていません。', 503)
    const data = await readJson(req, 5 * 1024 * 1024)
    const image = await decodeSquareImage(data.imageDataUrl)
    const objectKey = `private/store-icons/${session.organizationId}/${crypto.randomUUID()}.webp`
    const old = await prisma.$queryRawUnsafe('SELECT "iconImageUrl" FROM "Organization" WHERE "id"=$1 LIMIT 1', session.organizationId)
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: objectKey, Body: image.buffer, ContentType: image.mime, CacheControl: 'private, no-store', ServerSideEncryption: 'AES256' }))
    await prisma.$executeRawUnsafe('UPDATE "Organization" SET "iconImageUrl"=$1,"updatedAt"=NOW() WHERE "id"=$2', objectKey, session.organizationId)
    if (String(old[0]?.iconImageUrl || '').startsWith('private/store-icons/') && old[0].iconImageUrl !== objectKey) await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: old[0].iconImageUrl })).catch(() => {})
    return json(res, 200, { ok: true, iconUrl: `/api/lien-store-icon?v=${Date.now()}` })
  }

  async function storesPage(req, res) {
    const session = await currentCustomer(req)
    const stores = await linkedStores(session)
    const cards = stores.map(store => `<article class="registered-store-card ${store.current ? 'current' : ''}"><span class="registered-store-mark"><img src="/api/lien-store-icon?organizationId=${encodeURIComponent(store.organizationId)}" alt="${escapeHtml(store.name)}の店舗アイコン" width="52" height="52" loading="lazy" decoding="async" style="display:block;width:52px;height:52px;max-width:52px;max-height:52px;object-fit:cover" onerror="this.style.display='none';this.parentElement.textContent='${String(store.name || '店').trim().slice(0, 1)}'"></span><div><strong>${escapeHtml(store.name)}</strong><p>${store.linked ? (store.current ? '現在利用中の店舗' : '登録済み') : '利用可能な店舗（未選択）'}</p></div>${store.linked ? (store.current ? '<span class="registered-store-current">利用中</span>' : `<button type="button" data-switch-store="${escapeHtml(store.organizationId)}">切り替える</button>`) : '<span class="registered-store-current">閲覧中</span>'}</article>`).join('')
    const body = `<section class="page-title"><h1>登録済みの店舗</h1><p>利用するサロンを登録・切り替えできます。</p></section><section class="registered-store-section"><div class="registered-store-list">${cards || '<p class="registered-store-empty">登録済みの店舗はありません。</p>'}</div><form id="register-store-form" class="registered-store-form"><label for="store-code">店舗識別コード</label><p>サロンから案内された変更不可のコードを入力してください。</p><div><input id="store-code" name="storeCode" autocomplete="off" maxlength="32" placeholder="例: LIEN-SALON" required><button type="submit">店舗を登録</button></div><output id="store-result" aria-live="polite"></output></form></section><style>.page-title p{margin:8px 0 0;color:var(--muted);font-size:12px}.registered-store-section{max-width:840px;margin:auto;padding:18px}.registered-store-list{display:grid;gap:12px}.registered-store-card{display:grid;grid-template-columns:56px minmax(0,1fr) auto;align-items:center;gap:14px;border:1px solid var(--line);border-radius:18px;background:white;padding:16px}.registered-store-card.current{border-color:#dca8b5;background:#fff8fa}.registered-store-mark{display:grid;width:52px;height:52px;place-items:center;border-radius:16px;background:#f6e7e1;color:#8f4f42;font-size:20px;font-weight:700}.registered-store-card strong{font-size:14px}.registered-store-card p{margin:4px 0 0;color:var(--muted);font-size:11px}.registered-store-card button,.registered-store-form button{min-height:44px;border:0;border-radius:999px;background:var(--rose);padding:0 18px;color:white;font-weight:700}.registered-store-current{border-radius:999px;background:#edf7ef;padding:7px 11px;color:#356143;font-size:11px;font-weight:700}.registered-store-form{margin-top:18px;border:1px solid var(--line);border-radius:18px;background:white;padding:18px}.registered-store-form label{font-weight:700}.registered-store-form>p{color:var(--muted);font-size:11px;line-height:1.7}.registered-store-form>div{display:flex;gap:8px}.registered-store-form input{min-width:0;min-height:48px;flex:1;border:1px solid #d8cbbf;border-radius:13px;padding:0 14px;text-transform:uppercase}.registered-store-form output{display:block;min-height:20px;margin-top:10px;color:#a02f28;font-size:11px}@media(max-width:540px){.registered-store-card{grid-template-columns:48px minmax(0,1fr)}.registered-store-card>button,.registered-store-current{grid-column:1/-1;width:100%;text-align:center}.registered-store-form>div{display:grid}}</style><script>(()=>{const request=async payload=>{const response=await fetch('/api/lien-customer-stores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const result=await response.json();if(!response.ok)throw new Error(result.error||'登録できませんでした。');location.href=result.redirect||'/u/home'};document.querySelector('#register-store-form').addEventListener('submit',async event=>{event.preventDefault();const output=document.querySelector('#store-result');output.textContent='確認しています…';try{await request({action:'link',storeCode:document.querySelector('#store-code').value})}catch(error){output.textContent=error.message}});document.querySelectorAll('[data-switch-store]').forEach(button=>button.addEventListener('click',async()=>{button.disabled=true;try{await request({action:'switch',organizationId:button.dataset.switchStore})}catch(error){button.disabled=false;document.querySelector('#store-result').textContent=error.message}}))})()</script>`
    const html = renderCustomerShell({ title: '登録済みの店舗', active: 'メニュー', back: '/u/home', body })
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'private, no-store')
    res.end(html)
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]))
  }

  async function handle(req, res, url) {
    const paths = new Set(['/customer-experience-v276.js', '/customer-experience-v278.js', '/api/lien-staff-directory', '/api/lien-staff-profiles', '/api/lien-staff-avatar', '/api/admin/staff-profile', '/api/admin/staff-management', '/api/lien-customer-nickname', '/api/lien-community-nickname', '/api/lien-customer-stores', '/api/lien-store-icon', '/api/admin/store-icon', '/u/stores'])
    if (!paths.has(url.pathname)) return false
    try {
      if ((url.pathname === '/customer-experience-v276.js' || url.pathname === '/customer-experience-v278.js') && req.method === 'GET') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        res.setHeader('Cache-Control', 'public, max-age=300')
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.end(fs.readFileSync(path.join(__dirname, 'customer-experience-v278.js')))
      } else if (url.pathname === '/api/lien-staff-directory' || url.pathname === '/api/lien-staff-profiles') await staffDirectoryApi(req, res)
      else if (url.pathname === '/api/lien-staff-avatar' && req.method === 'GET') await staffAvatar(req, res, url)
      else if (url.pathname === '/api/admin/staff-profile') await staffProfile(req, res)
      else if (url.pathname === '/api/admin/staff-management') await staffManagement(req, res)
      else if (url.pathname === '/api/lien-customer-nickname') await nickname(req, res)
      else if (url.pathname === '/api/lien-community-nickname' && req.method === 'GET') await communityNickname(req, res, url)
      else if (url.pathname === '/api/lien-customer-stores') await customerStores(req, res)
      else if (url.pathname === '/api/lien-store-icon' && req.method === 'GET') await storeIcon(req, res, url)
      else if (url.pathname === '/api/admin/store-icon' && req.method === 'POST') await updateStoreIcon(req, res)
      else if (url.pathname === '/u/stores' && req.method === 'GET') await storesPage(req, res)
      else throw new CustomerStoreStaffError('この操作には対応していません。', 405)
    } catch (error) {
      const status = error instanceof CustomerStoreStaffError ? error.status : error && error.code === 'P2002' ? 409 : 500
      if (status === 500) console.error('[customer-store-staff] failed', { path: url.pathname, error: error && error.message })
      if (!res.headersSent) json(res, status, { error: status === 500 ? '処理を完了できませんでした。時間をおいて再度お試しください。' : status === 409 ? '同じ情報がすでに登録されています。' : error.message })
    }
    return true
  }

  return { ensureSchema, handle, directory, staffForOrganization: organizationId => directory(organizationId, false) }
}

module.exports = { createCustomerStoreStaffService, CustomerStoreStaffError }
