import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const chunkDirectory = `${root}/.next/server/chunks`
const marker = 'customer-public-code-parity-v476'
let listSource = null
let detailSource = null

for (const entry of fs.readdirSync(chunkDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.js')) continue
  const source = fs.readFileSync(`${chunkDirectory}/${entry.name}`, 'utf8')
  if (source.includes(`${marker}-list`)) listSource = source
  if (source.includes(`${marker}-detail`)) detailSource = source
}

if (!listSource || !detailSource) throw new Error('customer list/detail parity markers are missing')

const listAssertions = [
  [listSource.includes('COALESCE(directUser."customerPublicCode",linkedUser."customerPublicCode")'), 'list resolves direct or linked public code'],
  [listSource.includes('directUser."organizationId"=c."organizationId"'), 'direct account is tenant scoped'],
  [listSource.includes('link."customerId"=c."id" AND link."organizationId"=c."organizationId"'), 'linked account is customer and tenant scoped'],
  [listSource.includes('WHERE c."organizationId"=$1 AND c."id"=ANY($2::text[])'), 'bulk lookup is limited to visible tenant customers'],
  [listSource.includes('customerPublicCode:customerCodeByIdV476.get(e.id)??null'), 'resolved code is attached to customer rows'],
  [(listSource.match(/children:e\.customer\.customerPublicCode\?\?R\(e\.customer\.id\)/g) || []).length === 2, 'both list layouts prefer the public code'],
  [listSource.includes('referrer=${encodeURIComponent(e.customerPublicCode??R(e.id))}'), 'referrals prefer the same public code'],
]

const detailAssertions = [
  [detailSource.includes('select: { id: !0,email:!0,customerPublicCode:!0 }'), 'detail selects direct public code'],
  [detailSource.includes('SELECT u."id",u."email",u."customerPublicCode" FROM "CustomerStoreLink"'), 'detail selects linked public code'],
  [detailSource.includes('children: el.appUsers[0]?.customerPublicCode ?? et(el.id)'), 'detail display prefers public code'],
  [detailSource.includes('`${el.appUsers[0]?.customerPublicCode ?? et(el.id)}-${String(tc.getMonth() + 1)'), 'offer codes use the same public code'],
  [detailSource.includes('customer-linked-app-detection-v475'), 'linked app registration behavior is preserved'],
]

for (const [condition, message] of [...listAssertions, ...detailAssertions]) {
  if (!condition) throw new Error(message)
}

console.log(`customer public code runtime verified (${listAssertions.length + detailAssertions.length} assertions)`)
