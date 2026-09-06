'use strict'

const { createHash } = require('node:crypto')
const path = require('node:path')
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const sharp = require('sharp')

const RELEASE = 'customer-chart-attachment-delete-v567'
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024
const IMAGE_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ACCEPTED_CONTENT_TYPES = new Set([...IMAGE_CONTENT_TYPES, 'application/pdf', 'application/octet-stream'])
const CONTENT_TYPE_BY_FORMAT = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}
const EXTENSION_BY_CONTENT_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

function json(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(payload))
}

function statusError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode })
}

async function readBody(req, maxBytes = MAX_ATTACHMENT_BYTES) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBytes) throw statusError('ファイルは20MB以下にしてください。', 413)
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
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

function chartAttachmentRoute(pathname) {
  const match = /^\/api\/admin\/customers\/([^/]+)\/chart-photos(?:\/([^/]+))?$/.exec(pathname)
  if (!match) return null
  try {
    return {
      customerId: decodeURIComponent(match[1]),
      attachmentId: match[2] ? decodeURIComponent(match[2]) : null,
    }
  } catch {
    return null
  }
}

function storageKey(reference) {
  const prefix = 's3-private://'
  if (!String(reference || '').startsWith(prefix)) throw new Error('Invalid private storage reference')
  const key = String(reference).slice(prefix.length)
  if (!key || key.includes('..') || !key.startsWith('private/customer-chart-photos/')) {
    throw new Error('Invalid private chart attachment key')
  }
  return key
}

function normalizedFileName(value, contentType) {
  let decoded = cleanText(value, 720)
  try { decoded = decodeURIComponent(decoded) } catch {}
  decoded = path.basename(decoded.replaceAll('\\', '/')).replace(/[\u0000-\u001f\u007f]/g, '').trim()
  const extension = EXTENSION_BY_CONTENT_TYPE[contentType] || 'bin'
  if (!decoded) return `カルテ.${extension}`
  const currentExtension = path.extname(decoded).slice(1).toLowerCase()
  const allowedExtensions = contentType === 'image/jpeg' ? new Set(['jpg', 'jpeg']) : new Set([extension])
  if (allowedExtensions.has(currentExtension)) return decoded.slice(0, 240)
  const stem = (currentExtension ? decoded.slice(0, -(currentExtension.length + 1)) : decoded).trim() || 'カルテ'
  return `${stem.slice(0, Math.max(1, 239 - extension.length))}.${extension}`
}

