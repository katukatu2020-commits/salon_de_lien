import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const snapshot = process.argv[2] === 'snapshot'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const server = read('server.js')
const service = read('business-account-approvals-v643.js')
const stylesheet = read('wholesale-ordering-v543.css')

assert.match(server, /X-Lien-Customer-Booking-Points', 'v652'/)
assert.match(server, /X-Lien-Dealer-Password-Change', 'v646'/)
assert.match(service, /existingDealerAccess/)
assert.match(service, /\/dealer\/password-change/)

if (snapshot) {
  assert.doesNotMatch(server, /X-Lien-Dealer-Password-Common-Layout/)
  assert.doesNotMatch(service, /dealerPasswordPortalPageV653/)
  assert.doesNotMatch(stylesheet, /dealer-password-common-layout-v653/)
  console.log(JSON.stringify({ snapshot: true, parent: 'v652' }))
  process.exit(0)
}

assert.match(server, /X-Lien-Dealer-Password-Common-Layout', 'v653'/)
assert.equal((service.match(/function dealerPasswordPortalPageV653/g) || []).length, 1)
assert.match(service, /if \(kind === 'dealer'\) return dealerPasswordPortalPageV653\(access, options\)/)
assert.match(service, /class="wo-body wo-dealer-body"/)
assert.match(service, /class="wo-dealer-sidebar"/)
assert.match(service, /class="wo-dealer-topbar"/)
assert.match(service, /class="wo-workspace wo-password-workspace-v653"/)
assert.match(service, /href="\/wholesale-ordering-v543\.css\?v=653-password-layout1"/)
assert.match(service, /style-src 'self' 'unsafe-inline'/)
assert.match(service, /data-password-toggle-v653/)
assert.match(stylesheet, /\/\* dealer-password-common-layout-v653 \*\//)
assert.match(stylesheet, /\.wo-password-content-v653/)
assert.match(stylesheet, /\.wo-password-toggle-v653/)

console.log(JSON.stringify({ verified: true, release: 'dealer-password-common-layout-v653' }))
