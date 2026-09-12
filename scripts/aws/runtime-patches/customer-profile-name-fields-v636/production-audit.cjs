'use strict'

const { PrismaClient } = require('@prisma/client')
const {
  parseCustomerProfileNameV636,
  resolveCustomerProfileNameV636,
} = require('/app/customer-profile-name-v636.js')

const prisma = new PrismaClient()

async function main() {
  const columns = await prisma.$queryRawUnsafe(`
    SELECT column_name
      FROM information_schema.columns
     WHERE table_schema='public'
       AND table_name='Customer'
       AND column_name IN ('lastName','firstName','lastNameKana','firstNameKana')
  `)
  const columnNames = new Set(columns.map(row => row.column_name))
  for (const field of ['lastName', 'firstName', 'lastNameKana', 'firstNameKana']) {
    if (!columnNames.has(field)) throw new Error(`Missing Customer.${field}`)
  }

  const rows = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT c."id",c."name",c."lastName",c."firstName",c."lastNameKana",c."firstNameKana"
      FROM "Customer" c
      JOIN "AppUser" u ON u."customerId"=c."id"
     WHERE c."deletedAt" IS NULL
       AND u."role"='CUSTOMER'
       AND u."active"=TRUE
     ORDER BY c."id"
     LIMIT 500
  `)
  if (!rows.length) throw new Error('No active customer profile rows were found.')

  const structured = rows.filter(row => row.lastName || row.firstName || row.lastNameKana || row.firstNameKana)
  const incomplete = structured.filter(row => !parseCustomerProfileNameV636(row))
  if (incomplete.length) throw new Error(`${incomplete.length} structured customer names are incomplete or invalid.`)

  const fallbackRows = rows.filter(row => !structured.includes(row))
  const unresolvable = fallbackRows.filter(row => !resolveCustomerProfileNameV636(row, row.name).lastName)
  if (unresolvable.length) throw new Error(`${unresolvable.length} legacy customer names cannot be prefilled.`)

  console.log(`CUSTOMER_PROFILE_NAME_AUDIT_V636 ${JSON.stringify({
    customerProfileRows: rows.length,
    structuredNameRows: structured.length,
    legacyPrefillRows: fallbackRows.length,
    invalidStructuredRows: incomplete.length,
    customerRowsModified: 0,
  })}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async error => {
    console.error(`CUSTOMER_PROFILE_NAME_AUDIT_V636_FAILED ${error instanceof Error ? error.message : error}`)
    await prisma.$disconnect().catch(() => undefined)
    process.exit(1)
  })
