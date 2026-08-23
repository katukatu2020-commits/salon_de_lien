'use strict'

const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const sharp = require('sharp')

function json(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(payload))
}

function sameOrigin(req) {
  const origin = String(req.headers.origin || '')
  if (!origin) return false
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()
  return origin === `${protocol}://${host}` || origin === 'https://salon-de-lien.com'
}

async function readJson(req, limit = 30 * 1024 * 1024) {
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (Buffer.byteLength(raw, 'utf8') > limit) throw Object.assign(new Error('送信する画像が大きすぎます。'), { status: 413 })
  }
  try { return raw ? JSON.parse(raw) : {} } catch { throw Object.assign(new Error('送信内容を確認してください。'), { status: 400 }) }
}

function safePart(value, fallback) {
  const safe = String(value || '').replace(/[^A-Za-z0-9_-]/g, '')
  return safe || fallback
}

function decodeImage(dataUrl) {
  const match = String(dataUrl || '').match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/)
  if (!match) throw Object.assign(new Error('写真はJPG・PNG・WebP形式で選択してください。'), { status: 400 })
  const buffer = Buffer.from(match[2], 'base64')
  if (!buffer.length || buffer.length > 5 * 1024 * 1024) throw Object.assign(new Error('写真は1枚5MB以下にしてください。'), { status: 400 })
  return buffer
}

function createCommunityPublishingService({ prisma, crypto, sessionProvider }) {
  const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' })

  async function ensureSchema() {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "VisitCommunityPost"
        ALTER COLUMN "customerId" DROP NOT NULL,
        ALTER COLUMN "visitId" DROP NOT NULL,
        ADD COLUMN IF NOT EXISTS "postKind" TEXT NOT NULL DEFAULT 'VISIT',
        ADD COLUMN IF NOT EXISTS "caption" TEXT,
        ADD COLUMN IF NOT EXISTS "photoReferences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        ADD COLUMN IF NOT EXISTS "publishedByName" TEXT
    `)
  }

  async function publish(req, res, session) {
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: '安全のため操作を完了できませんでした。' })
    const input = await readJson(req)
    const caption = String(input.caption || '').trim().slice(0, 120) || null
    const photos = Array.isArray(input.photos) ? input.photos.slice(0, 4) : []
    if (!photos.length) throw Object.assign(new Error('公開する写真を選択してください。'), { status: 400 })
    if (input.rightsConfirmed !== true) throw Object.assign(new Error('写真の掲載権限を確認してください。'), { status: 400 })

    const bucket = String(process.env.S3_PRIVATE_ASSETS_BUCKET || '').trim()
    if (!bucket) throw new Error('写真保存先が設定されていません。')
    const postId = `community-post-${crypto.randomUUID()}`
    const stored = []
    try {
      for (const value of photos) {
        const inputBuffer = decodeImage(value)
        const body = await sharp(inputBuffer, { failOn: 'error', limitInputPixels: 40000000 })
          .rotate()
          .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 90, mozjpeg: true })
          .toBuffer()
        const key = `private/community-posts/${safePart(session.organizationId, 'organization')}/${safePart(postId, 'post')}/style-${crypto.randomUUID()}.jpg`
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
          Metadata: { kind: 'store-style', source: 'staff-community-publish' },
        }))
        stored.push({ key, reference: `s3-private://${key}` })
      }

      const displayName = String(session.displayName || (session.role === 'ADMIN' ? '店舗スタッフ' : 'スタイリスト')).trim().slice(0, 100)
      await prisma.$executeRawUnsafe(
        'INSERT INTO "VisitCommunityPost" ("id","organizationId","customerId","visitId","postKind","caption","photoReferences","publishedByName","published","publishedAt","createdAt","updatedAt","aiCommentDueAt","aiCommentedAt") VALUES ($1,$2,NULL,NULL,\'STORE\',$3,ARRAY(SELECT jsonb_array_elements_text($4::jsonb)),$5,TRUE,NOW(),NOW(),NOW(),NULL,NULL)',
        postId,
        session.organizationId,
        caption,
        JSON.stringify(stored.map(item => item.reference)),
        displayName,
      )
      return json(res, 201, { ok: true, postId, photoCount: stored.length })
    } catch (error) {
      await Promise.allSettled(stored.map(item => s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: item.key }))))
      throw error
    }
  }

  async function handle(req, res, url) {
    if (url.pathname === '/admin-community-publishing-v348.js' && req.method === 'GET') {
      const session = await sessionProvider(req)
      if (!session) { res.statusCode = 404; res.end(); return true }
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      require('fs').createReadStream('/app/community-publishing-client-v348.js').pipe(res)
      return true
    }
    if (url.pathname !== '/api/lien-community-publish') return false
    const session = await sessionProvider(req)
    if (!session) { json(res, 401, { ok: false, error: 'ログインが必要です。' }); return true }
    try {
      if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Allow', 'POST'); res.end(); return true }
      await publish(req, res, session)
    } catch (error) {
      console.error('[community-publishing-v348]', { organizationId: session.organizationId, path: url.pathname, error: error && error.message })
      const status = Number(error && error.status) || 500
      json(res, status, { ok: false, error: status < 500 ? error.message : '投稿を保存できませんでした。時間をおいて再度お試しください。' })
    }
    return true
  }

  return { ensureSchema, handle }
}

module.exports = { createCommunityPublishingService }
