'use strict'

const crypto = require('node:crypto')
const { PrismaClient } = require('@prisma/client')
const {
  ensureStylePostOrderSchema,
  normalizeStylePostOrder,
} = require('./style-post-order-v634')

const RELEASE = 'style-demo-ordering-v634'
const TARGET_ORGANIZATION_ID = 'org_salon_de_lien'
const SEED_KEY = 'style-demo-engagement-v634:org_salon_de_lien'
const prisma = new PrismaClient()

const demoFans = [
  { id: 'style_demo_sakura_v634', name: 'さくらさん', email: 'style-sakura-v634@demo.invalid' },
  { id: 'style_demo_miho_v634', name: 'みほさん', email: 'style-miho-v634@demo.invalid' },
  { id: 'style_demo_akari_v634', name: 'あかりさん', email: 'style-akari-v634@demo.invalid' },
  { id: 'style_demo_rena_v634', name: 'れなさん', email: 'style-rena-v634@demo.invalid' },
]

const demoBodies = [
  'シルエットがきれいで素敵です。次回のスタイル選びの参考にしたいです。',
  '横や後ろから見た雰囲気も分かりやすくて、相談しやすそうです。',
  '自分にも似合うか、次に伺ったときに相談してみたいです。',
  '扱いやすそうな仕上がりで気になりました。',
]

function deterministicId(prefix, ...parts) {
  return `${prefix}_${crypto.createHash('sha256').update(parts.join(':')).digest('hex').slice(0, 24)}`
}

async function ensureSeedTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_OrimiaRuntimeSeed" (
      "key" TEXT PRIMARY KEY,
      "details" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

async function seedDemoEngagement() {
  return prisma.$transaction(async transaction => {
    await transaction.$queryRawUnsafe(
      'WITH locked AS MATERIALIZED (SELECT pg_advisory_xact_lock(hashtext($1))) SELECT 1::int AS locked FROM locked',
      SEED_KEY,
    )
    const completed = await transaction.$queryRawUnsafe(
      'SELECT "details","completedAt" FROM "_OrimiaRuntimeSeed" WHERE "key"=$1 LIMIT 1',
      SEED_KEY,
    )
    if (completed.length) return { seeded: false, previous: completed[0] }

    const organizations = await transaction.$queryRawUnsafe(
      'SELECT "id","name" FROM "Organization" WHERE "id"=$1 LIMIT 1',
      TARGET_ORGANIZATION_ID,
    )
    if (!organizations.length) throw new Error('Salon de Lien organization was not found.')

    const posts = await transaction.$queryRawUnsafe(
      `SELECT p."id",ROW_NUMBER() OVER (ORDER BY p."displayOrder",p."publishedAt" DESC,p."id" DESC)::int AS position
         FROM "VisitCommunityPost" p
        WHERE p."organizationId"=$1 AND p."published"=TRUE AND p."deletedAt" IS NULL
          AND ((p."postKind"='STORE' AND CARDINALITY(p."photoReferences")>0)
            OR (p."postKind"<>'STORE' AND EXISTS (SELECT 1 FROM "VisitPhoto" photo WHERE photo."visitId"=p."visitId")))
        ORDER BY p."displayOrder",p."publishedAt" DESC,p."id" DESC`,
      TARGET_ORGANIZATION_ID,
    )
    if (!posts.length) throw new Error('Salon de Lien has no published style posts to seed.')

    for (const fan of demoFans) {
      await transaction.$executeRawUnsafe(
        `INSERT INTO "AppUser"
           ("id","organizationId","email","role","active","displayName","nickname","createdAt","updatedAt")
         VALUES ($1,$2,$3,'CUSTOMER',FALSE,$4,$4,NOW(),NOW())
         ON CONFLICT ("id") DO UPDATE
           SET "organizationId"=EXCLUDED."organizationId","active"=FALSE,
               "displayName"=EXCLUDED."displayName","nickname"=EXCLUDED."nickname","updatedAt"=NOW()`,
        fan.id,
        TARGET_ORGANIZATION_ID,
        fan.email,
        fan.name,
      )
    }

    let likesAdded = 0
    let commentsAdded = 0
    for (const [postIndex, post] of posts.entries()) {
      const likeRows = await transaction.$queryRawUnsafe(
        'SELECT COUNT(*)::int AS count FROM "VisitCommunityLike" WHERE "postId"=$1',
        post.id,
      )
      if (Number(likeRows[0]?.count || 0) === 0) {
        const likeTarget = 2 + (postIndex % 3)
        for (const fan of demoFans.slice(0, likeTarget)) {
          likesAdded += Number(await transaction.$executeRawUnsafe(
            `INSERT INTO "VisitCommunityLike" ("id","postId","appUserId","createdAt")
             VALUES ($1,$2,$3,NOW()-($4::int * INTERVAL '1 hour'))
             ON CONFLICT ("postId","appUserId") DO NOTHING`,
            deterministicId('v634like', post.id, fan.id),
            post.id,
            fan.id,
            postIndex + 1,
          ))
        }
      }

      const commentRows = await transaction.$queryRawUnsafe(
        'SELECT COUNT(*)::int AS count FROM "VisitCommunityComment" WHERE "postId"=$1 AND "deletedAt" IS NULL AND "isAiAssistant"=FALSE',
        post.id,
      )
      if (Number(commentRows[0]?.count || 0) === 0) {
        const commentTarget = 1 + (postIndex % 2)
        for (let index = 0; index < commentTarget; index += 1) {
          const fan = demoFans[(postIndex + index) % demoFans.length]
          const body = demoBodies[(postIndex + index) % demoBodies.length]
          commentsAdded += Number(await transaction.$executeRawUnsafe(
            `INSERT INTO "VisitCommunityComment"
               ("id","postId","appUserId","authorDisplayName","authorRole","isStylistComment","body",
                "deletedAt","createdAt","updatedAt","isAiAssistant")
             VALUES ($1,$2,$3,$4,'CUSTOMER',FALSE,$5,NULL,
                     NOW()-($6::int * INTERVAL '1 hour'),NOW()-($6::int * INTERVAL '1 hour'),FALSE)
             ON CONFLICT ("id") DO NOTHING`,
            deterministicId('v634comment', post.id, fan.id, index),
            post.id,
            fan.id,
            fan.name,
            body,
            postIndex + index + 1,
          ))
        }
      }
    }

    const details = {
      organizationId: TARGET_ORGANIZATION_ID,
      postCount: posts.length,
      likesAdded,
      commentsAdded,
    }
    await transaction.$executeRawUnsafe(
      'INSERT INTO "_OrimiaRuntimeSeed" ("key","details","completedAt") VALUES ($1,$2::jsonb,NOW())',
      SEED_KEY,
      JSON.stringify(details),
    )
    return { seeded: true, ...details }
  })
}

