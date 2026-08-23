import fs from 'node:fs'

function replaceOnce(source, oldValue, newValue, label) {
  const count = source.split(oldValue).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  return source.replace(oldValue, newValue)
}

const linksPath = '/app/customer-links-v293.js'
let links = fs.readFileSync(linksPath, 'utf8')

links = replaceOnce(
  links,
  `          const users = await tx.$queryRawUnsafe('SELECT "id","customerPublicCode" FROM "AppUser" WHERE "id"=$1 AND "customerId"=$2 AND "role"=\\'CUSTOMER\\' AND "active"=TRUE FOR UPDATE', session.userId, session.customerId)`,
  `          // The membership code belongs to the platform customer account, not to a
          // store-specific Customer record. A linked store session intentionally uses
          // a different customerId, while the AppUser id remains stable.
          const users = await tx.$queryRawUnsafe('SELECT "id","customerPublicCode" FROM "AppUser" WHERE "id"=$1 AND "role"=\\'CUSTOMER\\' AND "active"=TRUE FOR UPDATE', session.userId)`,
  'store-independent customer membership lookup',
)

fs.writeFileSync(linksPath, links)
console.log('customer store home membership lookup v407 patched')
