import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const server = read('server.js')
const links = read('customer-links-v293.js')
const appointments = read('appointment-operations-v267.js')
const service = read('customer-global-profile-v512.js')

assert.equal((server.match(/X-Lien-Customer-Global-Profile/g) || []).length, 1)
assert.match(server, /X-Lien-Customer-Global-Profile', 'v512'/)
assert.match(server, /customerGlobalProfile\.reconcileAll\(prisma\)/)
assert.match(server, /data: \{ nickname: nickname \|\| null, displayName: name \}/)

assert.match(links, /customer-global-profile-v512/)
assert.match(links, /synchronizeAppUser\(tx, appUserId\)/)
assert.match(links, /Object\.assign\(source, synchronizedSource\.identity \|\| \{\}\)/)

assert.match(appointments, /customer-global-profile-v512/)
assert.match(appointments, /overwriteName: true/)
assert.match(appointments, /await customerGlobalProfile\.synchronizeAppUser\(tx, source\.appUserId\)/)

assert.match(service, /async function reconcileAll/)
assert.match(service, /async function syncIdentityFromCustomer/)
assert.match(service, /async function syncHairProfileFromCustomer/)
assert.match(service, /async function syncProfileImageFromCustomer/)
assert.match(service, /async function auditConsistency/)
assert.match(service, /data: \{ displayName: desired\.name \}/)

const chunkDirectory = path.join(root, '.next', 'server', 'chunks')
const actionChunks = fs.readdirSync(chunkDirectory)
  .filter(name => name.endsWith('.js'))
  .map(name => [name, fs.readFileSync(path.join(chunkDirectory, name), 'utf8')])
  .filter(([, source]) => source.includes('customer-global-profile-v512'))
assert.equal(actionChunks.length, 1)
const [chunkName, actions] = actionChunks[0]
assert.match(actions, /syncIdentityFromCustomer\(o,e,n\)/)
assert.match(actions, /syncHairProfileFromCustomer\(t,e,a\)/)
assert.match(actions, /syncProfileImageFromCustomer\(t,e,i\.reference\)/)
assert.match(actions, /birthYear:a\?\(0,U\.eI\)\(a\):null/)

const allChunks = fs.readdirSync(chunkDirectory)
  .filter(name => name.endsWith('.js'))
  .map(name => fs.readFileSync(path.join(chunkDirectory, name), 'utf8'))
const listChunk = allChunks.find(source => source.includes('customer-public-code-parity-v476-list'))
const detailChunk = allChunks.find(source => source.includes('customer-public-code-parity-v476-detail'))
assert.ok(listChunk)
assert.ok(detailChunk)
assert.ok(listChunk.includes('function R(e){return`C-T-${String(e).replace(/[^a-z0-9]/gi,"").slice(-5).toUpperCase()}`}'))
assert.ok(detailChunk.includes('return `C-T-${String(e).replace(/[^a-z0-9]/gi, "").slice(-5).toUpperCase()}`;'))
assert.equal(allChunks.some(source => source.includes('`C-${e.slice(-5).toUpperCase()}`')), false)

console.log(JSON.stringify({ release: 'customer-global-profile-v512', chunkName, provisionalCodeNamespace: 'C-T' }))
