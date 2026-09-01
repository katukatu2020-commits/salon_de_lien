import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.APP_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')

assert.match(server, /X-Lien-Customer-Desktop-Frontend', 'v529'/)
assert.equal((server.match(/customer-experience-v503\.js\?v=529-release1/g) || []).length, 2)
assert.equal((server.match(/customer-experience-v508\.js\?v=529-release1/g) || []).length, 1)
assert.doesNotMatch(server, /customer-experience-v50[38]\.js\?v=518-release1/)

for (const name of ['customer-experience-v503.js', 'customer-experience-v508.js']) {
  const client = fs.readFileSync(path.join(root, name), 'utf8')
  assert.match(client, /;\/\* customer-desktop-frontend-v529-boundary \*\/\s*\(\(\) =>/)
  assert.match(client, /window\.__orimiaCustomerDesktopV529/)
  assert.match(client, /orimia-customer-desktop-nav-v529/)
  assert.match(client, /@media \(min-width:1024px\)/)
  assert.match(client, /!media\.matches/)
  assert.match(client, /customer-desktop-frontend-v529/)
}

console.log(JSON.stringify({ release: 'customer-desktop-frontend-v529', runtimeVerified: true }))
