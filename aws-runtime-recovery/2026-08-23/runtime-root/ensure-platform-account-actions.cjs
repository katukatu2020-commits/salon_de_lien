const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PlatformCustomerAccountAction" (
      "id" TEXT PRIMARY KEY,
      "customerId" TEXT NOT NULL,
      "organizationId" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "operatorEmail" TEXT NOT NULL,
      "detailJson" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "PlatformCustomerAccountAction_customerId_createdAt_idx"
    ON "PlatformCustomerAccountAction"("customerId", "createdAt" DESC)
  `)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error('[platform-customer-account-action] schema initialization failed', error)
    await prisma.$disconnect().catch(() => undefined)
    process.exit(1)
  })
