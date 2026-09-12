import crypto from 'node:crypto'
import { createRequire } from 'node:module'

const require = createRequire(process.env.RUNTIME_PACKAGE || import.meta.url)
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const command = process.argv[2] || 'setup'
const dealerId = 'list-pagination-performance-v628-dealer'
const dealerLoginId = 'dealer.pagination.v628'
const dealerPassword = 'DealerPaginationV628!'
const dealerCode = 'DLR-V628000001'
const productPrefix = 'list-pagination-performance-v628-product-'
const postPrefix = 'list-pagination-performance-v628-style-'
const organizationId = process.env.ORGANIZATION_ID || 'org_showcase_yohaku'

function passwordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  return `scrypt$${salt}$${crypto.scryptSync(password, salt, 64).toString('hex')}`
}

async function cleanup() {
  await prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe('DELETE FROM "VisitCommunityPost" WHERE "id" LIKE $1', postPrefix + '%')
    await tx.$executeRawUnsafe('DELETE FROM "WholesaleDealer" WHERE "id"=$1 OR LOWER("loginId")=LOWER($2)', dealerId, dealerLoginId)
  })
}

try {
  if (command === 'cleanup') {
    await cleanup()
    console.log(JSON.stringify({ command, dealerId, productCount: 0, styleCount: 0 }))
  } else {
    await cleanup()
    const organizations = await prisma.$queryRawUnsafe('SELECT "id" FROM "Organization" WHERE "id"=$1 LIMIT 1', organizationId)
    if (!organizations[0]) throw new Error('Fixture organization does not exist: ' + organizationId)

    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe(
        `INSERT INTO "WholesaleDealer"
           ("id","name","loginId","email","passwordHash","dealerCode","active","authVersion","createdAt","updatedAt")
         VALUES ($1,'V628 Pagination Dealer',$2,'dealer.pagination.v628@example.test',$3,$4,TRUE,1,NOW(),NOW())`,
        dealerId,
        dealerLoginId,
        passwordHash(dealerPassword),
        dealerCode,
      )
      await tx.$executeRawUnsafe(
        `INSERT INTO "WholesaleDealerBilling"
           ("dealerId","planKey","displayName","monthlyAmount","currency","onboardingStatus","subscriptionStatus","billingRequiredAt","createdAt","updatedAt")
         VALUES ($1,'dealer','ディーラープラン',9800,'jpy','ACTIVE','active',NOW(),NOW(),NOW())`,
        dealerId,
      )
      await tx.$executeRawUnsafe(
        `INSERT INTO "WholesaleDealerProduct"
           ("id","dealerId","manufacturerName","name","category","productCode","janCode","wholesalePrice","suggestedRetailPrice","orderUnit","description","active","createdAt","updatedAt")
         SELECT $1 || LPAD(series::text,3,'0'),$2,
                CASE WHEN series % 2 = 0 THEN 'V628 メーカーA' ELSE 'V628 メーカーB' END,
                'V628 商品 ' || LPAD(series::text,3,'0'),'シャンプー','V628-P' || LPAD(series::text,4,'0'),
                LPAD((6280000000000 + series)::text,13,'0'),900 + series,1800 + series,1,
                'ページ分割検証用商品',TRUE,NOW(),NOW()
           FROM GENERATE_SERIES(1,67) AS series`,
        productPrefix,
        dealerId,
      )
      await tx.$executeRawUnsafe(
        `INSERT INTO "VisitCommunityPost"
           ("id","organizationId","postKind","caption","photoReferences","publishedByName","published",
            "publishedAt","createdAt","updatedAt","styleMetadata","styleStaffKey","styleMenuIds","styleLinksVersion")
         SELECT $1 || LPAD(series::text,3,'0'),$2,'STORE','ページ分割検証用スタイル',
                ARRAY['/brand/salon-style-short.jpg']::text[],'テスト店舗',TRUE,
                NOW() - (series || ' seconds')::interval,NOW(),NOW(),
                JSONB_BUILD_OBJECT(
                  'title','V628 スタイル ' || LPAD(series::text,3,'0'),
                  'stylistName','雨宮　透',
                  'stylistComment','ページ分割検証用コメント',
                  'gender',CASE WHEN series % 2 = 0 THEN '女性' ELSE '男性' END,
                  'menuDescription','カット'
                ),NULL,ARRAY[]::text[],1
           FROM GENERATE_SERIES(1,47) AS series`,
        postPrefix,
        organizationId,
      )
    })
    console.log(JSON.stringify({
      command: 'setup',
      dealerId,
      dealerLoginId,
      dealerPassword,
      productCount: 67,
      styleCount: 47,
      organizationId,
    }))
  }
} finally {
  await prisma.$disconnect()
}
