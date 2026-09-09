'use strict'

const fs = require('node:fs')
const path = require('node:path')

const RELEASE = 'stamp-program-v603'
const API_PATH = '/api/lien-stamp-program'
const REWARD_TYPES = new Set([
  'PRODUCT_FREE',
  'MENU_FREE',
  'DISCOUNT_PERCENT',
  'DISCOUNT_FIXED',
  'CUSTOM',
])
const schemaPromises = new WeakMap()

class StampProgramError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'StampProgramError'
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
  const origin = String(req.headers.origin || '').trim()
  if (!origin) return false
  const allowed = new Set(['https://salon-de-lien.com', 'https://www.salon-de-lien.com'])
  for (const key of ['APP_URL', 'NEXT_PUBLIC_APP_URL', 'APP_BASE_URL', 'AUTH_BASE_URL', 'NEXTAUTH_URL']) {
    try {
      if (process.env[key]) allowed.add(new URL(process.env[key]).origin)
    } catch {}
  }
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  const protocol = String(req.headers['x-forwarded-proto'] || (host.includes('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https')).split(',')[0].trim()
  if (host) allowed.add(`${protocol}://${host}`)
  try {
    return allowed.has(new URL(origin).origin)
  } catch {
    return false
  }
}

async function readJson(req, limit = 24 * 1024) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw new StampProgramError('送信内容が大きすぎます。', 413)
    chunks.push(chunk)
  }
  try {
    const raw = Buffer.concat(chunks).toString('utf8')
    return raw ? JSON.parse(raw) : {}
  } catch {
    throw new StampProgramError('入力内容を確認してください。')
  }
}

function text(value, maxLength, label, required = false) {
  const result = String(value ?? '').replace(/\r\n/g, '\n').trim()
  if ((required && !result) || result.length > maxLength) {
    throw new StampProgramError(`${label}は${required ? `1〜${maxLength}` : `0〜${maxLength}`}文字で入力してください。`)
  }
  return result
}

function integer(value, min, max, label, required = true) {
  if (!required && (value === null || value === undefined || value === '')) return null
  const result = Number(value)
  if (!Number.isSafeInteger(result) || result < min || result > max) {
    throw new StampProgramError(`${label}は${min}〜${max}の整数で入力してください。`)
  }
  return result
}

