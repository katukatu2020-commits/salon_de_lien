import fs from 'node:fs'

const chunkPaths = [
  '/app/.next/server/chunks/1597.js',
  '/app/.next/server/chunks/2241.js',
  '/app/.next/server/chunks/8043.js',
]

for (const chunkPath of chunkPaths) {
  const source = fs.readFileSync(chunkPath, 'utf8')
  if (!source.includes('LEFT JOIN "CustomerStoreLink" l ON l."appUserId"=u."id"')) {
    throw new Error(`${chunkPath}: linked-store authorization is missing`)
  }
  if (!source.includes('(u."customerId"=c."id" AND u."organizationId"=c."organizationId") OR l."id" IS NOT NULL')) {
    throw new Error(`${chunkPath}: canonical-or-linked authorization guard is missing`)
  }
  if (!source.includes('LOWER(COALESCE(NULLIF(u."loginId",\'\'),u."email"))=$2')) {
    throw new Error(`${chunkPath}: signed subject validation is missing`)
  }
  if (source.includes('customerId:e.customerId,organizationId:e.organizationId,customer:{id:e.customerId')) {
    throw new Error(`${chunkPath}: direct-store-only authorization remains`)
  }
  new Function(source)
}

const server = fs.readFileSync('/app/server.js', 'utf8')
const links = fs.readFileSync('/app/customer-links-v293.js', 'utf8')
if (!server.includes('LEFT JOIN "CustomerStoreLink" l ON l."appUserId"=u."id"')) {
  throw new Error('custom server linked-store authorization was not preserved')
}
if (!links.includes('const signed = signCustomerSession(session, users[0]?.loginId || users[0]?.email, links[0].customerId, organizationId)')) {
  throw new Error('store switching no longer issues the selected-store session')
}
if (links.includes('UPDATE "AppUser" SET "organizationId"=$1,"customerId"=$2')) {
  throw new Error('store switching mutates the account-wide canonical store')
}

console.log('customer store navigation session v414 runtime verified')
