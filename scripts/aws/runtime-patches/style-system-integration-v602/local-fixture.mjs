import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

if (process.env.ALLOW_LOCAL_STYLE_FIXTURES !== 'true') throw new Error('ALLOW_LOCAL_STYLE_FIXTURES=true is required')
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')

const require = createRequire('/app/package.json')
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()
const postId = 'qa-v602-style-system'
const organizationId = 'org_showcase_yohaku'
const action = process.argv[2] || 'seed'

try {
  if (action === 'cleanup') {
    await db.$executeRawUnsafe('DELETE FROM "VisitCommunityComment" WHERE "postId"=$1', postId).catch(() => {})
    await db.$executeRawUnsafe('DELETE FROM "VisitCommunityLike" WHERE "postId"=$1', postId).catch(() => {})
    await db.$executeRawUnsafe('DELETE FROM "VisitCommunityPost" WHERE "id"=$1 AND "organizationId"=$2', postId, organizationId)
    console.log(JSON.stringify({ action, postId }))
  } else {
    const staff = await db.$queryRawUnsafe(
      'SELECT "staffKey","staffName" FROM "StaffBookingSetting" WHERE "organizationId"=$1 AND "staffKey"=$2 AND "active"=TRUE AND "onLeave"=FALSE LIMIT 1',
      organizationId,
      'amemiya',
    )
    const menus = await db.$queryRawUnsafe(
      'SELECT "id","name" FROM "SalonMenu" WHERE "organizationId"=$1 AND "name"=ANY($2::text[]) AND "active"=TRUE ORDER BY "sortOrder"',
      organizationId,
      ['似合わせカット', '透明感カラー'],
    )
    assert.equal(staff.length, 1, 'The showcase stylist is required')
    assert.ok(menus.length >= 1, 'At least one showcase menu is required')
    const metadata = {
      title:'やわらかな質感のショートボブ',
      stylistName:staff[0].staffName,
      stylistRole:'トップスタイリスト',
      stylistComment:'骨格に合わせて丸みの位置を調整し、乾かすだけでまとまるように仕上げました。顔まわりは軽さを残し、ご自宅でも扱いやすいデザインです。',
      menuDescription:menus.map(menu => menu.name).join(' + '),
      salonName:'ORIMIA Showcase',
      salonArea:'表参道',
    }
    await db.$executeRawUnsafe(
      `INSERT INTO "VisitCommunityPost"
        ("id","organizationId","customerId","visitId","published","publishedAt","createdAt","updatedAt",
         "postKind","caption","photoReferences","publishedByName","photoDirections","styleMetadata","sourceUrl",
         "deletedAt","deletedByUserId","styleStaffKey","styleMenuIds","styleLinksVersion")
       VALUES ($1,$2,NULL,NULL,TRUE,NOW(),NOW(),NOW(),'STORE',$3,$4::text[],$5,$6::text[],$7::jsonb,NULL,NULL,NULL,$8,$9::text[],1)
       ON CONFLICT ("id") DO UPDATE SET
         "organizationId"=EXCLUDED."organizationId","published"=TRUE,"publishedAt"=NOW(),"updatedAt"=NOW(),
         "postKind"='STORE',"caption"=EXCLUDED."caption","photoReferences"=EXCLUDED."photoReferences",
         "publishedByName"=EXCLUDED."publishedByName","photoDirections"=EXCLUDED."photoDirections",
         "styleMetadata"=EXCLUDED."styleMetadata","sourceUrl"=NULL,"deletedAt"=NULL,"deletedByUserId"=NULL,
         "styleStaffKey"=EXCLUDED."styleStaffKey","styleMenuIds"=EXCLUDED."styleMenuIds","styleLinksVersion"=1`,
      postId,
      organizationId,
      '骨格に合わせたショートボブです。',
      ['/demo/showcase/styles/style-01.png', '/demo/showcase/styles/style-02.png', '/demo/showcase/styles/style-03.png'],
      'ORIMIA Showcase',
      ['FRONT', 'SIDE', 'BACK'],
      JSON.stringify(metadata),
      staff[0].staffKey,
      menus.map(menu => menu.id),
    )
    console.log(JSON.stringify({ action:'seed', postId, staffKey:staff[0].staffKey, menuIds:menus.map(menu => menu.id) }))
  }
} finally {
  await db.$disconnect()
}
