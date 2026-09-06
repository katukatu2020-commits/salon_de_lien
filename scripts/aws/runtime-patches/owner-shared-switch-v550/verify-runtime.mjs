import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const server = read('server.js')
const service = read('owner-shared-switch-v550.js')
const client = read('public/owner-shared-switch-v550.js')
const css = read('public/owner-shared-switch-v550.css')

assert.match(server, /createOwnerSharedSwitchService/)
assert.match(server, /ownerSharedSwitch\.handle\(req, res, url\)/)
assert.match(server, /X-Lien-Owner-Shared-Switch', 'v550'/)
assert.match(server, /owner-shared-switch-v550\.css\?v=550-release1/)
assert.match(server, /owner-shared-switch-v550\.js\?v=550-release1/)
assert.match(service, /session\.role !== 'ADMIN'/)
assert.match(service, /role: 'STAFF'/)
assert.match(service, /isSharedStoreAccount"=TRUE/)
assert.match(service, /SameSite=Lax/)
assert.match(client, /共通へ切替/)
assert.match(client, /window\.location\.replace\(window\.location\.href\)/)
assert.match(client, /state\.role !== 'ADMIN'/)
assert.match(css, /\.owner-shared-switch-v550/)
assert.match(css, /@media \(max-width: 767\.98px\)/)

console.log(JSON.stringify({ release: 'owner-shared-switch-v550', verified: true }))
