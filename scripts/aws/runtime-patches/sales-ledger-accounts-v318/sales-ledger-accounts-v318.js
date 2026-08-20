'use strict'

const MAX_BULK = 100

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(body))
}

function readJson(req, limit = 128 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', chunk => {
      size += chunk.length
      if (size > limit) {
        reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) }
      catch { reject(Object.assign(new Error('Invalid JSON'), { statusCode: 400 })) }
    })
    req.on('error', reject)
  })
}

function origin(req) {
  const protocol = String(req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http')).split(',')[0].trim()
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  return `${protocol}://${host}`
}

function sameOrigin(req) {
  const supplied = String(req.headers.origin || '')
  // The authenticated cookie is SameSite=Lax and PATCH/JSON cannot be submitted
  // by a cross-site HTML form. Some embedded WebViews omit Origin on same-site
  // requests, so an absent header is accepted while a supplied origin must match.
  if (!supplied) return true
  try {
    const suppliedOrigin = new URL(supplied).origin
    const allowedOrigins = new Set([new URL(origin(req)).origin, 'https://salon-de-lien.com'])
    for (const key of ['APP_BASE_URL', 'AUTH_BASE_URL', 'NEXTAUTH_URL', 'NEXT_PUBLIC_APP_URL']) {
      const configured = String(process.env[key] || '').trim()
      if (!configured) continue
      try { allowedOrigins.add(new URL(configured).origin) } catch {}
    }
    return allowedOrigins.has(suppliedOrigin)
  } catch { return false }
}

function cleanText(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max)
}

