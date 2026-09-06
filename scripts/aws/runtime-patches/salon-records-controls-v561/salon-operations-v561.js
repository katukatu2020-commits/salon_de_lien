'use strict'

const { createHash } = require('node:crypto')
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const sharp = require('sharp')

const RELEASE = 'salon-records-controls-v561'
const MAX_IMAGE_BYTES = 12 * 1024 * 1024
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function json(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(payload))
}

async function readBody(req, maxBytes = MAX_IMAGE_BYTES) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBytes) {
      throw Object.assign(new Error('画像は12MB以下にしてください。'), { statusCode: 413 })
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

async function readJson(req, maxBytes = 32 * 1024) {
  const body = await readBody(req, maxBytes)
  try {
    return body.length ? JSON.parse(body.toString('utf8')) : {}
  } catch {
    throw Object.assign(new Error('入力内容を確認してください。'), { statusCode: 400 })
  }
}

function requestOrigin(req) {
  const protocol = String(req.headers['x-forwarded-proto'] || (req.socket?.encrypted ? 'https' : 'http')).split(',')[0].trim()
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  return `${protocol}://${host}`
}

function sameOrigin(req) {
  const supplied = String(req.headers.origin || '').trim()
  if (!supplied) return false
  try {
    const allowed = new Set([new URL(requestOrigin(req)).origin, 'https://salon-de-lien.com'])
    for (const key of ['APP_BASE_URL', 'AUTH_BASE_URL', 'NEXTAUTH_URL', 'NEXT_PUBLIC_APP_URL']) {
      const value = String(process.env[key] || '').trim()
      if (!value) continue
      try { allowed.add(new URL(value).origin) } catch {}
    }
    return allowed.has(new URL(supplied).origin)
  } catch {
    return false
  }
}

function cleanText(value, maxLength) {
  return String(value == null ? '' : value).trim().slice(0, maxLength)
}

function safeSegment(value, fallback) {
  return cleanText(value, 160).replace(/[^A-Za-z0-9_-]/g, '') || fallback
}

function storageKey(reference) {
  const prefix = 's3-private://'
  if (!String(reference || '').startsWith(prefix)) throw new Error('Invalid private storage reference')
  const key = String(reference).slice(prefix.length)
  if (!key || key.includes('..') || !key.startsWith('private/customer-chart-photos/')) {
    throw new Error('Invalid private chart photo key')
  }
  return key
}

function createDefaultStorage() {
  let client = null
  const bucket = () => {
    const value = String(process.env.S3_PRIVATE_ASSETS_BUCKET || '').trim()
    if (!value) throw new Error('S3_PRIVATE_ASSETS_BUCKET is not configured')
    return value
  }
  const s3 = () => {
    if (!client) client = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' })
    return client
  }
  return {
    async upload(key, body, metadata) {
      await s3().send(new PutObjectCommand({
        Bucket: bucket(),
        Key: key,
        Body: body,
        ContentType: 'image/jpeg',
        ContentLength: body.length,
        ChecksumSHA256: createHash('sha256').update(body).digest('base64'),
        ServerSideEncryption: 'AES256',
        CacheControl: 'private, max-age=0, no-store',
        Metadata: metadata,
      }))
      return `s3-private://${key}`
    },
    async getReadUrl(reference) {
      return getSignedUrl(s3(), new GetObjectCommand({ Bucket: bucket(), Key: storageKey(reference) }), { expiresIn: 300 })
    },
    async delete(reference) {
      await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: storageKey(reference) }))
    },
  }
}

