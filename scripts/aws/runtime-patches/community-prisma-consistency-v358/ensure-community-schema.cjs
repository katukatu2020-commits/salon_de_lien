const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "VisitCommunityPost"
      ALTER COLUMN "customerId" DROP NOT NULL,
      ALTER COLUMN "visitId" DROP NOT NULL,
      ADD COLUMN IF NOT EXISTS "postKind" TEXT NOT NULL DEFAULT 'VISIT',
      ADD COLUMN IF NOT EXISTS "caption" TEXT,
      ADD COLUMN IF NOT EXISTS "photoReferences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      ADD COLUMN IF NOT EXISTS "publishedByName" TEXT
  `)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error('[community-prisma-consistency] schema initialization failed', error)
    await prisma.$disconnect().catch(() => undefined)
    process.exit(1)
  })
