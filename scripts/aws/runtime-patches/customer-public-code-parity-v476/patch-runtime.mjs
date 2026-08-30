import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const chunkDirectory = `${root}/.next/server/chunks`
const marker = 'customer-public-code-parity-v476'

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function replaceExact(source, before, after, expectedCount, label) {
  const count = source.split(before).length - 1
  if (count !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} matches, found ${count}`)
  }
  return source.split(before).join(after)
}

let listPatched = 0
let detailPatched = 0

for (const entry of fs.readdirSync(chunkDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.js')) continue

  const filePath = `${chunkDirectory}/${entry.name}`
  let source = fs.readFileSync(filePath, 'utf8')

  if (
    source.includes('function R(e){return`C-${e.slice(-5).toUpperCase()}`}') &&
    source.includes('children:R(e.customer.id)')
  ) {
    const queryBinding = source.match(/let ([A-Za-z_$][\w$]*)=await ([A-Za-z_$][\w$]*)\._\.customer\.findMany\(\{/)
    if (!queryBinding) throw new Error(`customer list query binding was not found in ${entry.name}`)
    const [, customerRowsVariable, prismaVariable] = queryBinding
    const queryStart = queryBinding.index ?? -1
    const queryWindow = source.slice(queryStart, queryStart + 2500)
    const sessionBinding = queryWindow.match(/organizationId:([A-Za-z_$][\w$]*)\.organizationId\?\?void 0/)
    if (!sessionBinding) throw new Error(`customer list session binding was not found in ${entry.name}`)
    const [, sessionVariable] = sessionBinding

    const queryStartText = `let ${customerRowsVariable}=await ${prismaVariable}._.customer.findMany({`
    source = replaceExact(
      source,
      queryStartText,
      `let ${customerRowsVariable}=await(async()=>{let customerRowsV476=await ${prismaVariable}._.customer.findMany({`,
      1,
      'wrap customer list query',
    )

    const queryEndPattern = new RegExp(
      `orderBy:\\{updatedAt:"desc"\\}\\}\\),([A-Za-z_$][\\w$]*)=await ${escapeRegExp(prismaVariable)}\\._\\.contactLog\\.findMany`,
    )
    const queryEndMatches = [...source.matchAll(new RegExp(queryEndPattern.source, 'g'))]
    if (queryEndMatches.length !== 1) {
      throw new Error(`customer list query end: expected 1 match in ${entry.name}, found ${queryEndMatches.length}`)
    }

    source = source.replace(queryEndPattern, (_match, nextVariable) => `orderBy:{updatedAt:"desc"}});if(0===customerRowsV476.length)return customerRowsV476;let customerCodeRowsV476=await ${prismaVariable}._.$queryRawUnsafe('SELECT c."id",COALESCE(directUser."customerPublicCode",linkedUser."customerPublicCode") AS "customerPublicCode" FROM "Customer" c LEFT JOIN "AppUser" directUser ON directUser."customerId"=c."id" AND directUser."organizationId"=c."organizationId" AND directUser."role"=\\'CUSTOMER\\' AND directUser."active"=TRUE LEFT JOIN "CustomerStoreLink" link ON link."customerId"=c."id" AND link."organizationId"=c."organizationId" LEFT JOIN "AppUser" linkedUser ON linkedUser."id"=link."appUserId" AND linkedUser."role"=\\'CUSTOMER\\' AND linkedUser."active"=TRUE WHERE c."organizationId"=$1 AND c."id"=ANY($2::text[])',${sessionVariable}.organizationId,customerRowsV476.map(e=>e.id));let customerCodeByIdV476=new Map(customerCodeRowsV476.map(e=>[e.id,e.customerPublicCode]));return customerRowsV476.map(e=>({...e,customerPublicCode:customerCodeByIdV476.get(e.id)??null}))})(),${nextVariable}=await ${prismaVariable}._.contactLog.findMany`)

    source = replaceExact(
      source,
      'referrer=${encodeURIComponent(R(e.id))}',
      'referrer=${encodeURIComponent(e.customerPublicCode??R(e.id))}',
      1,
      'use public code for referrals',
    )
    source = replaceExact(
      source,
      'children:R(e.customer.id)',
      'children:e.customer.customerPublicCode??R(e.customer.id)',
      2,
      'use public code in customer list views',
    )
    source += `\n/* ${marker}-list */\n`
    fs.writeFileSync(filePath, source)
    listPatched += 1
    continue
  }

  if (
    source.includes('customer-linked-app-detection-v475') &&
    source.includes('function et(e) {') &&
    source.includes('children: et(el.id)')
  ) {
    source = replaceExact(
      source,
      'select: { id: !0,email:!0 },',
      'select: { id: !0,email:!0,customerPublicCode:!0 },',
      1,
      'select direct customer public code',
    )
    source = replaceExact(
      source,
      'SELECT u."id",u."email" FROM "CustomerStoreLink"',
      'SELECT u."id",u."email",u."customerPublicCode" FROM "CustomerStoreLink"',
      1,
      'select linked customer public code',
    )
    source = replaceExact(
      source,
      '`${et(el.id)}-${String(tc.getMonth() + 1).padStart(2, "0")}`',
      '`${el.appUsers[0]?.customerPublicCode ?? et(el.id)}-${String(tc.getMonth() + 1).padStart(2, "0")}`',
      1,
      'use public code for default offer code',
    )
    source = replaceExact(
      source,
      'children: et(el.id)',
      'children: el.appUsers[0]?.customerPublicCode ?? et(el.id)',
      1,
      'use public code in customer detail',
    )
    source += `\n/* ${marker}-detail */\n`
    fs.writeFileSync(filePath, source)
    detailPatched += 1
  }
}

if (listPatched !== 1 || detailPatched !== 1) {
  throw new Error(`customer public code parity: expected list=1/detail=1, found list=${listPatched}/detail=${detailPatched}`)
}

console.log(`${marker} patched`)
