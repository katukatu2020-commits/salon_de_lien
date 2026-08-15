'use strict'

const SESSION_COOKIE = 'lien_admin_session'
const ALLOWED_PRODUCT_CATEGORIES = ['シャンプー', 'トリートメント', 'スタイリング剤', 'アウトバス', 'その他']
const ALLOWED_CAMPAIGN_TAGS = ['夏季商戦', '年末商戦', '春季商戦']

class CatalogError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'CatalogError'
    this.status = status
  }
}

function safeEqual(crypto, left, right) {
  const a = Buffer.from(String(left || ''))
  const b = Buffer.from(String(right || ''))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function parseCookies(req) {
  return String(req.headers.cookie || '').split(';').reduce(function (result, part) {
    const index = part.indexOf('=')
    if (index < 1) return result
    const key = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    try { result[key] = decodeURIComponent(value) } catch { result[key] = value }
    return result
  }, {})
}

function sessionFromRequest(req, crypto, secret) {
  const token = parseCookies(req)[SESSION_COOKIE]
  if (!token || !secret || secret.length < 32) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const expected = crypto.createHmac('sha256', secret).update(parts[0]).digest('base64url')
  if (!safeEqual(crypto, parts[1], expected)) return null
  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
    if (payload.version !== 2 || !['ADMIN', 'STAFF'].includes(payload.role)) return null
    if (!payload.organizationId || !payload.subject || Number(payload.expiresAt) <= Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

function validSameOrigin(req) {
  const origin = String(req.headers.origin || '').trim()
  if (!origin) return false
  const allowed = new Set()
  try { allowed.add(new URL(process.env.APP_URL || 'https://salon-de-lien.com').origin) } catch {}
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()
  if (host) allowed.add(protocol + '://' + host)
  return allowed.has(origin)
}

async function readBody(req, maxBytes = 65536) {
  let body = ''
  for await (const chunk of req) {
    body += chunk
    if (Buffer.byteLength(body, 'utf8') > maxBytes) throw new CatalogError('入力内容が大きすぎます。', 413)
  }
  return body
}

function json(res, status, payload) {
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(body)
}

function text(form, name, label, maxLength, required = true) {
  const value = String(form.get(name) || '').replace(/\s+/g, ' ').trim()
  if (required && !value) throw new CatalogError(label + 'を入力してください。')
  if (value.length > maxLength) throw new CatalogError(label + 'は' + maxLength + '文字以内で入力してください。')
  return value || null
}

function integer(form, name, label, min, max) {
  const raw = String(form.get(name) || '').trim()
  const value = Number(raw)
  if (!raw || !Number.isSafeInteger(value) || value < min || value > max) {
    throw new CatalogError(label + 'を正しく入力してください。')
  }
  return value
}

function productTags(form) {
  const values = form.getAll('concernTags').flatMap(function (value) {
    return String(value || '').split(/[、,，]/)
  }).map(function (value) {
    return value.replace(/\s+/g, ' ').trim()
  }).filter(Boolean)
  const unique = [...new Set(values)]
  if (unique.some(function (value) { return value.length > 30 })) throw new CatalogError('悩み・効果タグは1つ30文字以内で入力してください。')
  if (unique.length > 16) throw new CatalogError('悩み・効果タグは16個以内で入力してください。')
  return unique
}

function checked(form, name) {
  return ['1', 'true', 'on', 'yes'].includes(String(form.get(name) || '').trim().toLowerCase())
}

function campaignTags(form) {
  return [...new Set(form.getAll('campaignTags').map(function (value) {
    return String(value || '').trim()
  }).filter(function (value) {
    return ALLOWED_CAMPAIGN_TAGS.includes(value)
  }))]
}

function normalizedTags(value) {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[、,，]/) : []
  return [...new Set(values.map(function (tag) {
    return String(tag || '').replace(/\s+/g, ' ').trim()
  }).filter(Boolean))]
}

function createCatalogOperationsService({ prisma, crypto }) {
  async function ensureSchema() {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "SalonMenu" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "description" TEXT,
      "durationMinutes" INTEGER NOT NULL,
      "priceYen" INTEGER NOT NULL,
      "source" TEXT NOT NULL DEFAULT 'manual',
      "sourceKey" TEXT,
      "active" BOOLEAN NOT NULL DEFAULT TRUE,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE("organizationId", "name")
    )`)
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "SalonMenu_org_active_idx" ON "SalonMenu"("organizationId", "active", "sortOrder")')
  }

  async function createMenu(form, session) {
    const name = text(form, 'menuName', 'メニュー名', 140)
    const category = text(form, 'menuCategory', 'カテゴリ', 80)
    const description = text(form, 'menuDescription', '説明', 1200, false)
    const durationMinutes = integer(form, 'menuDuration', '施術時間', 1, 1440)
    const priceYen = integer(form, 'menuPrice', '税込価格', 0, 10000000)
    const existing = await prisma.$queryRawUnsafe(
      'SELECT "id" FROM "SalonMenu" WHERE "organizationId"=$1 AND LOWER("name")=LOWER($2) LIMIT 1',
      session.organizationId,
      name,
    )
    if (existing.length) throw new CatalogError('同じ名前のメニューがすでに登録されています。', 409)
    const id = 'menu-manual-' + crypto.randomUUID()
    await prisma.$executeRawUnsafe(
      `INSERT INTO "SalonMenu" ("id","organizationId","name","category","description","durationMinutes","priceYen","source","sortOrder")
       VALUES ($1,$2,$3,$4,$5,$6,$7,'manual',COALESCE((SELECT MAX("sortOrder") + 1 FROM "SalonMenu" WHERE "organizationId"=$2),0))`,
      id,
      session.organizationId,
      name,
      category,
      description,
      durationMinutes,
      priceYen,
    )
    return { id, name, category, durationMinutes, priceYen, created: true }
  }

  async function listMenus(session) {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT "id","name","category","description","durationMinutes","priceYen","source","active","sortOrder","updatedAt"
       FROM "SalonMenu"
       WHERE "organizationId"=$1 AND ($2::boolean OR "source"<>'kanzashi')
       ORDER BY "active" DESC,"sortOrder","name"`,
      session.organizationId,
      session.organizationId === 'org_salon_de_lien',
    )
    return rows.map(function (row) {
      return {
        id: row.id,
        name: row.name,
        category: row.category,
        description: row.description || '',
        durationMinutes: Number(row.durationMinutes),
        priceYen: Number(row.priceYen),
        active: Boolean(row.active),
        sortOrder: Number(row.sortOrder || 0),
        updatedAt: row.updatedAt || null,
      }
    })
  }

  async function menuOwnedBySession(form, session) {
    const id = text(form, 'menuId', 'メニュー', 180)
    const rows = await prisma.$queryRawUnsafe(
      'SELECT "id","name","active" FROM "SalonMenu" WHERE "id"=$1 AND "organizationId"=$2 LIMIT 1',
      id,
      session.organizationId,
    )
    if (!rows[0]) throw new CatalogError('対象のメニューが見つかりません。', 404)
    return rows[0]
  }

  async function updateMenu(form, session) {
    const current = await menuOwnedBySession(form, session)
    const name = text(form, 'menuName', 'メニュー名', 140)
    const category = text(form, 'menuCategory', 'カテゴリ', 80)
    const description = text(form, 'menuDescription', '説明', 1200, false)
    const durationMinutes = integer(form, 'menuDuration', '施術時間', 1, 1440)
    const priceYen = integer(form, 'menuPrice', '税込価格', 0, 10000000)
    const active = checked(form, 'active')
    const duplicate = await prisma.$queryRawUnsafe(
      'SELECT "id" FROM "SalonMenu" WHERE "organizationId"=$1 AND LOWER("name")=LOWER($2) AND "id"<>$3 LIMIT 1',
      session.organizationId,
      name,
      current.id,
    )
    if (duplicate.length) throw new CatalogError('同じ名前のメニューがすでに登録されています。', 409)
    const changed = await prisma.$executeRawUnsafe(
      `UPDATE "SalonMenu"
       SET "name"=$3,"category"=$4,"description"=$5,"durationMinutes"=$6,"priceYen"=$7,"active"=$8,"updatedAt"=NOW()
       WHERE "id"=$1 AND "organizationId"=$2`,
      current.id,
      session.organizationId,
      name,
      category,
      description,
      durationMinutes,
      priceYen,
      active,
    )
    if (Number(changed) !== 1) throw new CatalogError('メニューを更新できませんでした。', 409)
    return { id: current.id, name, category, durationMinutes, priceYen, active, updated: true }
  }

  async function setMenuActive(form, session) {
    const current = await menuOwnedBySession(form, session)
    const raw = String(form.get('active') || '').trim().toLowerCase()
    if (!['true', 'false'].includes(raw)) throw new CatalogError('公開状態を確認してください。')
    const active = raw === 'true'
    const changed = await prisma.$executeRawUnsafe(
      'UPDATE "SalonMenu" SET "active"=$3,"updatedAt"=NOW() WHERE "id"=$1 AND "organizationId"=$2',
      current.id,
      session.organizationId,
      active,
    )
    if (Number(changed) !== 1) throw new CatalogError('公開状態を更新できませんでした。', 409)
    return { id: current.id, name: current.name, active, updated: true }
  }

  async function deleteMenu(form, session) {
    if (session.role !== 'ADMIN') throw new CatalogError('メニューを削除できるのはオーナー権限のアカウントだけです。', 403)
    const current = await menuOwnedBySession(form, session)
    const changed = await prisma.$executeRawUnsafe(
      'DELETE FROM "SalonMenu" WHERE "id"=$1 AND "organizationId"=$2',
      current.id,
      session.organizationId,
    )
    if (Number(changed) !== 1) throw new CatalogError('メニューを削除できませんでした。もう一度お試しください。', 409)
    return { id: current.id, name: current.name, deleted: true }
  }

  async function createProduct(form, session) {
    const manufacturerName = text(form, 'manufacturerName', 'メーカー名', 80)
    const name = text(form, 'name', '商品名', 140)
    const category = text(form, 'category', 'カテゴリ', 60)
    if (!ALLOWED_PRODUCT_CATEGORIES.includes(category)) throw new CatalogError('カテゴリを選択してください。')
    const retailPrice = integer(form, 'retailPrice', '店頭価格', 1, 10000000)
    const stockQuantity = integer(form, 'stockQuantity', '在庫数', 0, 100000)
    const description = text(form, 'description', '商品説明', 1200, false)
    const alternativeRecommendation = text(form, 'alternativeRecommendation', '代替提案', 180, false)
    const concernTags = productTags(form)
    const existing = await prisma.product.findFirst({
      where: {
        organizationId: session.organizationId,
        manufacturerName: { equals: manufacturerName, mode: 'insensitive' },
        name: { equals: name, mode: 'insensitive' },
      },
      select: { id: true, active: true },
    })
    const data = { manufacturerName, name, category, retailPrice, stockQuantity, concernTags, description, alternativeRecommendation, active: true }
    if (existing && existing.active) throw new CatalogError('同じメーカー・商品名の商品がすでに登録されています。', 409)
    if (existing) {
      const product = await prisma.product.update({ where: { id: existing.id }, data, select: { id: true } })
      return { id: product.id, name, reactivated: true, created: false }
    }
    const product = await prisma.product.create({
      data: { ...data, organizationId: session.organizationId },
      select: { id: true },
    })
    return { id: product.id, name, reactivated: false, created: true }
  }

  async function productOwnedBySession(form, session) {
    const id = text(form, 'productId', '商品', 180)
    const product = await prisma.product.findFirst({
      where: { id, organizationId: session.organizationId, active: true },
      select: {
        id: true,
        name: true,
        manufacturerName: true,
        salesSuspended: true,
        campaignTags: true,
        _count: { select: { proposals: true } },
      },
    })
    if (!product) throw new CatalogError('対象の商品が見つかりません。', 404)
    return product
  }

  async function updateProduct(form, session) {
    const current = await productOwnedBySession(form, session)
    const manufacturerName = text(form, 'manufacturerName', 'メーカー名', 80)
    const name = text(form, 'name', '商品名', 140)
    const category = text(form, 'category', 'カテゴリ', 60)
    if (!ALLOWED_PRODUCT_CATEGORIES.includes(category)) throw new CatalogError('カテゴリを選択してください。')
    const retailPrice = integer(form, 'retailPrice', '店頭価格', 1, 10000000)
    const stockQuantity = integer(form, 'stockQuantity', '在庫数', 0, 100000)
    const description = text(form, 'description', '商品説明', 1200, false)
    const alternativeRecommendation = text(form, 'alternativeRecommendation', '代替提案', 180, false)
    const concernTags = productTags(form)
    const duplicate = await prisma.product.findFirst({
      where: {
        id: { not: current.id },
        organizationId: session.organizationId,
        manufacturerName: { equals: manufacturerName, mode: 'insensitive' },
        name: { equals: name, mode: 'insensitive' },
        active: true,
      },
      select: { id: true },
    })
    if (duplicate) throw new CatalogError('同じメーカー・商品名の商品がすでに登録されています。', 409)
    const data = {
      manufacturerName,
      name,
      category,
      retailPrice,
      stockQuantity,
      description,
      alternativeRecommendation,
      concernTags,
    }
    if (session.role === 'ADMIN') {
      data.salesSuspended = checked(form, 'salesSuspended')
      data.campaignTags = campaignTags(form)
    }
    const changed = await prisma.product.updateMany({
      where: { id: current.id, organizationId: session.organizationId, active: true },
      data,
    })
    if (Number(changed.count) !== 1) throw new CatalogError('商品を更新できませんでした。', 409)
    return {
      id: current.id,
      name,
      updated: true,
      salesSuspended: session.role === 'ADMIN' ? data.salesSuspended : Boolean(current.salesSuspended),
      campaignTags: session.role === 'ADMIN' ? data.campaignTags : current.campaignTags,
    }
  }

  async function deleteProduct(form, session) {
    if (session.role !== 'ADMIN') throw new CatalogError('商品を削除できるのはオーナー権限のアカウントだけです。', 403)
    const current = await productOwnedBySession(form, session)
    const outcome = await prisma.$transaction(async function (transaction) {
      const owned = await transaction.product.findFirst({
        where: { id: current.id, organizationId: session.organizationId, active: true },
        select: { id: true, _count: { select: { proposals: true } } },
      })
      if (!owned) return 'missing'
      if (owned._count.proposals > 0) {
        await transaction.product.update({ where: { id: owned.id }, data: { active: false } })
        return 'archived'
      }
      await transaction.product.delete({ where: { id: owned.id } })
      return 'deleted'
    })
    if (outcome === 'missing') throw new CatalogError('対象の商品が見つかりません。', 404)
    return { id: current.id, name: current.name, deleted: true, archived: outcome === 'archived' }
  }

  async function listProductAlternatives(productId, session) {
    const id = String(productId || '').trim()
    if (!id || id.length > 180) throw new CatalogError('代替候補を調べる商品を確認してください。')
    const source = await prisma.product.findFirst({
      where: { id, organizationId: session.organizationId, active: true },
      select: { id: true, name: true, category: true, concernTags: true },
    })
    if (!source) throw new CatalogError('対象の商品が見つかりません。', 404)
    if (!source.category) return { source: { id: source.id, name: source.name, category: null }, alternatives: [] }
    const candidates = await prisma.product.findMany({
      where: {
        organizationId: session.organizationId,
        active: true,
        salesSuspended: false,
        category: source.category,
        id: { not: source.id },
      },
      select: { id: true, name: true, manufacturerName: true, category: true, concernTags: true, stockQuantity: true },
    })
    const sourceTags = normalizedTags(source.concernTags)
    const sourceKeys = new Map(sourceTags.map(tag => [tag.toLocaleLowerCase('ja-JP'), tag]))
    const alternatives = candidates.map(function (candidate) {
      const candidateTags = normalizedTags(candidate.concernTags)
      const sharedTags = candidateTags.filter(tag => sourceKeys.has(tag.toLocaleLowerCase('ja-JP')))
      const union = new Set([...sourceTags, ...candidateTags].map(tag => tag.toLocaleLowerCase('ja-JP')))
      return {
        id: candidate.id,
        name: candidate.name,
        manufacturerName: candidate.manufacturerName,
        category: candidate.category,
        stockQuantity: Number(candidate.stockQuantity || 0),
        sharedTags,
        similarity: union.size ? Math.round(sharedTags.length / union.size * 100) : 0,
      }
    }).filter(candidate => candidate.sharedTags.length > 0)
      .sort(function (left, right) {
        return right.sharedTags.length - left.sharedTags.length
          || right.similarity - left.similarity
          || right.stockQuantity - left.stockQuantity
          || left.name.localeCompare(right.name, 'ja')
      }).slice(0, 5)
    return { source: { id: source.id, name: source.name, category: source.category, tags: sourceTags }, alternatives }
  }

  async function handle(req, res, url) {
    const updateRoute = url.pathname.match(/^\/api\/admin\/catalog\/update\/(product|menu)\/([^/]+)$/)
    if (url.pathname !== '/api/admin/catalog' && !updateRoute) return false
    const session = sessionFromRequest(req, crypto, String(process.env.ADMIN_AUTH_SECRET || ''))
    if (!session) {
      json(res, 401, { ok: false, error: 'ログインし直してください。' })
      return true
    }
    if (req.method === 'GET') {
      const kind = url.searchParams.get('kind')
      if (!['menus', 'product-alternatives'].includes(kind)) {
        json(res, 400, { ok: false, error: '取得する種類を確認してください。' })
        return true
      }
      try {
        if (kind === 'product-alternatives') {
          const result = await listProductAlternatives(url.searchParams.get('productId'), session)
          json(res, 200, { ok: true, kind, role: session.role, ...result })
        } else {
          const menus = await listMenus(session)
          json(res, 200, { ok: true, kind: 'menus', role: session.role, menus })
        }
      } catch (error) {
        const status = error instanceof CatalogError ? error.status : 500
        if (status === 500) console.error('[catalog-list] failed', { organizationId: session.organizationId, kind, error: error && error.message })
        json(res, status, { ok: false, error: status === 500 ? '情報を取得できませんでした。時間をおいて再度お試しください。' : error.message })
      }
      return true
    }
    if (req.method !== 'POST') {
      res.statusCode = 405
      res.setHeader('Allow', 'GET, POST')
      res.end()
      return true
    }
    if (!validSameOrigin(req)) {
      json(res, 403, { ok: false, error: '安全性を確認できないため登録できませんでした。' })
      return true
    }
    try {
      const contentType = String(req.headers['content-type'] || '')
      if (!contentType.includes('application/x-www-form-urlencoded')) throw new CatalogError('送信形式を確認してください。', 415)
      const form = new URLSearchParams(await readBody(req))
      const forcedKind = updateRoute ? updateRoute[1] : null
      const forcedId = updateRoute ? decodeURIComponent(updateRoute[2]) : null
      if (forcedId) form.set(forcedKind === 'product' ? 'productId' : 'menuId', forcedId)
      const kind = String(forcedKind || url.searchParams.get('kind') || form.get('kind') || '')
      const requestedAction = String(updateRoute ? 'update' : url.searchParams.get('action') || form.get('action') || 'create')
      for (const idName of ['productId', 'menuId']) {
        if (!form.get(idName) && url.searchParams.get(idName)) form.set(idName, url.searchParams.get(idName))
      }
      // An edit form always carries its tenant-scoped record id.  Treat that
      // id as authoritative even if a stale client omits the action field, so
      // an edit can never fall through to product/menu creation.
      const action = kind === 'product' && form.get('productId') && requestedAction !== 'delete'
        ? 'update'
        : kind === 'menu' && form.get('menuId') && !['delete', 'set-active'].includes(requestedAction)
          ? 'update'
          : requestedAction
      const result = kind === 'menu' && action === 'delete'
        ? await deleteMenu(form, session)
        : kind === 'menu' && action === 'update'
          ? await updateMenu(form, session)
          : kind === 'menu' && action === 'set-active'
            ? await setMenuActive(form, session)
            : kind === 'menu'
              ? await createMenu(form, session)
              : kind === 'product' && action === 'delete'
                ? await deleteProduct(form, session)
                : kind === 'product' && action === 'update'
                  ? await updateProduct(form, session)
                  : kind === 'product'
                    ? await createProduct(form, session)
                    : (() => { throw new CatalogError('登録する種類を確認してください。') })()
      json(res, result.created ? 201 : 200, { ok: true, kind, result })
    } catch (error) {
      const duplicate = error && (error.code === 'P2002' || error.code === '23505')
      const status = duplicate ? 409 : error instanceof CatalogError ? error.status : 500
      if (status === 500) {
        console.error('[catalog-registration] failed', {
          organizationId: session.organizationId,
          error: error && error.message,
        })
      }
      json(res, status, {
        ok: false,
        error: duplicate ? '同じ名前の登録がすでに存在します。' : status === 500 ? '登録できませんでした。時間をおいて再度お試しください。' : error.message,
      })
    }
    return true
  }

  return { ensureSchema, handle, createMenu, listMenus, updateMenu, setMenuActive, deleteMenu, createProduct, updateProduct, deleteProduct, listProductAlternatives, sessionFromRequest: req => sessionFromRequest(req, crypto, String(process.env.ADMIN_AUTH_SECRET || '')) }
}

module.exports = { createCatalogOperationsService, CatalogError, SESSION_COOKIE, ALLOWED_PRODUCT_CATEGORIES, ALLOWED_CAMPAIGN_TAGS }
