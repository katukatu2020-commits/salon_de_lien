import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const commercial = fs.readFileSync(path.join(root, 'commercial-admin-v101.js'), 'utf8')

assert.match(server, /X-Lien-Style-Detail-Three-Photo-Layout', 'v568'/)
assert.match(server, /X-Lien-Customer-Chart-Delete', 'v567'/)
assert.match(commercial, /__lienStyleDetailThreePhotoLayoutV568/)
assert.match(commercial, /data-style-detail-photo-layout-v568/)
assert.match(commercial, /grid-template-columns: minmax\(0, 2fr\) minmax\(0, 1fr\)/)
assert.match(commercial, /grid-template-rows: repeat\(2, minmax\(0, 1fr\)\)/)
assert.match(commercial, /a:nth-child\(3\)/)
assert.match(commercial, /grid-template-columns: minmax\(0, 1fr\)/)
assert.match(commercial, /photos\.length !== 3/)
assert.match(commercial, /ResizeObserver/)

console.log(JSON.stringify({ release:'style-detail-three-photo-layout-v568', verified:true }))
