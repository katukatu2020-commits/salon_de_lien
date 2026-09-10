import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { randomBytes } from 'node:crypto'

const require = createRequire('/app/package.json')
const { PrismaClient } = require('@prisma/client')
const { customerSummaryV614 } = require('/app/customer-summary-v614')

if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL required')

const schema = `customer_current_appointment_${randomBytes(6).toString('hex')}`
const url = new URL(process.env.TEST_DATABASE_URL)
url.searchParams.set('connection_limit', '2')
const bootstrap = new PrismaClient({ datasources: { db: { url: url.href } } })
await bootstrap.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
url.searchParams.set('schema', schema)
const db = new PrismaClient({ datasources: { db: { url: url.href } } })
const session = { organizationId: 'org-a', customerId: 'alice' }

try {
  for (const sql of [
    'CREATE TABLE "Customer" ("id" TEXT PRIMARY KEY,"organizationId" TEXT,"name" TEXT,"deletedAt" TIMESTAMP)',
    'CREATE TABLE "Visit" ("customerId" TEXT,"visitedAt" TIMESTAMP)',
    'CREATE TABLE "Appointment" ("id" TEXT PRIMARY KEY,"customerId" TEXT,"scheduledAt" TIMESTAMP,"status" TEXT,"menu" TEXT,"staffName" TEXT)',
    'CREATE TABLE "ServiceSale" ("id" TEXT PRIMARY KEY,"appointmentId" TEXT)',
    'CREATE TABLE "CustomerPointAccount" ("customerId" TEXT,"availablePoints" INTEGER)',
    `INSERT INTO "Customer" VALUES ('alice','org-a','Alice',NULL),('other','org-b','Other',NULL)`,
    `INSERT INTO "Visit" VALUES ('alice',CURRENT_TIMESTAMP-INTERVAL '5 days')`,
    `INSERT INTO "Appointment" VALUES
      ('paid-linked','alice',CURRENT_TIMESTAMP+INTERVAL '1 day','予約確定','Paid menu','Staff A'),
      ('visited','alice',CURRENT_TIMESTAMP+INTERVAL '2 days','来店済み','Visited menu','Staff B'),
      ('completed','alice',CURRENT_TIMESTAMP+INTERVAL '3 days','completed','Completed menu','Staff C'),
      ('active','alice',CURRENT_TIMESTAMP+INTERVAL '4 days','予約確定','Active menu','Staff D'),
      ('foreign','other',CURRENT_TIMESTAMP+INTERVAL '1 day','予約確定','Private menu','Other staff')`,
    `INSERT INTO "ServiceSale" VALUES ('sale-1','paid-linked')`,
    `INSERT INTO "CustomerPointAccount" VALUES ('alice',120),('other',999)`,
  ]) await db.$executeRawUnsafe(sql)

  const summary = await customerSummaryV614(db, session, 'MEM-1')
  assert.equal(summary.name, 'Alice')
  assert.equal(summary.appointment.id, 'active', 'Only an unpaid active reservation may be current')
  assert.equal(summary.points, 120)
  assert.equal(await customerSummaryV614(db, { organizationId: 'org-b', customerId: 'alice' }, 'MEM-X'), null)

  await db.$executeRawUnsafe(`DELETE FROM "ServiceSale" WHERE "appointmentId"='paid-linked'`)
  const withoutSale = await customerSummaryV614(db, session, 'MEM-1')
  assert.equal(withoutSale.appointment.id, 'paid-linked', 'The linked sale is authoritative even when the status is stale')

  console.log(JSON.stringify({
    passed: true,
    terminalStatusesExcluded: true,
    linkedSaleExcluded: true,
    staleStatusHandled: true,
    tenantIsolation: true,
  }))
} finally {
  await db.$disconnect()
  await bootstrap.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`)
  await bootstrap.$disconnect()
}
