import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const chunkDirectory = `${root}/.next/server/chunks`
const marker = 'customer-linked-app-detection-v475'
const patched = []

for (const entry of fs.readdirSync(chunkDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.js')) continue
  const filePath = `${chunkDirectory}/${entry.name}`
  const source = fs.readFileSync(filePath, 'utf8')
  if (source.includes(marker)) patched.push({ filePath, source })
}

if (patched.length !== 1) {
  throw new Error(`expected one linked-app customer detail chunk, found ${patched.length}`)
}

const { source } = patched[0]
const assertions = [
  [source.includes('if (el.appUsers.length === 0)'), 'linked lookup only runs without a direct app account'],
  [source.includes('FROM "CustomerStoreLink" link JOIN "AppUser" u'), 'customer-store link account lookup exists'],
  [source.includes('link."customerId"=$1 AND link."organizationId"=$2'), 'linked lookup is customer and tenant scoped'],
  [source.includes('u."role"=\\\'CUSTOMER\\\' AND u."active"=TRUE'), 'only active customer accounts qualify'],
  [source.includes('el.id,') && source.includes('F.organizationId,'), 'bound customer and organization values are used'],
  [source.includes('el.appUsers.length === 0\n                  ? await require("qrcode")'), 'existing QR decision remains account based'],
  [source.includes('value: el.appUsers[0]?.email'), 'registered email uses the unified account result'],
]

for (const [condition, message] of assertions) {
  if (!condition) throw new Error(message)
}

const linkedLookupIndex = source.indexOf(marker)
const registrationQrIndex = source.indexOf('customerRegistrationQr =')
if (linkedLookupIndex < 0 || registrationQrIndex < 0 || linkedLookupIndex > registrationQrIndex) {
  throw new Error('linked account lookup must run before QR generation')
}

console.log(`customer linked app runtime verified (${assertions.length} assertions)`)
