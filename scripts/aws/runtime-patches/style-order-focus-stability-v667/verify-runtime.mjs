import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const snapshot = process.argv.includes('snapshot')
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const styleClient = fs.readFileSync(path.join(root, 'public', 'style-admin-controls-v618.js'), 'utf8')
const stabilityClientPath = path.join(root, 'public', 'style-order-focus-stability-v667.js')

assert.match(server, /X-Lien-Style-Order-Input-Stability', 'v666'/)
assert.match(styleClient, /orimia:style-order-saved-v666/)

if (snapshot) {
  assert.match(server, /style-order-input-stability-v666\.js\?v=666-release1/)
  assert.doesNotMatch(server, /X-Lien-Style-Order-Focus-Stability/)
  assert.doesNotMatch(server, /style-order-focus-stability-v667\.js/)
  assert.doesNotMatch(styleClient, /style-order-focus-stability-v667/)
  assert.equal(styleClient.split('requestAnimationFrame(scan)').length - 1, 2)
  console.log(JSON.stringify({ release: 'style-order-focus-stability-v667', snapshotVerified: true }))
  process.exit(0)
}

const stabilityClient = fs.readFileSync(stabilityClientPath, 'utf8')
assert.equal(server.split('/* style-order-focus-stability-v667 */').length - 1, 1)
assert.match(server, /X-Lien-Style-Order-Focus-Stability', 'v667'/)
assert.match(server, /style-order-focus-stability-v667\.js\?v=667-release1/)
assert.doesNotMatch(server, /id="orimia-style-order-input-stability-v666"/)
assert.equal(server.split('id="orimia-style-order-focus-stability-v667"').length - 1, 1)
assert.match(styleClient, /orimia:style-order-saved-v666/)
assert.equal(styleClient.split('queueMicrotask(scan)').length - 1, 2)
assert.doesNotMatch(styleClient, /requestAnimationFrame\(scan\)/)
assert.equal(styleClient.split('/* style-order-focus-stability-v667 */').length - 1, 1)
assert.match(stabilityClient, /__orimiaStyleOrderFocusStabilityV667/)
assert.match(stabilityClient, /const drafts = new Map\(\)/)
assert.match(stabilityClient, /input\.value = draft/)
assert.match(stabilityClient, /root\.queueMicrotask\(restoreDrafts\)/)
assert.match(stabilityClient, /focusTarget\.focus\(\{ preventScroll: true \}\)/)
assert.doesNotMatch(stabilityClient, /requestAnimationFrame/)
assert.match(stabilityClient, /transform: none !important/)
assert.doesNotMatch(stabilityClient, /innerHTML\s*=/)
new Function(stabilityClient)

console.log(JSON.stringify({
  release: 'style-order-focus-stability-v667',
  runtimeVerified: true,
  immediateFocusRestore: true,
  hoverMotionRemoved: true,
}))
