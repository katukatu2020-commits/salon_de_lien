'use strict'
const assert = require('node:assert/strict')
const { PrismaClient } = require('/app/node_modules/@prisma/client')
assert.equal(process.env.ALLOW_LOCAL_STYLE_FIXTURES, 'true')
assert.equal(new URL(process.env.DATABASE_URL).pathname, '/orimia_chat_v589')
const db = new PrismaClient()
const id = 'qa-v596-style-metadata'
;(async () => {
  if (process.argv[2] === 'cleanup') {
    await db.$executeRawUnsafe('DELETE FROM "VisitCommunityPost" WHERE "id"=$1',id)
    return
  }
  const owner = await db.appUser.findFirst({where:{loginId:'demo.owner',role:'ADMIN'}})
  assert(owner?.organizationId)
  const metadata = { title:'透明感カラーのテスト',stylistName:'テスト担当者',stylistKana:'テスト タントウシャ',stylistRole:'スタイリスト',stylistComment:'色味とまとまりを確認したテストデータ。',menuDescription:'カット + カラー',salonName:'テスト掲載元',salonArea:'テストエリア',sourceUrl:'https://beauty.hotpepper.jp/slnH000307612/style/L1.html',stylistPhotoReference:'/brand/customer-hair-care.webp' }
  await db.$executeRawUnsafe(`INSERT INTO "VisitCommunityPost" ("id","organizationId","postKind","caption","photoReferences","photoDirections","publishedByName","published","publishedAt","createdAt","updatedAt","styleMetadata") VALUES ($1,$2,'STORE','',ARRAY['/brand/customer-hair-care.webp','/brand/customer-hair-care.webp'],ARRAY['FRONT','BACK'],'QA',TRUE,NOW(),NOW(),NOW(),$3::jsonb) ON CONFLICT ("id") DO UPDATE SET "styleMetadata"=$3::jsonb`,id,owner.organizationId,JSON.stringify(metadata))
  console.log(JSON.stringify({postId:id}))
})().catch(error=>{console.error(error.message);process.exitCode=1}).finally(()=>db.$disconnect())
