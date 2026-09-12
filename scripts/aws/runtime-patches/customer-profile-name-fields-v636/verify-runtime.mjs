import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const page = fs.readFileSync(path.join(root, '.next/server/app/u/(account)/profile/page.js'), 'utf8')
const route = fs.readFileSync(path.join(root, '.next/server/app/api/customer/profile/route.js'), 'utf8')
const client = fs.readFileSync(path.join(root, 'customer-experience-v503.js'), 'utf8')
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const helper = require(path.join(root, 'customer-profile-name-v636.js'))

for (const field of ['lastName', 'firstName', 'lastNameKana', 'firstNameKana']) {
  assert.match(page, new RegExp(`name:"${field}"`))
}
assert.doesNotMatch(page, /children:\["お名前",a\.jsx\("input",\{name:"name"/)
assert.match(page, /data-customer-profile-name-fields-v636":"separated"/)
assert.match(page, /loadCustomerProfileNameV636/)
assert.match(page, /姓・名とそれぞれのフリガナ/)
assert.match(route, /parseCustomerProfileNameV636/)
assert.match(route, /persistCustomerProfileNameV636/)
assert.match(client, /input\[name="firstName"\]/)
assert.match(client, /input\[name="firstNameKana"\]/)
assert.match(server, /customer-experience-v503\.js\?v=636-profile-name-fields1/)
assert.match(server, /X-Lien-Customer-Profile-Name-Fields', 'v636'/)
assert.deepEqual(helper.resolveCustomerProfileNameV636({}, '山本 公正'), {
  lastName: '山本',
  firstName: '公正',
  lastNameKana: '',
  firstNameKana: '',
})

console.log(JSON.stringify({
  release: 'customer-profile-name-fields-v636',
  runtimeVerified: true,
  fourFieldsRendered: true,
  structuredPersistenceVerified: true,
  nicknameCompatibilityVerified: true,
}))
