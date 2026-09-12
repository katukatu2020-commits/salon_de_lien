import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const manifestPath = '/tmp/customer-registration-name-fields-v633-changes.json'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const count = (source, value) => source.split(value).length - 1

assert.ok(fs.existsSync(manifestPath), 'v633 change manifest is missing')
const changes = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
assert.deepEqual(
  [...new Set(changes.map(change => change.file))].sort(),
  [
    '.next/server/app/u/register/[token]/page.js',
    '.next/server/chunks/2241.js',
    'prisma/schema.prisma',
    'server.js',
  ],
  'v633 modified an unexpected runtime file',
)

const page = read('.next/server/app/u/register/[token]/page.js')
const actions = read('.next/server/chunks/2241.js')
const schema = read('prisma/schema.prisma')
const server = read('server.js')

for (const field of ['lastName', 'firstName', 'lastNameKana', 'firstNameKana']) {
  assert.equal(count(page, `name:"${field}"`), 1, `${field} input must appear exactly once`)
  assert.match(schema, new RegExp(`\\n  ${field}\\s+String\\?`), `${field} schema field is missing`)
}
assert.doesNotMatch(page, /name:"name",required:!0,className:"lien-input"/)
assert.match(page, /error==="name"/)
assert.match(page, /姓名とフリガナをすべて入力してください/)
assert.match(actions, /customer-registration-name-v633\.js/)
assert.match(actions, /parseCustomerRegistrationNameV633/)
assert.match(actions, /registrationNameV633\|\|\(0,l\.redirect\)\(i\("name"\)\)/)
assert.match(actions, /フリガナ: \$\{registrationNameKanaV633\}/)
assert.match(actions, /UPDATE "Customer" SET "lastName"=\$2,"firstName"=\$3,"lastNameKana"=\$4,"firstNameKana"=\$5/)
assert.match(actions, /provisionalCustomer/)
assert.equal(count(server, 'X-Lien-Customer-Registration-Name-Fields'), 1)
assert.match(server, /X-Lien-Customer-Registration-Name-Fields', 'v633'/)
assert.match(server, /X-Lien-Salon-Onboarding-Guides', 'removed-v632'/)
assert.ok(fs.existsSync(path.join(root, 'customer-registration-name-v633.js')))
assert.ok(fs.existsSync(path.join(root, 'ensure-customer-name-fields-v633.cjs')))
assert.ok(fs.existsSync('/usr/local/bin/lien-entrypoint-v632'))

console.log(JSON.stringify({
  release: 'customer-registration-name-fields-v633',
  runtimeVerified: true,
  separateNameInputs: 4,
  structuredNamePersistence: true,
  provisionalCustomerMergeRetained: true,
}))
