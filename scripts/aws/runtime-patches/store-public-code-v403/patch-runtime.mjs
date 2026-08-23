import fs from 'node:fs'

function replaceOnce(source, oldValue, newValue, label) {
  const count = source.split(oldValue).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  return source.replace(oldValue, newValue)
}

const billingPath = '/app/billing.js'
let billing = fs.readFileSync(billingPath, 'utf8')

billing = replaceOnce(
  billing,
  `    const organizationId = randomId(crypto, 'org')
    const userId = randomId(crypto, 'usr')`,
  `    const organizationId = randomId(crypto, 'org')
    const publicCode = 'STORE-' + crypto.createHash('md5').update(organizationId).digest('hex').slice(0, 8).toUpperCase()
    const userId = randomId(crypto, 'usr')`,
  'registration public code generation',
)

billing = replaceOnce(
  billing,
  `          'INSERT INTO "Organization" ("id","slug","name","createdAt","updatedAt") VALUES ($1,$2,$3,NOW(),NOW())',
          organizationId,
          slug,
          organizationName
        )`,
  `          'INSERT INTO "Organization" ("id","slug","name","publicCode","createdAt","updatedAt") VALUES ($1,$2,$3,$4,NOW(),NOW())',
          organizationId,
          slug,
          organizationName,
          publicCode
        )`,
  'organization registration insert',
)

fs.writeFileSync(billingPath, billing)

const customerLinksPath = '/app/customer-links-v293.js'
let customerLinks = fs.readFileSync(customerLinksPath, 'utf8')

customerLinks = replaceOnce(
  customerLinks,
  `  async function storeQr(req, res) {
    const session = await currentStaff(req)
    await ensureSchema()
    const rows = await prisma.$queryRawUnsafe('SELECT "name","publicCode" FROM "Organization" WHERE "id"=$1 LIMIT 1', session.organizationId)`,
  `  async function storeQr(req, res) {
    const session = await currentStaff(req)
    await ensureSchema()
    await prisma.$executeRawUnsafe(\`UPDATE "Organization" SET "publicCode"='STORE-'||UPPER(SUBSTRING(MD5("id") FROM 1 FOR 8)) WHERE "id"=$1 AND "publicCode" IS NULL\`, session.organizationId)
    const rows = await prisma.$queryRawUnsafe('SELECT "name","publicCode" FROM "Organization" WHERE "id"=$1 LIMIT 1', session.organizationId)`,
  'store QR self healing',
)

customerLinks = replaceOnce(
  customerLinks,
  `  async function storeQrSvg(req, res) {
    const session = await currentStaff(req)
    await ensureSchema()
    const rows = await prisma.$queryRawUnsafe('SELECT "publicCode" FROM "Organization" WHERE "id"=$1 LIMIT 1', session.organizationId)`,
  `  async function storeQrSvg(req, res) {
    const session = await currentStaff(req)
    await ensureSchema()
    await prisma.$executeRawUnsafe(\`UPDATE "Organization" SET "publicCode"='STORE-'||UPPER(SUBSTRING(MD5("id") FROM 1 FOR 8)) WHERE "id"=$1 AND "publicCode" IS NULL\`, session.organizationId)
    const rows = await prisma.$queryRawUnsafe('SELECT "publicCode" FROM "Organization" WHERE "id"=$1 LIMIT 1', session.organizationId)`,
  'store QR SVG self healing',
)

fs.writeFileSync(customerLinksPath, customerLinks)

console.log('store public code v403 runtime patched')
