import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const manifestPath = '/tmp/salon-onboarding-guide-removal-v632-changes.json'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const count = (source, value) => source.split(value).length - 1

assert.ok(fs.existsSync(manifestPath), 'v632 change manifest is missing')
const changes = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
assert.deepEqual(
  [...new Set(changes.map(change => change.file))].sort(),
  ['commercial-admin-v101.js', 'server.js', 'tenant-setup-client.js'],
  'v632 modified an unexpected runtime file',
)

const server = read('server.js')
const tenant = read('tenant-setup-client.js')
const commercial = read('commercial-admin-v101.js')

assert.equal(count(server, 'X-Lien-Salon-Onboarding-Guides'), 1)
assert.match(server, /X-Lien-Salon-Onboarding-Guides', 'removed-v632'/)
assert.match(server, /X-Lien-Dealer-Pricing-Pagination', 'v631'/)

assert.equal(count(tenant, 'salon-onboarding-guide-removal-v632'), 2)
assert.match(tenant, /window\.__orimiaSalonOnboardingGuideRemovalV632 = true/)
assert.match(tenant, /localStorage\.removeItem\(key\)/)
assert.match(tenant, /url\.searchParams\.delete\('registered'\)/)
assert.match(tenant, /document\.querySelectorAll\('\.ts-launcher'\)\.forEach/)
assert.doesNotMatch(tenant, /const shouldOpen = !state\.setup\.legacy/)
assert.doesNotMatch(tenant, /if \(state\.setup\) addLauncher\(state\.setup\)/)
assert.doesNotMatch(tenant, /WELCOME TO ORIMIA/)
assert.doesNotMatch(tenant, /lpt-welcome-card/)
assert.doesNotMatch(tenant, /function renderTour\(/)

assert.match(commercial, /<span class="ca-eyebrow">Store profile<\/span>/)
assert.doesNotMatch(commercial, /<div class="ca-setup-progress">/)
assert.doesNotMatch(commercial, /data-ca-open-setup/)
assert.match(commercial, /data-ca-store-form/)
assert.match(commercial, /data-ca-email-form/)

console.log(JSON.stringify({
  release: 'salon-onboarding-guide-removal-v632',
  runtimeVerified: true,
  firstUseTourRemoved: true,
  setupWizardRemoved: true,
  settingsFunctionsRetained: true,
  changedRuntimeFiles: 3,
}))
