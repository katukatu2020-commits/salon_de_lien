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
    if (Buffer.byteLength(raw, 'utf8') > limit) throw Object.assign(new Error('画像を含む送信内容が大きすぎます。'), { status: 413 })
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

  async function options(res, session) {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT v."id" AS "visitId",c."id" AS "customerId",c."name" AS "customerName",v."visitedAt",v."stylistName",COALESCE(v."performedStyle",v."requestedStyle",'施術記録') AS "menu",COUNT(vp."id")::int AS "photoCount",COALESCE(cp."published",false) AS "published" FROM "Visit" v JOIN "Customer" c ON c."id"=v."customerId" LEFT JOIN "VisitPhoto" vp ON vp."visitId"=v."id" LEFT JOIN "VisitCommunityPost" cp ON cp."visitId"=v."id" WHERE c."organizationId"=$1 AND c."deletedAt" IS NULL GROUP BY v."id",c."id",c."name",v."visitedAt",v."stylistName",v."performedStyle",v."requestedStyle",cp."published" ORDER BY v."visitedAt" DESC LIMIT 250`,
      session.organizationId,
    )
    return json(res, 200, { ok: true, visits: rows })
  }

  async function publish(req, res, session) {
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: '安全のため操作を完了できませんでした。' })
    const input = await readJson(req)
    const customerId = String(input.customerId || '').slice(0, 120)
    const visitId = String(input.visitId || '').slice(0, 120)
    const caption = String(input.caption || '').trim().slice(0, 120) || null
    const photos = Array.isArray(input.photos) ? input.photos.slice(0, 4) : []
    if (!customerId || !visitId || !photos.length) throw Object.assign(new Error('来店履歴と写真を選択してください。'), { status: 400 })
    if (input.consentConfirmed !== true) throw Object.assign(new Error('お客様の掲載同意を確認してください。'), { status: 400 })

    const visits = await prisma.$queryRawUnsafe(
      'SELECT v."id",v."customerId" FROM "Visit" v JOIN "Customer" c ON c."id"=v."customerId" WHERE v."id"=$1 AND c."id"=$2 AND c."organizationId"=$3 AND c."deletedAt" IS NULL LIMIT 1',
      visitId,
      customerId,
      session.organizationId,
    )
    if (!visits[0]) throw Object.assign(new Error('対象の来店履歴が見つかりません。'), { status: 404 })

    const bucket = String(process.env.S3_PRIVATE_ASSETS_BUCKET || '').trim()
    if (!bucket) throw new Error('写真保存先が設定されていません。')
    const stored = []
    try {
      for (const value of photos) {
        const inputBuffer = decodeImage(value)
        const body = await sharp(inputBuffer, { failOn: 'error', limitInputPixels: 40000000 })
          .rotate()
          .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 90, mozjpeg: true })
          .toBuffer()
        const key = `private/customer-photos/${safePart(session.organizationId, 'organization')}/${safePart(customerId, 'customer')}/${safePart(visitId, 'visit')}/after-${crypto.randomUUID()}.jpg`
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
          Metadata: { kind: 'after', source: 'staff-community-publish' },
        }))
        stored.push({ key, reference: `s3-private://${key}` })
      }

      const postId = await prisma.$transaction(async tx => {
        for (const item of stored) {
          await tx.$executeRawUnsafe(
            'INSERT INTO "VisitPhoto" ("id","customerId","visitId","storageReference","caption","uploadedByUserId","uploadedByName","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())',
            `community-photo-${crypto.randomUUID()}`,
            customerId,
            visitId,
            item.reference,
            caption,
            session.userId || null,
            session.displayName || (session.role === 'ADMIN' ? '管理者' : 'スタッフ'),
          )
        }
        const posts = await tx.$queryRawUnsafe(
          'INSERT INTO "VisitCommunityPost" ("id","organizationId","customerId","visitId","published","publishedAt","createdAt","updatedAt","aiCommentDueAt","aiCommentedAt") VALUES ($1,$2,$3,$4,TRUE,NOW(),NOW(),NOW(),NULL,NULL) ON CONFLICT ("visitId") DO UPDATE SET "published"=TRUE,"publishedAt"=NOW(),"updatedAt"=NOW(),"aiCommentDueAt"=NULL,"aiCommentedAt"=NULL RETURNING "id"',
          `community-post-${crypto.randomUUID()}`,
          session.organizationId,
          customerId,
          visitId,
        )
        return posts[0].id
      })
      return json(res, 201, { ok: true, postId, photoCount: stored.length })
    } catch (error) {
      await Promise.allSettled(stored.map(item => s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: item.key }))))
      throw error
    }
  }

  async function handle(req, res, url) {
    if (url.pathname === '/admin-community-publishing-v337.js' && req.method === 'GET') {
      const session = await sessionProvider(req)
      if (!session) { res.statusCode = 404; res.end(); return true }
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      require('fs').createReadStream('/app/community-publishing-client-v337.js').pipe(res)
      return true
    }
    if (!['/api/lien-community-publish-options', '/api/lien-community-publish'].includes(url.pathname)) return false
    const session = await sessionProvider(req)
    if (!session) { json(res, 401, { ok: false, error: 'ログインが必要です。' }); return true }
    try {
      if (url.pathname === '/api/lien-community-publish-options') {
        if (req.method !== 'GET') { res.statusCode = 405; res.setHeader('Allow', 'GET'); res.end(); return true }
        await options(res, session)
      } else {
        if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Allow', 'POST'); res.end(); return true }
        await publish(req, res, session)
      }
    } catch (error) {
      console.error('[community-publishing-v337]', { organizationId: session.organizationId, path: url.pathname, error: error && error.message })
      const status = Number(error && error.status) || 500
      json(res, status, { ok: false, error: status < 500 ? error.message : '投稿を保存できませんでした。時間をおいて再度お試しください。' })
    }
    return true
  }

  return { handle }
}

module.exports = { createCommunityPublishingService }
