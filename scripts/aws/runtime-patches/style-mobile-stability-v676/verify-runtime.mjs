import fs from 'node:fs'
import assert from 'node:assert/strict'
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = file => fs.readFileSync(root + '/' + file, 'utf8')
const client = read('public/content-edit-delete-client-v615.js')
assert.equal(client.split('modernStyleListOwnsPageV676()').length - 1, 3)
assert.match(client, /async function enhanceCommunityDetail/)
assert.match(client, /function enhanceChatMessages/)
assert.match(read('public/style-admin-controls-v618.css'), /style-mobile-stability-v676/)
assert.match(read('server.js'), /X-Lien-Style-Mobile-Stability/)
assert.match(read('server.js'), /X-Lien-Salon-Branch-Inquiry/)
console.log('v676 runtime verified')
