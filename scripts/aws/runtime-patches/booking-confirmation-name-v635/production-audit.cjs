'use strict'

const { PrismaClient } = require('@prisma/client')
const { displayBookingConfirmationNameV635 } = require('/app/booking-confirmation-name-v635.js')

const prisma = new PrismaClient()

async function main() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT log."id", customer."name", customer."lastName", customer."firstName",
           customer."lastNameKana", customer."firstNameKana"
      FROM "ContactLog" log
      JOIN "Customer" customer ON customer."id"=log."customerId"
     WHERE log."purpose"='予約登録'
       AND log."outcome"='予約確定'
       AND customer."deletedAt" IS NULL
     ORDER BY log."createdAt" DESC
     LIMIT 200
  `)
  if (!rows.length) throw new Error('No confirmed booking history rows were found.')

  const corrected = rows.filter(row => displayBookingConfirmationNameV635(row.name) !== String(row.name || '').normalize('NFKC').trim().replace(/\s+/g, ' '))
  const invalid = rows.filter(row => displayBookingConfirmationNameV635(displayBookingConfirmationNameV635(row.name)) !== displayBookingConfirmationNameV635(row.name))
  if (invalid.length) throw new Error(`Booking name normalization is not idempotent for ${invalid.length} rows.`)

  console.log(`BOOKING_CONFIRMATION_NAME_AUDIT_V635 ${JSON.stringify({
    confirmedBookingRows: rows.length,
    correctedDisplayRows: corrected.length,
    structuredNameRows: rows.filter(row => row.lastName && row.firstName).length,
    storedFuriganaRows: rows.filter(row => row.lastNameKana && row.firstNameKana).length,
    customerRowsModified: 0,
  })}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async error => {
    console.error(`BOOKING_CONFIRMATION_NAME_AUDIT_V635_FAILED ${error instanceof Error ? error.message : error}`)
    await prisma.$disconnect().catch(() => undefined)
    process.exit(1)
  })
