import assert from 'node:assert/strict'
import fs from 'node:fs'

const clientPath = process.env.LIEN_STYLE_BACK_CLIENT || '/tmp/lien-v490/content-edit-delete-client-v490.js'
const source = fs.readFileSync(clientPath, 'utf8')

assert.match(source, /function managedGridIsComplete\(grid\)/)
assert.match(source, /expectedCount === cards\.length/)
assert.match(source, /currentGrid\?\.remove\(\)/)
assert.match(source, /restoredGrid\?\.remove\(\)/)
assert.match(source, /delete document\.body\.dataset\.lienCommunityOwnerEnhancedV471/)
assert.match(source, /let scheduleTimer = 0/)
assert.match(source, /if \(!controlsReady \|\| scheduleTimer\) return/)
assert.match(source, /scheduleTimer = 0\s+void enhanceCommunityList\(\)/)
assert.match(source, /window\.addEventListener\('load', afterLoad, \{ once: true \}\)/)
assert.match(source, /for \(const delay of \[100, 260, 620\]\)/)
assert.doesNotMatch(source, /clearTimeout\(window\.__lienStyleCommunityControlsTimerV471\)/)

console.log('style community browser-back regression source checks passed')
