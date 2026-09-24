import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import path from 'node:path'
import { Readable } from 'node:stream'
import { createRequire } from 'node:module'

const runtimeRoot = process.env.LIEN_RUNTIME_ROOT || '/app'
const require = createRequire(import.meta.url)
const { createWholesaleOrderingService } = require(path.join(runtimeRoot, 'wholesale-ordering-v543.js'))

process.env.DEALER_AUTH_SECRET = 'v659-service-regression-secret-0123456789-abcdef'

const queried = []
const product = {
  id: 'product-ordeve',
  manufacturerName: 'ミルボン',
  name: 'ｵﾙﾃﾞｨｰﾌﾞ ｱﾃﾞｨｸｼｰ 5-GrayPearl',
  category: 'カラー',
  productCode: 'MIL-ORDEVE-001',
  janCode: '4954835299999',
  wholesalePrice: 800n,
  suggestedRetailPrice: 1200n,
  orderUnit: 1,
  description: '',
  active: true,
  createdAt: new Date('2026-09-01T00:00:00.000Z'),
  updatedAt: new Date('2026-09-01T00:00:00.000Z'),
}

const prisma = {
  async $executeRawUnsafe() { return 1 },
  async $queryRawUnsafe(sql, ...values) {
    queried.push({ sql, values })
    if (sql.includes('FROM "WholesaleDealer" WHERE "id"=$1')) {
      return [{ id:'dealer-v659', name:'スーパーヤマモト', loginId:'yamamoto', email:'dealer@example.test', authVersion:1, dealerCode:'DLR-YAMAMOTO' }]
    }
    if (sql.includes('FROM "WholesaleDealerContract" c JOIN "Organization"')) {
      return [{ id:'contract-v659', status:'ACTIVE', customerCode:'LIEN', organizationId:'salon-v659', organizationName:'Salon de Lien' }]
    }
    if (sql.includes('SELECT DISTINCT "manufacturerName"')) {
      return [
        { manufacturerName:'ミルボン', category:'カラー' },
        { manufacturerName:'ミルボン', category:'ヘアケア' },
        { manufacturerName:'サンコール', category:'カラー' },
      ]
    }
    if (sql.includes('AS "totalProductCount"')) return [{ totalProductCount:3947, count:1 }]
    if (sql.includes('SELECT COUNT(*)::int AS "count"') && sql.includes('FROM "WholesaleDealerProduct"')) return [{ count:1 }]
    if (sql.includes('FROM "WholesaleContractProductPrice" a') && sql.includes('COUNT(*)::int AS "count"')) return [{ count:125 }]
    if (sql.includes('SELECT "id","manufacturerName","name","category"')) return [product]
    if (sql.includes('FROM "WholesaleContractProductPrice" a') && sql.includes('SELECT a."id"')) {
      return [{ id:'price-v659', contractId:'contract-v659', dealerProductId:product.id, discountRate:20, createdAt:new Date(), updatedAt:new Date() }]
    }
    throw new Error(`Unexpected query: ${sql}`)
  },
}

const service = createWholesaleOrderingService({
  prisma,
  crypto,
  adminSessionProvider: async () => null,
})

function sessionToken() {
  const issuedAt = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(JSON.stringify({
    version:1,
    dealerId:'dealer-v659',
    loginId:'yamamoto',
    authVersion:1,
    issuedAt,
    expiresAt:issuedAt + 3600,
    sessionId:'v659-service-regression',
  })).toString('base64url')
  const signature = crypto.createHmac('sha256', process.env.DEALER_AUTH_SECRET).update(payload).digest('base64url')
  return payload + '.' + signature
}

function request() {
  const stream = Readable.from([])
  stream.method = 'GET'
  stream.headers = {
    host:'salon-de-lien.com',
    cookie:`orimia_dealer_session=${encodeURIComponent(sessionToken())}`,
  }
  return stream
}

function response() {
  return {
    statusCode:0,
    headers:{},
    body:'',
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value },
    end(value = '') { this.body += Buffer.isBuffer(value) ? value.toString('utf8') : String(value) },
  }
}

async function bootstrap(pathname) {
  const res = response()
  const url = new URL('https://salon-de-lien.com' + pathname)
  assert.equal(await service.handle(request(), res, url), true)
  assert.equal(res.statusCode, 200, res.body)
  return JSON.parse(res.body)
}

const products = await bootstrap('/api/dealer/bootstrap?view=products&productSearch=' + encodeURIComponent('オルディーブ') + '&productManufacturer=' + encodeURIComponent('ミルボン') + '&productCategory=' + encodeURIComponent('カラー'))
assert.equal(products.products.length, 1)
assert.equal(products.products[0].name, product.name)
assert.equal(products.productPagination.totalCount, 1)
assert.equal(products.productPagination.manufacturer, 'ミルボン')
assert.equal(products.productPagination.category, 'カラー')
assert.deepEqual(products.productFilters.manufacturers, ['ミルボン', 'サンコール'])
assert.deepEqual(products.productFilters.categories, ['カラー', 'ヘアケア'])

const productCountQuery = queried.find(entry => entry.sql.includes('SELECT COUNT(*)::int AS "count"') && entry.sql.includes('jsonb_array_elements_text'))
assert.ok(productCountQuery, 'normalized product search query was not issued')
const productTerms = JSON.parse(productCountQuery.values[1])
assert.ok(productTerms.includes('オルディーブ'))
assert.ok(productTerms.includes('ｵﾙﾃﾞｨｰﾌﾞ'))
assert.ok(productTerms.includes('おるでぃーぶ'))
assert.equal(productCountQuery.values[2], 'ミルボン')
assert.equal(productCountQuery.values[3], 'カラー')

const pricing = await bootstrap('/api/dealer/bootstrap?view=pricing&contractId=contract-v659&pricingSearch=' + encodeURIComponent('ｵﾙﾃﾞｨｰﾌﾞ') + '&pricingManufacturer=' + encodeURIComponent('ミルボン') + '&pricingCategory=' + encodeURIComponent('カラー'))
assert.equal(pricing.products.length, 1)
assert.equal(pricing.pricingPagination.totalCount, 1)
assert.equal(pricing.pricingPagination.totalProductCount, 3947)
assert.equal(pricing.pricingPagination.manufacturer, 'ミルボン')
assert.equal(pricing.pricingPagination.category, 'カラー')
assert.equal(pricing.contractProductPrices.length, 1)

const pricingQuery = queried.find(entry => entry.sql.includes('AS "totalProductCount"'))
assert.ok(pricingQuery)
const pricingTerms = JSON.parse(pricingQuery.values[1])
assert.ok(pricingTerms.includes('オルディーブ'))
assert.ok(pricingTerms.includes('ｵﾙﾃﾞｨｰﾌﾞ'))
assert.match(pricingQuery.sql, /"manufacturerName"=\$3/)
assert.match(pricingQuery.sql, /COALESCE\("category",''\)=\$4/)

console.log(JSON.stringify({
  release:'dealer-product-search-filters-v659',
  serviceVerified:true,
  fullwidthMatchedHalfwidth:true,
  productFilters:true,
  pricingFilters:true,
}))
