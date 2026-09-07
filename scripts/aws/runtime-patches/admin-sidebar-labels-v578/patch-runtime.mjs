import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const nextRoot = path.join(root, '.next')
const serverPath = path.join(root, 'server.js')
const marker = 'admin-sidebar-labels-v578'

const oldLayoutName = 'layout-runtime-v518-release1.navigation-loading-v536-release1.js'
const newLayoutName = `${oldLayoutName.slice(0, -3)}.${marker}.js`

const sidebarLabels = [
  ['予約カレンダー', '予約・シフト・会計'],
  ['顧客・チャット・配信', '顧客・カルテ・配信'],
  ['メニュー・商品棚・集計', 'メニュー・商品・在庫'],
  ['スタイル共有', 'スタイル投稿'],
  ['経営分析', '経営・会計管理'],
]

const commandHints = [
  ['Gmail予約と月間予定', '予約・シフト・出退勤・会計'],
  ['顧客管理とポイント管理', '顧客カルテ・チャット・配信'],
  ['メニュー・商品・在庫管理と集計', 'メニュー・商品・在庫・発注'],
  ['公開された施術写真とコメント', 'スタイル投稿・公開・コメント管理'],
  ['売上・スタッフ・顧客構成', '経営分析・会計データ・利用料'],
]

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

function patchCompiledLayout(source, label) {
  for (const [before, after] of sidebarLabels) {
    source = replaceExact(source, `label: "${before}"`, `label: "${after}"`, 2, `${label}: ${before}`)
  }
  for (const [before, after] of commandHints) {
    source = replaceExact(source, `hint: "${before}"`, `hint: "${after}"`, 1, `${label}: ${before}`)
  }
  return source
}

function patchShellText(filePath, replacements, label) {
  let source = fs.readFileSync(filePath, 'utf8')
  for (const [before, after, expected] of replacements) {
    source = replaceExact(source, before, after, expected, `${label}: ${before}`)
  }
  fs.writeFileSync(filePath, source)
}

function collectFiles(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes:true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) collectFiles(fullPath, output)
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.json')) output.push(fullPath)
  }
  return output
}

function replaceNextReferences(before, after) {
  let files = 0
  let references = 0
  for (const filePath of collectFiles(nextRoot)) {
    const source = fs.readFileSync(filePath, 'utf8')
    const count = source.split(before).length - 1
    if (!count) continue
    fs.writeFileSync(filePath, source.split(before).join(after))
    files += 1
    references += count
  }
  if (!files || !references) throw new Error('admin layout asset activation: no references were updated')
  return { files, references }
}

const oldLayoutPath = path.join(nextRoot, 'static', 'chunks', 'app', oldLayoutName)
const newLayoutPath = path.join(nextRoot, 'static', 'chunks', 'app', newLayoutName)
const layout = patchCompiledLayout(fs.readFileSync(oldLayoutPath, 'utf8'), 'admin client layout')
fs.writeFileSync(newLayoutPath, `${layout}\n/* ${marker} */\n`)
const layoutReferences = replaceNextReferences(oldLayoutName, newLayoutName)

patchShellText(
  path.join(nextRoot, 'server', 'chunks', '1425.js'),
  [
    ...sidebarLabels.map(([before, after]) => [`label: "${before}"`, `label: "${after}"`, 2]),
    ...commandHints.map(([before, after]) => [`hint: "${before}"`, `hint: "${after}"`, 1]),
  ],
  'admin server layout',
)

const commonShellText = [
  ['予約カレンダー', '予約・シフト・会計'],
  ['顧客・チャット・配信', '顧客・カルテ・配信'],
  ['メニュー・商品棚・集計', 'メニュー・商品・在庫'],
  ['スタイル共有', 'スタイル投稿'],
  ['経営分析', '経営・会計管理'],
]

patchShellText(
  path.join(root, 'customer-campaigns-v427.js'),
  commonShellText.map(([before, after]) => [before, after, before === '顧客・チャット・配信' ? 2 : 1]),
  'customer campaigns shell',
)
patchShellText(
  path.join(root, 'wholesale-ordering-v543.js'),
  commonShellText.map(([before, after]) => [before, after, 1]),
  'inventory and orders shell',
)
patchShellText(
  serverPath,
  commonShellText.map(([before, after]) => [before, after, before === '顧客・チャット・配信' ? 2 : 1]),
  'customer messages shell',
)
patchShellText(
  path.join(root, 'billing.js'),
  [
    ['予約カレンダー', '予約・シフト・会計', 1],
    ['顧客・チャット・配信', '顧客・カルテ・配信', 1],
    ['メニュー・商品棚・集計', 'メニュー・商品・在庫', 1],
    ['経営分析・システム利用料', '経営・会計管理', 1],
  ],
  'billing shell',
)

let server = fs.readFileSync(serverPath, 'utf8')
const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Owner-Billing-Tab', 'v577') /* owner-billing-tab-v577 */`
server = replaceExact(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Admin-Sidebar-Labels', 'v578') /* ${marker} */`,
  1,
  'readiness marker',
)
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release:marker, newLayoutName, layoutReferences }))
