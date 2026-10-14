'use strict'
const assert = require('node:assert/strict'), crypto = require('node:crypto')
const { PrismaClient } = require('/app/node_modules/@prisma/client')
const { createHotpepperMenuImportService } = require('/app/hotpepper-menu-import-v612.js')
const { fixture, entries, sourceUrl } = require('./fixtures.cjs')
const db = new PrismaClient(), org = 'org_showcase_yohaku'
const legacy = entries[20], legacyKey = 'hotpepper:H000307612:menu-' + crypto.createHash('sha256').update(legacy.name + '\n' + legacy.price).digest('hex').slice(0, 24)
const keys = entries.map(e => 'hotpepper:H000307612:' + e.id).concat(legacyKey)
async function run() {
  assert.equal(process.env.ORIMIA_ISOLATED_QA, 'v680')
  assert.equal((await db.$queryRawUnsafe('SELECT current_database() AS db'))[0].db, 'orimia_qa_v680_20260926')
  const action = process.argv[2]
  if (action === 'read') {
    console.log(JSON.stringify(await db.$queryRawUnsafe('SELECT "name","priceYen","sourceKey","category","description" FROM "SalonMenu" WHERE "organizationId"=$1 AND "sourceKey"=ANY($2::text[]) ORDER BY "name"', org, keys)))
    return
  }
  const service = createHotpepperMenuImportService({ prisma: db, sessionProvider: async () => null, fetchRemote: async () => fixture })
  await service.ensureSchema()
  const prior = (await db.$queryRawUnsafe('SELECT "data" FROM "HotpepperMenuImportJobV612" WHERE "organizationId"=$1', org))[0]?.data
  assert.ok(!prior || prior.salonName === 'QA v711 Salon', 'Do not overwrite another import job')
  if (action === 'cleanup') {
    await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('DELETE FROM "SalonMenu" WHERE "organizationId"=$1 AND "sourceKey"=ANY($2::text[]) AND "name" LIKE $3', org, keys, 'QA711 %')
      await tx.$executeRawUnsafe('DELETE FROM "HotpepperMenuImportJobV612" WHERE "organizationId"=$1 AND "data"->>\'salonName\'=$2', org, 'QA v711 Salon')
    })
    return
  }
  assert.equal(action, 'seed')
  await db.$executeRawUnsafe(`INSERT INTO "SalonMenu" ("id","organizationId","name","category","durationMinutes","priceYen","source","sourceKey") VALUES ('qa711-existing-menu',$1,$2,'既存の分類',60,9999,'hotpepper',$3) ON CONFLICT ("organizationId","name") DO NOTHING`, org, legacy.name, legacyKey)
  const job = await service.operate({ action: 'start', url: sourceUrl, rightsConfirmed: true }, { organizationId: org, userId: 'qa-v711', role: 'ADMIN' })
  console.log(JSON.stringify(job))
}
run().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => db.$disconnect())
