'use strict'

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')
const { GetObjectCommand, PutObjectCommand, S3Client } = require('@aws-sdk/client-s3')

const RELEASE = 'style-list-performance-v640'
const PRIVATE_S3_PREFIX = 's3-private://'
const THUMBNAIL_PREFIX = 'private/style-list-thumbnails-v640/'
const MAX_SOURCE_BYTES = 30 * 1024 * 1024
const MAX_CACHE_BYTES = 48 * 1024 * 1024
const MAX_CACHE_ENTRIES = 96
const THUMBNAIL_WIDTH = 560
const THUMBNAIL_HEIGHT = 700
const THUMBNAIL_QUALITY = 72

let privateS3Client = null
let localManifest = null

function configuredSecret() {
  return String(process.env.ADMIN_AUTH_SECRET || process.env.CUSTOMER_AUTH_SECRET || '').trim()
}

function signaturePayload({ organizationId, postId, audience, version, expiresAt }) {
  return [organizationId, postId, audience, version, expiresAt].join('\n')
}

function signatureFor(input, secret = configuredSecret()) {
  if (!secret) return ''
  return crypto.createHmac('sha256', secret).update(signaturePayload(input)).digest('base64url')
}

function normalizedLocalReference(reference) {
  const value = String(reference || '').trim()
  if (!value.startsWith('/') || value.startsWith('//')) return ''
  try {
    return decodeURIComponent(new URL(value, 'http://local.invalid').pathname)
  } catch {
    return ''
  }
}

function manifest() {
  if (localManifest) return localManifest
  try {
    const value = JSON.parse(fs.readFileSync('/app/style-list-thumbnails-v640.json', 'utf8'))
    localManifest = value && typeof value === 'object' ? value : {}
  } catch {
    localManifest = {}
  }
  return localManifest
}

function createStyleListThumbnailUrl({ organizationId, postId, audience, version, reference, secret }) {
  const value = String(reference || '').trim()
  const localReference = normalizedLocalReference(value)
  if (localReference) {
    const generated = manifest()[localReference]
    if (generated) return String(generated)
    return `/_next/image?url=${encodeURIComponent(localReference)}&w=640&q=72`
  }
  if (!value.startsWith(PRIVATE_S3_PREFIX)) return ''

  const input = {
    organizationId: String(organizationId || ''),
    postId: String(postId || ''),
    audience: audience === 'staff' ? 'staff' : 'customer',
    version: String(version instanceof Date ? version.getTime() : version || '').slice(0, 80),
    expiresAt: String((Math.floor(Date.now() / 3_600_000) + 2) * 3_600),
  }
  if (!input.organizationId || !input.postId) return ''
  const signature = signatureFor(input, secret)
  if (!signature) return ''
  const params = new URLSearchParams({
    organizationId: input.organizationId,
    postId: input.postId,
    audience: input.audience,
    version: input.version,
    expiresAt: input.expiresAt,
    signature,
  })
  return `/api/lien-style-thumbnail-v640?${params}`
}

function privateClient() {
  if (privateS3Client) return privateS3Client
  const endpoint = String(process.env.S3_ENDPOINT_URL || process.env.AWS_ENDPOINT_URL_S3 || '').trim()
  const accessKeyId = String(process.env.AWS_ACCESS_KEY_ID || '').trim()
  const secretAccessKey = String(process.env.AWS_SECRET_ACCESS_KEY || '').trim()
  privateS3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-northeast-1',
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
  })
  return privateS3Client
}

async function bodyToBuffer(body) {
  if (!body) throw new Error('Style image body is empty')
  if (typeof body.transformToByteArray === 'function') return Buffer.from(await body.transformToByteArray())
  const chunks = []
  let total = 0
  for await (const chunk of body) {
    const buffer = Buffer.from(chunk)
    total += buffer.length
    if (total > MAX_SOURCE_BYTES) throw new Error('Style image is too large')
    chunks.push(buffer)
  }
  return Buffer.concat(chunks)
}

function assertSourceSize(buffer) {
  if (!buffer.length || buffer.length > MAX_SOURCE_BYTES) throw new Error('Style image size is invalid')
  return buffer
}

async function transformImage(buffer) {
  return sharp(assertSourceSize(buffer), { failOn: 'none', limitInputPixels: 80_000_000 })
    .rotate()
    .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, { fit: 'cover', position: 'centre' })
    .webp({ quality: THUMBNAIL_QUALITY, effort: 3 })
    .toBuffer()
}

function thumbnailObjectKey(reference) {
  const sourceKey = String(reference || '').slice(PRIVATE_S3_PREFIX.length)
  const digest = crypto.createHash('sha256')
    .update(`${sourceKey}\n${THUMBNAIL_WIDTH}x${THUMBNAIL_HEIGHT}\n${THUMBNAIL_QUALITY}`)
    .digest('hex')
  return `${THUMBNAIL_PREFIX}${digest}.webp`
}

function isMissingObject(error) {
  return ['NoSuchKey', 'NotFound', 'NoSuchBucket'].includes(String(error?.name || error?.Code || ''))
    || Number(error?.$metadata?.httpStatusCode || 0) === 404
}

async function loadPrivateThumbnail(reference) {
  const bucket = String(process.env.S3_PRIVATE_ASSETS_BUCKET || '').trim()
  const sourceKey = String(reference || '').slice(PRIVATE_S3_PREFIX.length)
  if (!bucket || !sourceKey || sourceKey.includes('..')) throw new Error('Style image reference is unavailable')
  const client = privateClient()
  const thumbnailKey = thumbnailObjectKey(reference)
  try {
    const cached = await client.send(new GetObjectCommand({ Bucket: bucket, Key: thumbnailKey }))
    return assertSourceSize(await bodyToBuffer(cached.Body))
  } catch (error) {
    if (!isMissingObject(error)) throw error
  }

  const original = await client.send(new GetObjectCommand({ Bucket: bucket, Key: sourceKey }))
  const output = await transformImage(await bodyToBuffer(original.Body))
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: thumbnailKey,
    Body: output,
    ContentType: 'image/webp',
    CacheControl: 'private, max-age=31536000, immutable',
    ServerSideEncryption: 'AES256',
  }))
  return output
}

