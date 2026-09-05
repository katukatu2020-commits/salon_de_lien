import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const nextRoot = path.join(root, '.next')
const workflow = fs.readFileSync(path.join(root, 'ui-workflows-v294.js'), 'utf8')
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const customerLayoutName = 'layout-customer-mobile-nav-v425.chat-send-only-v547.js'
const customerLayout = fs.readFileSync(path.join(nextRoot, 'static', 'chunks', 'app', 'u', '(account)', customerLayoutName), 'utf8')
const adminChat = fs.readFileSync(path.join(nextRoot, 'server', 'app', 'admin', 'customers', 'messages', 'page.js'), 'utf8')

assert.match(server, /X-Lien-Customer-Chat-Send-Only', 'v547'/)
assert.match(server, /X-Lien-Customer-Navigation-Privacy', 'v546'/)
assert.match(server, /layout-customer-mobile-nav-v425\.chat-send-only-v547\.js/)

assert.match(workflow, /window\.__orimiaCustomerChatSendOnlyV547 = true/)
assert.match(workflow, /data-lien-chat-can-edit="false" data-lien-chat-customer-read-only="v547"/)
assert.match(workflow, /const enforceCustomerChatReadOnly = \(\) =>/)
assert.match(workflow, /readOnlyObserver\.observe\(portal, \{ childList: true, subtree: true \}\)/)
assert.match(workflow, /\.lien-chat-message-actions,\[data-lien-chat-edit\],\[data-lien-chat-cancel\]/)
assert.doesNotMatch(workflow, /script\.src = '\/content-edit-delete-client-v466\.js'/)
assert.doesNotMatch(workflow, /data-lien-chat-can-edit="\$\{String\(Boolean\(message\.canEdit\)\)\}"/)

assert.match(customerLayout, /ui-workflows-v294\.js\?v=547-send-only1/)
assert.match(customerLayout, /customer-chat-send-only-v547/)

assert.match(adminChat, /content-edit-delete-client-v509\.js/)
assert.match(adminChat, /data-lien-chat-can-edit/)
assert.match(adminChat, /senderType === "staff"/)

console.log(JSON.stringify({ release: 'customer-chat-send-only-v547', verified: true }))
