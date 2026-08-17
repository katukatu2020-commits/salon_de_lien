const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const QRCode = require('qrcode')

class CustomerLinkError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

function json(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(payload))
}

function html(res, body) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(body)
}

function sameOrigin(req) {
  const origin = String(req.headers.origin || '').trim()
  if (!origin) return false
  const allowed = new Set()
  try { allowed.add(new URL(process.env.APP_URL || 'https://salon-de-lien.com').origin) } catch {}
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  const protocol = String(req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https')).split(',')[0].trim()
  if (host) allowed.add(`${protocol}://${host}`)
  return allowed.has(origin)
}

async function readJson(req, limit = 65536) {
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (Buffer.byteLength(raw, 'utf8') > limit) throw new CustomerLinkError('入力内容が大きすぎます。', 413)
  }
  try { return raw ? JSON.parse(raw) : {} } catch { throw new CustomerLinkError('入力内容を確認してください。') }
}

function clean(value, max, label, required = false) {
  const result = String(value || '').replace(/\s+/g, ' ').trim()
  if (required && !result) throw new CustomerLinkError(`${label}を入力してください。`)
  if (result.length > max) throw new CustomerLinkError(`${label}は${max}文字以内で入力してください。`)
  return result
}

function customerCode(value) {
  const code = String(value || '').trim().toUpperCase()
  if (!/^C-R-\d{3,}$/.test(code)) throw new CustomerLinkError('会員コードは C-R-036 の形式で入力してください。')
  return code
}

function storeCode(value) {
  const code = String(value || '').trim().toUpperCase().replace(/\s+/g, '')
  if (!/^[A-Z0-9-]{5,32}$/.test(code)) throw new CustomerLinkError('店舗識別コードを確認してください。')
  return code
}

function normalizePhone(value) {
  return String(value || '').replace(/[^0-9]/g, '')
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]))
}

