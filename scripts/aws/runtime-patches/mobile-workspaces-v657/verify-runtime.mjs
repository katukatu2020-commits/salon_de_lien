import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const snapshot = process.argv[2] === 'snapshot'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const server = read('server.js')
const dealerService = read('wholesale-ordering-v543.js')

assert.match(server, /X-Lien-Dealer-Order-Documents', 'v656'/)
assert.match(dealerService, /dealer-order-documents-v656/)

if (snapshot) {
  assert.doesNotMatch(server, /X-Lien-Mobile-Workspaces/)
  assert.doesNotMatch(server, /orimia-mobile-workspaces-v657/)
  assert.doesNotMatch(dealerService, /orimia-mobile-workspaces-v657/)
  assert.equal(fs.existsSync(path.join(root, 'public', 'mobile-workspaces-v657.css')), false)
  assert.equal(fs.existsSync(path.join(root, 'public', 'mobile-workspaces-v657.js')), false)
  console.log(JSON.stringify({ snapshot: true, parent: 'v656' }))
  process.exit(0)
}

const css = read(path.join('public', 'mobile-workspaces-v657.css'))
const mobileScript = read(path.join('public', 'mobile-workspaces-v657.js'))
assert.match(server, /X-Lien-Mobile-Workspaces', 'v657'/)
assert.match(server, /if \(adminRoute && !output\.includes\('orimia-mobile-workspaces-v657'\)\)/)
assert.match(server, /mobile-workspaces-v657\.css\?v=657-release1/)
assert.match(dealerService, /id="orimia-mobile-workspaces-v657"/)
assert.match(dealerService, /mobile-workspaces-v657\.css\?v=657-release1/)
assert.match(dealerService, /mobile-workspaces-v657\.js\?v=657-release1/)
assert.match(server, /\/\* mobile-workspaces-v657 \*\//)
assert.match(dealerService, /\/\* mobile-workspaces-v657 \*\//)

assert.match(css, /@media \(max-width: 767\.98px\)/)
assert.match(css, /html\.orimia-admin-shell-v518 body \.admin-app-shell/)
assert.match(css, /\.orimia-admin-bottom-nav-v518/)
assert.match(css, /body\.wo-dealer-body \.wo-dealer-mobile-nav/)
assert.match(css, /body\.wo-dealer-body \.wo-pricing-row/)
assert.match(css, /body\.wo-dealer-body \.wo-dealer-order-row/)
assert.match(css, /min-height: 50px/)
assert.match(css, /font-size: 16px/)
assert.match(css, /\.wo-mobile-form-disclosure-v657/)
assert.match(css, /\.ca-setup-card/)
assert.match(css, /data-orimia-admin-workspace-source-v572/)
assert.match(css, /data-inventory-orders-page-header-v572/)
assert.match(mobileScript, /matchMedia\('\(max-width: 767\.98px\)'\)/)
assert.match(mobileScript, /wo-dealer-product-form/)
assert.match(mobileScript, /preventScroll: true/)

const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '').trim()
assert.ok(withoutComments.startsWith('@media (max-width: 767.98px) {'), 'mobile stylesheet must begin inside the mobile media boundary')
let depth = 0
let closedAt = -1
for (let index = 0; index < withoutComments.length; index += 1) {
  if (withoutComments[index] === '{') depth += 1
  if (withoutComments[index] === '}') {
    depth -= 1
    assert.ok(depth >= 0, `unexpected closing brace at ${index}`)
    if (depth === 0) closedAt = index
  }
}
assert.equal(depth, 0, 'mobile stylesheet braces must balance')
assert.equal(closedAt, withoutComments.length - 1, 'all mobile declarations must remain inside the media boundary')

console.log(JSON.stringify({
  release: 'mobile-workspaces-v657',
  runtimeVerified: true,
  adminMobileOnly: true,
  dealerMobileOnly: true,
  desktopDeclarations: 0,
}))
