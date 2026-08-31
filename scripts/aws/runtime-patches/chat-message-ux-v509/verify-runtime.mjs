import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const clientPath = `${root}/public/content-edit-delete-client-v509.js`
const staffRuntimePath = `${root}/admin-staff-experience-v276.js`
const serverPath = `${root}/server.js`
const pageFiles = [
  `${root}/.next/server/app/admin/community/page.js`,
  `${root}/.next/server/app/admin/community/[postId]/page.js`,
  `${root}/.next/server/app/u/(account)/community/[postId]/page.js`,
  `${root}/.next/server/app/admin/customers/messages/page.js`,
]

assert.ok(fs.existsSync(clientPath), 'v509 browser client is missing')
const client = fs.readFileSync(clientPath, 'utf8')
assert.match(client, /__lienStyleCommunityControlsV509/)
assert.match(client, /\[data-lien-chat-message\]\{[^}]*max-width:66\.666667%!important/)
assert.match(client, /overflow-wrap:anywhere;word-break:break-word/)
assert.match(client, /data-lien-chat-message-list="v509"/)
assert.match(client, /overflow-x:hidden!important/)
assert.match(client, /querySelectorAll\('\[data-lien-chat-message\]:not\(\[data-lien-chat-layout-v509\]\)'\)/)
assert.match(client, /data-lien-chat-delete-on-dblclick/)
assert.match(client, /addEventListener\('dblclick'/)

const chatEnhancer = client.slice(
  client.indexOf('function enhanceChatMessages()'),
  client.indexOf('function useStableCommunityNavigation'),
)
assert.match(chatEnhancer, /method: 'DELETE'/)
assert.match(chatEnhancer, /input: false/)
assert.doesNotMatch(chatEnhancer, /method: 'PATCH'/)
assert.doesNotMatch(chatEnhancer, /actionButton\('編集'/)
assert.doesNotMatch(chatEnhancer, /actions\.append/)

const staffRuntime = fs.readFileSync(staffRuntimePath, 'utf8')
assert.match(staffRuntime, /__lienStyleCommunityLoaderV509/)
assert.match(staffRuntime, /content-edit-delete-client-v509\.js/)
assert.doesNotMatch(staffRuntime, /__lienStyleCommunityLoaderV490/)

for (const file of pageFiles) {
  const source = fs.readFileSync(file, 'utf8')
  assert.match(source, /content-edit-delete-client-v509\.js/, `v509 client is not referenced by ${file}`)
  assert.doesNotMatch(source, /content-edit-delete-client-v490\.js/, `stale v490 client remains in ${file}`)
}

const shellFiles = fs.readdirSync(`${root}/.next/server/chunks`)
  .filter(name => name.endsWith('.js'))
  .map(name => `${root}/.next/server/chunks/${name}`)
const v509Shells = shellFiles.filter(file => fs.readFileSync(file, 'utf8').includes('"data-lien-community-bootstrap": "v509"'))
assert.equal(v509Shells.length, 1, 'exactly one AppShell chunk must carry the v509 bootstrap marker')
assert.match(fs.readFileSync(v509Shells[0], 'utf8'), /content-edit-delete-client-v509\.js/)

const server = fs.readFileSync(serverPath, 'utf8')
assert.equal((server.match(/X-Lien-Chat-Message-UX/g) || []).length, 1)
assert.match(server, /X-Lien-Chat-Message-UX', 'v509'/)
assert.match(server, /X-Lien-Customer-Experience', 'v508'/)

console.log('chat-message-ux-v509 runtime verified')
