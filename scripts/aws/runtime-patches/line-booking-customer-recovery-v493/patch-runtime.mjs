import fs from 'node:fs'

const root = process.env.LIEN_APP_ROOT || '/app'
const linePath = `${root}/line-reservations-v436.js`
const serverPath = `${root}/server.js`

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function replaceBetween(source, start, end, replacement, label) {
  const startIndex = source.indexOf(start)
  if (startIndex < 0) throw new Error(`${label}: start marker was not found`)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (endIndex < 0) throw new Error(`${label}: end marker was not found`)
  if (source.indexOf(start, startIndex + start.length) >= 0) throw new Error(`${label}: start marker was not unique`)
  return source.slice(0, startIndex) + replacement + source.slice(endIndex)
}

let line = fs.readFileSync(linePath, 'utf8')
line = replaceOnce(
  line,
  'async function syncExistingLineCustomer(tx, { customer, organizationId, identity, name, phone }) {',
  `async function resolveLineBookingCustomer(customerNameAutoMerge, tx, options) { /* line-booking-customer-recovery-v493 */
  try {
    return await customerNameAutoMerge.resolveOrCreate(tx, options)
  } catch (error) {
    if (!options.existingCustomerId || Number(error?.statusCode) !== 404) throw error
    return customerNameAutoMerge.resolveOrCreate(tx, { ...options, existingCustomerId: null })
  }
}

async function syncExistingLineCustomer(tx, { customer, organizationId, identity, name, phone }) {`,
  'LINE stale-customer recovery helper',
)

line = replaceBetween(
  line,
  '    let customer = await customerNameAutoMerge.resolveOrCreate(tx, {',
  '    await tx.$executeRawUnsafe(`INSERT INTO "CustomerLineIdentity"',
  `    const mergeOptions = {
      organizationId: connection.organizationId,
      existingCustomerId: existingIdentity[0]?.customerId || null,
      name,
      phone,
      overwriteName: true,
      overwritePhone: true,
      actorLabel: 'LINE予約時自動統合',
      createData: { staffAssignmentType: 'free', memo: 'LINE公式アカウントから予約登録' },
    }
    let customer = await resolveLineBookingCustomer(customerNameAutoMerge, tx, mergeOptions)
    customer = await syncExistingLineCustomer(tx, { customer, organizationId: connection.organizationId, identity, name, phone })
`,
  'LINE customer resolution call',
)

line = replaceOnce(
  line,
  '  richMenuDefinition,\n  slotAvailable,',
  '  richMenuDefinition,\n  resolveLineBookingCustomer,\n  slotAvailable,',
  'LINE recovery helper export',
)
fs.writeFileSync(linePath, line)

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceOnce(
  server,
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Name-Auto-Merge', 'v489')",
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Name-Auto-Merge', 'v489')\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Line-Booking-Customer-Recovery', 'v493')",
  'production release marker',
)
fs.writeFileSync(serverPath, server)

console.log('LINE booking customer recovery v493 runtime patched.')
