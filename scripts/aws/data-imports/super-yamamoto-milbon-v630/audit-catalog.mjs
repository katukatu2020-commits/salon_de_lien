import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import {
  RELEASE,
  DEALER_CODE,
  DEALER_NAME,
  MANUFACTURER_NAME,
  canonicalProduct,
  catalogDigest,
  validateCatalog,
} from './catalog-common.mjs'

const require = createRequire(path.join(process.env.LIEN_RUNTIME_ROOT || '/app', 'package.json'))
const { PrismaClient } = require('@prisma/client')
const catalog = JSON.parse(await fs.readFile(process.env.CATALOG_PATH || '/tmp/lien-v630/catalog.json', 'utf8'))
const expected = validateCatalog(catalog)
const prisma = new PrismaClient()

try {
  const dealers = await prisma.$queryRawUnsafe('SELECT "id","name","active" FROM "WholesaleDealer" WHERE "dealerCode"=$1 LIMIT 2', DEALER_CODE)
  if (dealers.length !== 1 || dealers[0].name !== DEALER_NAME || dealers[0].active !== true) throw new Error('Target dealer verification failed.')
  const codesJson = JSON.stringify(catalog.products.map(product => product.productCode))
  const stored = await prisma.$queryRawUnsafe(`SELECT "manufacturerName","name","category","productCode","janCode","wholesalePrice","suggestedRetailPrice","orderUnit","description"
    FROM "WholesaleDealerProduct" WHERE "dealerId"=$1 AND "active"=TRUE AND "productCode" IN (SELECT jsonb_array_elements_text($2::jsonb)) ORDER BY "productCode"`, dealers[0].id, codesJson)
  const normalized = stored.map(row => canonicalProduct({
    ...row,
    wholesalePrice: Number(row.wholesalePrice),
    suggestedRetailPrice: row.suggestedRetailPrice === null ? null : Number(row.suggestedRetailPrice),
    orderUnit: Number(row.orderUnit),
  }))
  const storedDigest = catalogDigest(normalized)
  if (stored.length !== expected.productCount || storedDigest !== expected.digest) throw new Error(`Catalog mismatch: ${stored.length}/${expected.productCount}, ${storedDigest}/${expected.digest}`)
  const audit = await prisma.$queryRawUnsafe(`SELECT "productCount","insertedCount","updatedCount","sourceSha256","catalogDigest","createdAt"
    FROM "WholesaleDealerCatalogImport" WHERE "dealerId"=$1 AND "release"=$2 AND "catalogDigest"=$3 ORDER BY "createdAt" DESC LIMIT 1`, dealers[0].id, RELEASE, expected.digest)
  if (audit.length !== 1 || audit[0].sourceSha256 !== catalog.sourceSha256) throw new Error('Catalog import audit record is missing or stale.')
  const total = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "WholesaleDealerProduct" WHERE "dealerId"=$1 AND "active"=TRUE', dealers[0].id)
  const manufacturerTotal = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "WholesaleDealerProduct" WHERE "dealerId"=$1 AND "manufacturerName"=$2 AND "active"=TRUE', dealers[0].id, MANUFACTURER_NAME)
  console.log(`V630_MILBON_AUDIT=${JSON.stringify({
    release: RELEASE,
    dealerCode: DEALER_CODE,
    productCount: expected.productCount,
    dealerActiveProducts: Number(total[0].count),
    milbonActiveProducts: Number(manufacturerTotal[0].count),
    catalogDigest: expected.digest,
    sourceSha256: catalog.sourceSha256,
    audit: {
      insertedCount: Number(audit[0].insertedCount),
      updatedCount: Number(audit[0].updatedCount),
      productCount: Number(audit[0].productCount),
    },
  })}`)
} finally {
  await prisma.$disconnect()
}
