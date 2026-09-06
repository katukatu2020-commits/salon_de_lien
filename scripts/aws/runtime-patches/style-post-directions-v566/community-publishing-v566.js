'use strict'

const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const sharp = require('sharp')

const RELEASE = 'style-post-directions-v566'
const MAX_BODY_BYTES = 30 * 1024 * 1024
const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const PHOTO_DIRECTIONS = Object.freeze(['FRONT', 'SIDE', 'BACK'])
const LEGACY_DIRECTIONS = Object.freeze([...PHOTO_DIRECTIONS, 'OTHER'])

function json(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(payload))
}

function statusError(message, status = 400) {
  return Object.assign(new Error(message), { status })
}

function sameOrigin(req) {
  const origin = String(req.headers.origin || '')
  if (!origin) return false
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()
  return origin === `${protocol}://${host}` || origin === 'https://salon-de-lien.com'
}

async function readJson(req, limit = MAX_BODY_BYTES) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw statusError('送信する画像が大きすぎます。', 413)
    chunks.push(chunk)
  }
  try {
    const body = Buffer.concat(chunks)
    return body.length ? JSON.parse(body.toString('utf8')) : {}
  } catch {
    throw statusError('送信内容を確認してください。')
  }
}

function safePart(value, fallback) {
  const safe = String(value || '').replace(/[^A-Za-z0-9_-]/g, '')
  return safe || fallback
}

function decodeImage(dataUrl) {
  const match = String(dataUrl || '').match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/)
  if (!match) throw statusError('写真はJPG・PNG・WebP形式で選択してください。')
  const buffer = Buffer.from(match[2], 'base64')
  if (!buffer.length || buffer.length > MAX_PHOTO_BYTES) throw statusError('写真は1枚5MB以下にしてください。')
  return buffer
}

function normalizePhotos(value) {
  const photos = Array.isArray(value) ? value : []
  const isLegacy = photos.length > 0 && photos.every(photo => typeof photo === 'string')
  if (isLegacy) {
    if (photos.length > LEGACY_DIRECTIONS.length) throw statusError('写真は最大4枚まで選択できます。')
    return photos.map((dataUrl, index) => ({ direction: LEGACY_DIRECTIONS[index], dataUrl }))
  }

  if (photos.length !== PHOTO_DIRECTIONS.length) {
    throw statusError('正面・横・後ろの写真を1枚ずつ選択してください。')
  }
  const byDirection = new Map()
  for (const photo of photos) {
    const direction = String(photo?.direction || '').trim().toUpperCase()
    const dataUrl = String(photo?.dataUrl || '')
    if (!PHOTO_DIRECTIONS.includes(direction) || !dataUrl || byDirection.has(direction)) {
      throw statusError('正面・横・後ろの写真を1枚ずつ選択してください。')
    }
    byDirection.set(direction, { direction, dataUrl })
  }
  if (PHOTO_DIRECTIONS.some(direction => !byDirection.has(direction))) {
    throw statusError('正面・横・後ろの写真を1枚ずつ選択してください。')
  }
  return PHOTO_DIRECTIONS.map(direction => byDirection.get(direction))
}

async function normalizeImage(photo) {
  try {
    return await sharp(decodeImage(photo.dataUrl), { failOn: 'error', limitInputPixels: 40000000 })
      .rotate()
      .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer()
  } catch (error) {
    if (error?.status) throw error
    throw statusError(`${photo.direction}の写真を読み込めませんでした。別の写真を選択してください。`)
  }
}

