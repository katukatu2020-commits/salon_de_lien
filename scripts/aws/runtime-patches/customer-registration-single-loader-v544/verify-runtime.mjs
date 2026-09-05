import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const shellStyle = fs.readFileSync(path.join(root, 'public', 'shell-consistency-v518.css'), 'utf8')

assert.match(server, /X-Lien-Customer-Registration-Single-Loader', 'v544'/)
assert.match(server, /shell-consistency-v518\.css\?v=544-single-loader1/)
assert.doesNotMatch(server, /shell-consistency-v518\.css\?v=524-booking-transition1/)
assert.match(server, /customer-registration-single-loader-v544/)

assert.match(shellStyle, /customer-registration-single-loader-v544/)
assert.match(shellStyle, /:not\(\[data-orimia-loading-experience\]\)/)
assert.match(shellStyle, /\[data-orimia-loading-experience\]:not\(\[data-orimia-ui-ready="v516"\]\)/)
assert.match(shellStyle, /body > :is\(\.admin-app-shell, \.app\)::after/)
assert.match(shellStyle, /body::after/)
assert.ok((shellStyle.match(/background-image: none !important/g) || []).length >= 2)
assert.ok((shellStyle.match(/animation: none !important/g) || []).length >= 2)

console.log(JSON.stringify({
  release: 'customer-registration-single-loader-v544',
  runtimeVerified: true,
  legacyGatePreserved: true,
  enhancedLoaderExclusive: true,
}))
