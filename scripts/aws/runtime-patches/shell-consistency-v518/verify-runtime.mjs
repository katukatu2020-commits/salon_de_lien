import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')

const server = read('server.js')
const shell = read('public/shell-consistency-v518.js')
const shellCss = read('public/shell-consistency-v518.css')
const layout = read('.next/static/chunks/app/layout-runtime-v518-release1.js')
const appManifest = read('.next/app-build-manifest.json')
const customerChunk = read('.next/static/chunks/app/u/(account)/layout-customer-mobile-nav-v425.orimia-v518.js')
const customerServerChunk = read('.next/server/chunks/1597.js')
const customerExperience = read('customer-experience-v508.js')
const customerStandalone = read('customer-experience-v503.js')
const brandRuntime = read('public/orimia-brand-v503.js')
const customerManifest = JSON.parse(read('public/powered-by-orimia.webmanifest'))
const storeManifest = JSON.parse(read('public/orimia-for-salon.webmanifest'))

assert.match(server, /X-Lien-Shell-Consistency', 'v518'/)
assert.match(server, /orimia-shell-consistency-style-v518/)
assert.match(server, /orimia-shell-consistency-script-v518/)
assert.match(server, /window\.__orimiaBrandV503=true/)
assert.match(server, /const adminRoute = pathname === '\/admin'/)
assert.match(server, /const customerRoute = pathname === '\/u'/)
assert.match(server, /layout-customer-mobile-nav-v425\.orimia-v518\.js/)
assert.match(server, /customer-experience-v508\.js\?v=518-release1/)
assert.match(server, /customer-experience-v503\.js\?v=518-release1/)
assert.match(server, /<span class="brand-script">ORIMIA for Salon<\/span>/)
assert.doesNotMatch(server, /if \(!pathname\.startsWith\('\/u\/'\)\) return output/)

assert.match(shell, /__orimiaShellConsistencyV518/)
assert.match(shell, /admin-mobile-bottom-nav-v518/)
assert.match(shell, /orimia-admin-mobile-header-v518/)
assert.match(shell, /orimia-customer-header-v518/)
assert.match(shell, /data-customer-shell-back-v518/)
assert.match(shell, /ORIMIA for Salon/)
assert.match(shell, /\/orimia-for-salon\.webmanifest\?v=518/)

assert.match(shellCss, /--orimia-admin-sidebar-width-v518: 18rem/)
assert.match(shellCss, /padding-left: var\(--orimia-admin-sidebar-width-v518\)/)
assert.match(shellCss, /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/)
assert.match(shellCss, /grid-template-areas: "back brand menu news"/)
assert.match(shellCss, /#customer-mobile-bottom-nav/)

assert.match(layout, /const CUSTOMER_BRAND = 'ORIMIA for Salon'/)
assert.match(layout, /shell-consistency-v518/)
assert.match(appManifest, /layout-runtime-v518-release1\.js/)
assert.doesNotMatch(appManifest, /layout-runtime-v517-release1\.js/)
assert.match(customerChunk, /customer-premium-brand-script",children:"ORIMIA for Salon"/)
assert.match(customerChunk, /shell-consistency-v518/)
assert.match(customerServerChunk, /customer-premium-brand-script",children:"ORIMIA for Salon"/)

for (const source of [customerExperience, customerStandalone, brandRuntime]) {
  assert.match(source, /ORIMIA for Salon/)
  assert.doesNotMatch(source, /Powered by ORIMIA/)
}

for (const manifest of [customerManifest, storeManifest]) {
  assert.equal(manifest.name, 'ORIMIA for Salon')
  assert.equal(manifest.short_name, 'ORIMIA')
}

console.log(JSON.stringify({ release: 'shell-consistency-v518', verified: true }))