function createCommunityPublishingService({ prisma, crypto, sessionProvider, s3Client }) {
  const s3 = s3Client || new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' })

  async function ensureSchema() {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "VisitCommunityPost"
        ALTER COLUMN "customerId" DROP NOT NULL,
        ALTER COLUMN "visitId" DROP NOT NULL,
        ADD COLUMN IF NOT EXISTS "postKind" TEXT NOT NULL DEFAULT 'VISIT',
        ADD COLUMN IF NOT EXISTS "caption" TEXT,
        ADD COLUMN IF NOT EXISTS "photoReferences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        ADD COLUMN IF NOT EXISTS "photoDirections" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        ADD COLUMN IF NOT EXISTS "publishedByName" TEXT
    `)
  }

  async function publish(req, res, session) {
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: '安全のため操作を完了できませんでした。' })
    const input = await readJson(req)
    const caption = String(input.caption || '').trim().slice(0, 120) || null
    const photos = normalizePhotos(input.photos)
    if (!photos.length) throw statusError('公開する写真を選択してください。')
    if (input.rightsConfirmed !== true) throw statusError('写真の掲載権限を確認してください。')

    const bucket = String(process.env.S3_PRIVATE_ASSETS_BUCKET || '').trim()
    if (!bucket) throw new Error('写真保存先が設定されていません。')
    const postId = `community-post-${crypto.randomUUID()}`
    const stored = []
    try {
      for (const photo of photos) {
        const body = await normalizeImage(photo)
        const direction = photo.direction.toLowerCase()
        const key = `private/community-posts/${safePart(session.organizationId, 'organization')}/${safePart(postId, 'post')}/${direction}-${crypto.randomUUID()}.jpg`
        const checksum = crypto.createHash('sha256').update(body).digest('base64')
        await s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: 'image/jpeg',
          ContentLength: body.length,
          ChecksumSHA256: checksum,
          ServerSideEncryption: 'AES256',
          CacheControl: 'private, max-age=0, no-store',
          Metadata: { kind: 'store-style', source: 'staff-community-publish', direction },
        }))
        stored.push({ key, reference: `s3-private://${key}`, direction: photo.direction })
      }

      const displayName = String(session.displayName || (session.role === 'ADMIN' ? '店舗スタッフ' : 'スタイリスト')).trim().slice(0, 100)
      await prisma.$executeRawUnsafe(
        'INSERT INTO "VisitCommunityPost" ("id","organizationId","customerId","visitId","postKind","caption","photoReferences","photoDirections","publishedByName","published","publishedAt","createdAt","updatedAt","aiCommentDueAt","aiCommentedAt") VALUES ($1,$2,NULL,NULL,\'STORE\',$3,ARRAY(SELECT jsonb_array_elements_text($4::jsonb)),ARRAY(SELECT jsonb_array_elements_text($5::jsonb)),$6,TRUE,NOW(),NOW(),NOW(),NULL,NULL)',
        postId,
        session.organizationId,
        caption,
        JSON.stringify(stored.map(item => item.reference)),
        JSON.stringify(stored.map(item => item.direction)),
        displayName,
      )
      return json(res, 201, {
        ok: true,
        postId,
        photoCount: stored.length,
        directions: stored.map(item => item.direction),
      })
    } catch (error) {
      await Promise.allSettled(stored.map(item => s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: item.key }))))
      throw error
    }
  }

  async function handle(req, res, url) {
    if (['/admin-community-publishing-v348.js', '/admin-community-publishing-v566.js'].includes(url.pathname) && req.method === 'GET') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      require('fs').createReadStream('/app/community-publishing-client-v566.js').pipe(res)
      return true
    }
    if (url.pathname !== '/api/lien-community-publish') return false
    const session = await sessionProvider(req)
    if (!session) { json(res, 401, { ok: false, error: 'ログインが必要です。' }); return true }
    try {
      if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Allow', 'POST'); res.end(); return true }
      await publish(req, res, session)
    } catch (error) {
      console.error(`[${RELEASE}]`, {
        organizationId: session.organizationId,
        path: url.pathname,
        status: Number(error?.status) || 500,
        name: String(error?.name || 'Error').slice(0, 80),
      })
      const status = Number(error?.status) || 500
      json(res, status, { ok: false, error: status < 500 ? error.message : '投稿を保存できませんでした。時間をおいて再度お試しください。' })
    }
    return true
  }

  return { ensureSchema, handle }
}

module.exports = {
  createCommunityPublishingService,
  __test: { decodeImage, normalizePhotos, sameOrigin },
}
