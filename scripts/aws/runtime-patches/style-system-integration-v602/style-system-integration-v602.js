'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { GetObjectCommand, S3Client } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')

const RELEASE = 'style-system-integration-v602'
const PRIVATE_S3_PREFIX = 's3-private://'
const MAX_MENU_LINKS = 12
const schemaPromises = new WeakMap()
let privateS3Client = null

class StyleSystemError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'StyleSystemError'
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

async function readJson(req, limit = 24 * 1024) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw new StyleSystemError('送信内容が大きすぎます。', 413)
    chunks.push(chunk)
  }
  try {
    const raw = Buffer.concat(chunks).toString('utf8')
    return raw ? JSON.parse(raw) : {}
  } catch {
    throw new StyleSystemError('送信内容を確認してください。')
  }
}

function text(value, maxLength, label, required = false) {
  const result = String(value ?? '').replace(/\r\n/g, '\n').trim()
  if ((required && !result) || result.length > maxLength) {
    throw new StyleSystemError(`${label}は${required ? `1〜${maxLength}` : `0〜${maxLength}`}文字で入力してください。`)
  }
  return result
}

function identity(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('ja-JP')
    .replace(/[\s　]/g, '')
    .replace(/[\s　()[\]{}（）【】「」・·,.、。:：'"’“”]/g, '')
}

function menuSegments(value) {
  const source = String(value || '').normalize('NFKC')
  return [...new Set(source.split(/\s*(?:\+|＋|\/|／|・|、)\s*/).map(identity).filter(Boolean))]
}

function groupByIdentity(rows, value) {
  const grouped = new Map()
  for (const row of rows) {
    const key = identity(row[value])
    if (!key) continue
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(row)
  }
  return grouped
}

function deriveAutoLinks(metadata, options) {
  const staffMatches = groupByIdentity(options.staff, 'name').get(identity(metadata?.stylistName)) || []
  const staffKey = staffMatches.length === 1 ? staffMatches[0].key : null
  const menusByName = groupByIdentity(options.menus, 'name')
  const fullMenu = menusByName.get(identity(metadata?.menuDescription)) || []
  let menuIds = fullMenu.length === 1 ? [fullMenu[0].id] : []
  if (!menuIds.length) {
    for (const segment of menuSegments(metadata?.menuDescription)) {
      const matches = menusByName.get(segment) || []
      if (matches.length === 1 && !menuIds.includes(matches[0].id)) menuIds.push(matches[0].id)
    }
  }
  return { staffKey, menuIds: menuIds.slice(0, MAX_MENU_LINKS) }
}

async function loadReferenceOptions(prisma, organizationId, includeInactive = false) {
  const staff = await prisma.$queryRawUnsafe(
    `SELECT s."staffKey" AS "key",s."staffName" AS "name",s."active",s."onLeave",
            p."roleLabel",p."specialties",p."introduction",p."profileImageKey",u."role" AS "accountRole"
       FROM "StaffBookingSetting" s
       LEFT JOIN "AppUser" u ON u."id"=s."userId" AND u."organizationId"=s."organizationId"
       LEFT JOIN "StaffProfileSetting" p ON p."userId"=s."userId" AND p."organizationId"=s."organizationId"
      WHERE s."organizationId"=$1 AND s."staffKey"<>'free'
        ${includeInactive ? '' : 'AND s."active"=TRUE AND s."onLeave"=FALSE AND (u."id" IS NULL OR u."active"=TRUE)'}
      ORDER BY s."createdAt",s."staffName"`,
    organizationId,
  )
  const menus = await prisma.$queryRawUnsafe(
    `SELECT "id","name","category","description","durationMinutes","priceYen","active","sortOrder"
       FROM "SalonMenu"
      WHERE "organizationId"=$1 ${includeInactive ? '' : 'AND "active"=TRUE'}
      ORDER BY "sortOrder","name"`,
    organizationId,
  )
  return {
    staff: staff.map(row => ({
      key: String(row.key),
      name: String(row.name || '').trim(),
      role: String(row.roleLabel || (row.accountRole === 'ADMIN' ? 'オーナー・スタイリスト' : 'スタイリスト')).trim(),
      specialties: String(row.specialties || '').trim(),
      introduction: String(row.introduction || '').trim(),
      hasAvatar: Boolean(row.profileImageKey),
      active: row.active !== false,
      onLeave: row.onLeave === true,
    })),
    menus: menus.map(row => ({
      id: String(row.id),
      name: String(row.name || '').trim(),
      category: String(row.category || '').trim(),
      description: String(row.description || '').trim(),
      durationMinutes: Number(row.durationMinutes || 0),
      priceYen: Number(row.priceYen || 0),
      active: row.active !== false,
    })),
  }
}

async function validateLinks(prisma, organizationId, input) {
  const staffKey = text(input?.staffKey, 160, '担当スタイリスト') || null
  const rawMenuIds = Array.isArray(input?.menuIds) ? input.menuIds : []
  if (rawMenuIds.length > MAX_MENU_LINKS) throw new StyleSystemError(`メニューは${MAX_MENU_LINKS}件まで選択できます。`)
  const menuIds = [...new Set(rawMenuIds.map(value => text(value, 180, 'メニュー')).filter(Boolean))]

  if (staffKey) {
    const rows = await prisma.$queryRawUnsafe(
      'SELECT "staffKey" FROM "StaffBookingSetting" WHERE "organizationId"=$1 AND "staffKey"=$2 AND "active"=TRUE AND "onLeave"=FALSE LIMIT 1',
      organizationId,
      staffKey,
    )
    if (!rows.length) throw new StyleSystemError('選択したスタイリストは現在利用できません。', 409)
  }

  if (menuIds.length) {
    const rows = await prisma.$queryRawUnsafe(
      'SELECT "id" FROM "SalonMenu" WHERE "organizationId"=$1 AND "id"=ANY($2::text[]) AND "active"=TRUE',
      organizationId,
      menuIds,
    )
    const found = new Set(rows.map(row => String(row.id)))
    if (found.size !== menuIds.length) throw new StyleSystemError('選択したメニューに現在利用できないものがあります。', 409)
  }
  return { staffKey, menuIds }
}

async function syncPostStyle({ prisma, organizationId, postId, metadata = {}, links }) {
  const resolved = links && typeof links === 'object'
    ? await validateLinks(prisma, organizationId, links)
    : deriveAutoLinks(metadata, await loadReferenceOptions(prisma, organizationId))
  await prisma.$executeRawUnsafe(
    'UPDATE "VisitCommunityPost" SET "styleStaffKey"=$1,"styleMenuIds"=$2::text[],"styleLinksVersion"=1,"updatedAt"=NOW() WHERE "id"=$3 AND "organizationId"=$4 AND "postKind"=\'STORE\'',
    resolved.staffKey,
    resolved.menuIds,
    postId,
    organizationId,
  )
  return resolved
}

async function backfillStyleLinks(prisma) {
  await prisma.$executeRawUnsafe('UPDATE "VisitCommunityPost" SET "styleLinksVersion"=1 WHERE "postKind"<>\'STORE\' AND "styleLinksVersion"=0')
  const optionCache = new Map()
  while (true) {
    const posts = await prisma.$queryRawUnsafe(
      'SELECT "id","organizationId","styleMetadata" FROM "VisitCommunityPost" WHERE "postKind"=\'STORE\' AND "styleLinksVersion"=0 ORDER BY "createdAt" LIMIT 500',
    )
    if (!posts.length) break
    for (const post of posts) {
      if (!optionCache.has(post.organizationId)) {
        optionCache.set(post.organizationId, await loadReferenceOptions(prisma, post.organizationId))
      }
      const links = deriveAutoLinks(post.styleMetadata || {}, optionCache.get(post.organizationId))
      await prisma.$executeRawUnsafe(
        'UPDATE "VisitCommunityPost" SET "styleStaffKey"=$1,"styleMenuIds"=$2::text[],"styleLinksVersion"=1 WHERE "id"=$3 AND "organizationId"=$4 AND "styleLinksVersion"=0',
        links.staffKey,
        links.menuIds,
        post.id,
        post.organizationId,
      )
    }
  }
}

async function ensureStyleSchema(prisma) {
  if (!schemaPromises.has(prisma)) {
    schemaPromises.set(prisma, (async () => {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "VisitCommunityPost"
          ADD COLUMN IF NOT EXISTS "styleStaffKey" TEXT,
          ADD COLUMN IF NOT EXISTS "styleMenuIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
          ADD COLUMN IF NOT EXISTS "styleLinksVersion" SMALLINT NOT NULL DEFAULT 0
      `)
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "VisitCommunityPost_org_style_staff_v602" ON "VisitCommunityPost" ("organizationId","styleStaffKey") WHERE "styleStaffKey" IS NOT NULL')
      await backfillStyleLinks(prisma)
    })().catch(error => {
      schemaPromises.delete(prisma)
      throw error
    }))
  }
  return schemaPromises.get(prisma)
}

function safeSourceUrl(value) {
  const source = String(value || '').trim()
  return /^https:\/\/beauty\.hotpepper\.jp\/slnH\d{9}\/style\/L\d+\.html(?:[?#].*)?$/.test(source) ? source : null
}

async function resolvePrivateReference(reference) {
  const value = String(reference || '').trim()
  if (!value) return null
  if (!value.startsWith(PRIVATE_S3_PREFIX)) return /^(https?:\/\/|\/(?!\/))/.test(value) ? value : null
  const bucket = String(process.env.S3_PRIVATE_ASSETS_BUCKET || '').trim()
  const key = value.slice(PRIVATE_S3_PREFIX.length)
  if (!bucket || !key || key.includes('..')) return null
  if (!privateS3Client) privateS3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' })
  return getSignedUrl(privateS3Client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 300 })
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

async function resolveStyle(prisma, post, audience) {
  const metadata = post.styleMetadata && typeof post.styleMetadata === 'object' ? post.styleMetadata : {}
  const staffRows = post.styleStaffKey
    ? await prisma.$queryRawUnsafe(
        `SELECT s."staffKey" AS "key",s."staffName" AS "name",s."active",s."onLeave",
                p."roleLabel",p."specialties",p."introduction",p."profileImageKey",u."role" AS "accountRole"
           FROM "StaffBookingSetting" s
           LEFT JOIN "AppUser" u ON u."id"=s."userId" AND u."organizationId"=s."organizationId"
           LEFT JOIN "StaffProfileSetting" p ON p."userId"=s."userId" AND p."organizationId"=s."organizationId"
          WHERE s."organizationId"=$1 AND s."staffKey"=$2 LIMIT 1`,
        post.organizationId,
        post.styleStaffKey,
      )
    : []
  const staff = staffRows[0]
  const menuIds = Array.isArray(post.styleMenuIds) ? post.styleMenuIds.map(String).slice(0, MAX_MENU_LINKS) : []
  const menuRows = menuIds.length
    ? await prisma.$queryRawUnsafe(
        `SELECT "id","name","category","description","durationMinutes","priceYen","active"
           FROM "SalonMenu"
          WHERE "organizationId"=$1 AND "id"=ANY($2::text[])
          ORDER BY array_position($2::text[],"id")`,
        post.organizationId,
        menuIds,
      )
    : []
  const importedPortrait = await resolvePrivateReference(metadata.stylistPhotoReference)
  const role = staff
    ? String(staff.roleLabel || (staff.accountRole === 'ADMIN' ? 'オーナー・スタイリスト' : 'スタイリスト')).trim()
    : text(metadata.stylistRole, 160, '役職')
  const title = text(metadata.title, 160, 'スタイル名') || text(post.caption, 300, '投稿文') || 'サロンスタイル'
  const sourceUrl = safeSourceUrl(post.sourceUrl || metadata.sourceUrl)
  return {
    title,
    comment: text(metadata.stylistComment, 4000, 'スタイリストコメント'),
    stylist: {
      linked: Boolean(staff),
      key: staff ? String(staff.key) : null,
      name: staff ? String(staff.name || '').trim() : text(metadata.stylistName, 100, '担当スタイリスト') || text(post.publishedByName, 100, '投稿者') || '店舗スタッフ',
      kana: staff ? '' : text(metadata.stylistKana, 100, 'ふりがな'),
      role,
      specialties: staff ? String(staff.specialties || '').trim() : '',
      introduction: staff ? String(staff.introduction || '').trim() : '',
      avatarUrl: staff?.profileImageKey
        ? `/api/lien-staff-avatar?staffKey=${encodeURIComponent(staff.key)}&audience=${audience}`
        : importedPortrait,
      active: staff ? staff.active !== false && staff.onLeave !== true : null,
    },
    menus: menuRows.map(menu => ({
      id: String(menu.id),
      name: String(menu.name || '').trim(),
      category: String(menu.category || '').trim(),
      description: String(menu.description || '').trim(),
      durationMinutes: Number(menu.durationMinutes || 0),
      priceYen: Number(menu.priceYen || 0),
      active: menu.active !== false,
    })),
    sourceMenuText: text(metadata.menuDescription, 2000, '取込元メニュー'),
    source: sourceUrl ? {
      name: text(metadata.salonName, 160, '掲載元店舗'),
      area: text(metadata.salonArea, 240, '掲載元エリア'),
      url: sourceUrl,
    } : null,
  }
}

function publicOptions(options) {
  return {
    staff: options.staff.map(({ active, onLeave, ...staff }) => staff),
    menus: options.menus.map(({ active, ...menu }) => menu),
  }
}

function createStyleSystemIntegrationService({ prisma, staffSessionProvider, customerSessionProvider }) {
  async function sessionFor(req, audience) {
    if (audience === 'staff') return staffSessionProvider(req)
    if (audience === 'customer') return customerSessionProvider(req)
    return null
  }

  async function handleApi(req, res, url) {
    const audience = String(url.searchParams.get('audience') || '')
    if (!['staff', 'customer'].includes(audience)) throw new StyleSystemError('利用画面を確認できません。')
    const session = await sessionFor(req, audience)
    if (!session?.organizationId) throw new StyleSystemError('ログインし直してください。', 401)
    await ensureStyleSchema(prisma)

    if (req.method === 'GET' && url.searchParams.get('scope') === 'options') {
      if (audience !== 'staff') throw new StyleSystemError('店舗スタッフのみ利用できます。', 403)
      return json(res, 200, { options: publicOptions(await loadReferenceOptions(prisma, session.organizationId)) })
    }

    const postId = text(url.searchParams.get('postId'), 220, '投稿', true)
    const post = await loadPost(prisma, session.organizationId, postId)
    if (!post || post.postKind !== 'STORE' || (audience === 'customer' && !post.published)) {
      throw new StyleSystemError('スタイルが見つかりません。', 404)
    }

    if (req.method === 'GET') {
      const payload = {
        post: {
          id: String(post.id),
          postKind: String(post.postKind),
          style: await resolveStyle(prisma, post, audience),
        },
      }
      if (audience === 'staff') payload.options = publicOptions(await loadReferenceOptions(prisma, session.organizationId))
      return json(res, 200, payload)
    }

    if (req.method !== 'PATCH') {
      res.setHeader('Allow', 'GET, PATCH')
      throw new StyleSystemError('操作を確認してください。', 405)
    }
    if (audience !== 'staff') throw new StyleSystemError('店舗スタッフのみ編集できます。', 403)
    if (!sameOrigin(req)) throw new StyleSystemError('安全のため操作を完了できませんでした。', 403)

    const input = await readJson(req)
    const styleName = text(input.styleName, 160, 'スタイル名', true)
    const stylistComment = text(input.stylistComment, 4000, 'スタイリストコメント')
    const links = await validateLinks(prisma, session.organizationId, input)
    await prisma.$executeRawUnsafe(
      `UPDATE "VisitCommunityPost"
          SET "styleMetadata"=COALESCE("styleMetadata",'{}'::jsonb) || $1::jsonb,
              "styleStaffKey"=$2,"styleMenuIds"=$3::text[],"styleLinksVersion"=1,"updatedAt"=NOW()
        WHERE "id"=$4 AND "organizationId"=$5 AND "postKind"='STORE' AND "deletedAt" IS NULL`,
      JSON.stringify({ title: styleName, stylistComment }),
      links.staffKey,
      links.menuIds,
      post.id,
      session.organizationId,
    )
    const updated = await loadPost(prisma, session.organizationId, post.id)
    return json(res, 200, { success: true, style: await resolveStyle(prisma, updated, audience) })
  }

  async function handle(req, res, url) {
    if (url.pathname === '/style-system-integration-v602.js' && req.method === 'GET') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      fs.createReadStream(path.join('/app/public', 'style-system-integration-v602.js')).pipe(res)
      return true
    }
    if (url.pathname === '/style-system-integration-v602.css' && req.method === 'GET') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/css; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      fs.createReadStream(path.join('/app/public', 'style-system-integration-v602.css')).pipe(res)
      return true
    }
    if (url.pathname !== '/api/lien-style-system') return false
    try {
      await handleApi(req, res, url)
    } catch (error) {
      const status = Number(error?.status) || 500
      console.error(`[${RELEASE}]`, { path: url.pathname, status, name: String(error?.name || 'Error').slice(0, 80) })
      json(res, status, { error: status < 500 ? error.message : 'スタイル情報を読み込めませんでした。' })
    }
    return true
  }

  return { ensureSchema: () => ensureStyleSchema(prisma), handle }
}

module.exports = {
  StyleSystemError,
  createStyleSystemIntegrationService,
  deriveAutoLinks,
  ensureStyleSchema,
  identity,
  loadReferenceOptions,
  resolveStyle,
  syncPostStyle,
  validateLinks,
}
