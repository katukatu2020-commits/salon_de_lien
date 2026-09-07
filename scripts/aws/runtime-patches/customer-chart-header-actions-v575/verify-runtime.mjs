import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const commercial = fs.readFileSync(path.join(root, 'commercial-admin-v101.js'), 'utf8')

assert.match(server, /X-Lien-Customer-Chart-Header-Actions', 'v575'/)
assert.match(server, /X-Lien-Customer-Booking-Check', 'v574'/)
assert.match(commercial, /customer-chart-header-actions-v575/)
assert.match(commercial, /\[data-chart-latest-card-v561\] \.lien-chart-card-header > \.lien-chart-actions > \.lien-chart-button/)
assert.match(commercial, /height: 44px;/)
assert.match(commercial, /margin: 0 !important;/)
assert.match(commercial, /\[data-chart-history-page-v561\] \.lien-chart-history-toolbar \[data-chart-upload\]/)
assert.equal(commercial.split('customer-chart-header-actions-v575').length - 1, 1)

console.log(JSON.stringify({
  release:'customer-chart-header-actions-v575',
  verified:true,
  chartScoped:true,
  equalButtonHeight:true,
}))
