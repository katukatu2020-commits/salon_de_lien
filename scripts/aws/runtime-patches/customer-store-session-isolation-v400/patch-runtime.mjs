import fs from 'node:fs'

function replaceOnce(source, oldValue, newValue, label) {
  const count = source.split(oldValue).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  return source.replace(oldValue, newValue)
}

const serverPath = '/app/server.js'
let server = fs.readFileSync(serverPath, 'utf8')

const oldCustomerSessionLookup = `    const users = await prisma.$queryRawUnsafe('SELECT u."id" FROM "AppUser" u JOIN "Customer" c ON c."id"=u."customerId" WHERE u."id"=$1 AND u."customerId"=$2 AND u."organizationId"=$3 AND u."role"=\\'CUSTOMER\\' AND u."active"=true AND c."deletedAt" IS NULL LIMIT 1', value.userId, value.customerId, value.organizationId)`
const newCustomerSessionLookup = `    const users = await prisma.$queryRawUnsafe(\`SELECT u."id" FROM "AppUser" u
      JOIN "Customer" c ON c."id"=$2 AND c."organizationId"=$3 AND c."deletedAt" IS NULL
      LEFT JOIN "CustomerStoreLink" l ON l."appUserId"=u."id" AND l."organizationId"=c."organizationId" AND l."customerId"=c."id"
      WHERE u."id"=$1 AND u."role"='CUSTOMER' AND u."active"=TRUE
        AND ((u."customerId"=c."id" AND u."organizationId"=c."organizationId") OR l."id" IS NOT NULL)
      LIMIT 1\`, value.userId, value.customerId, value.organizationId)`

server = replaceOnce(server, oldCustomerSessionLookup, newCustomerSessionLookup, 'customer session tenant lookup')
fs.writeFileSync(serverPath, server)

const linksPath = '/app/customer-links-v293.js'
let links = fs.readFileSync(linksPath, 'utf8')

const oldAccountMutation = `      await prisma.$executeRawUnsafe('UPDATE "AppUser" SET "organizationId"=$1,"customerId"=$2,"updatedAt"=NOW() WHERE "id"=$3', organizationId, links[0].customerId, session.userId)\n`
links = replaceOnce(
  links,
  oldAccountMutation,
  `      // The selected store is scoped to this signed browser session.\n      // Never mutate the account's canonical store: another device may be using it concurrently.\n`,
  'remove global customer account mutation',
)

fs.writeFileSync(linksPath, links)
