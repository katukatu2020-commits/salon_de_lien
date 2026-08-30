import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const clientPath = `${root}/public/content-edit-delete-client-v490.js`
const staffRuntimePath = `${root}/admin-staff-experience-v276.js`
const pageFiles = [
  `${root}/.next/server/app/admin/community/page.js`,
  `${root}/.next/server/app/admin/community/[postId]/page.js`,
  `${root}/.next/server/app/u/(account)/community/[postId]/page.js`,
  `${root}/.next/server/app/admin/customers/messages/page.js`,
]

assert.ok(fs.existsSync(clientPath), 'v490 browser client is missing')
const client = fs.readFileSync(clientPath, 'utf8')
assert.match(client, /__lienStyleCommunityControlsV490/)
assert.match(client, /data-lien-style-grid-managed-v490/)
assert.match(client, /lienStyleExpectedCountV490/)
assert.match(client, /managedGridIsComplete/)
assert.match(client, /if \(!controlsReady \|\| scheduleTimer\) return/)
assert.match(client, /window\.addEventListener\('load', afterLoad, \{ once: true \}\)/)
assert.match(client, /__lienStyleCommunityRepairV490/)
assert.match(client, /window\.addEventListener\('popstate', scheduleAfterRouteChange\)/)
assert.match(client, /window\.addEventListener\('pageshow', scheduleAfterRouteChange\)/)
assert.doesNotMatch(client, /__lienStyleCommunityControlsTimerV471/)

const staffRuntime = fs.readFileSync(staffRuntimePath, 'utf8')
assert.match(staffRuntime, /__lienStyleCommunityLoaderV490/)
assert.match(staffRuntime, /content-edit-delete-client-v490\.js/)
assert.doesNotMatch(staffRuntime, /__lienStyleCommunityLoaderV482/)

for (const file of pageFiles) {
  const source = fs.readFileSync(file, 'utf8')
  assert.match(source, /content-edit-delete-client-v490\.js/, `v490 client is not referenced by ${file}`)
  assert.doesNotMatch(source, /content-edit-delete-client-v482\.js/, `stale v482 client remains in ${file}`)
}

const shellFiles = fs.readdirSync(`${root}/.next/server/chunks`)
  .filter(name => name.endsWith('.js'))
  .map(name => `${root}/.next/server/chunks/${name}`)
const v490Shells = shellFiles.filter(file => fs.readFileSync(file, 'utf8').includes('"data-lien-community-bootstrap": "v490"'))
assert.equal(v490Shells.length, 1, 'exactly one AppShell chunk must carry the v490 bootstrap marker')
assert.match(fs.readFileSync(v490Shells[0], 'utf8'), /content-edit-delete-client-v490\.js/)

console.log('style-community-browser-back-v490 runtime verified')
