import crypto from 'node:crypto'
import { createRequire } from 'node:module'

const require = createRequire(process.env.RUNTIME_PACKAGE || import.meta.url)
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const command = process.argv[2] || 'setup'
const dealerId = 'dealer-pricing-pagination-v631-dealer'
const dealerLoginId = 'dealer.pricing.v631'
const dealerPassword = 'DealerPricingV631!'
const dealerCode = 'DLR-V631000001'
const organizationId = 'dealer-pricing-pagination-v631-org'
const contractId = 'dealer-pricing-pagination-v631-contract'
const productPrefix = 'dealer-pricing-pagination-v631-product-'

function passwordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  return `scrypt$${salt}$${crypto.scryptSync(password, salt, 64).toString('hex')}`
}

async function cleanup() {
  await prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe('DELETE FROM "WholesaleContractProductPrice" WHERE "contractId"=$1', contractId)
    await tx.$executeRawUnsafe('DELETE FROM "WholesaleDealerContract" WHERE "id"=$1', contractId)
    await tx.$executeRawUnsafe('DELETE FROM "WholesaleDealerProduct" WHERE "dealerId"=$1', dealerId)
    await tx.$executeRawUnsafe('DELETE FROM "ManagedAccountIssue" WHERE "targetId"=$1', dealerId)
    await tx.$executeRawUnsafe('DELETE FROM "WholesaleDealerBilling" WHERE "dealerId"=$1', dealerId)
    await tx.$executeRawUnsafe('DELETE FROM "WholesaleDealer" WHERE "id"=$1 OR LOWER("loginId")=LOWER($2)', dealerId, dealerLoginId)
    await tx.$executeRawUnsafe('DELETE FROM "Organization" WHERE "id"=$1', organizationId)
  })
}

try {
  if (command === 'cleanup') {
    await cleanup()
    console.log(JSON.stringify({ command, dealerId, productCount: 0, configuredCount: 0 }))
  } else {
    await cleanup()
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe(
        `INSERT INTO "Organization" ("id","slug","name","publicCode","createdAt","updatedAt")
         VALUES ($1,'dealer-pricing-pagination-v631-salon','V631 契約美容室','V631-SALON',NOW(),NOW())`,
        organizationId,
      )
      await tx.$executeRawUnsafe(
        `INSERT INTO "WholesaleDealer"
           ("id","name","representativeName","loginId","email","passwordHash","dealerCode","active","authVersion","createdAt","updatedAt")
         VALUES ($1,'V631 Pricing Dealer','検証 担当者',$2,'dealer.pricing.v631@example.test',$3,$4,TRUE,1,NOW(),NOW())`,
        dealerId,
        dealerLoginId,
        passwordHash(dealerPassword),
        dealerCode,
      )
      await tx.$executeRawUnsafe(
        `INSERT INTO "WholesaleDealerBilling"
           ("dealerId","planKey","displayName","monthlyAmount","currency","onboardingStatus","subscriptionStatus","billingRequiredAt","createdAt","updatedAt")
         VALUES ($1,'dealer','ディーラープラン',9800,'jpy','BANK_DEBIT_MANAGED','active',NOW(),NOW(),NOW())`,
        dealerId,
      )
      await tx.$executeRawUnsafe(
        `INSERT INTO "WholesaleDealerContract"
           ("id","dealerId","organizationId","status","customerCode","approvedAt","createdAt","updatedAt")
         VALUES ($1,$2,$3,'ACTIVE','V631-CUSTOMER',NOW(),NOW(),NOW())`,
        contractId,
        dealerId,
        organizationId,
      )
      await tx.$executeRawUnsafe(
        `INSERT INTO "WholesaleDealerProduct"
           ("id","dealerId","manufacturerName","name","category","productCode","janCode","wholesalePrice","suggestedRetailPrice","orderUnit","description","active","createdAt","updatedAt")
         SELECT $1 || LPAD(series::text,3,'0'),$2,
                CASE WHEN series % 2 = 0 THEN 'V631 メーカーA' ELSE 'V631 メーカーB' END,
                'V631 商品 ' || LPAD(series::text,3,'0'),'ヘアケア','V631-P' || LPAD(series::text,4,'0'),
                LPAD((6310000000000 + series)::text,13,'0'),1000 + series,2000 + series,1,
                '契約価格ページ分割の検証用商品',TRUE,NOW(),NOW()
           FROM GENERATE_SERIES(1,67) AS series`,
        productPrefix,
        dealerId,
      )
      await tx.$executeRawUnsafe(
        `INSERT INTO "WholesaleContractProductPrice"
           ("id","contractId","dealerProductId","discountRate","active","createdAt","updatedAt")
         SELECT 'dealer-pricing-pagination-v631-price-' || LPAD(series::text,3,'0'),$1,
                $2 || LPAD(series::text,3,'0'),15 + (series % 5),TRUE,NOW(),NOW()
           FROM GENERATE_SERIES(1,35) AS series`,
        contractId,
        productPrefix,
      )
    })
    console.log(JSON.stringify({
      command: 'setup',
      dealerId,
      dealerLoginId,
      dealerPassword,
      dealerCode,
      organizationId,
      contractId,
      productCount: 67,
      configuredCount: 35,
    }))
  }
} finally {
  await prisma.$disconnect()
}
