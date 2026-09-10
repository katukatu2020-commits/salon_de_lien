'use strict'

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')
const { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const {
  ensureStyleSchema,
  loadReferenceOptions,
  resolveStyle,
  validateLinks,
} = require('./style-system-integration-v602')

const RELEASE = 'style-admin-controls-v618'
const PRIVATE_S3_PREFIX = 's3-private://'
const OWNED_PHOTO_PREFIX = 'private/style-stylist-photos-v610/'
const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const MAX_JSON_BYTES = 8 * 1024 * 1024
const PAGE_SIZE = 50
const STYLE_GENDERS = new Set(['', '女性', '男性', 'その他'])
let s3Client = null

class StyleAdminError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'StyleAdminError'
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

function sameOrigin(req) {
  const origin = String(req.headers.origin || '')
  if (!origin) return false
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  const forwardedProtocol = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim()
  const protocol = forwardedProtocol || (req.socket?.encrypted ? 'https' : 'http')
  return origin === `${protocol}://${host}` || origin === 'https://salon-de-lien.com'
}

async function readJson(req, limit = MAX_JSON_BYTES) {
  const declaredLength = Number(req.headers['content-length'] || 0)
  if (declaredLength > limit) throw new StyleAdminError('送信内容が大きすぎます。', 413)
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw new StyleAdminError('送信内容が大きすぎます。', 413)
    chunks.push(chunk)
  }
  try {
    const raw = Buffer.concat(chunks).toString('utf8')
    return raw ? JSON.parse(raw) : {}
  } catch {
    throw new StyleAdminError('送信内容を確認してください。')
  }
}

function text(value, maxLength, label, required = false) {
  const result = String(value ?? '').replace(/\r\n/g, '\n').trim()
  if ((required && !result) || result.length > maxLength) {
    throw new StyleAdminError(`${label}は${required ? `1〜${maxLength}` : `0〜${maxLength}`}文字で入力してください。`)
  }
  return result
}

function normalizeGender(value) {
  const normalized = String(value || '').normalize('NFKC').trim()
  if (!normalized) return ''
  const lower = normalized.toLocaleLowerCase('ja-JP')
  if (['女', '女性', 'female'].includes(lower)) return '女性'
  if (['男', '男性', 'male'].includes(lower)) return '男性'
  if (['その他', 'ユニセックス', '男女兼用', 'other'].includes(lower)) return 'その他'
  return ''
}

function parsePage(value) {
  const page = Number.parseInt(String(value || '1'), 10)
  return Number.isFinite(page) && page > 0 ? Math.min(page, 10000) : 1
}

function privateBucket() {
  return String(process.env.S3_PRIVATE_ASSETS_BUCKET || '').trim()
}

function privateClient() {
  if (s3Client) return s3Client
  const endpoint = String(process.env.S3_ENDPOINT_URL || process.env.AWS_ENDPOINT_URL_S3 || '').trim()
  const accessKeyId = String(process.env.AWS_ACCESS_KEY_ID || '').trim()
  const secretAccessKey = String(process.env.AWS_SECRET_ACCESS_KEY || '').trim()
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-northeast-1',
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
  })
  return s3Client
}

async function resolveReference(reference) {
  const value = String(reference || '').trim()
  if (!value) return null
  if (!value.startsWith(PRIVATE_S3_PREFIX)) return /^(https?:\/\/|\/(?!\/))/.test(value) ? value : null
  const bucket = privateBucket()
  const key = value.slice(PRIVATE_S3_PREFIX.length)
  if (!bucket || !key || key.includes('..')) return null
  return getSignedUrl(privateClient(), new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 300 })
}

function stylePhotoPrefix(organizationId, postId) {
  const organization = crypto.createHash('sha256').update(String(organizationId)).digest('hex').slice(0, 20)
  const post = crypto.createHash('sha256').update(String(postId)).digest('hex').slice(0, 24)
  return `${OWNED_PHOTO_PREFIX}${organization}/${post}/`
}

