import assert from 'node:assert/strict'
import fs from 'node:fs'

const patchPath = new URL('./patch-runtime.mjs', import.meta.url)
const source = fs.readFileSync(patchPath, 'utf8')

assert.match(source, /legacyChatControlsLoader/)
assert.match(source, /data-lien-chat-can-edit="false"/)
assert.match(source, /data-lien-chat-customer-read-only="v547"/)
assert.match(source, /MutationObserver\(enforceCustomerChatReadOnly\)/)
assert.match(source, /readOnlyObserver\.disconnect\(\)/)
assert.match(source, /X-Lien-Customer-Chat-Send-Only/)
assert.match(source, /chat-send-only-v547\.js/)

console.log('customer-chat-send-only-v547 source regression checks passed')
