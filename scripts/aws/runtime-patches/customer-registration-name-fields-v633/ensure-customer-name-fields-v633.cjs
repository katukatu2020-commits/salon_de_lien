'use strict'

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const expectedColumns = ['lastName', 'firstName', 'lastNameKana', 'firstNameKana']

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Customer"
      ADD COLUMN IF NOT EXISTS "lastName" TEXT,
      ADD COLUMN IF NOT EXISTS "firstName" TEXT,
      ADD COLUMN IF NOT EXISTS "lastNameKana" TEXT,
      ADD COLUMN IF NOT EXISTS "firstNameKana" TEXT
  `)

  const rows = await prisma.$queryRawUnsafe(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'Customer'
      AND column_name IN ('lastName', 'firstName', 'lastNameKana', 'firstNameKana')
  `)
  const actual = new Set(rows.map(row => row.column_name))
  const missing = expectedColumns.filter(column => !actual.has(column))
  if (missing.length > 0) {
    throw new Error(`Customer name columns are missing: ${missing.join(', ')}`)
  }

  console.log(JSON.stringify({
    release: 'customer-registration-name-fields-v633',
    customerNameColumnsReady: expectedColumns,
  }))
}

main()
  .then(() => prisma.$disconnect())
  .catch(async error => {
    console.error('[customer-registration-name-fields-v633] schema initialization failed', error)
    await prisma.$disconnect().catch(() => undefined)
    process.exit(1)
  })