function signCustomerSession(session, subject, customerId, organizationId) {
  const secret = process.env.CUSTOMER_AUTH_SECRET || process.env.ADMIN_AUTH_SECRET
  if (!secret || secret.length < 32) throw new CustomerLinkError('セッション設定を確認できません。', 500)
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

const code39Patterns = {
  '0':'nnnwwnwnn','1':'wnnwnnnnw','2':'nnwwnnnnw','3':'wnwwnnnnn','4':'nnnwwnnnw','5':'wnnwwnnnn','6':'nnwwwnnnn','7':'nnnwnnwnw','8':'wnnwnnwnn','9':'nnwwnnwnn',
  A:'wnnnnwnnw',B:'nnwnnwnnw',C:'wnwnnwnnn',D:'nnnnwwnnw',E:'wnnnwwnnn',F:'nnwnwwnnn',G:'nnnnnwwnw',H:'wnnnnwwnn',I:'nnwnnwwnn',J:'nnnnwwwnn',
  K:'wnnnnnnww',L:'nnwnnnnww',M:'wnwnnnnwn',N:'nnnnwnnww',O:'wnnnwnnwn',P:'nnwnwnnwn',Q:'nnnnnnwww',R:'wnnnnnwwn',S:'nnwnnnwwn',T:'nnnnwnwwn',
  U:'wwnnnnnnw',V:'nwwnnnnnw',W:'wwwnnnnnn',X:'nwnnwnnnw',Y:'wwnnwnnnn',Z:'nwwnwnnnn','-':'nwnnnnwnw','.':'wwnnnnwnn',' ':'nwwnnnwnn','$':'nwnwnwnnn','/':'nwnwnnnwn','+':'nwnnnwnwn','%':'nnnwnwnwn','*':'nwnnwnwnn',
}

function code39Svg(rawCode) {
  const value = String(rawCode || '').toUpperCase().replace(/[^0-9A-Z. $/+%-]/g, '')
  if (!value) return ''
  const narrow = 2
  const wide = 5
  const gap = 2
  const height = 62
  let x = 12
  const bars = []
  for (const character of `*${value}*`) {
    const pattern = code39Patterns[character]
    if (!pattern) continue
    for (let index = 0; index < pattern.length; index += 1) {
      const width = pattern[index] === 'w' ? wide : narrow
      if (index % 2 === 0) bars.push(`<rect x="${x}" y="8" width="${width}" height="${height}" rx=".35"/>`)
      x += width
    }
    x += gap
  }
  const width = x + 10
  return `<svg class="member-code39-svg" viewBox="0 0 ${width} 92" role="img" aria-label="会員コード ${escapeHtml(value)}"><rect width="${width}" height="92" rx="12" fill="#fff"/><g fill="#2f2a25">${bars.join('')}</g><text x="${width / 2}" y="85" text-anchor="middle" fill="#554943" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="10" letter-spacing="1.6">${escapeHtml(value)}</text></svg>`
}

function membershipMarkup(code) {
  if (!code) return ''
  return `<div class="member-code39"><div><span>店舗で読み取る会員証</span><strong>MEMBERSHIP BARCODE</strong></div>${code39Svg(code)}<p>ご来店時にスタッフへこのバーコードをご提示ください。</p></div><style>.member-code39{margin-top:14px;border:1px solid #eadbd3;border-radius:18px;background:linear-gradient(145deg,#fff,#fff8f5);padding:15px;box-shadow:0 10px 25px rgba(70,45,35,.06)}.member-code39>div{display:flex;align-items:baseline;justify-content:space-between;gap:10px}.member-code39>div span{color:#3d302b;font-size:12px;font-weight:800}.member-code39>div strong{color:#9d5a4c;font-size:8px;letter-spacing:.12em}.member-code39-svg{display:block;width:100%;max-width:430px;height:94px;margin:9px auto 0}.member-code39>p{margin:7px 0 0;color:var(--muted,#7c7168);font-size:9px;text-align:center}@media(min-width:1024px){.member-code39{display:grid;grid-template-columns:minmax(190px,.8fr) minmax(320px,1.2fr);align-items:center;gap:2px 28px;padding:18px 22px}.member-code39>div{display:block}.member-code39>div strong{display:block;margin-top:6px}.member-code39-svg{grid-row:1/3;grid-column:2;margin:0}.member-code39>p{grid-column:1;text-align:left}}</style>`
}

function createCustomerLinkService({ prisma, staffSessionProvider, customerSessionProvider, renderCustomerShell }) {
  let schemaPromise = null

  async function ensureSchema() {
    if (!schemaPromise) schemaPromise = (async () => {
      await prisma.$executeRawUnsafe('ALTER TABLE "AppUser" ADD COLUMN IF NOT EXISTS "customerPublicCode" TEXT')
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "AppUser_customerPublicCode_key" ON "AppUser"("customerPublicCode") WHERE "customerPublicCode" IS NOT NULL')
      await prisma.$executeRawUnsafe('CREATE SEQUENCE IF NOT EXISTS "CustomerPublicCodeSeq" START 100')
      await prisma.$executeRawUnsafe('ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "publicCode" TEXT')
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Organization_publicCode_key" ON "Organization"("publicCode") WHERE "publicCode" IS NOT NULL')
      await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "CustomerStoreLink" ("id" TEXT PRIMARY KEY,"appUserId" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"customerId" TEXT NOT NULL UNIQUE,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)')
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "CustomerStoreLink_appUser_org_key" ON "CustomerStoreLink"("appUserId","organizationId")')
      await prisma.$executeRawUnsafe('UPDATE "Organization" SET "publicCode"=CASE WHEN "id"=\'org_salon_de_lien\' THEN \'LIEN-SALON\' WHEN "id"=\'org_showcase_yohaku\' THEN \'LIEN-YOHAKU\' ELSE \'STORE-\'||UPPER(SUBSTRING(MD5("id") FROM 1 FOR 8)) END WHERE "publicCode" IS NULL')
    })().catch(error => { schemaPromise = null; throw error })
    return schemaPromise
  }

  async function currentStaff(req) {
    const session = await staffSessionProvider(req)
    if (!session || !['ADMIN', 'STAFF'].includes(session.role) || !session.organizationId) throw new CustomerLinkError('ログインし直してください。', 401)
    return session
  }

  async function currentCustomer(req) {
    const session = await customerSessionProvider(req)
    if (!session || !session.userId || !session.customerId || !session.organizationId) throw new CustomerLinkError('ログインし直してください。', 401)
    return session
  }

  async function customerPublicCode(session) {
    await ensureSchema()
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await prisma.$transaction(async tx => {
          const users = await tx.$queryRawUnsafe('SELECT "id","customerPublicCode" FROM "AppUser" WHERE "id"=$1 AND "customerId"=$2 AND "role"=\'CUSTOMER\' AND "active"=TRUE FOR UPDATE', session.userId, session.customerId)
          if (!users[0]) throw new CustomerLinkError('会員情報を確認できませんでした。', 404)
          if (users[0].customerPublicCode) return users[0].customerPublicCode
          const sequence = await tx.$queryRawUnsafe('SELECT nextval(\'"CustomerPublicCodeSeq"\') AS value')
          const code = `C-R-${String(sequence[0].value).padStart(3, '0')}`
          const updated = await tx.$queryRawUnsafe('UPDATE "AppUser" SET "customerPublicCode"=$1,"updatedAt"=NOW() WHERE "id"=$2 AND "customerPublicCode" IS NULL RETURNING "customerPublicCode"', code, session.userId)
          return updated[0]?.customerPublicCode || code
        }, { isolationLevel: 'Serializable' })
      } catch (error) {
        if (attempt === 4) throw error
      }
    }
    throw new CustomerLinkError('会員コードを発行できませんでした。', 500)
  }

  async function memberForCode(db, rawCode) {
    const code = customerCode(rawCode)
    const rows = await db.$queryRawUnsafe(`SELECT u."id" AS "appUserId",u."customerId",u."customerPublicCode",u."nickname",c."organizationId",c."name",c."gender",c."birthYear",c."birthDate",c."phone",c."servicePreference",c."profileImageUrl",c."staffAssignmentType",c."assignedStaffName"
      FROM "AppUser" u JOIN "Customer" c ON c."id"=u."customerId"
      WHERE u."customerPublicCode"=$1 AND u."role"='CUSTOMER' AND u."active"=TRUE AND c."deletedAt" IS NULL LIMIT 1`, code)
    if (!rows[0]) throw new CustomerLinkError('この会員コードは見つかりませんでした。', 404)
    return rows[0]
  }

  async function cloneHairProfile(tx, sourceCustomerId, targetCustomerId) {
    const source = (await tx.$queryRawUnsafe('SELECT "hairThickness","hairVolume","hairTexture","scalpCondition","lifestyle","stylingTimeMinutes","hairCurl" FROM "HairProfile" WHERE "customerId"=$1 LIMIT 1', sourceCustomerId))[0]
    if (!source) return
    const exists = await tx.$queryRawUnsafe('SELECT 1 FROM "HairProfile" WHERE "customerId"=$1 LIMIT 1', targetCustomerId)
    if (exists[0]) return
    await tx.$executeRawUnsafe('INSERT INTO "HairProfile" ("id","customerId","hairThickness","hairVolume","hairTexture","scalpCondition","lifestyle","stylingTimeMinutes","hairCurl","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())', crypto.randomUUID(), targetCustomerId, source.hairThickness, source.hairVolume, source.hairTexture, source.scalpCondition, source.lifestyle, source.stylingTimeMinutes, source.hairCurl)
  }

  async function linkMemberToOrganization(appUserId, organizationId) {
    return prisma.$transaction(async tx => {
      const locked = await tx.$queryRawUnsafe(`SELECT u."id" AS "appUserId",u."customerId",u."customerPublicCode",c."organizationId",c."name",c."gender",c."birthYear",c."birthDate",c."phone",c."servicePreference",c."profileImageUrl",c."staffAssignmentType",c."assignedStaffName"
        FROM "AppUser" u JOIN "Customer" c ON c."id"=u."customerId"
        WHERE u."id"=$1 AND u."role"='CUSTOMER' AND u."active"=TRUE AND c."deletedAt" IS NULL FOR UPDATE OF u`, appUserId)
      const source = locked[0]
      if (!source) throw new CustomerLinkError('会員情報が見つかりません。', 404)
      const existing = await tx.$queryRawUnsafe('SELECT "customerId" FROM "CustomerStoreLink" WHERE "appUserId"=$1 AND "organizationId"=$2 LIMIT 1', appUserId, organizationId)
      if (existing[0]) return { customerId: existing[0].customerId, alreadyLinked: true, name: source.name }

      let targetCustomerId = source.organizationId === organizationId ? source.customerId : null
      if (!targetCustomerId && normalizePhone(source.phone)) {
        const candidates = await tx.$queryRawUnsafe(`SELECT c."id" FROM "Customer" c
          LEFT JOIN "AppUser" u ON u."customerId"=c."id"
          LEFT JOIN "CustomerStoreLink" l ON l."customerId"=c."id"
          WHERE c."organizationId"=$1 AND c."deletedAt" IS NULL AND u."id" IS NULL AND l."id" IS NULL
            AND REGEXP_REPLACE(COALESCE(c."phone",''),'[^0-9]','','g')=$2
          ORDER BY c."createdAt" ASC LIMIT 1`, organizationId, normalizePhone(source.phone))
        targetCustomerId = candidates[0]?.id || null
      }
      if (!targetCustomerId) {
        targetCustomerId = crypto.randomUUID()
        await tx.$executeRawUnsafe('INSERT INTO "Customer" ("id","organizationId","name","gender","birthYear","birthDate","phone","servicePreference","profileImageUrl","staffAssignmentType","assignedStaffName","memo","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())', targetCustomerId, organizationId, source.name, source.gender, source.birthYear, source.birthDate, source.phone, source.servicePreference, source.profileImageUrl, source.staffAssignmentType || 'free', source.assignedStaffName, `会員コード ${source.customerPublicCode || ''} で店舗へ追加`)
      } else if (targetCustomerId !== source.customerId) {
        await tx.$executeRawUnsafe('UPDATE "Customer" SET "name"=$1,"gender"=COALESCE("gender",$2),"birthYear"=COALESCE("birthYear",$3),"birthDate"=COALESCE("birthDate",$4),"phone"=COALESCE("phone",$5),"servicePreference"=COALESCE("servicePreference",$6),"profileImageUrl"=COALESCE("profileImageUrl",$7),"updatedAt"=NOW() WHERE "id"=$8 AND "organizationId"=$9', source.name, source.gender, source.birthYear, source.birthDate, source.phone, source.servicePreference, source.profileImageUrl, targetCustomerId, organizationId)
      }
      await cloneHairProfile(tx, source.customerId, targetCustomerId)
      await tx.$executeRawUnsafe('INSERT INTO "CustomerPointAccount" ("id","customerId","createdAt","updatedAt") VALUES ($1,$2,NOW(),NOW()) ON CONFLICT ("customerId") DO NOTHING', crypto.randomUUID(), targetCustomerId)
      await tx.$executeRawUnsafe('INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId","createdAt") VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT ("appUserId","organizationId") DO NOTHING', crypto.randomUUID(), appUserId, organizationId, targetCustomerId)
      return { customerId: targetCustomerId, alreadyLinked: false, name: source.name }
    }, { isolationLevel: 'Serializable' })
  }

  async function notifyLinkedCustomer(organizationId, customerId, name) {
    await prisma.$executeRawUnsafe('INSERT INTO "StaffSystemNotification" ("id","organizationId","type","title","body","href","entityType","entityId","source") VALUES ($1,$2,\'store_inflow\',\'別店舗からお客様が登録されました\',$3,$4,\'customer\',$5,\'customer_store_link\') ON CONFLICT ("organizationId","type","entityId") DO NOTHING', crypto.randomUUID(), organizationId, `${name || 'お客様'}様が店舗へ登録されました。顧客情報をご確認ください。`, `/admin/customers/${encodeURIComponent(customerId)}`, customerId)
  }

  async function customerDirectory(req, res, url) {
    const session = await currentStaff(req)
    await ensureSchema()
    if (req.method === 'GET') {
      const member = await memberForCode(prisma, url.searchParams.get('code'))
      const linked = await prisma.$queryRawUnsafe('SELECT "customerId" FROM "CustomerStoreLink" WHERE "appUserId"=$1 AND "organizationId"=$2 LIMIT 1', member.appUserId, session.organizationId)
      return json(res, 200, { publicCode: member.customerPublicCode, name: member.name, nickname: member.nickname || null, phone: member.phone || null, gender: member.gender || null, birthDate: member.birthDate || null, linkedCustomerId: linked[0]?.customerId || null })
    }
    if (req.method !== 'POST' || !sameOrigin(req)) throw new CustomerLinkError('安全性を確認できませんでした。', 403)
    const data = await readJson(req)
    if (data.mode === 'manual') {
      const name = clean(data.name, 80, 'お名前', true)
      const phone = clean(data.phone, 32, '電話番号')
      const normalized = normalizePhone(phone)
      if (normalized) {
        const rows = await prisma.$queryRawUnsafe('SELECT "id","name" FROM "Customer" WHERE "organizationId"=$1 AND "deletedAt" IS NULL AND REGEXP_REPLACE(COALESCE("phone",\'\'),\'[^0-9]\',\'\',\'g\')=$2 LIMIT 1', session.organizationId, normalized)
        if (rows[0]) throw new CustomerLinkError(`同じ電話番号の「${rows[0].name}」様が登録済みです。`, 409)
      }
      const gender = ['女性', '男性', 'その他', '未回答'].includes(String(data.gender || '')) ? String(data.gender) : null
      const birthDate = /^\d{4}-\d{2}-\d{2}$/.test(String(data.birthDate || '')) ? new Date(`${data.birthDate}T00:00:00+09:00`) : null
      if (birthDate && Number.isNaN(birthDate.getTime())) throw new CustomerLinkError('生年月日を確認してください。')
      const customerId = crypto.randomUUID()
      await prisma.$transaction(async tx => {
        await tx.$executeRawUnsafe('INSERT INTO "Customer" ("id","organizationId","name","phone","gender","birthDate","birthYear","staffAssignmentType","memo","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,\'free\',\'顧客管理から手動登録\',NOW(),NOW())', customerId, session.organizationId, name, phone || null, gender, birthDate, birthDate ? birthDate.getFullYear() : null)
        await tx.$executeRawUnsafe('INSERT INTO "CustomerPointAccount" ("id","customerId","createdAt","updatedAt") VALUES ($1,$2,NOW(),NOW())', crypto.randomUUID(), customerId)
      })
      return json(res, 201, { ok: true, customerId, redirect: `/admin/customers/${encodeURIComponent(customerId)}` })
    }
    const member = await memberForCode(prisma, data.publicCode)
    const result = await linkMemberToOrganization(member.appUserId, session.organizationId)
    if (!result.alreadyLinked) await notifyLinkedCustomer(session.organizationId, result.customerId, result.name)
    return json(res, result.alreadyLinked ? 200 : 201, { ok: true, alreadyLinked: result.alreadyLinked, customerId: result.customerId, redirect: `/admin/customers/${encodeURIComponent(result.customerId)}` })
  }

  async function stores(req, res, url) {
    const session = await currentCustomer(req)
    await ensureSchema()
    await prisma.$executeRawUnsafe('INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId","createdAt") VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT DO NOTHING', crypto.randomUUID(), session.userId, session.organizationId, session.customerId)
    if (req.method === 'GET' && url.searchParams.get('lookup')) {
      const code = storeCode(url.searchParams.get('lookup'))
      const organizations = await prisma.$queryRawUnsafe('SELECT "id","name","publicCode" FROM "Organization" WHERE UPPER("publicCode")=$1 LIMIT 1', code)
      if (!organizations[0]) throw new CustomerLinkError('店舗が見つかりません。コードをもう一度ご確認ください。', 404)
      const linked = await prisma.$queryRawUnsafe('SELECT 1 FROM "CustomerStoreLink" WHERE "appUserId"=$1 AND "organizationId"=$2 LIMIT 1', session.userId, organizations[0].id)
      return json(res, 200, { store: { organizationId: organizations[0].id, name: organizations[0].name, publicCode: organizations[0].publicCode, iconUrl: `/api/lien-store-icon?organizationId=${encodeURIComponent(organizations[0].id)}`, alreadyLinked: Boolean(linked[0]) } })
    }
    if (req.method === 'GET') {
      const rows = await prisma.$queryRawUnsafe(`SELECT l."organizationId",l."customerId",o."name",o."publicCode",CASE WHEN l."organizationId"=$2 THEN TRUE ELSE FALSE END AS "current"
        FROM "CustomerStoreLink" l JOIN "Organization" o ON o."id"=l."organizationId" JOIN "Customer" c ON c."id"=l."customerId" AND c."deletedAt" IS NULL
        WHERE l."appUserId"=$1 ORDER BY "current" DESC,l."createdAt"`, session.userId, session.organizationId)
      return json(res, 200, { stores: rows })
    }
    if (!sameOrigin(req)) throw new CustomerLinkError('安全性を確認できませんでした。', 403)
    const data = await readJson(req)
    if (data.action === 'link') {
      if (data.confirmed !== true) throw new CustomerLinkError('店舗内容を確認してから追加してください。')
      const code = storeCode(data.storeCode)
      const organizations = await prisma.$queryRawUnsafe('SELECT "id","name" FROM "Organization" WHERE UPPER("publicCode")=$1 LIMIT 1', code)
      if (!organizations[0]) throw new CustomerLinkError('店舗が見つかりません。', 404)
      const result = await linkMemberToOrganization(session.userId, organizations[0].id)
      if (!result.alreadyLinked) await notifyLinkedCustomer(organizations[0].id, result.customerId, result.name)
      return json(res, result.alreadyLinked ? 200 : 201, { ok: true, alreadyLinked: result.alreadyLinked })
    }
    if (data.action === 'switch') {
      const organizationId = String(data.organizationId || '')
      const links = await prisma.$queryRawUnsafe('SELECT "customerId" FROM "CustomerStoreLink" WHERE "appUserId"=$1 AND "organizationId"=$2 LIMIT 1', session.userId, organizationId)
      if (!links[0]) throw new CustomerLinkError('登録済みの店舗ではありません。', 404)
      const users = await prisma.$queryRawUnsafe('SELECT "loginId","email" FROM "AppUser" WHERE "id"=$1 AND "role"=\'CUSTOMER\' AND "active"=TRUE LIMIT 1', session.userId)
      await prisma.$executeRawUnsafe('UPDATE "AppUser" SET "organizationId"=$1,"customerId"=$2,"updatedAt"=NOW() WHERE "id"=$3', organizationId, links[0].customerId, session.userId)
      const signed = signCustomerSession(session, users[0]?.loginId || users[0]?.email, links[0].customerId, organizationId)
      res.setHeader('Set-Cookie', `lien_customer_session=${encodeURIComponent(signed.token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${signed.maxAge}`)
      return json(res, 200, { ok: true, redirect: '/u/home' })
    }
    throw new CustomerLinkError('操作内容を確認してください。')
  }

  async function storeQr(req, res) {
    const session = await currentStaff(req)
    await ensureSchema()
    const rows = await prisma.$queryRawUnsafe('SELECT "name","publicCode" FROM "Organization" WHERE "id"=$1 LIMIT 1', session.organizationId)
    if (!rows[0]?.publicCode) throw new CustomerLinkError('店舗識別コードが未発行です。', 404)
    const base = String(process.env.APP_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
    const url = `${base}/u/stores?store=${encodeURIComponent(rows[0].publicCode)}`
    const svg = await QRCode.toString(url, { type: 'svg', margin: 1, width: 248, errorCorrectionLevel: 'M', color: { dark: '#2f2a25', light: '#ffffff' } })
    return json(res, 200, { name: rows[0].name, publicCode: rows[0].publicCode, url, svg })
  }

  async function storeQrSvg(req, res) {
    const session = await currentStaff(req)
    await ensureSchema()
    const rows = await prisma.$queryRawUnsafe('SELECT "publicCode" FROM "Organization" WHERE "id"=$1 LIMIT 1', session.organizationId)
    if (!rows[0]?.publicCode) throw new CustomerLinkError('店舗識別コードが未発行です。', 404)
    const base = String(process.env.APP_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
    const target = `${base}/u/stores?store=${encodeURIComponent(rows[0].publicCode)}`
    const svg = await QRCode.toString(target, { type: 'svg', margin: 1, width: 248, errorCorrectionLevel: 'M', color: { dark: '#2f2a25', light: '#ffffff' } })
    res.statusCode = 200
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8')
    res.setHeader('Cache-Control', 'private, no-store, max-age=0')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.end(svg)
  }

  async function storesPage(req, res, url) {
    const session = await currentCustomer(req)
    const rows = await prisma.$queryRawUnsafe(`SELECT l."organizationId",o."name",o."publicCode",CASE WHEN l."organizationId"=$2 THEN TRUE ELSE FALSE END AS "current"
      FROM "CustomerStoreLink" l JOIN "Organization" o ON o."id"=l."organizationId" WHERE l."appUserId"=$1 ORDER BY "current" DESC,l."createdAt"`, session.userId, session.organizationId)
    const cards = rows.map(store => `<article class="registered-store-card ${store.current ? 'current' : ''}"><span class="registered-store-mark"><img src="/api/lien-store-icon?organizationId=${encodeURIComponent(store.organizationId)}" alt="${escapeHtml(store.name)}の店舗アイコン"></span><div><strong>${escapeHtml(store.name)}</strong><p>${store.current ? '現在利用中の店舗' : '登録済み'}</p></div>${store.current ? '<span class="registered-store-current">利用中</span>' : `<button type="button" data-switch-store="${escapeHtml(store.organizationId)}">切り替える</button>`}</article>`).join('')
    const initialCode = storeCodeFromQuery(url.searchParams.get('store'))
    const body = `<section class="page-title"><h1>登録済みの店舗</h1><p>店舗のQRコードを読み取り、内容を確認してから登録できます。</p></section><section class="registered-store-section"><div class="registered-store-list">${cards || '<p class="registered-store-empty">登録済みの店舗はありません。</p>'}</div><form id="register-store-form" class="registered-store-form"><label for="store-code">新しい店舗を登録</label><p>カメラで店舗QRを読み取るか、店舗識別コードを入力してください。</p><div class="registered-store-actions"><button class="scan-store-qr" id="scan-store-qr" type="button">カメラでQRを読み取る</button><div class="registered-store-code-row"><input id="store-code" name="storeCode" autocomplete="off" maxlength="32" value="${escapeHtml(initialCode)}" placeholder="例: LIEN-SALON"><button type="submit">店舗を確認</button></div></div><output id="store-result" aria-live="polite"></output><div id="store-preview"></div></form></section><style>.page-title p{margin:8px 0 0;color:var(--muted);font-size:12px}.registered-store-section{max-width:840px;margin:auto;padding:18px}.registered-store-list{display:grid;gap:12px}.registered-store-card{display:grid;grid-template-columns:56px minmax(0,1fr) auto;align-items:center;gap:14px;border:1px solid var(--line);border-radius:18px;background:white;padding:16px}.registered-store-card.current{border-color:#dca8b5;background:#fff8fa}.registered-store-mark{display:grid;width:52px;height:52px;place-items:center;overflow:hidden;border-radius:16px;background:#f6e7e1}.registered-store-mark img{width:100%;height:100%;object-fit:cover}.registered-store-card strong{font-size:14px}.registered-store-card p{margin:4px 0 0;color:var(--muted);font-size:11px}.registered-store-card button,.registered-store-form button{min-height:44px;border:0;border-radius:999px;background:var(--rose);padding:0 18px;color:white;font-weight:700}.registered-store-current{border-radius:999px;background:#edf7ef;padding:7px 11px;color:#356143;font-size:11px;font-weight:700}.registered-store-form{margin-top:18px;border:1px solid var(--line);border-radius:18px;background:white;padding:18px}.registered-store-form label{font-weight:800}.registered-store-form>p{color:var(--muted);font-size:11px;line-height:1.7}.registered-store-actions{display:grid;gap:10px}.registered-store-code-row{display:flex;gap:8px}.registered-store-form input{min-width:0;min-height:48px;flex:1;border:1px solid #d8cbbf;border-radius:13px;padding:0 14px;text-transform:uppercase}.registered-store-form output{display:block;min-height:20px;margin-top:10px;color:#a02f28;font-size:11px}.scan-store-qr{width:100%;border:1px solid #d9c5bc!important;background:#fff8f5!important;color:#74433a!important}@media(max-width:540px){.registered-store-card{grid-template-columns:48px minmax(0,1fr)}.registered-store-card>button,.registered-store-current{grid-column:1/-1;width:100%;text-align:center}.registered-store-code-row{display:grid}}</style>`
    return html(res, renderCustomerShell({ title: '登録済みの店舗', active: '', back: '/u/home', body }))
  }

  function storeCodeFromQuery(value) {
    const result = String(value || '').trim().toUpperCase().replace(/\s+/g, '')
    return /^[A-Z0-9-]{5,32}$/.test(result) ? result : ''
  }

  async function handle(req, res, url) {
    const paths = new Set(['/customer-link-ui-v293.js', '/api/admin/customer-directory', '/api/lien-customer-stores', '/api/admin/store-qr', '/api/admin/store-qr.svg', '/u/stores'])
    if (!paths.has(url.pathname)) return false
    try {
      if (url.pathname === '/customer-link-ui-v293.js' && req.method === 'GET') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store, max-age=0')
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.end(fs.readFileSync(path.join(__dirname, 'customer-link-ui-v293.js')))
      }
      else if (url.pathname === '/api/admin/customer-directory') await customerDirectory(req, res, url)
      else if (url.pathname === '/api/lien-customer-stores') await stores(req, res, url)
      else if (url.pathname === '/api/admin/store-qr' && req.method === 'GET') await storeQr(req, res)
      else if (url.pathname === '/api/admin/store-qr.svg' && req.method === 'GET') await storeQrSvg(req, res)
      else if (url.pathname === '/u/stores' && req.method === 'GET') await storesPage(req, res, url)
      else throw new CustomerLinkError('この操作には対応していません。', 405)
    } catch (error) {
      const status = error instanceof CustomerLinkError ? error.status : error && error.code === 'P2002' ? 409 : 500
      if (status === 500) console.error('[customer-links-v293] failed', { path: url.pathname, error: error && error.message })
      if (!res.headersSent) json(res, status, { error: status === 500 ? '処理を完了できませんでした。時間をおいて再度お試しください。' : status === 409 ? '同じ情報がすでに登録されています。' : error.message })
    }
    return true
  }

  return { ensureSchema, handle, customerPublicCode, membershipMarkup }
}

module.exports = { createCustomerLinkService, CustomerLinkError }
