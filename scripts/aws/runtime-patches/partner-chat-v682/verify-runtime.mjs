import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
const read = name => fs.readFileSync('/app/' + name, 'utf8')
for (const name of ['dealer-erp-v678.js', 'dealer-erp-v678-partner-chat-v682.js', 'dealer-erp-v678-partner-chat-client-v682.js', 'dealer-erp-v678-order-entry-v682.js', 'dealer-erp-v678-nav.partner-chat-v682.js', 'wholesale-ordering-v543.js', 'server.js', 'public/inventory-orders-common-layout-v572.partner-chat-v682.js']) execFileSync('node', ['--check', '/app/' + name])
assert.ok(read('dealer-erp-v678.js').includes("'chat-send': partnerChat.send"))
assert.ok(read('dealer-erp-v678.js').includes("'chat-partners': partnerChat.partners"))
assert.ok(read('dealer-erp-v678.js').includes('dealer-erp-v678-partner-chat-client-v682.js?v=682-1'))
assert.ok(read('dealer-erp-v678-order-entry-v682.js').includes('チャットを開く'))
assert.ok(read('dealer-erp-v678-client.stock-note-v681.js').includes('備考（任意）'))
assert.ok(read('public/inventory-orders-common-layout-v572.partner-chat-v682.js').includes('orimia:hydrated-v680'))
assert.ok(read('server.js').includes('inventory-orders-common-layout-v572.partner-chat-v682.js?v=682-1'))
assert.ok(read('server.js').includes("'X-Lien-Partner-Chat', 'v682'"))
console.log('PASS: partner chat runtime and preserved v681 stock notes / v680 hydration gate')
