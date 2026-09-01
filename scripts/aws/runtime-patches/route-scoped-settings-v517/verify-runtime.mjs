import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const server = read('server.js')
const commercial = read('commercial-admin-v101.js')
const layout = read('.next/static/chunks/app/layout-runtime-v517-release1.js')
const manifest = read('.next/app-build-manifest.json')

assert.match(server, /X-Lien-Route-Scoped-Settings', 'v517'/)
assert.match(server, /X-Lien-Ui-Transition-Consistency', 'v516'/)
assert.match(commercial, /function cleanup\(\)/)
assert.match(commercial, /document\.getElementById\(PANEL_ID\)\?\.remove\(\)/)
assert.match(commercial, /data-external-source-hidden-v492/)
assert.match(commercial, /document\.documentElement\.classList\.remove\('lien-settings-v447'\)/)
assert.match(commercial, /route-scoped-settings-v517/)
assert.match(layout, /commercial-admin-v136\.js\?v=20260901-517-release1/)
assert.match(layout, /route-scoped-settings-v517/)
assert.match(layout, /ui-transition-consistency-v516/)
assert.match(manifest, /layout-runtime-v517-release1\.js/)
assert.doesNotMatch(manifest, /layout-runtime-v516-release5\.js/)

console.log(JSON.stringify({ release: 'route-scoped-settings-v517', verified: true }))
