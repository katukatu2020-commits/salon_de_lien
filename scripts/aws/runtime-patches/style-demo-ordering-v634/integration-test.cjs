'use strict'

const assert = require('node:assert/strict')
const { PrismaClient } = require('/app/node_modules/@prisma/client')
const { moveStylePost, stylePostOrderSummary } = require('./style-post-order-v634')

const prisma = new PrismaClient()

async function main() {
  const moved = await moveStylePost(prisma, 'org_salon_de_lien', 'v634-style-d', 2)
  assert.equal(moved.displayOrder, 2)
  const rows = await prisma.$queryRawUnsafe(
    `SELECT "id","displayOrder" FROM "VisitCommunityPost"
      WHERE "id"=ANY($1::text[]) ORDER BY "displayOrder"`,
    ['v634-style-a', 'v634-style-b', 'v634-style-c', 'v634-style-d'],
  )
  assert.deepEqual(rows.map(row => String(row.id)), ['v634-style-a', 'v634-style-d', 'v634-style-b', 'v634-style-c'])
  assert.deepEqual(rows.map(row => Number(row.displayOrder)), [1, 2, 3, 4])
  const summary = await stylePostOrderSummary(prisma, 'org_salon_de_lien')
  assert.equal(summary.duplicateCount, 0)
  assert.equal(summary.orderedCount, summary.postCount)
  console.log(JSON.stringify({ release: 'style-demo-ordering-v634', integrationVerified: true, moved, rows, summary }))
}

main()
  .then(() => prisma.$disconnect())
  .catch(async error => {
    console.error(error)
    await prisma.$disconnect().catch(() => undefined)
    process.exit(1)
  })
