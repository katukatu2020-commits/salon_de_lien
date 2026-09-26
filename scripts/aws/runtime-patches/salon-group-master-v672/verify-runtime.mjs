import assert from 'node:assert/strict'
import fs from 'node:fs'
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = file => fs.readFileSync(root + '/' + file, 'utf8')
const server = read('server.js')
assert.match(server, /salonGroupMasterV672\.ensureSchema/)
assert.match(server, /X-Lien-Salon-Group-Master/)
assert.ok(server.indexOf('if (await salonGroupMasterV672.handle') > server.indexOf('if (await businessAccountApprovalsV643.handle'))
assert.match(server, /pathname === '\/admin\/salon-master'\) return output/)
assert.match(server, /salon-group-master-v672-client.js\?v=672-1/)
assert.match(read('salon-group-master-v672.js'), /ownerUserId !== row.id/)
assert.match(read('salon-group-master-v672.js'), /pg_advisory_xact_lock/)
assert.match(read('salon-group-master-v672.css'), /max-width:680px/)
assert.match(read('salon-group-master-v672-page.js'), /系列店マスタ/)
assert.match(read('salon-group-master-v672.sql'), /UNIQUE \("actorId", "requestKey"\)/)
console.log(JSON.stringify({ release: 'salon-group-master-v672', verified: true }))
