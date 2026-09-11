import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const manifestPath = '/tmp/style-detail-management-removal-v626-changes.json'

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

function count(source, value) {
  return source.split(value).length - 1
}

assert.ok(fs.existsSync(manifestPath), 'v626 change manifest is missing')
const changes = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
assert.deepEqual(
  [...new Set(changes.map(change => change.file))].sort(),
  [
    'public/content-edit-delete-client-v615.js',
    'public/style-admin-controls-v618.js',
    'server.js',
  ],
  'v626 modified an unexpected runtime file',
)

const server = read('server.js')
const contentClient = read('public/content-edit-delete-client-v615.js')
const styleClient = read('public/style-admin-controls-v618.js')
const styleService = read('style-admin-controls-v618.js')
const styleCss = read('public/style-admin-controls-v618.css')

assert.match(server, /style-admin-controls-v618\.js\?v=626-detail-cleanup1/)
assert.doesNotMatch(server, /style-admin-controls-v618\.js\?v=625-post-controls3/)
assert.match(server, /X-Lien-Style-Detail-Cleanup', 'v626'/)
assert.match(server, /X-Lien-Style-Admin-Post-Controls', 'v625'/)
assert.match(server, /X-Lien-Navigation-Loader-Verified', 'v624'/)

assert.match(contentClient, /const hideManagementForStaffStyle =/)
assert.match(contentClient, /article\.matches\("\.orimia-style-detail-staff-v602"\)/)
assert.match(contentClient, /content\.querySelector\("\.orimia-style-details-v602"\)/)
assert.match(contentClient, /!commentOnlyCustomer && !hideManagementForStaffStyle/)
assert.equal(
  count(contentClient, 'if (!commentOnlyCustomer) meta.insertAdjacentElement("afterend", panel);'),
  0,
  'legacy style management insertion is still active',
)
assert.match(contentClient, /data-lien-customer-comment-menu="v615"/)
assert.match(contentClient, /assignedCommentCards/)

assert.equal(count(styleClient, '/* style-detail-management-removal-v626 */'), 1)
assert.match(styleClient, /window\.__orimiaStyleDetailManagementRemovalV626/)
assert.ok(
  styleClient.includes("return /^\\/admin\\/community\\/[^/]+\\/?$/.test(location.pathname) &&"),
  'staff style detail route guard is missing',
)
assert.match(styleClient, /\.orimia-style-detail-staff-v602, \.orimia-style-details-v602/)
assert.match(styleClient, /querySelectorAll\('\[aria-label="投稿管理"\]'\)/)
assert.match(styleClient, /new MutationObserver\(scheduleScan\)/)
assert.doesNotMatch(
  styleClient.slice(styleClient.indexOf('/* style-detail-management-removal-v626 */')),
  /fetch\(|method:\s*['"](?:PATCH|DELETE)['"]/,
  'detail cleanup must not mutate post data',
)

assert.match(styleClient, /data-orimia-style-visibility-v625/)
assert.match(styleClient, /orimiaStyleDeleteV625/)
assert.match(styleClient, /querySelectorAll\('\.orimia-style-detail-controls-v625'\)\.forEach/)
assert.match(styleService, /published: Boolean\(row\.published\)/)
assert.match(styleCss, /\.orimia-admin-style-managed-card-v625/)

console.log(JSON.stringify({
  release: 'style-detail-management-removal-v626',
  runtimeVerified: true,
  changedFiles: [...new Set(changes.map(change => change.file))].length,
}))
