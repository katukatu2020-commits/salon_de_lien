import assert from 'node:assert/strict'
import fs from 'node:fs'

const clientPath = process.env.LIEN_CHAT_UX_CLIENT || '/tmp/lien-v509/content-edit-delete-client-v509.js'
const source = fs.readFileSync(clientPath, 'utf8')
const chatEnhancer = source.slice(
  source.indexOf('function enhanceChatMessages()'),
  source.indexOf('function useStableCommunityNavigation'),
)

assert.ok(chatEnhancer.length > 500, 'chat enhancer was not found')
assert.match(source, /max-width:66\.666667%!important/)
assert.match(source, /\[data-lien-chat-message-list="v509"\]\{[^}]*overflow-x:hidden!important/)
assert.match(source, /\[data-lien-chat-body-text\][^{]*\{[^}]*overflow-wrap:anywhere/)
assert.match(chatEnhancer, /row\.getAttribute\('data-lien-chat-can-edit'\) !== 'true'/)
assert.match(chatEnhancer, /bubble\.addEventListener\('dblclick'/)
assert.match(chatEnhancer, /document\.querySelector\('\[data-lien-content-dialog\]'\)\?\.open/)
assert.match(chatEnhancer, /row\.remove\(\)/)
assert.doesNotMatch(chatEnhancer, /メッセージを編集/)
assert.doesNotMatch(chatEnhancer, /className\s*=\s*['"]lien-chat-message-actions/)

console.log('chat-message-ux-v509 source regression checks passed')
