const assert = require('node:assert/strict')
const { PrismaClient } = require('/app/node_modules/@prisma/client')
const { createHotpepperMenuImportService } = require('/app/hotpepper-menu-import-v612.js')
const db = new PrismaClient(), organizationId = 'org_showcase_yohaku'
const sourceUrl = 'https://beauty.hotpepper.jp/slnH000307612/coupon/CT00/'
const fixture = `<h1 class="detailTitle">QA v703 Salon</h1>${[
  ['似合わせカット', 5500, 'SN70300001'],
  ['QA703 カット＋カラー', 13200, 'SN70300002'],
  ['QA703 頭皮ケア', 4400, 'SN70300003'],
].map(([name, price, id]) => `<table class="menuTbl"><tr><td><li class="couponMenuIcon">カット</li><div><p class="couponMenuName">${name}</p><span class="fs16 fgGray">¥${price}</span></div><p class="mT10 fgGray fs11 wbba">検証用メニュー</p><a href="https://beauty.hotpepper.jp/CSP/bt/reserve/?setmenuId=${id}">予約</a></td></tr></table>`).join('')}`
;(async () => {
  assert.equal(process.env.ORIMIA_ISOLATED_QA, 'v680')
  const [database] = await db.$queryRawUnsafe('SELECT current_database() AS db')
  assert.equal(database.db, 'orimia_qa_v680_20260926')
  const action = process.argv[2] || 'seed'
  if (action === 'read') {
    console.log(JSON.stringify(await db.$queryRawUnsafe('SELECT "name","durationMinutes","priceYen" FROM "SalonMenu" WHERE "organizationId"=$1 AND "sourceKey" IN ($2,$3) ORDER BY "name"', organizationId, 'hotpepper:H000307612:SN70300002', 'hotpepper:H000307612:SN70300003')))
    return
  }
  if (action === 'cleanup') {
    await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('DELETE FROM "SalonMenu" WHERE "organizationId"=$1 AND "name" LIKE $2 AND "sourceKey" IN ($3,$4)', organizationId, 'QA703 %', 'hotpepper:H000307612:SN70300002', 'hotpepper:H000307612:SN70300003')
      await tx.$executeRawUnsafe('DELETE FROM "HotpepperMenuImportJobV612" WHERE "organizationId"=$1 AND "data"->>\'salonName\'=$2', organizationId, 'QA v703 Salon')
    })
    return
  }
  const service = createHotpepperMenuImportService({ prisma: db, sessionProvider: async () => null, fetchRemote: async () => fixture })
  await service.ensureSchema()
  const job = await service.operate({ action: 'start', url: sourceUrl, rightsConfirmed: true }, { organizationId, userId: 'qa-v703', role: 'ADMIN' })
  console.log(JSON.stringify(job))
})().catch(e => { console.error(e); process.exitCode = 1 }).finally(() => db.$disconnect())