async function deleteOwnedPhoto(reference) {
  const value = String(reference || '')
  if (!value.startsWith(`${PRIVATE_S3_PREFIX}${OWNED_PHOTO_PREFIX}`)) return
  const bucket = privateBucket()
  const key = value.slice(PRIVATE_S3_PREFIX.length)
  if (!bucket || !key || key.includes('..')) return
  try {
    await privateClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
  } catch (error) {
    console.warn(`[${RELEASE}]`, { action: 'delete-photo', name: String(error?.name || 'Error').slice(0, 80) })
  }
}

async function uploadStylePhoto(organizationId, postId, photo) {
  const mimeType = String(photo?.mimeType || '').toLowerCase()
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
    throw new StyleAdminError('写真はJPG・PNG・WebPで選択してください。')
  }
  const encoded = String(photo?.data || '')
  if (!encoded || encoded.length > Math.ceil(MAX_PHOTO_BYTES * 4 / 3) + 8 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw new StyleAdminError('写真データを確認してください。')
  }
  const input = Buffer.from(encoded, 'base64')
  if (!input.length || input.length > MAX_PHOTO_BYTES) throw new StyleAdminError('写真は5MB以下で選択してください。')

  let output
  try {
    output = await sharp(input, { failOn: 'error', limitInputPixels: 25_000_000 })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 88, progressive: true })
      .toBuffer()
  } catch {
    throw new StyleAdminError('写真を読み込めませんでした。別の画像を選択してください。')
  }

  const bucket = privateBucket()
  if (!bucket) throw new StyleAdminError('写真保存先が設定されていません。', 503)
  const key = `${stylePhotoPrefix(organizationId, postId)}${crypto.randomUUID()}.jpg`
  await privateClient().send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: output,
    ContentType: 'image/jpeg',
    CacheControl: 'private, max-age=31536000, immutable',
    ServerSideEncryption: 'AES256',
    ChecksumSHA256: crypto.createHash('sha256').update(output).digest('base64'),
  }))
  return `${PRIVATE_S3_PREFIX}${key}`
}

async function loadPost(prisma, organizationId, postId) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT "id","organizationId","postKind","caption","published","publishedByName","styleMetadata","sourceUrl",
            "styleStaffKey","styleMenuIds","styleLinksVersion"
       FROM "VisitCommunityPost"
      WHERE "id"=$1 AND "organizationId"=$2 AND "deletedAt" IS NULL LIMIT 1`,
    postId,
    organizationId,
  )
  return rows[0] || null
}

function publicOptions(options) {
  return {
    staff: options.staff.map(({ active, onLeave, ...staff }) => staff),
    menus: options.menus.map(({ active, ...menu }) => menu),
  }
}

async function loadCourseOptions(prisma, organizationId) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT DISTINCT "value" FROM (
       SELECT NULLIF(BTRIM(CASE WHEN p."postKind"='STORE' THEN
         COALESCE((SELECT STRING_AGG(m."name",' + ' ORDER BY ARRAY_POSITION(p."styleMenuIds",m."id"))
                     FROM "SalonMenu" m
                    WHERE m."organizationId"=p."organizationId" AND m."id"=ANY(p."styleMenuIds")),
                  p."styleMetadata"->>'menuDescription')
         ELSE COALESCE(v."performedStyle",v."requestedStyle") END),'') AS "value"
         FROM "VisitCommunityPost" p
         LEFT JOIN "Visit" v ON v."id"=p."visitId"
         LEFT JOIN "Customer" c ON c."id"=p."customerId" AND c."organizationId"=p."organizationId"
        WHERE p."organizationId"=$1 AND p."published"=TRUE AND p."deletedAt" IS NULL
          AND ((p."postKind"='STORE' AND CARDINALITY(p."photoReferences")>0)
            OR (p."postKind"<>'STORE' AND c."id" IS NOT NULL AND c."deletedAt" IS NULL
              AND EXISTS (SELECT 1 FROM "VisitPhoto" vp WHERE vp."visitId"=p."visitId")))
     ) courses WHERE "value" IS NOT NULL ORDER BY "value" LIMIT 500`,
    organizationId,
  )
  return rows.map(row => ({ value: String(row.value), label: String(row.value) }))
}

