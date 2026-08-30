import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const chunkDirectory = `${root}/.next/server/chunks`
const marker = 'customer-linked-app-detection-v475'
let patchedCount = 0

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

for (const entry of fs.readdirSync(chunkDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.js')) continue

  const filePath = `${chunkDirectory}/${entry.name}`
  let source = fs.readFileSync(filePath, 'utf8')
  if (
    !source.includes('customerRegistrationQr') ||
    !source.includes('el.appUsers.length === 0') ||
    !source.includes('el.appUsers[0]?.email')
  ) {
    continue
  }

  const customerLookup = source.match(/let ([A-Za-z_$][\w$]*) = await ([A-Za-z_$][\w$]*)\._\.customer\.findFirst\(\{/)
  const sessionLookup = source.match(/organizationId: ([A-Za-z_$][\w$]*)\.organizationId \?\? void 0/)
  if (!customerLookup || !sessionLookup) {
    throw new Error(`customer detail bindings were not found in ${entry.name}`)
  }

  const [, customerVariable, prismaVariable] = customerLookup
  const [, sessionVariable] = sessionLookup
  const customerReadyPattern = new RegExp(
    `^([ \\t]*)${escapeRegExp(customerVariable)} \\|\\| \\(0, ([A-Za-z_$][\\w$]*)\\.notFound\\)\\(\\);$`,
    'm',
  )
  const customerReadyMatches = [...source.matchAll(new RegExp(customerReadyPattern.source, 'gm'))]
  if (customerReadyMatches.length !== 1) {
    throw new Error(`customer detail ready anchor: expected 1 match in ${entry.name}, found ${customerReadyMatches.length}`)
  }

  source = source.replace(customerReadyPattern, (anchor, indent) => `${anchor}
${indent}if (${customerVariable}.appUsers.length === 0) {
${indent}  ${customerVariable}.appUsers = await ${prismaVariable}._.$queryRawUnsafe(
${indent}    'SELECT u."id",u."email" FROM "CustomerStoreLink" link JOIN "AppUser" u ON u."id"=link."appUserId" WHERE link."customerId"=$1 AND link."organizationId"=$2 AND u."role"=\\'CUSTOMER\\' AND u."active"=TRUE LIMIT 1',
${indent}    ${customerVariable}.id,
${indent}    ${sessionVariable}.organizationId,
${indent}  ); /* ${marker} */
${indent}}`)

  fs.writeFileSync(filePath, source)
  patchedCount += 1
}

if (patchedCount !== 1) {
  throw new Error(`linked customer app detection: expected 1 patched chunk, found ${patchedCount}`)
}

console.log(`${marker} patched`)
