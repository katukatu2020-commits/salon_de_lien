import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const server = read('server.js')
const links = read('customer-links-v293.js')
const appointments = read('appointment-operations-v267.js')
const service = read('customer-global-profile-v513.js')

assert.match(server, /X-Lien-Customer-Global-Profile-Extended', 'v513'/)
assert.match(server, /require\('\.\/customer-global-profile-v513'\)/)
assert.match(server, /customerGlobalProfileReconciliationV513/)
assert.match(server, /syncRealNameFromCustomer\(tx, customerId, realName, session\.userId\)/)
assert.doesNotMatch(server, /require\('\.\/customer-global-profile-v512'\)/)

assert.match(links, /require\('\.\/customer-global-profile-v513'\)/)
assert.match(appointments, /require\('\.\/customer-global-profile-v513'\)/)

assert.match(service, /syncRealNameFromCustomer/)
assert.match(service, /syncPreferenceFromCustomer/)
assert.match(service, /LEFT JOIN "CustomerRealName"/)
assert.match(service, /LEFT JOIN "Preference"/)
assert.match(service, /extendedDriftAccounts/)

const chunkDirectory = path.join(root, '.next', 'server', 'chunks')
const chunks = fs.readdirSync(chunkDirectory)
  .filter(name => name.endsWith('.js'))
  .map(name => [name, fs.readFileSync(path.join(chunkDirectory, name), 'utf8')])
const actionChunks = chunks.filter(([, source]) => source.includes('customer-global-profile-v513'))
assert.equal(actionChunks.length, 1)
const [chunkName, actions] = actionChunks[0]
assert.match(actions, /syncPreferenceFromCustomer\(t,e,a\)/)
assert.equal((actions.match(/\/app\/customer-global-profile-v513\.js/g) || []).length, 4)
assert.doesNotMatch(actions, /\/app\/customer-global-profile-v512\.js/)

const listChunk = chunks.find(([, source]) => source.includes('customer-public-code-parity-v476-list'))?.[1]
const detailChunk = chunks.find(([, source]) => source.includes('customer-public-code-parity-v476-detail'))?.[1]
assert.ok(listChunk?.includes('function R(e){return`C-T-${String(e).replace(/[^a-z0-9]/gi,"").slice(-5).toUpperCase()}`}'))
assert.ok(detailChunk?.includes('return `C-T-${String(e).replace(/[^a-z0-9]/gi, "").slice(-5).toUpperCase()}`;'))

console.log(JSON.stringify({ release: 'customer-global-profile-v513', chunkName }))