function listSql(sort) {
  const order = sort === 'likes'
    ? '"likeCount" DESC,"publishedAt" DESC,"id" DESC'
    : sort === 'oldest'
      ? '"publishedAt" ASC,"id" ASC'
      : '"publishedAt" DESC,"id" DESC'
  return `WITH base AS (
    SELECT p."id",p."publishedAt",p."postKind",p."styleStaffKey",
           COALESCE(NULLIF(BTRIM(p."styleMetadata"->>'title'),''),NULLIF(BTRIM(p."caption"),''),'サロンスタイル') AS "title",
           COALESCE(NULLIF(BTRIM(s."staffName"),''),NULLIF(BTRIM(p."styleMetadata"->>'stylistName'),''),
                    NULLIF(BTRIM(v."stylistName"),''),NULLIF(BTRIM(p."publishedByName"),''),'店舗スタッフ') AS "stylistName",
           CASE WHEN p."postKind"='STORE' THEN NULLIF(BTRIM(p."styleMetadata"->>'gender'),'') ELSE NULLIF(BTRIM(c."gender"),'') END AS "rawGender",
           NULLIF(BTRIM(CASE WHEN p."postKind"='STORE' THEN
             COALESCE((SELECT STRING_AGG(m."name",' + ' ORDER BY ARRAY_POSITION(p."styleMenuIds",m."id"))
                         FROM "SalonMenu" m
                        WHERE m."organizationId"=p."organizationId" AND m."id"=ANY(p."styleMenuIds")),
                      p."styleMetadata"->>'menuDescription')
             ELSE COALESCE(v."performedStyle",v."requestedStyle") END),'') AS "courseName",
           CASE WHEN p."postKind"='STORE' THEN p."photoReferences"[1]
                ELSE (SELECT vp."storageReference" FROM "VisitPhoto" vp WHERE vp."visitId"=p."visitId" ORDER BY vp."createdAt",vp."id" LIMIT 1)
            END AS "coverReference",
           (SELECT COUNT(*)::int FROM "VisitCommunityLike" l WHERE l."postId"=p."id") AS "likeCount"
      FROM "VisitCommunityPost" p
      LEFT JOIN "Visit" v ON v."id"=p."visitId"
      LEFT JOIN "Customer" c ON c."id"=p."customerId" AND c."organizationId"=p."organizationId"
      LEFT JOIN "StaffBookingSetting" s ON s."organizationId"=p."organizationId" AND s."staffKey"=p."styleStaffKey"
     WHERE p."organizationId"=$1 AND p."published"=TRUE AND p."deletedAt" IS NULL
       AND ((p."postKind"='STORE' AND CARDINALITY(p."photoReferences")>0)
         OR (p."postKind"<>'STORE' AND c."id" IS NOT NULL AND c."deletedAt" IS NULL
           AND EXISTS (SELECT 1 FROM "VisitPhoto" available WHERE available."visitId"=p."visitId")))
  ), visible AS (
    SELECT *,CASE
      WHEN LOWER("rawGender") IN ('女','女性','female') THEN '女性'
      WHEN LOWER("rawGender") IN ('男','男性','male') THEN '男性'
      WHEN LOWER("rawGender") IN ('その他','ユニセックス','男女兼用','other') THEN 'その他'
      ELSE '' END AS "gender"
      FROM base WHERE "coverReference" IS NOT NULL
  )
  SELECT "id","publishedAt","postKind","styleStaffKey","title","stylistName","gender","courseName","coverReference","likeCount",
         (COUNT(*) OVER())::int AS "totalCount"
    FROM visible
   WHERE ($2='' OR "styleStaffKey"=$2
          OR REGEXP_REPLACE(LOWER("stylistName"),'[[:space:]　]+','','g')=REGEXP_REPLACE(LOWER($3),'[[:space:]　]+','','g'))
     AND ($4='' OR "courseName"=$4)
     AND ($5='' OR "gender"=$5)
   ORDER BY ${order}
   LIMIT $6 OFFSET $7`
}

