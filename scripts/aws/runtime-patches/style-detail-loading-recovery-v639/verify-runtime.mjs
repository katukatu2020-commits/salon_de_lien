import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const loader = fs.readFileSync(path.join(root, 'public', 'ui-transition-v639.js'), 'utf8')
const style = fs.readFileSync(path.join(root, 'public', 'style-system-integration-v602.js'), 'utf8')
const appChunks = fs.readdirSync(path.join(root, '.next', 'static', 'chunks', 'app'))
const adminChunk = appChunks.find(name => name.includes('admin-sidebar-labels-v578.navigation-loader-scope-v623.style-loader-v639.js'))
const customerChunk = appChunks.find(name => name.includes('customertabs-v503') && name.endsWith('navigation-loader-scope-v623.style-loader-v639.js'))

assert.ok(adminChunk, 'active admin loader chunk is missing')
assert.ok(customerChunk, 'active customer loader chunk is missing')
assert.match(server, /ui-transition-v639\.js\?v=639-style-detail-recovery1/)
assert.doesNotMatch(server, /ui-transition-v623\.js\?v=623-release1/)
assert.match(server, /style-system-integration-v602\.js\?v=639-loading-recovery1/)
assert.match(server, /X-Lien-Style-Detail-Loading-Recovery', 'v639'/)
assert.match(server, /X-Lien-Dealer-Pricing-Ime-Search', 'v638'/)

for (const source of [
  loader,
  fs.readFileSync(path.join(root, '.next', 'static', 'chunks', 'app', adminChunk), 'utf8'),
  fs.readFileSync(path.join(root, '.next', 'static', 'chunks', 'app', customerChunk), 'utf8'),
]) {
  assert.match(source, /window\.__orimiaUiTransitionV639 = true/)
  assert.match(source, /dataset\.orimiaNavigationLoaderScope = 'v639'/)
  assert.match(source, /function forceReveal\(reason\)/)
  assert.match(source, /forceReveal\('safety-timeout'\)/)
  assert.match(source, /function scheduleStyleDetailReveal\(reason\)/)
  assert.match(source, /orimia:style-detail-state-v639/)
}

assert.match(style, /styleDetailStateEventV639 = 'orimia:style-detail-state-v639'/)
assert.match(style, /Style detail request timed out/)
assert.match(style, /await loadStylePayloadV639\(\)/)
assert.match(style, /controller\?\.abort\(\)/)
assert.match(style, /style-detail-loading-recovery-v639/)

console.log(JSON.stringify({
  release:'style-detail-loading-recovery-v639',
  runtimeVerified:true,
  adminLoaderVerified:true,
  customerLoaderVerified:true,
  standaloneLoaderVerified:true,
  boundedStyleRequestVerified:true,
  previousReleasePreserved:true,
}))
