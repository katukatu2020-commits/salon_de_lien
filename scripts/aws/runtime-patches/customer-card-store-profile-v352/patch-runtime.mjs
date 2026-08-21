import fs from 'node:fs'

const file = '/app/store-profile.js'
let source = fs.readFileSync(file, 'utf8')

const before = `      prisma.organization.findUnique({ where: { id: session.organizationId }, select: { id: true, name: true, slug: true, publicCode: true, updatedAt: true } }),`
const after = `      prisma.$queryRawUnsafe(
        'SELECT "id","name","slug","publicCode","updatedAt" FROM "Organization" WHERE "id"=$1 LIMIT 1',
        session.organizationId,
      ).then(rows => rows[0] || null), /* customer-card-store-profile-v352 */`

const matches = source.split(before).length - 1
if (matches !== 1) throw new Error(`store profile organization lookup: expected one match, found ${matches}`)
source = source.replace(before, after)
fs.writeFileSync(file, source)

const customerPageFile = '/app/.next/server/chunks/3244.js'
let customerPage = fs.readFileSync(customerPageFile, 'utf8')

const customerReplacements = [
  ['el.appUsers.length === 0', '!el.appUsers'],
  ['el.appUsers[0]?.email', 'el.appUsers?.email'],
]

for (const [customerBefore, customerAfter] of customerReplacements) {
  const customerMatches = customerPage.split(customerBefore).length - 1
  if (customerMatches !== 1) {
    throw new Error(`customer card relation fix: expected one match for ${customerBefore}, found ${customerMatches}`)
  }
  customerPage = customerPage.replace(customerBefore, customerAfter)
}

fs.writeFileSync(customerPageFile, customerPage)
