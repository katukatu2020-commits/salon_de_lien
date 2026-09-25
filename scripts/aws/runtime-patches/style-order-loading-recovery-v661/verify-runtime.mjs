import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const snapshot = process.argv[2] === 'snapshot'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const server = read('server.js')
const styleClient = read('public/style-admin-controls-v618.js')
const rootLayout = read('.next/server/chunks/1425.js')

assert.match(server, /X-Lien-Customer-Registration-Link-Recovery', 'v660'/)
assert.match(styleClient, /api\/lien-style-order-v634/)
assert.match(styleClient, /__orimiaStyleAdminLocalPaginationV650/)
assert.match(rootLayout, /orimia-customer-registration-link-recovery-v660/)

if (snapshot) {
  assert.doesNotMatch(server, /X-Lien-Style-Order-Loading-Recovery/)
  assert.doesNotMatch(styleClient, /__orimiaStyleOrderLoadingRecoveryV661/)
  assert.doesNotMatch(rootLayout, /orimia-global-loading-recovery-v661/)
  assert.ok(!fs.existsSync(path.join(root, 'public/ui-transition-v661.js')))
  console.log(JSON.stringify({ snapshot: true, parent: 'v660' }))
  process.exit(0)
}

const transition = read('public/ui-transition-v661.js')
assert.match(server, /X-Lien-Style-Order-Loading-Recovery', 'v661'/)
assert.match(server, /style-admin-controls-v618\.js\?v=661-order-recovery1/)
assert.equal((server.match(/ui-transition-v661\.js\?v=661-loading-recovery1/g) || []).length, 2)
assert.equal((server.match(/onerror=.*orimiaUiReady/g) || []).length, 2)
assert.match(styleClient, /__orimiaStyleOrderLoadingRecoveryV661/)
assert.match(styleClient, /requestedPageV650: destinationPage/)
assert.match(styleClient, /focusPostIdV661: postId/)
assert.match(styleClient, /writeListFilters\(canonical, false\) \/\* style-order-loading-recovery-v661 \*\//)
assert.match(styleClient, /window\.setTimeout\(\(\) => \{\s*timedOut = true\s*controller\.abort\(\)\s*\}, 10000\)/)
assert.match(rootLayout, /orimia-global-loading-recovery-v661/)
assert.match(rootLayout, /__orimiaGlobalLoadingRecoveryV661/)
assert.match(rootLayout, /watchdog-timeout/)
assert.match(transition, /__orimiaUiTransitionV661/)
assert.match(transition, /public-dom-ready/)
assert.match(transition, /armHardFallback\(3600\)/)
assert.match(transition, /style-order-loading-recovery-v661/)

for (const name of [
  'layout-runtime-v518-release1.navigation-loading-v536-release1.admin-sidebar-labels-v578.navigation-loader-scope-v623.style-loader-v639.style-list-v640.loading-recovery-v661.js',
  'layout-d1470003e928b0b1.customertabs-v503.ui-transition-v516-release5.navigation-loading-v536-release1.navigation-loader-scope-v623.style-loader-v639.style-list-v640.loading-recovery-v661.js',
]) {
  const source = read(`.next/static/chunks/app/${name}`)
  assert.match(source, /__orimiaUiTransitionV661/)
  assert.match(source, /style-order-loading-recovery-v661/)
}

console.log(JSON.stringify({
  release: 'style-order-loading-recovery-v661',
  runtimeVerified: true,
  orderDestinationPagination: true,
  mutationTimeout: true,
  globalLoaderWatchdog: true,
  standaloneLoaderFallback: true,
}))