async function verifyTargetEngagement() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS "postCount",
            COUNT(*) FILTER (WHERE NOT EXISTS (
              SELECT 1 FROM "VisitCommunityLike" likes WHERE likes."postId"=post."id"
            ))::int AS "zeroLikeCount",
            COUNT(*) FILTER (WHERE NOT EXISTS (
              SELECT 1 FROM "VisitCommunityComment" comments
               WHERE comments."postId"=post."id" AND comments."deletedAt" IS NULL AND comments."isAiAssistant"=FALSE
            ))::int AS "zeroCommentCount",
            (SELECT COUNT(*)::int
               FROM "VisitCommunityComment" demo
               JOIN "VisitCommunityPost" demo_post ON demo_post."id"=demo."postId"
              WHERE demo."id" LIKE 'v634comment_%' AND demo."deletedAt" IS NULL
                AND demo_post."organizationId"=$1) AS "demoCommentCount"
       FROM "VisitCommunityPost" post
      WHERE post."organizationId"=$1 AND post."published"=TRUE AND post."deletedAt" IS NULL
        AND ((post."postKind"='STORE' AND CARDINALITY(post."photoReferences")>0)
          OR (post."postKind"<>'STORE' AND EXISTS (SELECT 1 FROM "VisitPhoto" photo WHERE photo."visitId"=post."visitId")))`,
    TARGET_ORGANIZATION_ID,
  )
  const result = Object.fromEntries(Object.entries(rows[0] || {}).map(([key, value]) => [key, Number(value || 0)]))
  return result
}

async function main() {
  await ensureStylePostOrderSchema(prisma)
  await ensureSeedTable()
  const organizations = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT "organizationId"
      FROM "VisitCommunityPost"
     WHERE "deletedAt" IS NULL
  `)
  for (const row of organizations) await normalizeStylePostOrder(prisma, String(row.organizationId))
  const seed = await seedDemoEngagement()
  const engagement = await verifyTargetEngagement()
  const verified = Boolean(
    engagement.postCount
    && !engagement.zeroLikeCount
    && !engagement.zeroCommentCount
    && engagement.demoCommentCount,
  )
  if (seed.seeded && !verified) {
    throw new Error(`Salon de Lien demo engagement verification failed: ${JSON.stringify(engagement)}`)
  }
  console.log(JSON.stringify({ release: RELEASE, seed, engagement, verified }))
}

main()
  .then(() => prisma.$disconnect())
  .catch(async error => {
    console.error(`[${RELEASE}] initialization failed`, error)
    await prisma.$disconnect().catch(() => undefined)
    process.exit(1)
  })