function contentDisposition(mode, fileName) {
  const normalized = cleanText(fileName, 240) || 'chart-file'
  const ascii = normalized.replace(/[^\x20-\x7e]/g, '_').replace(/["\\;]/g, '_') || 'chart-file'
  const encoded = encodeURIComponent(normalized).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
  return `${mode}; filename="${ascii}"; filename*=UTF-8''${encoded}`
}

function inferContentType(storageReference, originalFileName) {
  const reference = String(storageReference || '').toLowerCase()
  if (/\.pdf$/.test(reference)) return 'application/pdf'
  if (/\.png$/.test(reference)) return 'image/png'
  if (/\.webp$/.test(reference)) return 'image/webp'
  if (/\.jpe?g$/.test(reference)) return 'image/jpeg'
  const fileName = String(originalFileName || '').toLowerCase()
  if (/\.pdf$/.test(fileName)) return 'application/pdf'
  if (/\.png$/.test(fileName)) return 'image/png'
  if (/\.webp$/.test(fileName)) return 'image/webp'
  return 'image/jpeg'
}

async function inspectAttachment(input, declaredContentType) {
  if (!input.length) throw statusError('カルテファイルを選択してください。', 400)
  const declared = cleanText(String(declaredContentType || '').split(';')[0], 80).toLowerCase() || 'application/octet-stream'
  if (!ACCEPTED_CONTENT_TYPES.has(declared)) {
    throw statusError('JPG・PNG・WebP・PDFのファイルを選択してください。', 415)
  }

  if (input.subarray(0, 5).toString('ascii') === '%PDF-') {
    if (!['application/pdf', 'application/octet-stream'].includes(declared)) {
      throw statusError('ファイルの種類と内容が一致しません。', 400)
    }
    return { body: input, contentType: 'application/pdf', extension: 'pdf', kind: 'pdf' }
  }

  let metadata
  try {
    metadata = await sharp(input, { failOn: 'error', limitInputPixels: 60_000_000 }).metadata()
  } catch {
    throw statusError('ファイルを読み込めませんでした。JPG・PNG・WebP・PDFを選択してください。', 400)
  }
  const detectedContentType = CONTENT_TYPE_BY_FORMAT[metadata.format]
  if (!detectedContentType || Number(metadata.pages || 1) !== 1) {
    throw statusError('対応していない画像形式です。JPG・PNG・WebPを選択してください。', 400)
  }
  if (declared !== 'application/octet-stream' && declared !== detectedContentType) {
    throw statusError('ファイルの種類と内容が一致しません。', 400)
  }
  return {
    body: input,
    contentType: detectedContentType,
    extension: EXTENSION_BY_CONTENT_TYPE[detectedContentType],
    kind: 'image',
    width: Number(metadata.width || 0),
    height: Number(metadata.height || 0),
  }
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
    async upload(key, body, options) {
      await s3().send(new PutObjectCommand({
        Bucket: bucket(),
        Key: key,
        Body: body,
        ContentType: options.contentType,
        ContentLength: body.length,
        ChecksumSHA256: createHash('sha256').update(body).digest('base64'),
        ServerSideEncryption: 'AES256',
        CacheControl: 'private, max-age=0, no-store',
        Metadata: options.metadata,
      }))
      return `s3-private://${key}`
    },
    async getReadUrl(reference, options = {}) {
      const command = new GetObjectCommand({
        Bucket: bucket(),
        Key: storageKey(reference),
        ResponseContentType: options.contentType || undefined,
        ResponseContentDisposition: contentDisposition(options.download ? 'attachment' : 'inline', options.fileName),
      })
      return getSignedUrl(s3(), command, { expiresIn: 300 })
    },
    async delete(reference) {
      await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: storageKey(reference) }))
    },
  }
}

