import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const count = (value, pattern) => value.split(pattern).length - 1

const server = read('server.js')
const adminService = read('style-admin-controls-v618.js')
const adminClient = read('public/style-admin-controls-v618.js')
const adminCss = read('public/style-admin-controls-v618.css')
const customerService = read('style-community-controls-v610.js')
const customerClient = read('public/style-community-controls-v610.js')
const schema = read('prisma/schema.prisma')
const manifest = JSON.parse(fs.readFileSync('/tmp/style-demo-ordering-v634-changes.json', 'utf8'))

assert.equal(count(server, 'X-Lien-Style-Demo-Ordering'), 1)
assert.match(server, /X-Lien-Style-Demo-Ordering', 'v634'/)
assert.match(server, /style-admin-controls-v618\.js\?v=634-order1/)
assert.match(server, /style-admin-controls-v618\.css\?v=634-order1/)
assert.match(server, /style-community-controls-v610\.js\?v=634-order1/)
assert.doesNotMatch(server, /style-admin-controls-v618\.js\?v=628-pagination1/)

assert.match(adminService, /api\/lien-style-order-v634/)
assert.match(adminService, /targetOrganization: current\.organizationId === 'org_salon_de_lien'/)
assert.match(adminService, /normalizeStylePostOrder/)
assert.match(adminService, /"displayOrder" ASC NULLS LAST/)
assert.match(adminService, /"commentCount"/)
assert.match(customerService, /normalizeStylePostOrder/)
assert.match(customerService, /"displayOrder" ASC NULLS LAST/)
assert.match(customerService, /\['manual', 'latest', 'likes', 'oldest'\]/)

assert.match(adminClient, /\['manual', 'No順'\]/)
assert.match(adminClient, /data-orimia-style-display-order-v634/)
assert.match(adminClient, /orimia-admin-style-order-form-v634/)
assert.match(adminClient, /No\.は1以上の整数|1以上の整数/)
assert.match(customerClient, /\['manual', 'おすすめ順'\]/)
assert.match(adminCss, /\.orimia-admin-style-order-badge-v634/)
assert.match(adminCss, /\.orimia-admin-style-order-form-v634/)

assert.match(schema, /displayOrder\s+Int\?/)
assert.match(schema, /@@index\(\[organizationId, displayOrder\]\)/)
assert.ok(fs.existsSync(path.join(root, 'style-post-order-v634.js')))
assert.ok(fs.existsSync(path.join(root, 'ensure-style-demo-ordering-v634.cjs')))
assert.ok(fs.existsSync('/usr/local/bin/lien-entrypoint-v633'))
assert.equal(manifest.release, undefined)
assert.ok(manifest.length >= 8)

console.log(JSON.stringify({
  release: 'style-demo-ordering-v634',
  runtimeVerified: true,
  modifiedFiles: [...new Set(manifest.map(change => change.file))],
}))
