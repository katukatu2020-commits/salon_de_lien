import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const manifestPath = '/tmp/style-admin-post-controls-v625-changes.json'

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

function count(source, value) {
  return source.split(value).length - 1
}

assert.ok(fs.existsSync(manifestPath), 'v625 change manifest is missing')
const changes = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
assert.deepEqual(
  [...new Set(changes.map(change => change.file))].sort(),
  [
    'public/style-admin-controls-v618.css',
    'public/style-admin-controls-v618.js',
    'server.js',
    'style-admin-controls-v618.js',
  ],
  'v625 modified an unexpected runtime file',
)

const server = read('server.js')
const service = read('style-admin-controls-v618.js')
const client = read('public/style-admin-controls-v618.js')
const css = read('public/style-admin-controls-v618.css')
const customerService = read('style-community-controls-v610.js')
const contentManagement = read('content-management-v465.js')

assert.match(server, /style-admin-controls-v618\.css\?v=625-post-controls1/)
assert.match(server, /style-admin-controls-v618\.js\?v=625-post-controls1/)
assert.match(server, /X-Lien-Style-Admin-Post-Controls', 'v625'/)
assert.match(server, /X-Lien-Navigation-Loader-Verified', 'v624'/)
assert.match(server, /X-Lien-Auto-Split-Orders', 'v622'/)

assert.equal(
  count(service, `p."organizationId"=$1 AND p."published"=TRUE AND p."deletedAt" IS NULL`),
  0,
  'admin list still excludes private posts',
)
assert.match(service, /SELECT p\."id",p\."published",p\."publishedAt",p\."postKind"/)
assert.match(service, /SELECT "id","published","publishedAt","postKind"/)
assert.match(service, /published: Boolean\(row\.published\)/)
assert.match(customerService, /p\."published"=TRUE/)

assert.equal(count(client, '/* style-admin-post-controls-v625 */'), 1)
assert.match(client, /\/\* style-admin-post-controls-v625 \*\/\n;\(\(\) =>/)
assert.match(client, /data-orimia-style-post-id-v625/)
assert.match(client, /data-orimia-style-published-v625/)
assert.match(client, /window\.__orimiaReloadStyleAdminV625/)
assert.match(client, /data-orimia-style-visibility-v625/)
assert.match(client, /orimiaStyleDeleteV625/)
assert.match(client, /非公開にする/)
assert.match(client, /公開する/)
assert.match(client, /スタイル投稿を削除/)
assert.match(client, /name="confirmed"/)
assert.match(client, /method: 'PATCH'/)
assert.match(client, /method: 'DELETE'/)
assert.match(client, /__orimiaStyleAdminPostControlsV625/)

assert.equal(count(css, '/* style-admin-post-controls-v625 */'), 1)
assert.match(css, /\.orimia-admin-style-managed-card-v625/)
assert.match(css, /\.orimia-style-detail-controls-v625/)
assert.match(css, /\.orimia-style-delete-dialog-v625/)
assert.match(css, /@media \(max-width: 640px\)/)

assert.match(contentManagement, /input\.action === 'visibility'/)
assert.match(contentManagement, /SET "published"=\$1/)
assert.match(contentManagement, /SET "published"=FALSE,"deletedAt"=CURRENT_TIMESTAMP/)

console.log(JSON.stringify({
  release: 'style-admin-post-controls-v625',
  runtimeVerified: true,
  changedFiles: [...new Set(changes.map(change => change.file))].length,
}))
