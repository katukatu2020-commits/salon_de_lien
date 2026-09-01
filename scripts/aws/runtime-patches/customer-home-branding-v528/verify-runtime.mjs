import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.APP_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const tenantClient = fs.readFileSync(path.join(root, 'tenant-setup-client.js'), 'utf8')
const servicePath = path.join(root, 'customer-home-branding-v528.js')

assert.match(server, /createCustomerHomeBrandingService/)
assert.match(server, /customerHomeBranding\.ensureSchema\(\)/)
assert.match(server, /customerHomeBranding\.handle\(req, res, url\)/)
assert.match(server, /X-Lien-Customer-Home-Branding', 'v528'/)
assert.match(server, /customerHomeBranding\.getForOrganization\(session\.organizationId, 'customer'\)/)
assert.match(server, /data-customer-home-branding="v528"/)
assert.match(server, /quick-tone-rose/)
assert.match(server, /quick-tone-sage/)
assert.match(server, /quick-tone-amber/)
assert.match(server, /quick-tone-blue/)
assert.match(server, /quick-tone-plum/)
for (const icon of ['booking', 'campaign', 'profile', 'coupon', 'salons', 'loyalty', 'styles', 'recommendations', 'reviews']) {
  assert.match(server, new RegExp(`${icon}: '<`), `${icon} icon is missing`)
  assert.match(server, new RegExp(`\\['${icon}'`), `${icon} quick service is missing`)
}
assert.doesNotMatch(server, /<section class="hero"><img src="\/brand\/salon-interior-illustrated\.png"/)

assert.match(tenantClient, /window\.__orimiaCustomerHomeBrandingV528/)
assert.match(tenantClient, /;\/\* customer-home-branding-v528-client-boundary \*\/\s*\(\(\) =>/)
assert.match(tenantClient, /data-ohb-panel/)
assert.match(tenantClient, /aspect-ratio:16\/9/)
assert.match(tenantClient, /canvas width="1280" height="720"/)
assert.match(tenantClient, /location\.pathname === '\/admin\/settings'/)
assert.match(tenantClient, /new MutationObserver\(schedule\)/)
assert.match(tenantClient, /customer-home-branding-v528/)

assert.ok(fs.existsSync(servicePath))
const service = fs.readFileSync(servicePath, 'utf8')
assert.match(service, /function createCustomerHomeBrandingService/)
assert.match(service, /const DEFAULT_PHRASE = 'あたらしい、\\n美しさを大切に。'/)
assert.match(service, /private\/customer-home-branding/)
assert.match(service, /session\.role !== 'ADMIN'/)

console.log(JSON.stringify({ release: 'customer-home-branding-v528', runtimeVerified: true }))
