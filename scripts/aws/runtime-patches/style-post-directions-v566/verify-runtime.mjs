import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = name => fs.readFileSync(`${root}/${name}`, 'utf8')

const server = read('server.js')
const commercial = read('commercial-admin-v101.js')
const service = read('community-publishing-v566.js')
const client = read('community-publishing-client-v566.js')

assert.match(server, /community-publishing-v566/)
assert.match(server, /X-Lien-Style-Post-Directions', 'v566'/)
assert.match(server, /customer-appointment-history-memos-v565/)
assert.match(commercial, /admin-community-publishing-v566\.js\?v=566/)
assert.match(commercial, /data-style-post-directions-v566/)
assert.doesNotMatch(commercial, /admin-community-publishing-v348\.js\?v=348/)
assert.match(service, /photoDirections/)
assert.match(service, /\['FRONT', 'SIDE', 'BACK'\]/)
assert.match(service, /direction: photo\.direction/)
assert.match(service, /admin-community-publishing-v566\.js/)
assert.match(client, /__lienStylePostDirectionsV566/)
assert.match(client, /direction:'FRONT'/)
assert.match(client, /direction:'SIDE'/)
assert.match(client, /direction:'BACK'/)
assert.match(client, /selectedCount !== SLOTS\.length/)
assert.match(client, /3方向を公開/)

console.log(JSON.stringify({ release:'style-post-directions-v566', verified:true }))
