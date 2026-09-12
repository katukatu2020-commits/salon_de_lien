import crypto from 'node:crypto'
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

const runtimeRoot = process.env.LIEN_RUNTIME_ROOT || '/app'
const require = createRequire(path.join(runtimeRoot, 'package.json'))
const { PrismaClient } = require('@prisma/client')
const catalogPath = process.env.CATALOG_PATH || '/tmp/lien-v630/catalog.json'
const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'))
const expected = validateCatalog(catalog)
const prisma = new PrismaClient()

function comparable(row) {
  return canonicalProduct({
    ...row,
    wholesalePrice: Number(row.wholesalePrice),
    suggestedRetailPrice: row.suggestedRetailPrice === null ? null : Number(row.suggestedRetailPrice),
    orderUnit: Number(row.orderUnit),
  })
}

try {
  const result = await prisma.$transaction(async tx => {
    await tx.$queryRawUnsafe("SELECT 1::int AS locked FROM (SELECT pg_advisory_xact_lock(hashtext('super_yamamoto_milbon_v630'))) AS guard")
    await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "WholesaleDealerCatalogImport" (
      "id" TEXT PRIMARY KEY,
      "dealerId" TEXT NOT NULL REFERENCES "WholesaleDealer"("id") ON DELETE CASCADE,
      "release" TEXT NOT NULL,
      "manufacturerName" TEXT NOT NULL,
      "sourceFile" TEXT NOT NULL,
      "sourceSha256" TEXT NOT NULL,
      "catalogDigest" TEXT NOT NULL,
      "productCount" INTEGER NOT NULL,
      "insertedCount" INTEGER NOT NULL,
      "updatedCount" INTEGER NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE("dealerId","release","catalogDigest")
    )`)
    const dealers = await tx.$queryRawUnsafe('SELECT "id","name","dealerCode","active" FROM "WholesaleDealer" WHERE "dealerCode"=$1 LIMIT 2', DEALER_CODE)
    if (dealers.length !== 1 || dealers[0].name !== DEALER_NAME || dealers[0].active !== true) throw new Error('The active Super Yamamoto dealer account was not found uniquely.')
    const dealer = dealers[0]
    const codesJson = JSON.stringify(catalog.products.map(product => product.productCode))
    const existing = await tx.$queryRawUnsafe(`SELECT "productCode","manufacturerName" FROM "WholesaleDealerProduct" WHERE "dealerId"=$1 AND "productCode" IN (SELECT jsonb_array_elements_text($2::jsonb))`, dealer.id, codesJson)
    const conflicts = existing.filter(row => row.manufacturerName !== MANUFACTURER_NAME)
    if (conflicts.length) throw new Error(`Incoming product codes belong to another manufacturer: ${conflicts.slice(0, 10).map(row => row.productCode).join(', ')}`)

    const payload = catalog.products.map(product => ({
      id: `dealer_product_${crypto.randomUUID()}`,
      ...canonicalProduct(product),
    }))
    const upserted = await tx.$queryRawUnsafe(`INSERT INTO "WholesaleDealerProduct"
      ("id","dealerId","manufacturerName","name","category","productCode","janCode","wholesalePrice","suggestedRetailPrice","orderUnit","description","active","createdAt","updatedAt")
      SELECT x."id",$1,x."manufacturerName",x."name",x."category",x."productCode",x."janCode",x."wholesalePrice",x."suggestedRetailPrice",x."orderUnit",x."description",TRUE,NOW(),NOW()
      FROM jsonb_to_recordset($2::jsonb) AS x(
        "id" TEXT,"manufacturerName" TEXT,"name" TEXT,"category" TEXT,"productCode" TEXT,"janCode" TEXT,
        "wholesalePrice" INTEGER,"suggestedRetailPrice" INTEGER,"orderUnit" INTEGER,"description" TEXT
      )
      ON CONFLICT ("dealerId","productCode") DO UPDATE SET
        "manufacturerName"=EXCLUDED."manufacturerName","name"=EXCLUDED."name","category"=EXCLUDED."category",
        "janCode"=EXCLUDED."janCode","wholesalePrice"=EXCLUDED."wholesalePrice",
        "suggestedRetailPrice"=EXCLUDED."suggestedRetailPrice","orderUnit"=EXCLUDED."orderUnit",
        "description"=EXCLUDED."description","active"=TRUE,"updatedAt"=NOW()
      RETURNING "productCode"`, dealer.id, JSON.stringify(payload))
    if (upserted.length !== expected.productCount) throw new Error(`Upsert count mismatch: ${upserted.length}/${expected.productCount}`)

    const stored = await tx.$queryRawUnsafe(`SELECT "manufacturerName","name","category","productCode","janCode","wholesalePrice","suggestedRetailPrice","orderUnit","description"
      FROM "WholesaleDealerProduct" WHERE "dealerId"=$1 AND "productCode" IN (SELECT jsonb_array_elements_text($2::jsonb)) ORDER BY "productCode"`, dealer.id, codesJson)
    const storedDigest = catalogDigest(stored.map(comparable))
    if (stored.length !== expected.productCount || storedDigest !== expected.digest) throw new Error(`Stored catalog verification failed: ${stored.length}/${expected.productCount}, ${storedDigest}/${expected.digest}`)

    const insertedCount = expected.productCount - existing.length
    const updatedCount = existing.length
    await tx.$executeRawUnsafe(`INSERT INTO "WholesaleDealerCatalogImport"
      ("id","dealerId","release","manufacturerName","sourceFile","sourceSha256","catalogDigest","productCount","insertedCount","updatedCount","createdAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
      ON CONFLICT ("dealerId","release","catalogDigest") DO UPDATE SET
        "sourceFile"=EXCLUDED."sourceFile","sourceSha256"=EXCLUDED."sourceSha256","productCount"=EXCLUDED."productCount",
        "insertedCount"=EXCLUDED."insertedCount","updatedCount"=EXCLUDED."updatedCount","createdAt"=NOW()`,
      `catalog_import_${crypto.randomUUID()}`, dealer.id, RELEASE, MANUFACTURER_NAME, catalog.sourceFile, catalog.sourceSha256,
      expected.digest, expected.productCount, insertedCount, updatedCount)
    const total = await tx.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "WholesaleDealerProduct" WHERE "dealerId"=$1 AND "active"=TRUE', dealer.id)
    const manufacturerTotal = await tx.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "WholesaleDealerProduct" WHERE "dealerId"=$1 AND "manufacturerName"=$2 AND "active"=TRUE', dealer.id, MANUFACTURER_NAME)
    return {
      release: RELEASE,
      dealerCode: DEALER_CODE,
      productCount: expected.productCount,
      insertedCount,
      updatedCount,
      dealerActiveProducts: Number(total[0].count),
      milbonActiveProducts: Number(manufacturerTotal[0].count),
      catalogDigest: expected.digest,
      storedDigest,
    }
  }, { maxWait: 10_000, timeout: 180_000 })
  console.log(`V630_MILBON_IMPORT=${JSON.stringify(result)}`)
} finally {
  await prisma.$disconnect()
}
