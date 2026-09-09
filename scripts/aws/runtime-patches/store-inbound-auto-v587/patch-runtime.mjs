import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'store-inbound-auto-v587'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${marker}: ${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function read(name) {
  const source = fs.readFileSync(path.join(root, name), 'utf8').replace(/\r\n/g, '\n')
  if (source.includes(`/* ${marker} */`)) throw new Error(`${name} already patched`)
  return source
}

let inbound = read('inbound-email.js')
inbound = replaceOnce(inbound,
  '  async function rowForOrganization(organizationId) {\n    return (await prisma.$queryRawUnsafe(',
  '  async function rowForOrganization(organizationId, database = prisma) {\n    return (await database.$queryRawUnsafe(',
  'transaction-aware address lookup')
inbound = replaceOnce(inbound,
  '  async function issueAddressForOrganization(organizationId) {\n    const existing = await rowForOrganization(organizationId)',
  '  async function issueAddressForOrganization(organizationId, database = prisma) {\n    const existing = await rowForOrganization(organizationId, database)',
  'transaction-aware address issuance')
inbound = replaceOnce(inbound,
  'const rows = await prisma.$queryRawUnsafe(`INSERT INTO "OrganizationInboundEmail"',
  'const rows = await database.$queryRawUnsafe(`INSERT INTO "OrganizationInboundEmail"',
  'transaction-aware address insert')
inbound = replaceOnce(inbound,
  'const raced = await rowForOrganization(organizationId)',
  'const raced = await rowForOrganization(organizationId, database)',
  'transaction-aware concurrent lookup')
const schemaEnd = `    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "InboundEmailMessage_org_received_idx" ON "InboundEmailMessage"("organizationId","receivedAt" DESC)')`
inbound = replaceOnce(inbound, schemaEnd, `${schemaEnd}
    const missing = await prisma.$queryRawUnsafe('SELECT o."id" FROM "Organization" o LEFT JOIN "OrganizationInboundEmail" i ON i."organizationId"=o."id" WHERE i."organizationId" IS NULL ORDER BY o."id"')
    for (const organization of missing) await issueAddressForOrganization(organization.id)`, 'missing store address backfill')

let billing = read('billing.js')
billing = replaceOnce(billing, "const path = require('path')", "const path = require('path')\nconst { createInboundEmailService } = require('./inbound-email')", 'reuse inbound service')
billing = replaceOnce(billing,
  '  const crypto = dependencies.crypto',
  '  const crypto = dependencies.crypto\n  const inboundEmail = createInboundEmailService({ prisma, sessionProvider, crypto })',
  'registration address issuer')
const consumeToken = `        await tx.$executeRawUnsafe('UPDATE "StoreRegistrationVerification" SET "consumedAt"=NOW(),"updatedAt"=NOW() WHERE "id"=$1', locked[0].id)`
billing = replaceOnce(billing, consumeToken,
  `        await inboundEmail.issueAddressForOrganization(organizationId, tx)\n${consumeToken}`,
  'atomic store and inbound address creation')

let server = read('server.js')
const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Admin-Product-Tab-State', 'v586') /* admin-product-tab-state-v586 */`
server = replaceOnce(server, previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Store-Inbound-Auto', 'v587') /* ${marker} */`,
  'readiness header')

for (const [name, source] of [['inbound-email.js', inbound], ['billing.js', billing], ['server.js', server]]) {
  fs.writeFileSync(path.join(root, name), `${source}\n/* ${marker} */\n`)
}
console.log(JSON.stringify({ release:marker, atomicRegistration:true, missingAddressesBackfilled:true }))