function createCustomerChartAttachmentsService({ prisma, crypto, sessionProvider, storageProvider }) {
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
      })().catch(error => {
        schemaPromise = null
        throw error
      })
    }
    return schemaPromise
  }

  async function requireStaff(req, res) {
    const session = await sessionProvider(req)
    if (!session || !session.organizationId || !['ADMIN', 'STAFF'].includes(session.role)) {
      json(res, 401, { ok: false, error: '店舗アカウントでログインしてください。' })
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

  async function itemPayload(row) {
    const contentType = inferContentType(row.storageReference, row.originalFileName)
    const fileName = normalizedFileName(row.originalFileName, contentType)
    const urlOptions = { fileName, contentType }
    const [url, downloadUrl] = await Promise.all([
      storage.getReadUrl(row.storageReference, urlOptions),
      storage.getReadUrl(row.storageReference, { ...urlOptions, download: true }),
    ])
    return {
      id: row.id,
      url,
      downloadUrl,
      originalFileName: fileName,
      contentType,
      kind: contentType === 'application/pdf' ? 'pdf' : 'image',
      uploadedByName: row.uploadedByName,
      byteSize: Number(row.byteSize || 0),
      createdAt: new Date(row.createdAt).toISOString(),
    }
  }

  async function listAttachments(res, url, session, customer) {
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
    json(res, 200, {
      ok: true,
      customer,
      count: Number(countRows[0]?.count || 0),
      limit,
      offset,
      items: await Promise.all(rows.map(itemPayload)),
    })
  }

  async function uploadAttachment(req, res, session, customer) {
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: '安全性を確認できないため保存できませんでした。' })
    const contentLength = Number(req.headers['content-length'] || 0)
    if (contentLength > MAX_ATTACHMENT_BYTES) return json(res, 413, { ok: false, error: 'ファイルは20MB以下にしてください。' })

    const declaredContentType = cleanText(String(req.headers['content-type'] || '').split(';')[0], 80).toLowerCase() || 'application/octet-stream'
    const attachment = await inspectAttachment(await readBody(req), declaredContentType)
    const originalFileName = normalizedFileName(req.headers['x-file-name'], attachment.contentType)
    const id = `chart_${crypto.randomUUID()}`
    const key = [
      'private/customer-chart-photos',
      safeSegment(session.organizationId, 'organization'),
      safeSegment(customer.id, 'customer'),
      `${safeSegment(id, 'chart')}.${attachment.extension}`,
    ].join('/')
    const reference = await storage.upload(key, attachment.body, {
      contentType: attachment.contentType,
      metadata: {
        organization: safeSegment(session.organizationId, 'organization'),
        customer: safeSegment(customer.id, 'customer'),
        kind: 'customer-chart-attachment',
      },
    })

    try {
      const rows = await prisma.$queryRawUnsafe(
        'INSERT INTO "CustomerChartPhoto" ("id","organizationId","customerId","storageReference","originalFileName","uploadedByUserId","uploadedByName","byteSize","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING "id","storageReference","originalFileName","uploadedByName","byteSize","createdAt"',
        id,
        session.organizationId,
        customer.id,
        reference,
        originalFileName,
        session.userId || null,
        cleanText(session.displayName || session.subject || '店舗スタッフ', 160) || '店舗スタッフ',
        attachment.body.length,
      )
      json(res, 201, { ok: true, item: await itemPayload(rows[0]) })
    } catch (error) {
      await storage.delete(reference).catch(() => {})
      throw error
    }
  }

  async function deleteAttachment(req, res, session, customer, attachmentId) {
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: '安全性を確認できないため削除できませんでした。' })
    const rows = await prisma.$queryRawUnsafe(
      'SELECT "id","storageReference" FROM "CustomerChartPhoto" WHERE "id"=$1 AND "organizationId"=$2 AND "customerId"=$3 LIMIT 1',
      attachmentId,
      session.organizationId,
      customer.id,
    )
    const attachment = rows[0]
    if (!attachment) return json(res, 404, { ok: false, error: '削除するカルテファイルが見つかりません。' })

    // Delete the private object first. If the database operation fails, retrying remains safe.
    await storage.delete(attachment.storageReference)
    await prisma.$executeRawUnsafe(
      'DELETE FROM "CustomerChartPhoto" WHERE "id"=$1 AND "organizationId"=$2 AND "customerId"=$3',
      attachment.id,
      session.organizationId,
      customer.id,
    )
    json(res, 200, { ok: true, deletedId: attachment.id })
  }

  async function handle(req, res, url) {
    const route = chartAttachmentRoute(url.pathname)
    if (!route) return false
    try {
      await ensureSchema()
      const session = await requireStaff(req, res)
      if (!session) return true
      const customer = await ownedCustomer(route.customerId, session.organizationId)
      if (!customer) {
        json(res, 404, { ok: false, error: '顧客カルテが見つかりません。' })
        return true
      }
      if (!route.attachmentId && req.method === 'GET') await listAttachments(res, url, session, customer)
      else if (!route.attachmentId && req.method === 'POST') await uploadAttachment(req, res, session, customer)
      else if (route.attachmentId && req.method === 'DELETE') await deleteAttachment(req, res, session, customer, route.attachmentId)
      else {
        res.statusCode = 405
        res.setHeader('Allow', route.attachmentId ? 'DELETE' : 'GET, POST')
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
  createCustomerChartAttachmentsService,
  __test: {
    chartAttachmentRoute,
    contentDisposition,
    inferContentType,
    inspectAttachment,
    normalizedFileName,
    sameOrigin,
    storageKey,
  },
}
