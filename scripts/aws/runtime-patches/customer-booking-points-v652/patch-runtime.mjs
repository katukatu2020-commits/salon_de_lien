import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const release = 'customer-booking-points-v652'
const here = path.dirname(fileURLToPath(import.meta.url))
const changes = []

function target(file) { return path.join(root, file) }
function read(file) { return fs.readFileSync(target(file), 'utf8') }

function replaceExact(file, before, after, label) {
  const source = read(file)
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one v651 parent anchor in ${file}, found ${count}`)
  fs.writeFileSync(target(file), source.replace(before, after))
  changes.push({ file, label })
}

fs.copyFileSync(path.join(here, 'customer-booking-points-v652.js'), target('customer-booking-points-v652.js'))
changes.push({ file: 'customer-booking-points-v652.js', label: 'install the server-authoritative booking adjustment service' })
fs.copyFileSync(path.join(here, 'customer-booking-points-v652-client.js'), target('public/customer-booking-points-v652.js'))
changes.push({ file: 'public/customer-booking-points-v652.js', label: 'install the customer booking points controls' })

replaceExact(
  'stamp-booking-rewards-v644.js',
  "const { createCustomerBookingCouponService: createBaseService } = require('./customer-booking-coupon-v616')",
  "const { createCustomerBookingCouponService: createBaseService } = require('./customer-booking-points-v652')",
  'route stamp rewards through booking points and pricing',
)

{
  const file = 'ui-workflows-v294.js'
  const source = read(file)
  const startMarker = ';(() => {\n  if (window.__lienCustomerBookingCouponV366) return'
  const endMarker = '\n\n;(() => {\n  /* asset-persistence-banner-v462'
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start)
  if (start < 0 || end < 0 || source.indexOf(startMarker, start + 1) >= 0) {
    throw new Error('booking workflow replacement: unexpected v651 parent section')
  }
  const workflow = fs.readFileSync(path.join(here, 'ui-workflows-booking-v652.js'), 'utf8').trimEnd()
  fs.writeFileSync(target(file), source.slice(0, start) + workflow + source.slice(end))
  changes.push({ file, label: 'apply points and coupons once before the booking response resolves' })
}

replaceExact(
  'server.js',
  `  if (pathname === '/u/appointments' && !output.includes('customer-booking-confirmation-v616')) {
    output = output.replace('</head>', '<script id="customer-booking-confirmation-v616" src="/customer-booking-confirmation-v616.js?v=645-pricing1" defer></script></head>')
  } /* customer-booking-confirmation-v616-assets */`,
  `  if (pathname === '/u/appointments' && !output.includes('customer-booking-confirmation-v616')) {
    output = output.replace('</head>', '<script id="customer-booking-confirmation-v616" src="/customer-booking-confirmation-v616.js?v=645-pricing1" defer></script><script id="customer-booking-points-v652" src="/customer-booking-points-v652.js?v=652-release1" defer></script></head>')
  } /* customer-booking-confirmation-v616-assets */`,
  'load points controls on customer booking step four',
)

replaceExact(
  'public/customer-booking-confirmation-v616.js',
  "selected?.benefitKind === 'STAMP_MENU_FREE' ? 'スタンプカード特典が予約と会計に適用され、お支払い目安は0円になります。' : selected ? 'クーポンは会計時に適用されます。'",
  "selected?.benefitKind === 'STAMP_MENU_FREE' ? 'スタンプカード特典を予約金額に適用し、お支払い目安は0円になります。' : selected ? 'クーポンを予約金額に適用します。'",
  'describe booking-time coupon pricing accurately',
)

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Business-Application-Phone-Type', 'v651') /* business-application-phone-type-v651-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  readinessAnchor + "\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Booking-Points', 'v652') /* customer-booking-points-v652-ready */",
  'publish the v652 readiness marker',
)

fs.writeFileSync('/tmp/customer-booking-points-v652-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release, changedFiles: [...new Set(changes.map(change => change.file))], changes: changes.length }))
