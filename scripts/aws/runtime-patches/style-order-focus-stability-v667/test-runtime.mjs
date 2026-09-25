import assert from 'node:assert/strict'
import fs from 'node:fs'
import { patchServerRuntime, patchStyleAdminClient } from './runtime-transform.mjs'

const parentServer = [
  "const assets = '<script id=\"orimia-style-order-input-stability-v666\" src=\"/style-order-input-stability-v666.js?v=666-release1\" defer></script>'",
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Order-Input-Stability', 'v666') /* style-order-input-stability-v666-ready */",
].join('\n')
const deferredScan = `  function scheduleScan() {
    if (scanQueued) return
    scanQueued = true
    requestAnimationFrame(scan)
  }`
const parentStyleClient = [
  '  window.__orimiaStyleOrderLoadingRecoveryV661 = true',
  deferredScan,
  deferredScan,
  "window.dispatchEvent(new CustomEvent('orimia:style-order-saved-v666'))",
].join('\n')

const server = patchServerRuntime(parentServer)
const styleClient = patchStyleAdminClient(parentStyleClient)
const stabilityClient = fs.readFileSync(new URL('./style-order-focus-stability-v667.js', import.meta.url), 'utf8')

assert.match(server, /style-order-focus-stability-v667\.js\?v=667-release1/)
assert.doesNotMatch(server, /id="orimia-style-order-input-stability-v666"/)
assert.match(server, /X-Lien-Style-Order-Focus-Stability', 'v667'/)
assert.equal(server.split('id="orimia-style-order-focus-stability-v667"').length - 1, 1)
assert.equal(styleClient.split('queueMicrotask(scan)').length - 1, 2)
assert.doesNotMatch(styleClient, /requestAnimationFrame\(scan\)/)
assert.match(styleClient, /orimia:style-order-saved-v666/)
assert.match(stabilityClient, /const drafts = new Map\(\)/)
assert.match(stabilityClient, /input\.value = draft/)
assert.match(stabilityClient, /root\.queueMicrotask\(restoreDrafts\)/)
assert.match(stabilityClient, /focusTarget\.focus\(\{ preventScroll: true \}\)/)
assert.doesNotMatch(stabilityClient, /requestAnimationFrame/)
assert.match(stabilityClient, /transform: none !important/)
assert.match(stabilityClient, /orimia:style-order-saved-v666/)
assert.doesNotMatch(stabilityClient, /innerHTML\s*=/)
new Function(stabilityClient)

console.log(JSON.stringify({
  release: 'style-order-focus-stability-v667',
  testsPassed: true,
}))
