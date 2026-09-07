import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const nextRoot = path.join(root, '.next')
const oldLayoutName = 'layout-runtime-v518-release1.navigation-loading-v536-release1.js'
const newLayoutName = 'layout-runtime-v518-release1.navigation-loading-v536-release1.admin-sidebar-labels-v578.js'

const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')
const count = (source, value) => source.split(value).length - 1

function collectFiles(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes:true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) collectFiles(fullPath, output)
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.json')) output.push(fullPath)
  }
  return output
}

const labels = [
  ['予約カレンダー', '予約・シフト・会計'],
  ['顧客・チャット・配信', '顧客・カルテ・配信'],
  ['メニュー・商品棚・集計', 'メニュー・商品・在庫'],
  ['スタイル共有', 'スタイル投稿'],
  ['経営分析', '経営・会計管理'],
]
const hints = [
  '予約・シフト・出退勤・会計',
  '顧客カルテ・チャット・配信',
  'メニュー・商品・在庫・発注',
  'スタイル投稿・公開・コメント管理',
  '経営分析・会計データ・利用料',
]

for (const [relativePath, expectedLabelCount] of [
  [`.next/static/chunks/app/${newLayoutName}`, 2],
  ['.next/server/chunks/1425.js', 2],
]) {
  const source = read(relativePath)
  for (const [oldLabel, newLabel] of labels) {
    assert.equal(count(source, `label: "${oldLabel}"`), 0, `${relativePath}: stale ${oldLabel}`)
    assert.equal(count(source, `label: "${newLabel}"`), expectedLabelCount, `${relativePath}: ${newLabel}`)
  }
  for (const hint of hints) assert.equal(count(source, `hint: "${hint}"`), 1, `${relativePath}: ${hint}`)
}

const customExpectations = [
  ['customer-campaigns-v427.js', 2],
  ['wholesale-ordering-v543.js', 1],
  ['server.js', 2],
]
for (const [relativePath, customerLabelCount] of customExpectations) {
  const source = read(relativePath)
  for (const [oldLabel, newLabel] of labels) {
    assert.equal(count(source, oldLabel), 0, `${relativePath}: stale ${oldLabel}`)
    assert.equal(count(source, newLabel), oldLabel === '顧客・チャット・配信' ? customerLabelCount : 1, `${relativePath}: ${newLabel}`)
  }
}

const billing = read('billing.js')
assert.equal(count(billing, '予約・シフト・会計'), 1)
assert.equal(count(billing, '顧客・カルテ・配信'), 1)
assert.equal(count(billing, 'メニュー・商品・在庫'), 1)
assert.equal(count(billing, '経営・会計管理'), 1)
assert.equal(billing.includes('経営分析・システム利用料'), false)

let oldReferences = 0
let newReferences = 0
for (const filePath of collectFiles(nextRoot)) {
  const source = fs.readFileSync(filePath, 'utf8')
  oldReferences += count(source, oldLayoutName)
  newReferences += count(source, newLayoutName)
}
assert.equal(oldReferences, 0, 'stale active layout references remain')
assert.ok(newReferences > 0, 'new layout asset is not activated')

const server = read('server.js')
assert.match(server, /X-Lien-Admin-Sidebar-Labels', 'v578'/)
assert.match(server, /X-Lien-Owner-Billing-Tab', 'v577'/)
assert.equal(count(server, 'X-Lien-Admin-Sidebar-Labels'), 1)

console.log(JSON.stringify({ release:'admin-sidebar-labels-v578', runtimeVerified:true, newReferences }))
