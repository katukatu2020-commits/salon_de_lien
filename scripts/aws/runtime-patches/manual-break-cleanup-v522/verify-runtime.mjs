import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.APP_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const client = fs.readFileSync(path.join(root, 'staff-breaks-checkout-menu-client-v442.js'), 'utf8')

assert.match(server, /X-Lien-Manual-Break-Cleanup', 'v522'/)
assert.match(server, /X-Lien-Manual-Break-Booking', 'v521'/)
assert.match(client, /manual-break-cleanup-v522/)
assert.match(client, /orimiaManualBreakCleanup = 'v522'/)
assert.match(client, /body \.lien-break-action-v442\{display:none!important/)
assert.match(client, /action\.setAttribute\('aria-hidden', 'true'\)/)
assert.match(client, /action\.inert = true/)
assert.match(client, /dataset\.lienBreakCheckboxV521/)
assert.match(client, /jsonRequest\('\/api\/admin\/staff-breaks', \{ method: 'POST'/)

console.log(JSON.stringify({ release: 'manual-break-cleanup-v522', verified: true }))
