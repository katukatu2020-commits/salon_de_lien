'use strict'
const { sameOrigin } = require('./hotpepper-origin-v600')
const endpoint = '/api/customer/product-favorites'
const columns = 'p."id",p."manufacturerName",p."name",p."category",p."retailPrice",p."concernTags",p."description",p."alternativeRecommendation",p."imageUrl"'
function createCustomerFavoritesService({ prisma, sessionProvider }) {
  let schema
  function ensureSchema() {
    if (!schema) schema = prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CustomerProductFavoriteV601" (
      "organizationId" TEXT NOT NULL, "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,
      "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("organizationId","customerId","productId"))`).catch(error => { schema = null; throw error })
    return schema
  }
  async function listProducts(session) {
    await ensureSchema()
    return prisma.$queryRawUnsafe(`SELECT ${columns} FROM "CustomerProductFavoriteV601" f JOIN "Product" p ON p."id"=f."productId" AND p."organizationId"=f."organizationId" WHERE f."organizationId"=$1 AND f."customerId"=$2 AND p."active"=true AND p."salesSuspended"=false ORDER BY f."createdAt" DESC,p."id"`, session.organizationId, session.customerId)
  }
  async function findProduct(session, id) {
    const rows = await prisma.$queryRawUnsafe(`SELECT ${columns} FROM "Product" p WHERE p."organizationId"=$1 AND p."id"=$2 AND p."active"=true AND p."salesSuspended"=false`, session.organizationId, id)
    return rows[0]
  }
  async function setFavorite(session, productId, favorite) {
    if (typeof productId !== 'string' || !productId || productId.length > 160 || typeof favorite !== 'boolean') throw Object.assign(new Error('商品と操作内容を確認してください。'), { status:400 })
    await ensureSchema()
    return prisma.$transaction(async tx => {
      const rows = await tx.$queryRawUnsafe('SELECT "active","salesSuspended" FROM "Product" WHERE "id"=$1 AND "organizationId"=$2', productId, session.organizationId)
      if (!rows[0] || favorite && (!rows[0].active || rows[0].salesSuspended)) throw Object.assign(new Error('この商品は現在利用できません。'), { status:404 })
      if (favorite) await tx.$executeRawUnsafe('INSERT INTO "CustomerProductFavoriteV601" ("organizationId","customerId","productId") VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', session.organizationId, session.customerId, productId)
      else await tx.$executeRawUnsafe('DELETE FROM "CustomerProductFavoriteV601" WHERE "organizationId"=$1 AND "customerId"=$2 AND "productId"=$3', session.organizationId, session.customerId, productId)
      return { productId, favorite }
    })
  }
  const json = (res, status, payload) => { res.statusCode = status; res.setHeader('Content-Type','application/json; charset=utf-8'); res.setHeader('Cache-Control','private, no-store'); res.setHeader('X-Content-Type-Options','nosniff'); res.end(JSON.stringify(payload)) }
  async function handle(req, res, url) {
    if (url.pathname !== endpoint) return false
    const session = await sessionProvider(req)
    if (!session) { json(res,401,{error:'ログインしてください。'}); return true }
    try {
      if (req.method === 'GET') { json(res,200,{productIds:(await listProducts(session)).map(p=>p.id)}); return true }
      if (req.method !== 'PUT') { res.setHeader('Allow','GET, PUT'); json(res,405,{error:'対応していない操作です。'}); return true }
      if (!sameOrigin(req)) { json(res,403,{error:'操作元を確認できませんでした。'}); return true }
      const chunks = []; let length = 0
      for await (const chunk of req) { length += chunk.length; if (length > 4096) { json(res,413,{error:'送信内容が大きすぎます。'}); return true } chunks.push(chunk) }
      let input
      try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { json(res,400,{error:'送信内容を確認してください。'}); return true }
      json(res,200,await setFavorite(session,input?.productId,input?.favorite))
    } catch (error) { json(res,error.status || 500,{error:error.status ? error.message : '保存できませんでした。もう一度お試しください。'}) }
    return true
  }
  return { ensureSchema, listProducts, findProduct, setFavorite, handle }
}
module.exports = { createCustomerFavoritesService }