async function ensureStampProgramSchema(prisma) {
  if (!schemaPromises.has(prisma)) {
    schemaPromises.set(prisma, (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "OrganizationStampProgram" (
          "organizationId" TEXT PRIMARY KEY REFERENCES "Organization"("id") ON DELETE CASCADE,
          "requiredVisits" INTEGER NOT NULL DEFAULT 10,
          "rewardType" TEXT NOT NULL DEFAULT 'CUSTOM',
          "rewardProductId" TEXT,
          "rewardMenuId" TEXT,
          "discountValue" INTEGER,
          "rewardTitle" TEXT NOT NULL DEFAULT '店舗で選べる来店特典',
          "rewardDescription" TEXT NOT NULL DEFAULT '達成後、店舗スタッフへお声がけください。',
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT "OrganizationStampProgram_requiredVisits_v603" CHECK ("requiredVisits" BETWEEN 1 AND 50),
          CONSTRAINT "OrganizationStampProgram_rewardType_v603" CHECK ("rewardType" IN ('PRODUCT_FREE','MENU_FREE','DISCOUNT_PERCENT','DISCOUNT_FIXED','CUSTOM')),
          CONSTRAINT "OrganizationStampProgram_discountValue_v603" CHECK ("discountValue" IS NULL OR "discountValue" BETWEEN 1 AND 10000000)
        )
      `)
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "OrganizationStampProgram_product_v603" ON "OrganizationStampProgram" ("organizationId","rewardProductId") WHERE "rewardProductId" IS NOT NULL')
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "OrganizationStampProgram_menu_v603" ON "OrganizationStampProgram" ("organizationId","rewardMenuId") WHERE "rewardMenuId" IS NOT NULL')
    })().catch(error => {
      schemaPromises.delete(prisma)
      throw error
    }))
  }
  return schemaPromises.get(prisma)
}

async function ensureProgram(prisma, organizationId) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO "OrganizationStampProgram" ("organizationId")
     SELECT "id" FROM "Organization" WHERE "id"=$1
     ON CONFLICT ("organizationId") DO NOTHING`,
    organizationId,
  )
}

async function loadProgram(prisma, organizationId) {
  await ensureProgram(prisma, organizationId)
  const rows = await prisma.$queryRawUnsafe(
    `SELECT "organizationId","requiredVisits","rewardType","rewardProductId","rewardMenuId",
            "discountValue","rewardTitle","rewardDescription","updatedAt"
       FROM "OrganizationStampProgram" WHERE "organizationId"=$1 LIMIT 1`,
    organizationId,
  )
  if (!rows[0]) throw new StampProgramError('店舗情報が見つかりません。', 404)
  const row = rows[0]
  return {
    organizationId:String(row.organizationId),
    requiredVisits:Number(row.requiredVisits),
    rewardType:String(row.rewardType),
    rewardProductId:row.rewardProductId ? String(row.rewardProductId) : null,
    rewardMenuId:row.rewardMenuId ? String(row.rewardMenuId) : null,
    discountValue:row.discountValue == null ? null : Number(row.discountValue),
    rewardTitle:String(row.rewardTitle || '').trim(),
    rewardDescription:String(row.rewardDescription || '').trim(),
    updatedAt:row.updatedAt || null,
  }
}

async function loadOptions(prisma, organizationId) {
  const [products, menus] = await Promise.all([
    prisma.$queryRawUnsafe(
      `SELECT "id","manufacturerName","name","category","retailPrice"
         FROM "Product"
        WHERE "organizationId"=$1 AND "active"=TRUE AND "salesSuspended"=FALSE
        ORDER BY "manufacturerName","name"`,
      organizationId,
    ),
    prisma.$queryRawUnsafe(
      `SELECT "id","name","category","durationMinutes","priceYen"
         FROM "SalonMenu"
        WHERE "organizationId"=$1 AND "active"=TRUE
        ORDER BY "sortOrder","name"`,
      organizationId,
    ),
  ])
  return {
    products:products.map(row => ({
      id:String(row.id),
      manufacturerName:String(row.manufacturerName || '').trim(),
      name:String(row.name || '').trim(),
      category:String(row.category || '').trim(),
      priceYen:Number(row.retailPrice || 0),
    })),
    menus:menus.map(row => ({
      id:String(row.id),
      name:String(row.name || '').trim(),
      category:String(row.category || '').trim(),
      durationMinutes:Number(row.durationMinutes || 0),
      priceYen:Number(row.priceYen || 0),
    })),
  }
}

function defaultTitle(type, selected, discountValue) {
  if (type === 'PRODUCT_FREE') return selected ? `${selected.name} 1点無料` : '店舗指定商品1点無料'
  if (type === 'MENU_FREE') return selected ? `${selected.name} 無料` : '店舗指定メニュー無料'
  if (type === 'DISCOUNT_PERCENT') return `${discountValue}%OFFクーポン`
  if (type === 'DISCOUNT_FIXED') return `${Number(discountValue || 0).toLocaleString('ja-JP')}円OFFクーポン`
  return '店舗で選べる来店特典'
}

function defaultDescription(type, selected) {
  if (type === 'PRODUCT_FREE') return selected ? `${selected.manufacturerName ? `${selected.manufacturerName} ` : ''}${selected.name}を次回来店時にお受け取りいただけます。` : '対象商品は店舗スタッフへご確認ください。'
  if (type === 'MENU_FREE') return selected ? `${selected.name}を次回来店時にご利用いただけます。` : '対象メニューは店舗スタッフへご確認ください。'
  if (type === 'DISCOUNT_PERCENT' || type === 'DISCOUNT_FIXED') return '達成後、次回来店時の会計でご利用いただけます。'
  return '達成後、店舗スタッフへお声がけください。'
}

async function selectedRewardTarget(prisma, organizationId, program, activeOnly = true) {
  if (program.rewardType === 'PRODUCT_FREE' && program.rewardProductId) {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT "id","manufacturerName","name","category","retailPrice"
         FROM "Product" WHERE "id"=$1 AND "organizationId"=$2 ${activeOnly ? 'AND "active"=TRUE AND "salesSuspended"=FALSE' : ''} LIMIT 1`,
      program.rewardProductId,
      organizationId,
    )
    return rows[0] ? {
      id:String(rows[0].id),
      manufacturerName:String(rows[0].manufacturerName || '').trim(),
      name:String(rows[0].name || '').trim(),
      category:String(rows[0].category || '').trim(),
      priceYen:Number(rows[0].retailPrice || 0),
    } : null
  }
  if (program.rewardType === 'MENU_FREE' && program.rewardMenuId) {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT "id","name","category","durationMinutes","priceYen"
         FROM "SalonMenu" WHERE "id"=$1 AND "organizationId"=$2 ${activeOnly ? 'AND "active"=TRUE' : ''} LIMIT 1`,
      program.rewardMenuId,
      organizationId,
    )
    return rows[0] ? {
      id:String(rows[0].id),
      name:String(rows[0].name || '').trim(),
      category:String(rows[0].category || '').trim(),
      durationMinutes:Number(rows[0].durationMinutes || 0),
      priceYen:Number(rows[0].priceYen || 0),
    } : null
  }
  return null
}

async function rewardProjection(prisma, organizationId, program) {
  const selected = await selectedRewardTarget(prisma, organizationId, program)
  const title = program.rewardTitle || defaultTitle(program.rewardType, selected, program.discountValue)
  const description = program.rewardDescription || defaultDescription(program.rewardType, selected)
  const labels = {
    PRODUCT_FREE:'商品無料特典',
    MENU_FREE:'メニュー無料特典',
    DISCOUNT_PERCENT:'割引クーポン',
    DISCOUNT_FIXED:'割引クーポン',
    CUSTOM:'来店特典',
  }
  return {
    type:program.rewardType,
    typeLabel:labels[program.rewardType] || labels.CUSTOM,
    title,
    description,
    discountValue:program.discountValue,
    target:selected ? {
      name:selected.name,
      manufacturerName:selected.manufacturerName || '',
      category:selected.category || '',
      priceYen:selected.priceYen || 0,
      durationMinutes:selected.durationMinutes || 0,
    } : null,
  }
}

async function saveProgram(prisma, organizationId, input) {
  const requiredVisits = integer(input.requiredVisits, 1, 50, '特典までの来店回数')
  const rewardType = text(input.rewardType, 40, '特典種別', true)
  if (!REWARD_TYPES.has(rewardType)) throw new StampProgramError('特典種別を選択してください。')

  let rewardProductId = null
  let rewardMenuId = null
  let discountValue = null
  let selected = null
  if (rewardType === 'PRODUCT_FREE') {
    rewardProductId = text(input.rewardProductId, 180, '特典商品', true)
    selected = await selectedRewardTarget(prisma, organizationId, { rewardType, rewardProductId }, true)
    if (!selected) throw new StampProgramError('選択した商品は現在利用できません。', 409)
  } else if (rewardType === 'MENU_FREE') {
    rewardMenuId = text(input.rewardMenuId, 180, '特典メニュー', true)
    selected = await selectedRewardTarget(prisma, organizationId, { rewardType, rewardMenuId }, true)
    if (!selected) throw new StampProgramError('選択したメニューは現在利用できません。', 409)
  } else if (rewardType === 'DISCOUNT_PERCENT') {
    discountValue = integer(input.discountValue, 1, 90, '割引率')
  } else if (rewardType === 'DISCOUNT_FIXED') {
    discountValue = integer(input.discountValue, 1, 10000000, '割引額')
  }

  const suppliedTitle = text(input.rewardTitle, 120, '特典名')
  if (rewardType === 'CUSTOM' && !suppliedTitle) throw new StampProgramError('任意特典の特典名を入力してください。')
  const rewardTitle = suppliedTitle
  const rewardDescription = text(input.rewardDescription, 320, '特典の説明')

  await prisma.$executeRawUnsafe(
    `INSERT INTO "OrganizationStampProgram"
      ("organizationId","requiredVisits","rewardType","rewardProductId","rewardMenuId","discountValue","rewardTitle","rewardDescription")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT ("organizationId") DO UPDATE SET
       "requiredVisits"=EXCLUDED."requiredVisits","rewardType"=EXCLUDED."rewardType",
       "rewardProductId"=EXCLUDED."rewardProductId","rewardMenuId"=EXCLUDED."rewardMenuId",
       "discountValue"=EXCLUDED."discountValue","rewardTitle"=EXCLUDED."rewardTitle",
       "rewardDescription"=EXCLUDED."rewardDescription","updatedAt"=NOW()`,
    organizationId,
    requiredVisits,
    rewardType,
    rewardProductId,
    rewardMenuId,
    discountValue,
    rewardTitle,
    rewardDescription,
  )
  return loadProgram(prisma, organizationId)
}

function createStampProgramService({ prisma, staffSessionProvider }) {
  async function adminPayload(session) {
    await ensureStampProgramSchema(prisma)
    const organizations = await prisma.$queryRawUnsafe('SELECT "id","name" FROM "Organization" WHERE "id"=$1 LIMIT 1', session.organizationId)
    if (!organizations[0]) throw new StampProgramError('店舗情報が見つかりません。', 404)
    const [program, options] = await Promise.all([
      loadProgram(prisma, session.organizationId),
      loadOptions(prisma, session.organizationId),
    ])
    return { organization:{ id:String(organizations[0].id), name:String(organizations[0].name || '').trim() }, program, options }
  }

  async function customerCard(session) {
    if (!session?.organizationId || !session?.customerId) throw new StampProgramError('ログインし直してください。', 401)
    await ensureStampProgramSchema(prisma)
    const [organizations, program, totals] = await Promise.all([
      prisma.$queryRawUnsafe(
        `SELECT o."id",o."name" FROM "Organization" o
          JOIN "Customer" c ON c."organizationId"=o."id" AND c."id"=$2 AND c."deletedAt" IS NULL
         WHERE o."id"=$1 LIMIT 1`,
        session.organizationId,
        session.customerId,
      ),
      loadProgram(prisma, session.organizationId),
      prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS "total"
           FROM "Visit" v
           JOIN "Customer" c ON c."id"=v."customerId"
          WHERE c."id"=$1 AND c."organizationId"=$2 AND c."deletedAt" IS NULL`,
        session.customerId,
        session.organizationId,
      ),
    ])
    if (!organizations[0]) throw new StampProgramError('店舗情報が見つかりません。', 404)
    const totalVisits = Number(totals[0]?.total || 0)
    const remainder = totalVisits % program.requiredVisits
    const completedAtCurrentVisit = totalVisits > 0 && remainder === 0
    const currentStamps = completedAtCurrentVisit ? program.requiredVisits : remainder
    const completedCards = Math.floor(totalVisits / program.requiredVisits)
    return {
      organization:{ id:String(organizations[0].id), name:String(organizations[0].name || '').trim() },
      requiredVisits:program.requiredVisits,
      totalVisits,
      currentStamps,
      remainingVisits:completedAtCurrentVisit ? 0 : program.requiredVisits - currentStamps,
      completedCards,
      reward:await rewardProjection(prisma, session.organizationId, program),
    }
  }

  async function handleApi(req, res) {
    const session = await staffSessionProvider(req)
    if (!session?.organizationId) throw new StampProgramError('ログインし直してください。', 401)
    if (session.role !== 'ADMIN') throw new StampProgramError('スタンプカード設定はオーナーのみ変更できます。', 403)
    if (req.method === 'GET') return json(res, 200, await adminPayload(session))
    if (req.method !== 'PATCH') {
      res.setHeader('Allow', 'GET, PATCH')
      throw new StampProgramError('操作を確認してください。', 405)
    }
    if (!sameOrigin(req)) throw new StampProgramError('安全のため操作を完了できませんでした。', 403)
    const program = await saveProgram(prisma, session.organizationId, await readJson(req))
    return json(res, 200, { success:true, ...(await adminPayload(session)), program })
  }

  async function handle(req, res, url) {
    if (url.pathname === '/stamp-program-v603.js' && req.method === 'GET') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      fs.createReadStream(path.join('/app/public', 'stamp-program-v603.js')).pipe(res)
      return true
    }
    if (url.pathname === '/stamp-program-v603.css' && req.method === 'GET') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/css; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      fs.createReadStream(path.join('/app/public', 'stamp-program-v603.css')).pipe(res)
      return true
    }
    if (url.pathname !== API_PATH) return false
    try {
      await handleApi(req, res)
    } catch (error) {
      const status = Number(error?.status) || 500
      console.error(`[${RELEASE}]`, { path:url.pathname, status, name:String(error?.name || 'Error').slice(0, 80) })
      json(res, status, { error:status < 500 ? error.message : 'スタンプカード設定を読み込めませんでした。' })
    }
    return true
  }

  return {
    adminPayload,
    customerCard,
    ensureSchema:() => ensureStampProgramSchema(prisma),
    handle,
  }
}

module.exports = {
  REWARD_TYPES,
  StampProgramError,
  createStampProgramService,
  defaultDescription,
  defaultTitle,
  ensureStampProgramSchema,
  loadOptions,
  loadProgram,
  rewardProjection,
  saveProgram,
}