async function loadAdminPage(prisma, organizationId, url) {
  const requestedSort = String(url.searchParams.get('sort') || 'latest')
  const sort = ['latest', 'likes', 'oldest'].includes(requestedSort) ? requestedSort : 'latest'
  const requestedStaffKey = text(url.searchParams.get('staff'), 160, 'スタッフ')
  const course = text(url.searchParams.get('course'), 2000, 'コース')
  const requestedGender = String(url.searchParams.get('gender') || '')
  const gender = normalizeGender(requestedGender)
  if (requestedGender && !gender) throw new StyleAdminError('性別の条件を確認してください。')

  const references = await loadReferenceOptions(prisma, organizationId)
  const staff = references.staff.map(row => ({ key: String(row.key), name: String(row.name || '').trim(), role: String(row.role || '').trim() }))
  const selectedStaff = staff.find(row => row.key === requestedStaffKey)
  const staffKey = selectedStaff ? selectedStaff.key : ''
  let page = parsePage(url.searchParams.get('page'))
  const query = listSql(sort)
  const run = offset => prisma.$queryRawUnsafe(
    query,
    organizationId,
    staffKey,
    selectedStaff?.name || '',
    course,
    gender,
    PAGE_SIZE,
    offset,
  )
  let rows = await run((page - 1) * PAGE_SIZE)
  if (!rows.length && page > 1) {
    page = 1
    rows = await run(0)
  }
  const totalCount = Number(rows[0]?.totalCount || 0)
  const posts = await Promise.all(rows.map(async row => ({
    id: String(row.id),
    postKind: String(row.postKind || ''),
    title: String(row.title || 'サロンスタイル'),
    staffKey: row.styleStaffKey ? String(row.styleStaffKey) : null,
    stylistName: String(row.stylistName || '店舗スタッフ'),
    gender: String(row.gender || ''),
    course: String(row.courseName || ''),
    publishedAt: row.publishedAt instanceof Date ? row.publishedAt.toISOString() : String(row.publishedAt || ''),
    coverPhotoUrl: await resolveReference(row.coverReference),
    likeCount: Number(row.likeCount || 0),
  })))

  return {
    release: RELEASE,
    filters: { sort, staffKey, course, gender },
    options: {
      staff,
      courses: await loadCourseOptions(prisma, organizationId),
      genders: [
        { value: '女性', label: '女性' },
        { value: '男性', label: '男性' },
        { value: 'その他', label: 'その他' },
      ],
    },
    posts: posts.filter(post => post.coverPhotoUrl),
    page,
    pageSize: PAGE_SIZE,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
  }
}

async function editorPayload(prisma, organizationId, postId) {
  const post = await loadPost(prisma, organizationId, postId)
  if (!post || post.postKind !== 'STORE') throw new StyleAdminError('スタイルが見つかりません。', 404)
  const metadata = post.styleMetadata && typeof post.styleMetadata === 'object' ? post.styleMetadata : {}
  const style = await resolveStyle(prisma, post, 'staff')
  style.gender = normalizeGender(metadata.gender)
  style.stylist.photoOverride = Boolean(String(metadata.stylistPhotoReference || '').trim())
  return {
    release: RELEASE,
    post: { id: String(post.id), postKind: String(post.postKind), style },
    options: publicOptions(await loadReferenceOptions(prisma, organizationId)),
  }
}

