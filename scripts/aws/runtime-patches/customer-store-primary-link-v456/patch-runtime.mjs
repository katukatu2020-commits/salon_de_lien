import fs from 'node:fs'

const customerLinksPath = '/app/customer-links-v293.js'

function replaceExact(source, before, after, expectedCount, label) {
  const count = source.split(before).length - 1
  if (count !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} matches, found ${count}`)
  }
  return source.split(before).join(after)
}

let source = fs.readFileSync(customerLinksPath, 'utf8')

const targetLookup = `      const existing = await tx.$queryRawUnsafe('SELECT "customerId" FROM "CustomerStoreLink" WHERE "appUserId"=$1 AND "organizationId"=$2 LIMIT 1', appUserId, organizationId)`
const preserveCurrentMembership = `      await tx.$executeRawUnsafe('INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId","createdAt") VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT DO NOTHING', crypto.randomUUID(), appUserId, source.organizationId, source.customerId)
${targetLookup}`

source = replaceExact(
  source,
  targetLookup,
  preserveCurrentMembership,
  1,
  'preserve current membership before linking another store',
)

const availableStoresStart = `  async function availableStores(session) {
    await ensureSchema()`
const repairMemberships = `  async function availableStores(session) {
    await ensureSchema()
    const memberships = await prisma.$queryRawUnsafe(\`SELECT u."organizationId",u."customerId"
      FROM "AppUser" u JOIN "Customer" c ON c."id"=u."customerId" AND c."organizationId"=u."organizationId" AND c."deletedAt" IS NULL
      WHERE u."id"=$1 AND u."role"='CUSTOMER' AND u."active"=TRUE AND u."organizationId" IS NOT NULL AND u."customerId" IS NOT NULL
      UNION
      SELECT i."organizationId",i."customerId"
      FROM "AppUser" u JOIN "CustomerRegistrationInvite" i ON LOWER(i."email")=LOWER(u."email") AND i."customerId" IS NOT NULL AND i."usedAt" IS NOT NULL
      JOIN "Customer" c ON c."id"=i."customerId" AND c."organizationId"=i."organizationId" AND c."deletedAt" IS NULL
      WHERE u."id"=$1 AND u."role"='CUSTOMER' AND u."active"=TRUE\`, session.userId)
    for (const membership of memberships) {
      await prisma.$executeRawUnsafe('INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId","createdAt") VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT DO NOTHING', crypto.randomUUID(), session.userId, membership.organizationId, membership.customerId)
    }`

source = replaceExact(
  source,
  availableStoresStart,
  repairMemberships,
  1,
  'repair current and registration-origin memberships before listing stores',
)

fs.writeFileSync(customerLinksPath, source)
console.log('customer primary store link v456 patched')

