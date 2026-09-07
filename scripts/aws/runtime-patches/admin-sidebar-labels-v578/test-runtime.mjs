import assert from 'node:assert/strict'
import fs from 'node:fs'

const appShell = fs.readFileSync(new URL('../../../../src/components/layout/app-shell.tsx', import.meta.url), 'utf8')
const patch = fs.readFileSync(new URL('./patch-runtime.mjs', import.meta.url), 'utf8')

const labels = [
  '予約・シフト・会計',
  '顧客・カルテ・配信',
  'メニュー・商品・在庫',
  'スタイル投稿',
  '経営・会計管理',
]
const hints = [
  '予約・シフト・出退勤・会計',
  '顧客カルテ・チャット・配信',
  'メニュー・商品・在庫・発注',
  'スタイル投稿・公開・コメント管理',
  '経営分析・会計データ・利用料',
]

for (const label of labels) {
  assert.equal(appShell.split(`label: "${label}"`).length - 1, 2, `${label} must be shared by the sidebar and command palette`)
  assert.match(patch, new RegExp(label))
}
for (const hint of hints) assert.equal(appShell.split(`hint: "${hint}"`).length - 1, 1)

assert.equal(appShell.includes('label: "顧客・ポイント"'), false)
assert.equal(appShell.includes('label: "商品棚・集計"'), false)
assert.match(patch, /replaceNextReferences\(oldLayoutName, newLayoutName\)/)
assert.match(patch, /X-Lien-Admin-Sidebar-Labels', 'v578'/)
assert.match(patch, /customer-campaigns-v427\.js/)
assert.match(patch, /wholesale-ordering-v543\.js/)
assert.match(patch, /billing\.js/)

console.log(JSON.stringify({ release:'admin-sidebar-labels-v578', sourceLabels:true, cacheBusting:true, standaloneShells:true }))
