import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const client = read('sales-ledger-client-v318.js')
const server = read('server.js')
const service = read('sales-ledger-accounts-v318.js')
const marker = 'sales-ledger-month-filter-v534'

for (const required of [
  `const VERSION = '${marker}'`,
  'const monthValueInTokyo',
  'const monthRange',
  'const shiftMonth',
  'const monthLabel',
  'data-sl-month-caption',
  'data-sl-month-shift="-1"',
  'data-sl-month-shift="1"',
  'data-sl-current-month',
  'type="month"',
  'max="${currentMonth}"',
  'initialRange.from',
  'initialRange.to',
  'function syncMonthFromDates',
  'const sequence = ++loadSequence',
  'sequence !== loadSequence',
  'void load(root)',
  '対象月',
  '詳細条件',
  '今月',
]) assert.ok(client.includes(required), `sales ledger invariant missing: ${required}`)

assert.equal(client.includes(`const VERSION = 'sales-ledger-layout-v413'`), false)
assert.equal(client.includes('now.getFullYear() - 1'), false)
assert.equal((client.match(/type="month"/g) || []).length, 1)
assert.equal((client.match(/data-sl-month-filter-v534/g) || []).length, 0)
assert.match(client, /\.sl-month-filter\{display:flex/)
assert.match(client, /@media\(max-width:700px\)\{\.sl-month-filter/)
assert.match(client, /root\.querySelector\('\[name=from\]'\)\.value = range\.from/)
assert.match(client, /root\.querySelector\('\[name=to\]'\)\.value = range\.to/)
assert.match(client, /root\.querySelector\('\[data-select-all\]'\)\.checked = Boolean\(state\.rows\.length\)/)

for (const required of [
  `X-Lien-Sales-Ledger-Month-Filter', 'v534'`,
  `X-Lien-Customer-Registration-Profile', 'v533'`,
  `X-Lien-Customer-Account-Lifecycle', 'v532'`,
  `X-Lien-Billing-Display-Mask', 'v531'`,
  `X-Lien-Customer-Home-Menu-Order', 'v530'`,
  `X-Lien-Customer-Desktop-Frontend', 'v529'`,
  `X-Lien-Customer-Home-Branding', 'v528'`,
  `X-Lien-Line-Booking-UI-Parity', 'v527'`,
]) assert.ok(server.includes(required), `readiness invariant missing: ${required}`)

assert.match(service, /const start = localDate\(url\.searchParams\.get\('from'\)\)/)
assert.match(service, /const end = localDate\(url\.searchParams\.get\('to'\), true\)/)
assert.match(service, /\+09:00/)
assert.match(service, /WHERE c\."organizationId"=\$1 AND c\."deletedAt" IS NULL/)
assert.match(service, /s\."paidAt">=\$2::timestamptz/)
assert.match(service, /s\."paidAt"<=\$3::timestamptz/)

console.log(JSON.stringify({ release: marker, runtimeVerified: true, monthlyApiBoundsVerified: true }))
