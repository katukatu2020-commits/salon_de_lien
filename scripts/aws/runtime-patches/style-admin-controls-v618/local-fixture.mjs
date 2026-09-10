import { createRequire } from 'node:module'

const require = createRequire(process.env.RUNTIME_PACKAGE || import.meta.url)
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const id = 'style-admin-controls-v618-fixture'
const organizationId = process.env.ORGANIZATION_ID || 'org_showcase_yohaku'
const command = process.argv[2] || 'setup'

try {
  if (command === 'cleanup') {
    await prisma.$executeRawUnsafe('DELETE FROM "VisitCommunityPost" WHERE "id"=$1', id)
    console.log(JSON.stringify({ command, id }))
  } else if (command === 'inspect') {
    const rows = await prisma.$queryRawUnsafe(
      'SELECT "styleStaffKey","styleMetadata" FROM "VisitCommunityPost" WHERE "id"=$1 LIMIT 1',
      id,
    )
    console.log(JSON.stringify({ command, id, post: rows[0] || null }))
  } else {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "VisitCommunityPost"
         ("id","organizationId","postKind","caption","photoReferences","publishedByName","published",
          "publishedAt","createdAt","updatedAt","styleMetadata","styleStaffKey","styleMenuIds","styleLinksVersion")
       VALUES ($1,$2,'STORE','v618 local fixture',ARRAY['/brand/salon-style-short-dark.jpg']::text[],'ORIMIA',TRUE,
               NOW(),NOW(),NOW(),$3::jsonb,NULL,ARRAY[]::text[],1)
       ON CONFLICT ("id") DO UPDATE SET
         "organizationId"=EXCLUDED."organizationId","postKind"='STORE',"caption"=EXCLUDED."caption",
         "photoReferences"=EXCLUDED."photoReferences","published"=TRUE,"deletedAt"=NULL,
         "styleMetadata"=EXCLUDED."styleMetadata","styleStaffKey"=NULL,"styleMenuIds"=ARRAY[]::text[],"updatedAt"=NOW()`,
      id,
      organizationId,
      JSON.stringify({
        title: '未紐付けスタイル',
        stylistName: '雨宮　透',
        stylistKana: 'アメミヤ トオル',
        stylistRole: '取込元役職',
        stylistComment: 'テスト用コメント',
        gender: 'ユニセックス',
        menuDescription: '透明感カラー',
      }),
    )
    console.log(JSON.stringify({ command: 'setup', id, organizationId }))
  }
} finally {
  await prisma.$disconnect()
}