function createStyleAdminControlsService({ prisma, staffSessionProvider }) {
  async function session(req) {
    const value = await staffSessionProvider(req)
    if (!value?.organizationId) throw new StyleAdminError('ログインし直してください。', 401)
    return value
  }

  async function handleList(req, res, url) {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      throw new StyleAdminError('操作を確認してください。', 405)
    }
    const current = await session(req)
    await ensureStyleSchema(prisma)
    return json(res, 200, await loadAdminPage(prisma, current.organizationId, url))
  }

  async function handleEditor(req, res, url) {
    const current = await session(req)
    await ensureStyleSchema(prisma)
    const postId = text(url.searchParams.get('postId'), 220, '投稿', true)
    if (req.method === 'GET') return json(res, 200, await editorPayload(prisma, current.organizationId, postId))
    if (req.method !== 'PATCH') {
      res.setHeader('Allow', 'GET, PATCH')
      throw new StyleAdminError('操作を確認してください。', 405)
    }
    if (!sameOrigin(req)) throw new StyleAdminError('安全のため操作を完了できませんでした。', 403)

    const post = await loadPost(prisma, current.organizationId, postId)
    if (!post || post.postKind !== 'STORE') throw new StyleAdminError('スタイルが見つかりません。', 404)
    const input = await readJson(req)
    const styleName = text(input.styleName, 160, 'スタイル名', true)
    const staffKey = text(input.staffKey, 160, 'スタッフ', true)
    const stylistComment = text(input.stylistComment, 4000, 'スタイリストコメント')
    const requestedGender = String(input.gender || '').normalize('NFKC').trim()
    const gender = normalizeGender(requestedGender)
    if (!STYLE_GENDERS.has(requestedGender) || (requestedGender && !gender)) {
      throw new StyleAdminError('性別を選び直してください。')
    }
    const links = await validateLinks(prisma, current.organizationId, { ...input, staffKey })
    if (!links.staffKey) throw new StyleAdminError('スタッフを選択してください。')

    const metadata = post.styleMetadata && typeof post.styleMetadata === 'object' ? post.styleMetadata : {}
    const oldReference = String(metadata.stylistPhotoReference || '')
    let uploadedReference = null
    let photoSpecified = false
    let nextReference = oldReference || null

    try {
      if (input.photo && typeof input.photo === 'object') {
        uploadedReference = await uploadStylePhoto(current.organizationId, post.id, input.photo)
        nextReference = uploadedReference
        photoSpecified = true
      } else if (input.removeStylistPhoto === true) {
        nextReference = null
        photoSpecified = true
      }

      const metadataPatch = { title: styleName, stylistComment, gender: gender || null }
      if (photoSpecified) metadataPatch.stylistPhotoReference = nextReference
      const changed = await prisma.$executeRawUnsafe(
        `UPDATE "VisitCommunityPost"
            SET "styleMetadata"=(COALESCE("styleMetadata",'{}'::jsonb)-'stylistName'-'stylistKana'-'stylistRole') || $1::jsonb,
                "styleStaffKey"=$2,"styleMenuIds"=$3::text[],"styleLinksVersion"=1,"updatedAt"=NOW()
          WHERE "id"=$4 AND "organizationId"=$5 AND "postKind"='STORE' AND "deletedAt" IS NULL`,
        JSON.stringify(metadataPatch),
        links.staffKey,
        links.menuIds,
        post.id,
        current.organizationId,
      )
      if (!Number(changed)) throw new StyleAdminError('スタイルが見つかりません。', 404)
    } catch (error) {
      if (uploadedReference) await deleteOwnedPhoto(uploadedReference)
      throw error
    }

    if (photoSpecified && oldReference && oldReference !== nextReference) await deleteOwnedPhoto(oldReference)
    return json(res, 200, { success: true, ...(await editorPayload(prisma, current.organizationId, post.id)) })
  }

  async function handle(req, res, url) {
    if (url.pathname === '/style-admin-controls-v618.js' && req.method === 'GET') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      fs.createReadStream(path.join('/app/public', 'style-admin-controls-v618.js')).pipe(res)
      return true
    }
    if (url.pathname === '/style-admin-controls-v618.css' && req.method === 'GET') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/css; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      fs.createReadStream(path.join('/app/public', 'style-admin-controls-v618.css')).pipe(res)
      return true
    }
    if (!['/api/lien-style-admin-v618', '/api/lien-style-editor-v618'].includes(url.pathname)) return false
    try {
      if (url.pathname === '/api/lien-style-admin-v618') await handleList(req, res, url)
      else await handleEditor(req, res, url)
    } catch (error) {
      const status = Number(error?.status) || 500
      console.error(`[${RELEASE}]`, { path: url.pathname, status, name: String(error?.name || 'Error').slice(0, 80) })
      json(res, status, { error: status < 500 ? error.message : 'スタイル情報を読み込めませんでした。' })
    }
    return true
  }

  return { handle }
}

module.exports = {
  StyleAdminError,
  createStyleAdminControlsService,
  normalizeGender,
}
