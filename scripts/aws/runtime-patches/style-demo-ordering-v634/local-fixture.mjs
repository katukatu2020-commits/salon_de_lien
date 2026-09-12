import { createRequire } from 'node:module'

const require = createRequire(process.env.RUNTIME_PACKAGE || import.meta.url)
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const organizationId = 'org_salon_de_lien'
const command = process.argv[2] || 'setup'
const postIds = ['v634-style-a', 'v634-style-b', 'v634-style-c', 'v634-style-d']

try {
  if (command === 'cleanup') {
    await prisma.$executeRawUnsafe('DELETE FROM "_OrimiaRuntimeSeed" WHERE "key"=$1', 'style-demo-engagement-v634:org_salon_de_lien').catch(() => undefined)
    await prisma.$executeRawUnsafe('DELETE FROM "VisitCommunityPost" WHERE "id"=ANY($1::text[])', postIds)
    await prisma.$executeRawUnsafe('DELETE FROM "AppUser" WHERE "id" LIKE $1', 'style_demo_%_v634')
    console.log(JSON.stringify({ command, postIds }))
  } else if (command === 'inspect') {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT post."id",post."displayOrder",
              (SELECT COUNT(*)::int FROM "VisitCommunityLike" likes WHERE likes."postId"=post."id") AS likes,
              (SELECT COUNT(*)::int FROM "VisitCommunityComment" comments
                WHERE comments."postId"=post."id" AND comments."deletedAt" IS NULL) AS comments
         FROM "VisitCommunityPost" post WHERE post."id"=ANY($1::text[])
        ORDER BY post."displayOrder"`,
      postIds,
    )
    console.log(JSON.stringify({ command, rows }))
  } else {
    await prisma.$executeRawUnsafe('ALTER TABLE "VisitCommunityPost" ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER')
    await prisma.$executeRawUnsafe('DELETE FROM "_OrimiaRuntimeSeed" WHERE "key"=$1', 'style-demo-engagement-v634:org_salon_de_lien').catch(() => undefined)
    await prisma.$executeRawUnsafe('DELETE FROM "VisitCommunityPost" WHERE "id"=ANY($1::text[])', postIds)
    for (const [index, id] of postIds.entries()) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "VisitCommunityPost"
           ("id","organizationId","postKind","caption","photoReferences","publishedByName","published",
            "publishedAt","createdAt","updatedAt","styleMetadata","styleMenuIds","styleLinksVersion","displayOrder")
         VALUES ($1,$2,'STORE',$3,ARRAY['/brand/salon-style-short-dark.jpg']::text[],'Salon de Lien',TRUE,
                 NOW()-($4::int * INTERVAL '1 day'),NOW(),NOW(),$5::jsonb,ARRAY[]::text[],1,NULL)`,
        id,
        organizationId,
        `v634 fixture ${index + 1}`,
        index,
        JSON.stringify({ title: `V634テストスタイル${index + 1}`, stylistName: '谷崎 太二' }),
      )
    }
    console.log(JSON.stringify({ command: 'setup', postIds }))
  }
} finally {
  await prisma.$disconnect()
}
