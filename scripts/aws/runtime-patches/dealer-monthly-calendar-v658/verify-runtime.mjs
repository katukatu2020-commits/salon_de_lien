import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const snapshot = process.argv[2] === 'snapshot'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const server = read('server.js')
const dealerService = read('wholesale-ordering-v543.js')
const dealerClient = read('wholesale-ordering-client-v543.js')

assert.match(server, /X-Lien-Mobile-Workspaces', 'v657'/)
assert.match(dealerService, /orimia-mobile-workspaces-v657/)

if (snapshot) {
  assert.doesNotMatch(server, /X-Lien-Dealer-Monthly-Calendar/)
  assert.doesNotMatch(dealerService, /WholesaleDealerMonthlyPlan/)
  assert.doesNotMatch(dealerService, /dealer-monthly-calendar-v658/)
  assert.doesNotMatch(dealerClient, /dealerCalendarGrid/)
  assert.equal(fs.existsSync(path.join(root, 'public', 'dealer-monthly-calendar-v658.css')), false)
  console.log(JSON.stringify({ snapshot: true, parent: 'v657' }))
  process.exit(0)
}

const css = read(path.join('public', 'dealer-monthly-calendar-v658.css'))

assert.match(server, /X-Lien-Dealer-Monthly-Calendar', 'v658'/)
assert.match(dealerService, /CREATE TABLE IF NOT EXISTS "WholesaleDealerMonthlyPlan"/)
assert.match(dealerService, /PRIMARY KEY \("dealerId", "monthKey"\)/)
assert.match(dealerService, /calendar\|orders\|salons\|products\|pricing\|company/)
assert.match(dealerService, /\['calendar', '\/dealer\/calendar', 'calendar', '月次売上'\]/)
assert.match(dealerService, /pathname === '\/api\/dealer\/calendar'/)
assert.match(dealerService, /pathname === '\/api\/dealer\/calendar\/targets'/)
assert.match(dealerService, /o\."status"<>'CANCELLED'/)
assert.match(dealerService, /AT TIME ZONE 'Asia\/Tokyo'/)
assert.match(dealerService, /dealer-monthly-calendar-v658\.css\?v=658-release1/)
assert.match(dealerService, /wholesale-ordering-client-v543\.js\?v=658-calendar1/)

assert.match(dealerClient, /function dealerCalendarGrid\(calendar\)/)
assert.match(dealerClient, /function dealerCalendar\(\)/)
assert.match(dealerClient, /data-action="dealer-calendar-month"/)
assert.match(dealerClient, /id="dealer-calendar-plan-form"/)
assert.match(dealerClient, /monthlyForecastYen/)
assert.match(dealerClient, /newAcquisitionCount/)
assert.doesNotMatch(dealerClient, /return cells\.push/)

assert.match(css, /\.wo-dealer-calendar-v658/)
assert.match(css, /grid-template-columns: repeat\(7, minmax\(0, 1fr\)\)/)
assert.match(css, /@media \(max-width: 767\.98px\)/)
assert.match(css, /repeat\(7, minmax\(44px, 1fr\)\)/)
assert.match(css, /\.wo-calendar-compact-yen-v658/)

let depth = 0
for (let index = 0; index < css.length; index += 1) {
  if (css[index] === '{') depth += 1
  if (css[index] === '}') {
    depth -= 1
    assert.ok(depth >= 0, `unexpected closing brace at ${index}`)
  }
}
assert.equal(depth, 0, 'calendar stylesheet braces must balance')

console.log(JSON.stringify({
  release: 'dealer-monthly-calendar-v658',
  runtimeVerified: true,
  route: '/dealer/calendar',
  monthlyTargetsPersisted: true,
  cancelledOrdersExcluded: true,
  mobileCalendar: true,
}))
