import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
for (const file of ['server.js', 'public/hotpepper-menu-import-v703.js']) execFileSync(process.execPath, ['--check', '/app/' + file])
const server = fs.readFileSync('/app/server.js', 'utf8')
const client = fs.readFileSync('/app/public/hotpepper-menu-import-v703.js', 'utf8')
assert.ok(server.includes("const hotpepperMenuRouteV612 = pathname.startsWith('/admin/')"))
assert.ok(server.includes('/hotpepper-menu-import-v703.js?v=703-1'))
assert.ok(!server.includes('/hotpepper-menu-import-v612.js?v=612-release1'))
assert.ok(client.includes('data-hotpepper-menu-entry-v703'))
assert.ok(client.includes('__orimiaHydratedV680'))
assert.ok(client.includes("const ENDPOINT = '/api/lien-hotpepper-menus-v612'"))
assert.ok(client.includes('openConfirmation'))
for (const file of ['hotpepper-menu-parser-v612.js', 'hotpepper-menu-import-v612.js']) {
  assert.equal(fs.readFileSync('/app/' + file, 'utf8'), fs.readFileSync('/tmp/lien-v612/' + file, 'utf8'), 'Existing parsing, permissions, transactions and duplicate checks are unchanged')
}
execFileSync(process.execPath, ['/tmp/lien-v612/integration.mjs'], { stdio: 'inherit' })
console.log('PASS v703 runtime: all-admin loader, menu toolbar, existing preview/import/duplicate logic preserved')
