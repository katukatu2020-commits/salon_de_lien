import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const nextRoot = path.join(root, '.next')
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const shell = fs.readFileSync(path.join(root, 'public', 'shell-consistency-v518.js'), 'utf8')
const experience = fs.readFileSync(path.join(root, 'customer-experience-v503.js'), 'utf8')
const serverCommunityChunk = fs.readFileSync(path.join(nextRoot, 'server', 'chunks', '2616.js'), 'utf8')
const clientCommunityChunk = fs.readFileSync(path.join(nextRoot, 'static', 'chunks', '6012-community-customer-privacy-v546.js'), 'utf8')
const customerLayout = fs.readFileSync(path.join(nextRoot, 'static', 'chunks', 'app', 'u', '(account)', 'layout-customer-mobile-nav-v425.navigation-privacy-v546.js'), 'utf8')
const appBuildManifest = fs.readFileSync(path.join(nextRoot, 'app-build-manifest.json'), 'utf8')

assert.match(server, /X-Lien-Customer-Navigation-Privacy', 'v546'/)
assert.match(server, /X-Lien-Customer-Profile-Auto-Upload', 'v545'/)
assert.equal((server.match(/customer-experience-v503\.js\?v=546-navigation-privacy1/g) || []).length, 2)
assert.match(server, /shell-consistency-v518\.js\?v=546-navigation-privacy1/)
assert.match(server, /layout-customer-mobile-nav-v425\.navigation-privacy-v546\.js/)
assert.doesNotMatch(server, /shell-consistency-v518\.js\?v=518-release1/)

assert.match(shell, /function samePage\(left, right\)/)
assert.match(shell, /while \(routes\.length && samePage\(routes\.at\(-1\), route\)\) routes\.pop\(\)/)
assert.match(shell, /key === CUSTOMER_STACK_KEY && samePage\(routes\.at\(-1\), current\)/)
assert.match(shell, /window\.__orimiaCustomerNavigateBackV546/)
assert.match(shell, /customer-navigation-privacy-v546/)

assert.match(experience, /window\.__orimiaCustomerNavigateBackV546\(fallback\)/)
assert.doesNotMatch(experience, /if \(history\.length > 1\) history\.back\(\)/)
assert.match(experience, /customer-navigation-privacy-v546/)
assert.match(customerLayout, /customer-experience-v503\.js\?v=546-navigation-privacy1/)

assert.match(serverCommunityChunk, /"staff"===t\?s\.jsx\("span"[^]*?children:"公開中"\}\):null/)
assert.match(clientCommunityChunk, /"staff"===s\?\(0,a\.jsx\)\("span"[^]*?children:"公開中"\}\):null/)
assert.match(clientCommunityChunk, /customer-navigation-privacy-v546/)
assert.match(appBuildManifest, /6012-community-customer-privacy-v546\.js/)
assert.doesNotMatch(appBuildManifest, /6012-community-timezone-v420\.js/)

console.log(JSON.stringify({ release: 'customer-navigation-privacy-v546', verified: true }))
