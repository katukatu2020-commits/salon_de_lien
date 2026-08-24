'use strict'

const crypto = require('crypto')
const sharp = require('sharp')
const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand, S3Client } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const { put, del } = require('@vercel/blob')

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_MULTIPART_BYTES = MAX_IMAGE_BYTES + 512 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const S3_PREFIX = 's3-private://'

function safeSegment(value, fallback) {
  return String(value || '').trim().replace(/[^A-Za-z0-9_-]/g, '') || fallback
}

function validOrigin(req) {
  const origin = String(req.headers.origin || '')
  if (!origin) return true
  try {
    return new URL(origin).host === String(req.headers.host || '')
  } catch {
    return false
  }
}

async function readMultipart(req) {
  const declaredLength = Number(req.headers['content-length'] || 0)
  if (Number.isFinite(declaredLength) && declaredLength > MAX_MULTIPART_BYTES) {
    const error = new Error('プロフィール画像は5MB以下にしてください。')
    error.status = 413
    throw error
  }
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > MAX_MULTIPART_BYTES) {
      const error = new Error('プロフィール画像は5MB以下にしてください。')
      error.status = 413
      throw error
    }
    chunks.push(chunk)
  }
  const request = new Request('http://localhost/api/customer/profile-image', {
    method: 'POST',
    headers: { 'content-type': String(req.headers['content-type'] || '') },
    body: Buffer.concat(chunks),
  })
  return request.formData()
}

async function normalizeImage(file) {
  if (!file || typeof file.arrayBuffer !== 'function' || !file.size) {
    const error = new Error('プロフィール画像を選択してください。')
    error.status = 400
    throw error
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    const error = new Error('プロフィール画像は JPG / PNG / WebP のみアップロードできます。')
    error.status = 415
    throw error
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const error = new Error('プロフィール画像は5MB以下にしてください。')
    error.status = 413
    throw error
  }
  const input = Buffer.from(await file.arrayBuffer())
  let metadata
  try {
    metadata = await sharp(input, { failOn: 'error', limitInputPixels: 40_000_000 }).metadata()
  } catch {
    const error = new Error('安全な静止画像として読み込めませんでした。')
    error.status = 400
    throw error
  }
  if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages || 1) > 1) {
    const error = new Error('安全な静止画像として読み込めませんでした。')
    error.status = 400
    throw error
  }
  return sharp(input, { failOn: 'error', limitInputPixels: 40_000_000 })
    .rotate()
    .resize(720, 720, { fit: 'cover', position: 'centre', withoutEnlargement: false })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer()
}

function s3ObjectKey(session) {
  return [
    'private/customer-photos',
    safeSegment(session.organizationId, 'organization'),
    safeSegment(session.customerId, 'customer'),
    'unassigned',
    `profile-${crypto.randomUUID()}.jpg`,
  ].join('/')
}

function s3Key(reference) {
  if (!String(reference || '').startsWith(S3_PREFIX)) return null
  const key = String(reference).slice(S3_PREFIX.length)
  return key && !key.includes('..') ? key : null
}

async function uploadImage(body, session) {
  const key = s3ObjectKey(session)
  const provider = String(process.env.STORAGE_PROVIDER || '').trim().toLowerCase()
  if (provider === 's3') {
    const bucket = String(process.env.S3_PRIVATE_ASSETS_BUCKET || '').trim()
    if (!bucket) throw new Error('S3 private assets bucket is not configured')
    const client = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' })
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'image/jpeg',
      ContentLength: body.length,
      ServerSideEncryption: 'AES256',
      CacheControl: 'private, max-age=0, no-store',
      Metadata: { kind: 'profile', 'content-sha256': crypto.createHash('sha256').update(body).digest('hex') },
    }))
    const reference = `${S3_PREFIX}${key}`
    const readUrl = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 300 })
    return { reference, readUrl }
  }
  const uploaded = await put(key, body, {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'image/jpeg',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })
  return { reference: uploaded.url, readUrl: uploaded.url }
}

async function deleteReference(reference) {
  if (!reference) return
  const key = s3Key(reference)
  if (key) {
    const bucket = String(process.env.S3_PRIVATE_ASSETS_BUCKET || '').trim()
    if (!bucket) return
    const client = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' })
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    return
  }
  if (/^https?:\/\//.test(String(reference))) {
    await del(reference, { token: process.env.BLOB_READ_WRITE_TOKEN })
  }
}

function createCustomerProfileImageService({ prisma, customerSession, json }) {
  return {
    async handle(req, res, url) {
      if (url.pathname !== '/api/customer/profile-image' || req.method !== 'POST') return false
      if (!validOrigin(req)) {
        json(res, 403, { error: '安全性を確認できませんでした。' })
        return true
      }
      const session = await customerSession(req)
      if (!session) {
        json(res, 401, { error: 'ログインし直してください。' })
        return true
      }
      let stored = null
      try {
        const formData = await readMultipart(req)
        const normalized = await normalizeImage(formData.get('profileImage'))
        const rows = await prisma.$queryRawUnsafe(
          'SELECT "id","organizationId","profileImageUrl" FROM "Customer" WHERE "id"=$1 AND "organizationId"=$2 AND "deletedAt" IS NULL LIMIT 1',
          session.customerId,
          session.organizationId,
        )
        const customer = rows[0]
        if (!customer) {
          json(res, 404, { error: '顧客情報が見つかりません。' })
          return true
        }
        stored = await uploadImage(normalized, session)
        const updated = await prisma.customer.updateMany({
          where: {
            id: customer.id,
            organizationId: customer.organizationId,
            deletedAt: null,
            profileImageUrl: customer.profileImageUrl,
          },
          data: { profileImageUrl: stored.reference },
        })
        if (updated.count !== 1) {
          await deleteReference(stored.reference).catch(() => undefined)
          json(res, 409, { error: '画像が同時に更新されました。画面を再読み込みしてお試しください。' })
          return true
        }
        await deleteReference(customer.profileImageUrl).catch(error => {
          console.warn('[customer-profile-image-v424] previous image cleanup failed', { name: error?.name || 'UnknownError' })
        })
        json(res, 200, { success: true, message: 'プロフィール画像を更新しました。', imageUrl: stored.readUrl })
      } catch (error) {
        if (stored) await deleteReference(stored.reference).catch(() => undefined)
        const status = Number(error?.status) || 500
        if (status >= 500) console.error('[customer-profile-image-v424] upload failed', { name: error?.name || 'UnknownError' })
        json(res, status, { error: status >= 500 ? '画像を保存できませんでした。時間をおいてもう一度お試しください。' : error.message })
      }
      return true
    },
  }
}

module.exports = { createCustomerProfileImageService }
