import assert from 'node:assert/strict'
import fs from 'node:fs'
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = file => fs.readFileSync(root + '/' + file, 'utf8')
assert.match(read('customer-link-ui-v293.js'), /cropCampaignImageV706/)
assert.match(read('customer-link-ui-v293.js'), /broadcast-confirm-v706/)
assert.match(read('customer-campaigns-v427.js'), /width: 1600, height: 1200, fit: 'contain'/)
assert.match(read('customer-campaigns-v427.js'), /aspect-ratio:4\/3;object-fit:contain/)
assert.match(read('.next/server/chunks/9845.js'), /id: confirmedBroadcastIdV706/)
assert.match(read('.next/server/chunks/9845.js'), /\.verify\(t, e, M\)/)
assert.match(read('server.js'), /broadcastPreviewV706.handle/)
assert.ok(read('server.js').indexOf('if(await wholesaleOrdering.flowGate(req,res,url))return') < read('server.js').indexOf('if (await broadcastPreviewV706.handle(req, res, url)) return'), 'Existing account feature gate precedes recipient preview')
assert.match(read('broadcast-preview-v706.cjs'), /timingSafeEqual/)
console.log('v706 runtime wiring verified')
