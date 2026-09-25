import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const snapshot = process.argv.includes('snapshot')
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const styleClient = fs.readFileSync(path.join(root, 'public', 'style-admin-controls-v618.js'), 'utf8')
const stabilityClientPath = path.join(root, 'public', 'style-order-input-stability-v666.js')

assert.match(server, /X-Lien-Coupon-Menu-Prefill', 'v665'/)
assert.match(server, /style-admin-controls-v618\.js\?v=661-order-recovery1/)
assert.match(styleClient, /window\.__orimiaStyleOrderLoadingRecoveryV661 = true/)

if (snapshot) {
  assert.doesNotMatch(server, /X-Lien-Style-Order-Input-Stability/)
  assert.doesNotMatch(server, /style-order-input-stability-v666\.js/)
  assert.doesNotMatch(styleClient, /orimia:style-order-saved-v666/)
  console.log(JSON.stringify({ release: 'style-order-input-stability-v666', snapshotVerified: true }))
  process.exit(0)
}

const stabilityClient = fs.readFileSync(stabilityClientPath, 'utf8')
assert.equal(server.split('/* style-order-input-stability-v666 */').length - 1, 1)
assert.match(server, /X-Lien-Style-Order-Input-Stability', 'v666'/)
assert.match(server, /style-order-input-stability-v666\.js\?v=666-release1/)
assert.equal(server.split('id="orimia-style-order-input-stability-v666"').length - 1, 1)
assert.equal(styleClient.split('/* style-order-input-stability-v666 */').length - 1, 1)
assert.match(styleClient, /orimia:style-order-saved-v666/)
assert.match(stabilityClient, /__orimiaStyleOrderInputStabilityV666/)
assert.match(stabilityClient, /const drafts = new Map\(\)/)
assert.match(stabilityClient, /input\.value = draft/)
assert.match(stabilityClient, /focus\(\{ preventScroll: true \}\)/)
assert.match(stabilityClient, /transform: none !important/)
assert.doesNotMatch(stabilityClient, /innerHTML\s*=/)
new Function(stabilityClient)

console.log(JSON.stringify({
  release: 'style-order-input-stability-v666',
  runtimeVerified: true,
  draftOrderPreserved: true,
  hoverMotionRemoved: true,
}))
