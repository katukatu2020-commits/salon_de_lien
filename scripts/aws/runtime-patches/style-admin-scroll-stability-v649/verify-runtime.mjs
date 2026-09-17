import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const mode = process.argv[2] || 'verify'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const server = read('server.js')
const client = read('public/style-admin-controls-v618.js')
const stylesheet = read('public/style-admin-controls-v618.css')

if (mode === 'snapshot') {
  assert.match(server, /X-Lien-Business-Application-Rejection', 'v648'/)
  assert.match(server, /style-admin-controls-v618\.js\?v=647-pagination1/)
  assert.match(client, /restorePaginationViewportV647/)
  assert.doesNotMatch(client, /__orimiaStyleAdminScrollStabilityV649/)
  console.log(JSON.stringify({ release: 'style-admin-scroll-stability-v649', mode, parent: 'v648', ok: true }))
  process.exit(0)
}

assert.match(server, /X-Lien-Style-Admin-Scroll-Stability', 'v649'/)
assert.match(server, /style-admin-controls-v618\.js\?v=649-scroll1/)
assert.match(server, /style-admin-controls-v618\.css\?v=649-scroll1/)
assert.match(client, /window\.__orimiaStyleAdminScrollStabilityV649 = true/)
assert.match(client, /History\.prototype\.pushState/)
assert.match(client, /write\.call\(history, history\.state, '', url\)/)
assert.match(client, /listHeight: listRoot\.getBoundingClientRect\(\)\.height/)
assert.match(client, /listRoot\.style\.minHeight = Math\.ceil\(options\.paginationViewportV649\.listHeight\)/)
assert.match(client, /restorePaginationViewportV649\(options\.paginationViewportV649\)/)
assert.doesNotMatch(client, /restorePaginationViewportV647/)
assert.doesNotMatch(client, /preservedScrollYV647/)
assert.doesNotMatch(client, /window\.requestAnimationFrame\(\(\) => \{\s*restore\(\)/)
assert.match(stylesheet, /overflow-anchor: none/)

console.log(JSON.stringify({ release: 'style-admin-scroll-stability-v649', mode, nativeHistory: true, clickViewportCapture: true, delayedRestoreRemoved: true, scrollAnchorDisabled: true }))
