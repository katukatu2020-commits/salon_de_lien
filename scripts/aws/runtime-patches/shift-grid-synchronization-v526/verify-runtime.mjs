import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.env.LIEN_RUNTIME_ROOT || process.env.APP_ROOT || '/app'
const marker = 'shift-grid-synchronization-v526'
const oldChunkName = 'page-shift-line-break-v461.js'
const newChunkName = 'page-shift-grid-sync-v526.js'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const count = (source, value) => source.split(value).length - 1

const server = read('server.js')
const tenantClient = read('tenant-setup-client.js')
const shift = read(`.next/static/chunks/app/admin/appointments/${newChunkName}`)
const appManifest = read('.next/app-build-manifest.json')
const clientManifest = read('.next/server/app/admin/appointments/page_client-reference-manifest.js')

assert.match(server, /X-Lien-Shift-Grid-Synchronization', 'v526'/)
assert.match(server, /X-Lien-Coupon-Broadcast-Delivery', 'v525'/)

assert.match(shift, /q = L < 440 && 0 === __businessDuration % 60 \? 60 : 30/)
assert.match(shift, /e\.querySelector\("\.shift-canvas"\) \|\| e/)
assert.match(shift, /getBoundingClientRect\(\)\.width/)
assert.doesNotMatch(shift, /Math\.floor\(e\.getBoundingClientRect\(\)\.width\)/)
assert.match(shift, /r\.observe\(t\)[\s\S]+\}, \[__shiftHydrated\]\)\)/)
assert.match(shift, /style: \{ "--ts-shift-slots": String\(F\.length\) \}/)
assert.match(shift, new RegExp(marker))

assert.match(tenantClient, /const summarySlots = canvas\.querySelector\('\.shift-top > div:nth-child\(4\) > div'\)\?\.children\.length \|\| 0/)
assert.match(tenantClient, /canvas\.style\.setProperty\('--ts-shift-slots', String\(slots\)\)/)
assert.doesNotMatch(tenantClient, /canvas\.style\.setProperty\('--ts-shift-slots', String\(duration \/ 30\)\)/)
assert.match(tenantClient, new RegExp(marker))

assert.equal(count(appManifest, newChunkName), 1)
assert.equal(count(appManifest, oldChunkName), 0)
assert.equal(count(clientManifest, newChunkName), 7)
assert.equal(count(clientManifest, oldChunkName), 0)

for (const file of [
  path.join(root, 'server.js'),
  path.join(root, 'tenant-setup-client.js'),
  path.join(root, '.next', 'static', 'chunks', 'app', 'admin', 'appointments', newChunkName),
]) {
  const syntax = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  assert.equal(syntax.status, 0, `${file}: ${syntax.stderr || syntax.stdout}`)
}

console.log(JSON.stringify({ release: marker, chunk: newChunkName, verified: true }))
