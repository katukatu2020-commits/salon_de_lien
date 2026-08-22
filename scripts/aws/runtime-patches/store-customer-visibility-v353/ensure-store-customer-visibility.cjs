const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "storeHiddenAt" TIMESTAMP(3)',
  )
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "Customer_organizationId_storeHiddenAt_deletedAt_idx" ON "Customer"("organizationId", "storeHiddenAt", "deletedAt")',
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error('[store-customer-visibility] schema initialization failed', error)
    await prisma.$disconnect().catch(() => undefined)
    process.exit(1)
  })
