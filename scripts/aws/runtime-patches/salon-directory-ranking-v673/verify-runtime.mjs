import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const require = createRequire(root + '/package.json')
const read = file => fs.readFileSync(root + '/' + file, 'utf8')
assert.match(read('server.js'), /X-Lien-Salon-Directory-Ranking/)
assert.match(read('server.js'), /salon-directory-ranking-v673-assets/)
assert.match(read('customer-links-v293.js'), /require\('\.\/salon-directory-ranking-v673.js'\)/)
const directory = require(root + '/salon-directory-ranking-v673.js')
assert.equal(directory.PREFECTURES.length, 47)
assert.equal(directory.MAX_STORES, null)
assert.equal(directory.STORE_LIMITED, false)
assert.match(directory.renderDirectory([]), /すべての都道府県/)
assert.match(read('customer-link-ui-v424.js'), /data-select-orimia-store/)
assert.match(read('server.js'), /X-Lien-Salon-Group-Master/)
console.log(JSON.stringify({ release: 'salon-directory-ranking-v673', verified: true }))