function createMemoryCache() {
  const entries = new Map()
  let bytes = 0
  return {
    get(key) {
      const value = entries.get(key)
      if (!value) return null
      entries.delete(key)
      entries.set(key, value)
      return value
    },
    set(key, value) {
      const previous = entries.get(key)
      if (previous) bytes -= previous.buffer.length
      entries.delete(key)
      entries.set(key, value)
      bytes += value.buffer.length
      while (entries.size > MAX_CACHE_ENTRIES || bytes > MAX_CACHE_BYTES) {
        const oldestKey = entries.keys().next().value
        const oldest = entries.get(oldestKey)
        entries.delete(oldestKey)
        bytes -= oldest.buffer.length
      }
    },
    size() {
      return entries.size
    },
  }
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''))
  const b = Buffer.from(String(right || ''))
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b)
}

function validateSignedRequest(url, secret) {
  const input = {
    organizationId: String(url.searchParams.get('organizationId') || ''),
    postId: String(url.searchParams.get('postId') || ''),
    audience: String(url.searchParams.get('audience') || ''),
    version: String(url.searchParams.get('version') || '').slice(0, 80),
    expiresAt: String(url.searchParams.get('expiresAt') || ''),
  }
  const expiresAt = Number(input.expiresAt)
  const now = Math.floor(Date.now() / 1000)
  if (!input.organizationId || !input.postId || !['staff', 'customer'].includes(input.audience)) return null
  if (!Number.isInteger(expiresAt) || expiresAt < now - 30 || expiresAt > now + 3 * 60 * 60) return null
  const expected = signatureFor(input, secret)
  if (!safeEqual(expected, url.searchParams.get('signature'))) return null
  return input
}

function status(res, code, message) {
  res.statusCode = code
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(message)
}

function createStyleListThumbnailService({
  prisma,
  authSecret = configuredSecret(),
  sourceLoader = loadPrivateThumbnail,
  transformer = null,
} = {}) {
  const cache = createMemoryCache()
  const inFlight = new Map()

  async function resolveOutput(reference, version) {
    const key = `${reference}\n${version}`
    const cached = cache.get(key)
    if (cached) return cached
    if (!inFlight.has(key)) {
      inFlight.set(key, (async () => {
        const source = await sourceLoader(reference, version)
        const buffer = transformer ? await transformer(source) : source
        const outputBuffer = assertSourceSize(Buffer.from(buffer))
        const value = {
          buffer: outputBuffer,
          etag: `"${crypto.createHash('sha256').update(outputBuffer).digest('base64url')}"`,
        }
        cache.set(key, value)
        return value
      })().finally(() => inFlight.delete(key)))
    }
    return inFlight.get(key)
  }

  async function handle(req, res, url) {
    if (url.pathname !== '/api/lien-style-thumbnail-v640') return false
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.setHeader('Allow', 'GET, HEAD')
      status(res, 405, 'Method not allowed')
      return true
    }
    const input = validateSignedRequest(url, authSecret)
    if (!input) {
      status(res, 403, 'Image link is invalid')
      return true
    }
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT p."published",
                CASE WHEN p."postKind"='STORE' THEN p."photoReferences"[1] ELSE photo."storageReference" END AS "coverReference"
           FROM "VisitCommunityPost" p
           LEFT JOIN LATERAL (
             SELECT "storageReference" FROM "VisitPhoto"
              WHERE "visitId"=p."visitId" ORDER BY "createdAt","id" LIMIT 1
           ) photo ON TRUE
          WHERE p."id"=$1 AND p."organizationId"=$2 AND p."deletedAt" IS NULL LIMIT 1`,
        input.postId,
        input.organizationId,
      )
      const post = rows[0]
      const reference = String(post?.coverReference || '')
      if (!post || !reference.startsWith(PRIVATE_S3_PREFIX) || (input.audience === 'customer' && !post.published)) {
        status(res, 404, 'Image not found')
        return true
      }
      const output = await resolveOutput(reference, input.version)
      if (String(req.headers['if-none-match'] || '') === output.etag) {
        res.statusCode = 304
        res.setHeader('ETag', output.etag)
        res.setHeader('Cache-Control', 'private, max-age=900, stale-while-revalidate=3600')
        res.end()
        return true
      }
      res.statusCode = 200
      res.setHeader('Content-Type', 'image/webp')
      res.setHeader('Content-Length', String(output.buffer.length))
      res.setHeader('Cache-Control', 'private, max-age=900, stale-while-revalidate=3600')
      res.setHeader('ETag', output.etag)
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('X-Lien-Style-Thumbnail', 'v640')
      res.end(req.method === 'HEAD' ? undefined : output.buffer)
    } catch (error) {
      console.error(`[${RELEASE}] thumbnail`, {
        organizationId: input.organizationId,
        postId: input.postId,
        name: String(error?.name || 'Error').slice(0, 80),
      })
      status(res, 503, 'Image is temporarily unavailable')
    }
    return true
  }

  return { handle, cacheSize: () => cache.size() }
}

module.exports = {
  RELEASE,
  createStyleListThumbnailService,
  createStyleListThumbnailUrl,
  signatureFor,
  transformImage,
  validateSignedRequest,
}