function localDate(value, end = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null
  return new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}+09:00`)
}

function createSalesLedgerAccountsService({ prisma, crypto, sessionProvider }) {
  let schemaPromise = null

  async function ensureSchema() {
    if (!schemaPromise) schemaPromise = (async () => {
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "SalesCorrectionAudit" (
        "id" TEXT PRIMARY KEY,
        "organizationId" TEXT NOT NULL,
        "serviceSaleId" TEXT NOT NULL,
        "actorUserId" TEXT,
        "actorDisplayName" TEXT NOT NULL,
        "actorRole" TEXT NOT NULL,
        "changesJson" JSONB NOT NULL,
        "beforeJson" JSONB NOT NULL,
        "afterJson" JSONB NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`)
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "SalesCorrectionAudit_org_sale_created_idx" ON "SalesCorrectionAudit"("organizationId","serviceSaleId","createdAt")')
      await prisma.$executeRawUnsafe('ALTER TABLE "AppUser" ADD COLUMN IF NOT EXISTS "isSharedStoreAccount" BOOLEAN NOT NULL DEFAULT FALSE')
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "AppUser_one_shared_store_account" ON "AppUser"("organizationId") WHERE "isSharedStoreAccount"=TRUE')
      await prisma.$executeRawUnsafe(`INSERT INTO "AppUser" ("id","organizationId","email","loginId","displayName","passwordHash","role","active","createdAt","updatedAt","isSharedStoreAccount")
        SELECT 'shared_'||SUBSTRING(MD5(o."id") FROM 1 FOR 24),o."id",'store-'||SUBSTRING(MD5(o."id") FROM 1 FOR 16)||'@accounts.invalid','store-'||o."slug",o."name"||' 店舗共通',NULL,'STAFF',FALSE,NOW(),NOW(),TRUE
        FROM "Organization" o
        WHERE NOT EXISTS (SELECT 1 FROM "AppUser" u WHERE u."organizationId"=o."id" AND u."isSharedStoreAccount"=TRUE)
        ON CONFLICT DO NOTHING`)
    })().catch(error => { schemaPromise = null; throw error })
    return schemaPromise
  }

  async function requireOwner(req, res) {
    const session = await sessionProvider(req)
    if (!session) { json(res, 401, { error: 'ログインし直してください。' }); return null }
    if (session.role !== 'ADMIN' || !session.organizationId) { json(res, 403, { error: 'オーナー権限が必要です。' }); return null }
    return session
  }

  async function listSales(req, res, url, session) {
    const start = localDate(url.searchParams.get('from'))
    const end = localDate(url.searchParams.get('to'), true)
    const customer = cleanText(url.searchParams.get('customer'), 100)
    const staff = cleanText(url.searchParams.get('staff'), 100)
    const keyword = cleanText(url.searchParams.get('keyword'), 120)
    const saleNo = cleanText(url.searchParams.get('saleNo'), 100)
    const appointmentNo = cleanText(url.searchParams.get('appointmentNo'), 100)
    const rows = await prisma.$queryRawUnsafe(`SELECT s."id",s."paidAt",s."title",s."amount",s."paymentMethod",s."source",s."note",
        c."id" AS "customerId",c."name" AS "customerName",COALESCE(r."realName",c."name") AS "displayCustomerName",
        a."id" AS "appointmentId",a."scheduledAt",a."menu",a."staffName",a."bookingProvider",
        COALESCE(lines."productTotal",0)::int AS "productTotal",COALESCE(lines."productCount",0)::int AS "productCount",
        COALESCE(audits."auditCount",0)::int AS "auditCount",audits."lastCorrectedAt"
      FROM "ServiceSale" s
      JOIN "Customer" c ON c."id"=s."customerId"
      LEFT JOIN "CustomerRealName" r ON r."customerId"=c."id" AND r."organizationId"=c."organizationId"
      LEFT JOIN "Appointment" a ON a."id"=s."appointmentId"
      LEFT JOIN LATERAL (SELECT COALESCE(SUM(l."lineTotal"),0)::int AS "productTotal",COUNT(*)::int AS "productCount" FROM "ProductSaleLine" l WHERE l."serviceSaleId"=s."id") lines ON TRUE
      LEFT JOIN LATERAL (SELECT COUNT(*)::int AS "auditCount",MAX(x."createdAt") AS "lastCorrectedAt" FROM "SalesCorrectionAudit" x WHERE x."organizationId"=c."organizationId" AND x."serviceSaleId"=s."id") audits ON TRUE
      WHERE c."organizationId"=$1 AND c."deletedAt" IS NULL
        AND ($2::timestamptz IS NULL OR s."paidAt">=$2::timestamptz)
        AND ($3::timestamptz IS NULL OR s."paidAt"<=$3::timestamptz)
        AND ($4='' OR COALESCE(r."realName",c."name") ILIKE '%'||$4||'%' OR c."name" ILIKE '%'||$4||'%')
        AND ($5='' OR COALESCE(a."staffName",'')=$5)
        AND ($6='' OR s."title" ILIKE '%'||$6||'%' OR COALESCE(s."note",'') ILIKE '%'||$6||'%' OR COALESCE(a."menu",'') ILIKE '%'||$6||'%')
        AND ($7='' OR s."id" ILIKE '%'||$7||'%')
        AND ($8='' OR COALESCE(a."id",'') ILIKE '%'||$8||'%')
      ORDER BY s."paidAt" DESC,s."id" DESC LIMIT 500`,
      session.organizationId, start, end, customer, staff, keyword, saleNo, appointmentNo)
    const staffRows = await prisma.$queryRawUnsafe('SELECT DISTINCT "staffName" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" WHERE c."organizationId"=$1 AND a."staffName" IS NOT NULL AND BTRIM(a."staffName")<>\'\' ORDER BY "staffName"', session.organizationId)
    json(res, 200, {
      rows: rows.map(row => ({ ...row, amount: Number(row.amount), productTotal: Number(row.productTotal), productCount: Number(row.productCount), auditCount: Number(row.auditCount) })),
      staff: staffRows.map(row => row.staffName),
      count: rows.length,
      editable: true,
    })
  }

  function normalizeChanges(input, bulk) {
    const changes = {}
    if (!bulk || input.amount !== '' && input.amount != null) {
      if (input.amount != null && input.amount !== '') {
        const amount = Number(input.amount)
        if (!Number.isInteger(amount) || amount < 0 || amount > 100000000) throw Object.assign(new Error('金額を確認してください。'), { statusCode: 400 })
        changes.amount = amount
      }
    }
    if (Object.prototype.hasOwnProperty.call(input, 'paymentMethod') && (!bulk || input.paymentMethod !== '')) changes.paymentMethod = cleanText(input.paymentMethod, 40) || null
    if (!bulk && Object.prototype.hasOwnProperty.call(input, 'title')) {
      const title = cleanText(input.title, 240)
      if (!title) throw Object.assign(new Error('施術・売上内容を入力してください。'), { statusCode: 400 })
      changes.title = title
    }
    if (!bulk && Object.prototype.hasOwnProperty.call(input, 'note')) changes.note = cleanText(input.note, 1000) || null
    if (!bulk && input.paidAt) {
      const rawPaidAt = String(input.paidAt)
      const paidAt = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(rawPaidAt)
        ? new Date(`${rawPaidAt}:00+09:00`)
        : new Date(rawPaidAt)
      if (!Number.isFinite(paidAt.getTime())) throw Object.assign(new Error('会計日時を確認してください。'), { statusCode: 400 })
      changes.paidAt = paidAt
    }
    if (Object.prototype.hasOwnProperty.call(input, 'staffName') && (!bulk || input.staffName !== '')) changes.staffName = cleanText(input.staffName, 100) || null
    if (!Object.keys(changes).length) throw Object.assign(new Error('変更する項目を入力してください。'), { statusCode: 400 })
    return changes
  }

  async function updateSales(req, res, session) {
    if (!sameOrigin(req)) return json(res, 403, { error: '安全のため操作を完了できませんでした。' })
    const body = await readJson(req)
    const ids = [...new Set((Array.isArray(body.ids) ? body.ids : []).map(value => cleanText(value, 120)).filter(Boolean))]
    if (!ids.length || ids.length > MAX_BULK) return json(res, 400, { error: `1〜${MAX_BULK}件を選択してください。` })
    const changes = normalizeChanges(body.changes || {}, ids.length > 1)
    const actorName = cleanText(session.operatorSubject || session.displayName || session.subject || 'オーナー', 160)
    const updated = await prisma.$transaction(async tx => {
      const owned = await tx.$queryRawUnsafe(`SELECT s."id",s."amount",s."paymentMethod",s."paidAt",s."title",s."note",s."appointmentId",a."staffName"
        FROM "ServiceSale" s JOIN "Customer" c ON c."id"=s."customerId" LEFT JOIN "Appointment" a ON a."id"=s."appointmentId"
        WHERE c."organizationId"=$1 AND s."id"=ANY($2::text[]) FOR UPDATE OF s`, session.organizationId, ids)
      if (owned.length !== ids.length) throw Object.assign(new Error('対象の会計データを確認できません。'), { statusCode: 404 })
      for (const before of owned) {
        const saleSets = []
        const values = []
        for (const field of ['amount','paymentMethod','paidAt','title','note']) {
          if (!Object.prototype.hasOwnProperty.call(changes, field)) continue
          values.push(changes[field])
          saleSets.push(`"${field}"=$${values.length}`)
        }
        if (saleSets.length) {
          values.push(before.id)
          await tx.$executeRawUnsafe(`UPDATE "ServiceSale" SET ${saleSets.join(',')} WHERE "id"=$${values.length}`, ...values)
        }
        if (Object.prototype.hasOwnProperty.call(changes, 'staffName') && before.appointmentId) {
          await tx.$executeRawUnsafe('UPDATE "Appointment" SET "staffName"=$1,"updatedAt"=NOW() WHERE "id"=$2', changes.staffName, before.appointmentId)
        }
        const after = { ...before, ...changes }
        await tx.$executeRawUnsafe(`INSERT INTO "SalesCorrectionAudit" ("id","organizationId","serviceSaleId","actorUserId","actorDisplayName","actorRole","changesJson","beforeJson","afterJson","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,NOW())`,
          `sca_${crypto.randomUUID()}`, session.organizationId, before.id, session.userId || null, actorName, session.operatorSubject ? 'PLATFORM_OPERATOR' : session.role,
          JSON.stringify(changes), JSON.stringify(before), JSON.stringify(after))
      }
      return owned.length
    })
    json(res, 200, { ok: true, updated })
  }

  async function sharedAccount(req, res, session) {
    await ensureSchema()
    if (req.method === 'GET') {
      const rows = await prisma.$queryRawUnsafe('SELECT "loginId","displayName","active","updatedAt" FROM "AppUser" WHERE "organizationId"=$1 AND "isSharedStoreAccount"=TRUE LIMIT 1', session.organizationId)
      return json(res, 200, { account: rows[0] || null })
    }
    if (!sameOrigin(req)) return json(res, 403, { error: '安全のため操作を完了できませんでした。' })
    const body = await readJson(req)
    const loginId = cleanText(body.loginId, 80).toLowerCase()
    const password = String(body.password || '')
    if (!/^[a-z0-9._-]{3,80}$/.test(loginId)) return json(res, 400, { error: 'ログインIDは英小文字・数字・記号（._-）で3〜80文字にしてください。' })
    if (password.length < 10 || password.length > 128) return json(res, 400, { error: 'パスワードは10〜128文字で入力してください。' })
    const duplicate = await prisma.$queryRawUnsafe('SELECT "id" FROM "AppUser" WHERE LOWER(COALESCE("loginId",\'\'))=$1 AND NOT ("organizationId"=$2 AND "isSharedStoreAccount"=TRUE) LIMIT 1', loginId, session.organizationId)
    if (duplicate[0]) return json(res, 409, { error: 'このログインIDは使用されています。' })
    const salt = crypto.randomBytes(16).toString('hex')
    const hash = `scrypt$${salt}$${crypto.scryptSync(password, salt, 64).toString('hex')}`
    await prisma.$executeRawUnsafe('UPDATE "AppUser" SET "loginId"=$1,"passwordHash"=$2,"active"=TRUE,"updatedAt"=NOW() WHERE "organizationId"=$3 AND "isSharedStoreAccount"=TRUE', loginId, hash, session.organizationId)
    json(res, 200, { ok: true, loginId })
  }

  async function handle(req, res, url) {
    if (url.pathname === '/sales-ledger-v318.js' && req.method === 'GET') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
      res.setHeader('Cache-Control', 'private, no-store')
      res.end(require('fs').readFileSync(require('path').join(__dirname, 'sales-ledger-client-v318.js')))
      return true
    }
    if (!['/api/admin/sales-ledger','/api/admin/shared-store-account'].includes(url.pathname)) return false
    const session = await requireOwner(req, res)
    if (!session) return true
    try {
      await ensureSchema()
      if (url.pathname === '/api/admin/shared-store-account' && ['GET','POST'].includes(req.method)) { await sharedAccount(req, res, session); return true }
      if (url.pathname === '/api/admin/sales-ledger' && req.method === 'GET') { await listSales(req, res, url, session); return true }
      if (url.pathname === '/api/admin/sales-ledger' && req.method === 'PATCH') { await updateSales(req, res, session); return true }
      res.statusCode = 405; res.setHeader('Allow', url.pathname.includes('shared') ? 'GET, POST' : 'GET, PATCH'); res.end(); return true
    } catch (error) {
      console.error('Sales ledger/accounts request failed', { code: String(error && error.code || 'unknown').slice(0, 80) })
      json(res, Number(error && error.statusCode) || 500, { error: Number(error && error.statusCode) ? error.message : '処理を完了できませんでした。' })
      return true
    }
  }

  return { ensureSchema, handle }
}

module.exports = { createSalesLedgerAccountsService }
