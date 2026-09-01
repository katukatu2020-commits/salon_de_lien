'use strict'

const crypto = require('crypto')
const sharp = require('sharp')
const {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} = require('@aws-sdk/client-s3')

const RELEASE = 'customer-home-branding-v528'
const DEFAULT_PHRASE = 'あたらしい、\n美しさを大切に。'
const DEFAULT_IMAGE_URL = '/brand/salon-interior-illustrated.png'
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function createCustomerHomeBrandingService({
  prisma,
  customerSession,
  staffSession,
  json,
  s3Client,
}) {
  const s3 = s3Client || globalThis.__lienCustomerHomeBrandingS3 || new S3Client({
    region: process.env.AWS_REGION || 'ap-northeast-1',
  })
  if (!s3Client) globalThis.__lienCustomerHomeBrandingS3 = s3
  let schemaReady = false

  async function ensureSchema() {
    if (schemaReady) return
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CustomerHomeBranding" (
      "organizationId" TEXT PRIMARY KEY REFERENCES "Organization"("id") ON DELETE CASCADE,
      "phrase" TEXT NOT NULL,
      "imageKey" TEXT,
      "updatedByStaffId" TEXT,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)
    schemaReady = true
  }

  function safeSegment(value, fallback) {
    const safe = String(value || '').replace(/[^A-Za-z0-9_-]/g, '')
    return safe || fallback
  }

  function privateObjectKey(value) {
    let key = String(value || '').trim()
    if (key.startsWith('s3-private://')) key = key.slice('s3-private://'.length)
    if (!key.startsWith('private/customer-home-branding/') || key.includes('..') || key.includes('\\')) return null
    return key
  }

  function requestOriginIsValid(req) {
    const origin = String(req.headers.origin || '')
    if (!origin) return true
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
    const protocol = String(req.headers['cloudfront-forwarded-proto'] || req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()
    return origin === `${protocol}://${host}` || origin === `https://${host}` || origin === `http://${host}`
  }

  async function readBuffer(req, maximum) {
    const chunks = []
    let total = 0
    for await (const chunk of req) {
      total += chunk.length
      if (total > maximum) throw Object.assign(new Error('too_large'), { status: 413 })
      chunks.push(chunk)
    }
    return Buffer.concat(chunks)
  }

  async function readJson(req) {
    const raw = await readBuffer(req, 64 * 1024)
    try {
      return raw.length ? JSON.parse(raw.toString('utf8')) : {}
    } catch {
      throw Object.assign(new Error('入力内容を確認してください。'), { status: 400 })
    }
  }

  function normalizePhrase(value) {
    const phrase = String(value == null ? '' : value)
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      .trim()
    if (!phrase) throw Object.assign(new Error('ホーム画面のフレーズを入力してください。'), { status: 400 })
    if (phrase.length > 70) throw Object.assign(new Error('フレーズは70文字以内で入力してください。'), { status: 400 })
    if (phrase.split('\n').length > 3) throw Object.assign(new Error('フレーズは3行以内で入力してください。'), { status: 400 })
    return phrase
  }

  function imageUrl(record, audience) {
    if (!record?.imageKey) return DEFAULT_IMAGE_URL
    const version = record.updatedAt ? new Date(record.updatedAt).getTime() : Date.now()
    return `/api/lien-customer-home-branding/image?audience=${encodeURIComponent(audience)}&v=${encodeURIComponent(version)}`
  }

  async function getForOrganization(organizationId, audience = 'customer') {
    await ensureSchema()
    const rows = await prisma.$queryRawUnsafe(
      'SELECT "phrase","imageKey","updatedAt" FROM "CustomerHomeBranding" WHERE "organizationId"=$1 LIMIT 1',
      organizationId,
    )
    const record = rows[0] || null
    return {
      phrase: record?.phrase || DEFAULT_PHRASE,
      imageKey: privateObjectKey(record?.imageKey),
      imageUrl: imageUrl(record, audience),
      updatedAt: record?.updatedAt || null,
      isDefault: !record,
    }
  }

  async function sessionForAudience(req, audience) {
    if (audience === 'customer') return customerSession(req)
    if (audience === 'staff') return staffSession(req)
    const staff = await staffSession(req)
    return staff || customerSession(req)
  }

  async function settings(req, res, url) {
    const audience = String(url.searchParams.get('audience') || 'staff').toLowerCase()
    if (!['staff', 'customer'].includes(audience)) return json(res, 400, { error: '表示先を確認してください。' })
    const session = await sessionForAudience(req, audience)
    if (!session) return json(res, 401, { error: 'ログインが必要です。' })
    const branding = await getForOrganization(session.organizationId, audience)
    return json(res, 200, {
      success: true,
      branding: audience === 'staff' ? branding : { ...branding, imageKey: null },
    })
  }

  function expectedPrefix(organizationId) {
    return `private/customer-home-branding/${safeSegment(organizationId, 'organization')}/`
  }

  async function deleteObject(key) {
    const safeKey = privateObjectKey(key)
    const bucket = String(process.env.S3_PRIVATE_ASSETS_BUCKET || '').trim()
    if (!safeKey || !bucket) return
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: safeKey }))
    } catch (error) {
      console.warn(`[${RELEASE}] stale image cleanup failed`, { name: error?.name || 'UnknownError' })
    }
  }

  async function save(req, res) {
    const session = await staffSession(req)
    if (!session) return json(res, 401, { error: 'ログインが必要です。' })
    if (session.role !== 'ADMIN') return json(res, 403, { error: 'ホーム表示の変更はオーナーのみ操作できます。' })
    if (!requestOriginIsValid(req)) return json(res, 403, { error: '安全性を確認できませんでした。' })
    try {
      await ensureSchema()
      const input = await readJson(req)
      const previous = await getForOrganization(session.organizationId, 'staff')
      if (input.reset === true) {
        await prisma.$executeRawUnsafe('DELETE FROM "CustomerHomeBranding" WHERE "organizationId"=$1', session.organizationId)
        await deleteObject(previous.imageKey)
        return json(res, 200, { success: true, branding: await getForOrganization(session.organizationId, 'staff') })
      }

      const phrase = normalizePhrase(input.phrase)
      const imageKey = input.imageKey ? privateObjectKey(input.imageKey) : null
      if (input.imageKey && (!imageKey || !imageKey.startsWith(expectedPrefix(session.organizationId)))) {
        return json(res, 400, { error: 'ホーム画面の画像を確認してください。' })
      }
      await prisma.$executeRawUnsafe(`INSERT INTO "CustomerHomeBranding" (
        "organizationId","phrase","imageKey","updatedByStaffId","updatedAt"
      ) VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP)
      ON CONFLICT ("organizationId") DO UPDATE SET
        "phrase"=EXCLUDED."phrase","imageKey"=EXCLUDED."imageKey",
        "updatedByStaffId"=EXCLUDED."updatedByStaffId","updatedAt"=CURRENT_TIMESTAMP`,
      session.organizationId, phrase, imageKey, session.userId || null)
      if (previous.imageKey && previous.imageKey !== imageKey) await deleteObject(previous.imageKey)
      return json(res, 200, { success: true, branding: await getForOrganization(session.organizationId, 'staff') })
    } catch (error) {
      const status = Number(error?.status || 500)
      if (status < 500) return json(res, status, { error: error.message })
      console.error(`[${RELEASE}] save failed`, { name: error?.name || 'UnknownError' })
      return json(res, 500, { error: 'ホーム表示を保存できませんでした。時間をおいてもう一度お試しください。' })
    }
  }

  async function uploadImage(req, res) {
    const session = await staffSession(req)
    if (!session) return json(res, 401, { error: 'ログインが必要です。' })
    if (session.role !== 'ADMIN') return json(res, 403, { error: 'ホーム画面の変更はオーナーのみ操作できます。' })
    if (!requestOriginIsValid(req)) return json(res, 403, { error: '安全性を確認できませんでした。' })
    const contentType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase()
    if (!IMAGE_TYPES.has(contentType)) return json(res, 415, { error: '画像は JPG / PNG / WebP を選択してください。' })
    if (Number(req.headers['content-length'] || 0) > MAX_IMAGE_BYTES) return json(res, 413, { error: '画像は5MB以下にしてください。' })
    try {
      const source = await readBuffer(req, MAX_IMAGE_BYTES)
      const normalized = await sharp(source, { failOn: 'error', limitInputPixels: 40_000_000 })
        .rotate()
        .resize({ width: 1600, height: 900, fit: 'cover', position: 'centre' })
        .jpeg({ quality: 88, mozjpeg: true })
        .toBuffer()
      const bucket = String(process.env.S3_PRIVATE_ASSETS_BUCKET || '').trim()
      if (!bucket) return json(res, 503, { error: '画像保存先が設定されていません。' })
      const key = `${expectedPrefix(session.organizationId)}${crypto.randomUUID()}.jpg`
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: normalized,
        ContentType: 'image/jpeg',
        ContentLength: normalized.length,
        ServerSideEncryption: 'AES256',
        CacheControl: 'private, max-age=0, no-store',
      }))
      return json(res, 201, { success: true, imageKey: key })
    } catch (error) {
      if (error?.status === 413) return json(res, 413, { error: '画像は5MB以下にしてください。' })
      console.error(`[${RELEASE}] image upload failed`, { name: error?.name || 'UnknownError' })
      return json(res, 500, { error: '画像を保存できませんでした。時間をおいてもう一度お試しください。' })
    }
  }

  async function streamImage(req, res, url) {
    const audience = String(url.searchParams.get('audience') || '').toLowerCase()
    if (!['staff', 'customer'].includes(audience)) return json(res, 400, { error: '表示先を確認してください。' })
    const session = await sessionForAudience(req, audience)
    if (!session) return json(res, 401, { error: 'ログインが必要です。' })
    const branding = await getForOrganization(session.organizationId, audience)
    const key = privateObjectKey(branding.imageKey)
    if (!key || !key.startsWith(expectedPrefix(session.organizationId))) return json(res, 404, { error: '画像がありません。' })
    const bucket = String(process.env.S3_PRIVATE_ASSETS_BUCKET || '').trim()
    if (!bucket) return json(res, 503, { error: '画像保存先が設定されていません。' })
    try {
      const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
      res.statusCode = 200
      res.setHeader('Content-Type', object.ContentType || 'image/jpeg')
      res.setHeader('Cache-Control', 'private, max-age=120')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      if (object.ETag) res.setHeader('ETag', object.ETag)
      if (object.ContentLength != null) res.setHeader('Content-Length', String(object.ContentLength))
      if (Buffer.isBuffer(object.Body) || object.Body instanceof Uint8Array) return res.end(Buffer.from(object.Body))
      if (object.Body && typeof object.Body.pipe === 'function') return object.Body.pipe(res)
      if (!object.Body || typeof object.Body.transformToByteArray !== 'function') throw new Error('empty_s3_body')
      return res.end(Buffer.from(await object.Body.transformToByteArray()))
    } catch (error) {
      console.warn(`[${RELEASE}] image read failed`, { name: error?.name || 'UnknownError' })
      return json(res, 404, { error: '画像を読み込めませんでした。' })
    }
  }

  async function handle(req, res, url) {
    if (url.pathname === '/api/lien-customer-home-branding/image') {
      if (req.method === 'POST') await uploadImage(req, res)
      else if (req.method === 'GET') await streamImage(req, res, url)
      else json(res, 405, { error: 'Method not allowed' })
      return true
    }
    if (url.pathname === '/api/lien-customer-home-branding') {
      if (req.method === 'GET') await settings(req, res, url)
      else if (req.method === 'PUT') await save(req, res)
      else json(res, 405, { error: 'Method not allowed' })
      return true
    }
    return false
  }

  return {
    DEFAULT_IMAGE_URL,
    DEFAULT_PHRASE,
    ensureSchema,
    getForOrganization,
    handle,
  }
}

module.exports = {
  DEFAULT_IMAGE_URL,
  DEFAULT_PHRASE,
  createCustomerHomeBrandingService,
}
