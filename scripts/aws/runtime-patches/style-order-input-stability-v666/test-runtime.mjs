import assert from 'node:assert/strict'
import fs from 'node:fs'
import { patchServerRuntime, patchStyleAdminClient } from './runtime-transform.mjs'

const parentServer = [
  "const assets = '<script id=\"orimia-style-admin-controls-v618\" src=\"/style-admin-controls-v618.js?v=661-order-recovery1\" defer></script>'",
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Coupon-Menu-Prefill', 'v665') /* coupon-menu-prefill-v665-ready */",
].join('\n')
const parentClient = [
  '  window.__orimiaStyleOrderLoadingRecoveryV661 = true',
  "        if (!Number.isInteger(movedOrder) || movedOrder < 1) throw new Error('保存結果を確認できませんでした。')",
  '        orderInput.value = String(movedOrder)',
].join('\n')

const server = patchServerRuntime(parentServer)
const styleClient = patchStyleAdminClient(parentClient)
const stabilityClient = fs.readFileSync(new URL('./style-order-input-stability-v666.js', import.meta.url), 'utf8')

assert.match(server, /style-order-input-stability-v666\.js\?v=666-release1/)
assert.match(server, /X-Lien-Style-Order-Input-Stability', 'v666'/)
assert.equal(server.split('id="orimia-style-order-input-stability-v666"').length - 1, 1)
assert.match(styleClient, /orimia:style-order-saved-v666/)
assert.match(styleClient, /detail: \{ postId, displayOrder: movedOrder \}/)
assert.match(stabilityClient, /const drafts = new Map\(\)/)
assert.match(stabilityClient, /input\.value = draft/)
assert.match(stabilityClient, /focus\(\{ preventScroll: true \}\)/)
assert.match(stabilityClient, /transform: none !important/)
assert.match(stabilityClient, /orimia:style-order-saved-v666/)
assert.doesNotMatch(stabilityClient, /innerHTML\s*=/)
new Function(stabilityClient)

console.log(JSON.stringify({
  release: 'style-order-input-stability-v666',
  testsPassed: true,
}))
