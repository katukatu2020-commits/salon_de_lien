import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const manifest = '/tmp/style-admin-controls-v618-parent.json'
const changesPath = '/tmp/style-admin-controls-v618-changes.json'
const hash = value => crypto.createHash('sha256').update(value).digest('hex')

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => (
    entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]
  ))
}

function targets() {
  return [
    ...files(path.join(root, '.next')),
    ...files(path.join(root, 'public')),
    ...fs.readdirSync(root).filter(file => /\.(?:js|css)$/.test(file)).map(file => path.join(root, file)),
  ]
}

if (process.argv[2] === 'snapshot') {
  fs.writeFileSync(manifest, JSON.stringify(Object.fromEntries(targets().map(file => [file, hash(fs.readFileSync(file))]))))
} else {
  const parent = JSON.parse(fs.readFileSync(manifest, 'utf8'))
  const changes = JSON.parse(fs.readFileSync(changesPath, 'utf8'))
  const currentTargets = targets()
  const current = Object.fromEntries(currentTargets.map(file => [file, hash(fs.readFileSync(file))]))
  const modified = Object.keys(parent).filter(file => current[file] !== parent[file]).sort()
  const added = currentTargets.filter(file => !parent[file]).sort()

  assert.deepEqual(modified, [
    path.join(root, 'public/style-community-controls-v610.js'),
    path.join(root, 'server.js'),
    path.join(root, 'style-community-controls-v610.js'),
  ].sort())
  assert.deepEqual(added, [
    path.join(root, 'public/style-admin-controls-v618.css'),
    path.join(root, 'public/style-admin-controls-v618.js'),
    path.join(root, 'style-admin-controls-v618.js'),
  ].sort())

  for (const [file, digest] of Object.entries(parent)) {
    let value = fs.readFileSync(file)
    for (const change of changes.filter(item => path.join(root, item.file) === file).reverse()) {
      const source = value.toString('utf8')
      assert.equal(source.split(change.after).length - 1, change.count, file + ': replacement count changed')
      value = Buffer.from(source.split(change.after).join(change.before))
    }
    assert.equal(hash(value), digest, 'Unexpected parent change: ' + file)
  }

  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
  const service = fs.readFileSync(path.join(root, 'style-admin-controls-v618.js'), 'utf8')
  const client = fs.readFileSync(path.join(root, 'public/style-admin-controls-v618.js'), 'utf8')
  const css = fs.readFileSync(path.join(root, 'public/style-admin-controls-v618.css'), 'utf8')
  const customerService = fs.readFileSync(path.join(root, 'style-community-controls-v610.js'), 'utf8')
  const customerClient = fs.readFileSync(path.join(root, 'public/style-community-controls-v610.js'), 'utf8')

  assert.match(server, /createStyleAdminControlsService/)
  assert.match(server, /styleAdminControlsV618\.handle/)
  assert.match(server, /style-community-controls-v610\.js\?v=618-gender1/)
  assert.match(server, /style-admin-controls-v618\.js\?v=618-release1/)
  assert.match(server, /style-admin-controls-v618\.css\?v=618-release1/)
  assert.match(server, /X-Lien-Style-Admin-Controls', 'v618'/)
  assert.match(service, /const STYLE_GENDERS = new Set\(\['', '女性', '男性', 'その他'\]\)/)
  assert.match(service, /const staffKey = text\(input\.staffKey, 160, 'スタッフ', true\)/)
  assert.match(service, /-'stylistName'-'stylistKana'-'stylistRole'/)
  assert.match(service, /\/api\/lien-style-admin-v618/)
  assert.match(service, /\/api\/lien-style-editor-v618/)
  assert.match(client, /const LIST_PATH = '\/admin\/community'/)
  assert.match(client, /<span>スタッフ<\/span><select name=\"staffKey\" required>/)
  assert.match(client, /\['その他', 'その他'\]/)
  assert.doesNotMatch(client, /取込元の担当者情報を使用/)
  assert.doesNotMatch(client, /name=\"stylistKana\"/)
  assert.doesNotMatch(client, />年代</)
  assert.match(css, /\.orimia-style-admin-legacy-hidden-v618/)
  assert.match(css, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/)
  assert.match(customerService, /return 'その他'/)
  assert.match(customerService, /THEN 'その他'/)
  assert.match(customerClient, /\['その他', 'その他'\]/)
  assert.doesNotMatch(customerClient, /\['ユニセックス', 'ユニセックス'\]/)

  for (const [header, version] of [
    ['X-Lien-Stamp-Card-Commercial', 'v617'],
    ['X-Lien-Customer-Booking-Confirmation', 'v616'],
    ['X-Lien-Style-Publisher-Comments', 'v615'],
    ['X-Lien-Customer-Current-Appointment', 'v614'],
    ['X-Lien-Coupon-Email-Delivery', 'v613'],
    ['X-Lien-Hotpepper-Menu-Import', 'v612'],
    ['X-Lien-Style-Community-Rerender', 'v611'],
    ['X-Lien-Style-Community-Controls', 'v610'],
    ['X-Lien-Customer-Style-Gallery-Grid', 'v609'],
    ['X-Lien-Customer-Style-Mobile-Gallery', 'v608'],
    ['X-Lien-Customer-Booking-Menu-Clearance', 'v607'],
    ['X-Lien-Customer-Style-First-Paint', 'v606'],
    ['X-Lien-Customer-Style-Detail', 'v605'],
    ['X-Lien-Customer-Mypage-Navigation', 'v604'],
    ['X-Lien-Stamp-Program', 'v603'],
    ['X-Lien-Style-System-Integration', 'v602'],
    ['X-Lien-Customer-Journey', 'v601'],
    ['X-Lien-Hotpepper-Style-Import', 'v600'],
    ['X-Lien-Business-Logout', 'v599'],
    ['X-Lien-Customer-Notification-Badge', 'v597'],
    ['X-Lien-Customer-Store-List', 'v595'],
    ['X-Lien-Daily-Sales-Print', 'v590'],
    ['X-Lien-Receipt-Pos-Direct', 'v582'],
  ]) assert.match(server, new RegExp(header + "', '" + version))

  console.log(JSON.stringify({
    protectedFiles: Object.keys(parent).length,
    modified,
    added,
    staffKeyFiltering: true,
    ageFilterRemoved: true,
    canonicalGenders: ['女性', '男性', 'その他'],
    currentStaffOnlyEditor: true,
  }))
}
