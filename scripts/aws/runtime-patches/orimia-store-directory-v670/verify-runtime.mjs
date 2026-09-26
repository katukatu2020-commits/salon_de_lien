import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const snapshot = process.argv[2] === 'snapshot'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const count = (value, needle) => value.split(needle).length - 1

const server = read('server.js')
const links = read('customer-links-v293.js')
const profile = read('store-profile.js')
const storeStaff = read('customer-store-staff-v276.js')
const adminClient = read('commercial-admin-v101.js')

if (snapshot) {
  assert.equal(count(server, 'orimia-store-directory-v670'), 0)
  assert.equal(count(links, `require('./customer-store-frequency-v668.js')`), 1)
  assert.equal(count(links, '  async function storesPage(req, res, url) {'), 1)
  assert.equal(count(profile, '  async function updateOwnerEmail(session, data) {'), 1)
  assert.ok(count(storeStaff, '登録済みの店舗ではありません。') >= 1)
  assert.equal(count(server, `X-Lien-Admin-Chat-Reply', 'v669'`), 1)
  console.log(JSON.stringify({ release: 'orimia-store-directory-v670', snapshot: true }))
  process.exit(0)
}

assert.equal(fs.existsSync(path.join(root, 'orimia-store-directory-v670.js')), true)
const directory = read('orimia-store-directory-v670.js')
assert.equal(count(server, `X-Lien-Orimia-Store-Directory', 'v670'`), 1)
assert.equal(count(server, 'await storeProfile.ensureSchema() /* orimia-store-directory-v670-schema */'), 1)
assert.equal(count(links, `require('./orimia-store-directory-v670.js')`), 1)
assert.equal(count(links, 'customerStoreMembershipV668'), 0)
assert.equal(count(links, `data.action === 'link' || data.action === 'unlink'`), 1)
assert.equal(count(links, 'customerStoreDirectoryV670.renderDirectory(rows)'), 1)
assert.equal(count(profile, '"orimiaPublished" BOOLEAN NOT NULL DEFAULT TRUE'), 1)
assert.equal(count(profile, "data.action === 'update-orimia-publication'"), 1)
assert.equal(count(profile, 'orimiaPublished: store.orimiaPublished !== false'), 1)
assert.equal(count(storeStaff, 'COALESCE(p."orimiaPublished",TRUE)=TRUE'), 1)
assert.equal(count(adminClient, '__orimiaPublicationSettingsV670'), 2)
assert.equal(count(adminClient, 'ORIMIA店舗一覧への掲載'), 1)
assert.equal(count(directory, 'data-orimia-store-directory="v670"'), 1)
assert.equal(directory.includes('新しい店舗を登録'), false)
assert.equal(directory.includes('登録を解除'), false)
for (const file of ['customer-link-ui-v293.js', 'customer-link-ui-v424.js']) {
  const source = read(file)
  assert.equal(count(source, 'dataset.lienStoresV670'), 2)
  assert.equal(count(source, 'data-select-orimia-store'), 2)
  assert.equal(source.includes("body: JSON.stringify({ action: 'unlink'"), false)
  assert.equal(source.includes("body: JSON.stringify({ action: 'link'"), false)
}
console.log(JSON.stringify({ release: 'orimia-store-directory-v670', verified: true }))
