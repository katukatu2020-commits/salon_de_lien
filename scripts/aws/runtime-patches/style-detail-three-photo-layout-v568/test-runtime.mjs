import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const commercial = fs.readFileSync(path.join(root, 'commercial-admin-v101.js'), 'utf8')

const start = commercial.indexOf(';(() => {', commercial.indexOf('__lienStyleDetailThreePhotoLayoutV568') - 100)
const end = commercial.indexOf('/* style-detail-three-photo-layout-v568 */', start)
assert.ok(start >= 0 && end > start, 'layout client boundary was not found')

const client = commercial.slice(start, end)
assert.match(client, /WIDE_LAYOUT_MINIMUM = 600/)
assert.match(client, /photos\.length !== 3 \|\| grid\.children\.length !== 3/)
assert.match(client, /width >= WIDE_LAYOUT_MINIMUM \? 'triptych' : 'stack'/)
assert.match(client, /childList:true/)
assert.match(client, /subtree:true/)
assert.doesNotMatch(client, /grid-cols-2/)

console.log(JSON.stringify({
  release:'style-detail-three-photo-layout-v568',
  exactThreeOnly:true,
  responsiveMeasurement:true,
  mutationSafe:true,
}))