async function normalizeChartImage(input) {
  if (!input.length) throw Object.assign(new Error('カルテ画像を選択してください。'), { statusCode: 400 })
  let metadata
  try {
    metadata = await sharp(input, { failOn: 'error', limitInputPixels: 50_000_000 }).metadata()
  } catch {
    throw Object.assign(new Error('画像を読み込めませんでした。JPG・PNG・WebPを選択してください。'), { statusCode: 400 })
  }
  if (!['jpeg', 'png', 'webp'].includes(metadata.format) || Number(metadata.pages || 1) !== 1) {
    throw Object.assign(new Error('安全な静止画像として確認できませんでした。'), { statusCode: 400 })
  }
  const output = await sharp(input, { failOn: 'error', limitInputPixels: 50_000_000 })
    .rotate()
    .resize({ width: 2600, height: 3600, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer()
  return output
}

function chartPhotoRoute(pathname) {
  const match = /^\/api\/admin\/customers\/([^/]+)\/chart-photos$/.exec(pathname)
  if (!match) return null
  try { return decodeURIComponent(match[1]) } catch { return null }
}

function statusError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode })
}

function createSalonOperationsService({ prisma, crypto, sessionProvider, storageProvider }) {
  const storage = storageProvider || createDefaultStorage()
  let schemaPromise = null

  async function ensureSchema() {
    if (!schemaPromise) {
      schemaPromise = (async () => {
        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CustomerChartPhoto" (
          "id" TEXT PRIMARY KEY,
          "organizationId" TEXT NOT NULL,
          "customerId" TEXT NOT NULL,
          "storageReference" TEXT NOT NULL UNIQUE,
          "originalFileName" TEXT,
          "uploadedByUserId" TEXT,
          "uploadedByName" TEXT NOT NULL,
          "byteSize" INTEGER NOT NULL,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`)
        await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerChartPhoto_customer_created_idx" ON "CustomerChartPhoto"("organizationId","customerId","createdAt" DESC)')
        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "SalesVoidAudit" (
          "id" TEXT PRIMARY KEY,
          "organizationId" TEXT NOT NULL,
          "serviceSaleId" TEXT NOT NULL,
          "actorUserId" TEXT,
          "actorDisplayName" TEXT NOT NULL,
          "actorRole" TEXT NOT NULL,
          "reason" TEXT NOT NULL,
          "snapshotJson" JSONB NOT NULL,
          "restoredStockQuantity" INTEGER NOT NULL DEFAULT 0,
          "voidedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`)
        await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "SalesVoidAudit_org_sale_voided_idx" ON "SalesVoidAudit"("organizationId","serviceSaleId","voidedAt" DESC)')
      })().catch(error => {
        schemaPromise = null
        throw error
      })
    }
    return schemaPromise
  }

  async function requireStaff(req, res, ownerOnly = false) {
    const session = await sessionProvider(req)
    if (!session || !session.organizationId || !['ADMIN', 'STAFF'].includes(session.role)) {
      json(res, 401, { ok: false, error: '店舗アカウントでログインしてください。' })
      return null
    }
    if (ownerOnly && session.role !== 'ADMIN') {
      json(res, 403, { ok: false, error: 'この操作はオーナーアカウントのみ実行できます。' })
      return null
    }
    return session
  }

  async function ownedCustomer(customerId, organizationId) {
    const rows = await prisma.$queryRawUnsafe(
      'SELECT "id","name" FROM "Customer" WHERE "id"=$1 AND "organizationId"=$2 AND "deletedAt" IS NULL AND "storeHiddenAt" IS NULL LIMIT 1',
      customerId,
      organizationId,
    )
    return rows[0] || null
  }

  async function listChartPhotos(res, url, session, customer) {
    const requestedLimit = Number(url.searchParams.get('limit') || 1)
    const requestedOffset = Number(url.searchParams.get('offset') || 0)
    const limit = Math.min(100, Math.max(1, Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : 1))
    const offset = Math.min(1_000_000, Math.max(0, Number.isFinite(requestedOffset) ? Math.floor(requestedOffset) : 0))
    const rows = await prisma.$queryRawUnsafe(
      'SELECT "id","storageReference","originalFileName","uploadedByName","byteSize","createdAt" FROM "CustomerChartPhoto" WHERE "organizationId"=$1 AND "customerId"=$2 ORDER BY "createdAt" DESC,"id" DESC LIMIT $3 OFFSET $4',
      session.organizationId,
      customer.id,
      limit,
      offset,
    )
    const countRows = await prisma.$queryRawUnsafe(
      'SELECT COUNT(*)::int AS "count" FROM "CustomerChartPhoto" WHERE "organizationId"=$1 AND "customerId"=$2',
      session.organizationId,
      customer.id,
    )
    const items = await Promise.all(rows.map(async row => ({
      id: row.id,
      url: await storage.getReadUrl(row.storageReference),
      originalFileName: row.originalFileName,
      uploadedByName: row.uploadedByName,
      byteSize: Number(row.byteSize || 0),
      createdAt: new Date(row.createdAt).toISOString(),
    })))
    json(res, 200, { ok: true, customer, count: Number(countRows[0]?.count || 0), limit, offset, items })
  }

  async function uploadChartPhoto(req, res, session, customer) {
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: '安全性を確認できないため保存できませんでした。' })
    const contentType = cleanText(String(req.headers['content-type'] || '').split(';')[0], 80).toLowerCase()
    if (!IMAGE_TYPES.has(contentType)) return json(res, 415, { ok: false, error: 'JPG・PNG・WebPの画像を選択してください。' })
    const contentLength = Number(req.headers['content-length'] || 0)
    if (contentLength > MAX_IMAGE_BYTES) return json(res, 413, { ok: false, error: '画像は12MB以下にしてください。' })
    const normalized = await normalizeChartImage(await readBody(req))
    const fileNameHeader = cleanText(req.headers['x-file-name'], 240)
    let originalFileName = fileNameHeader
    try { originalFileName = decodeURIComponent(fileNameHeader) } catch {}
    const id = `chart_${crypto.randomUUID()}`
    const key = [
      'private/customer-chart-photos',
      safeSegment(session.organizationId, 'organization'),
      safeSegment(customer.id, 'customer'),
      `${safeSegment(id, 'chart')}.jpg`,
    ].join('/')
    const reference = await storage.upload(key, normalized, {
      organization: safeSegment(session.organizationId, 'organization'),
      customer: safeSegment(customer.id, 'customer'),
      kind: 'customer-chart-photo',
    })
    try {
      const rows = await prisma.$queryRawUnsafe(
        'INSERT INTO "CustomerChartPhoto" ("id","organizationId","customerId","storageReference","originalFileName","uploadedByUserId","uploadedByName","byteSize","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING "id","storageReference","originalFileName","uploadedByName","byteSize","createdAt"',
        id,
        session.organizationId,
        customer.id,
        reference,
        cleanText(originalFileName, 240) || null,
        session.userId || null,
        cleanText(session.displayName || session.subject || '店舗スタッフ', 160) || '店舗スタッフ',
        normalized.length,
      )
      const row = rows[0]
      json(res, 201, {
        ok: true,
        count: null,
        item: {
          id: row.id,
          url: await storage.getReadUrl(row.storageReference),
          originalFileName: row.originalFileName,
          uploadedByName: row.uploadedByName,
          byteSize: Number(row.byteSize || 0),
          createdAt: new Date(row.createdAt).toISOString(),
        },
      })
    } catch (error) {
      await storage.delete(reference).catch(() => {})
      throw error
    }
  }

  async function handleChartPhotos(req, res, url, customerId) {
    const session = await requireStaff(req, res)
    if (!session) return
    const customer = await ownedCustomer(customerId, session.organizationId)
    if (!customer) return json(res, 404, { ok: false, error: '顧客カルテが見つかりません。' })
    if (req.method === 'GET') return listChartPhotos(res, url, session, customer)
    if (req.method === 'POST') return uploadChartPhoto(req, res, session, customer)
    res.statusCode = 405
    res.setHeader('Allow', 'GET, POST')
    res.end()
  }

  async function voidSale(req, res) {
    const session = await requireStaff(req, res, true)
    if (!session) return
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: '安全性を確認できないため取消できませんでした。' })
    const input = await readJson(req)
    const saleId = cleanText(input.saleId, 120)
    const reason = cleanText(input.reason, 500) || '後から決済を取り消し'
    if (!saleId || input.confirmed !== true) {
      return json(res, 400, { ok: false, error: '取消対象と確認チェックを確認してください。' })
    }
    const actorName = cleanText(session.operatorSubject || session.displayName || session.subject || 'オーナー', 160) || 'オーナー'
    const result = await prisma.$transaction(async tx => {
      const sales = await tx.$queryRawUnsafe(`SELECT s."id",s."customerId",s."appointmentId",s."title",s."amount",s."paymentMethod",s."paidAt",s."source",s."note",s."createdAt",
          c."name" AS "customerName",a."staffName",a."scheduledAt",a."menu"
        FROM "ServiceSale" s
        JOIN "Customer" c ON c."id"=s."customerId"
        LEFT JOIN "Appointment" a ON a."id"=s."appointmentId"
        WHERE s."id"=$1 AND c."organizationId"=$2
        FOR UPDATE OF s`, saleId, session.organizationId)
      if (!sales.length) throw statusError('対象の決済明細が見つかりません。すでに取消済みの可能性があります。', 404)
      const lines = await tx.$queryRawUnsafe(
        'SELECT "id","productId","productNameSnapshot","manufacturerNameSnapshot","unitPrice","quantity","lineTotal","createdAt" FROM "ProductSaleLine" WHERE "serviceSaleId"=$1 ORDER BY "createdAt","id"',
        saleId,
      )
      const restoredStockQuantity = lines.reduce((sum, line) => sum + Math.max(0, Number(line.quantity || 0)), 0)
      const snapshot = { sale: sales[0], productLines: lines }
      await tx.$executeRawUnsafe(
        'INSERT INTO "SalesVoidAudit" ("id","organizationId","serviceSaleId","actorUserId","actorDisplayName","actorRole","reason","snapshotJson","restoredStockQuantity","voidedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,NOW())',
        `void_${crypto.randomUUID()}`,
        session.organizationId,
        saleId,
        session.userId || null,
        actorName,
        session.operatorSubject ? 'PLATFORM_OPERATOR' : session.role,
        reason,
        JSON.stringify(snapshot),
        restoredStockQuantity,
      )
      await tx.$executeRawUnsafe(`UPDATE "Product" p
        SET "stockQuantity"=p."stockQuantity"+restored."quantity","updatedAt"=NOW()
        FROM (SELECT "productId",SUM("quantity")::int AS "quantity" FROM "ProductSaleLine" WHERE "serviceSaleId"=$1 GROUP BY "productId") restored
        WHERE p."id"=restored."productId" AND p."organizationId"=$2`, saleId, session.organizationId)
      const deleted = await tx.$queryRawUnsafe('DELETE FROM "ServiceSale" WHERE "id"=$1 RETURNING "id"', saleId)
      if (!deleted.length) throw statusError('決済明細を取消できませんでした。', 409)
      return { saleId, restoredStockQuantity }
    })
    json(res, 200, { ok: true, ...result, message: '決済を取り消し、日別売上集計から除外しました。' })
  }

  async function handle(req, res, url) {
    const customerId = chartPhotoRoute(url.pathname)
    const isVoidRoute = url.pathname === '/api/admin/sales-ledger/void'
    if (!customerId && !isVoidRoute) return false
    try {
      await ensureSchema()
      if (customerId) await handleChartPhotos(req, res, url, customerId)
      else if (req.method === 'POST') await voidSale(req, res)
      else {
        res.statusCode = 405
        res.setHeader('Allow', 'POST')
        res.end()
      }
    } catch (error) {
      const status = Number(error?.statusCode) || 500
      console.error(`[${RELEASE}] request failed`, {
        path: url.pathname,
        status,
        name: String(error?.name || 'Error').slice(0, 80),
      })
      json(res, status, {
        ok: false,
        error: status < 500 ? error.message : '処理を完了できませんでした。時間をおいてもう一度お試しください。',
      })
    }
    return true
  }

  return { ensureSchema, handle }
}

module.exports = {
  createSalonOperationsService,
  __test: { chartPhotoRoute, cleanText, normalizeChartImage, safeSegment, sameOrigin, storageKey },
}
