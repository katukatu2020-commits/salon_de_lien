import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const source = path.dirname(fileURLToPath(import.meta.url))
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
function edit(file, transform) {
  const target = path.join(root, file)
  fs.writeFileSync(target, transform(fs.readFileSync(target, 'utf8')))
}
function replace(file, before, after) {
  edit(file, content => {
    if (content.split(before).length !== 2) throw Error(`Unexpected parent anchor ${file}: ${before.slice(0, 100)}`)
    return content.replace(before, after)
  })
}
function between(file, start, end, replacement) {
  edit(file, content => {
    if (content.split(start).length !== 2 || content.split(end).length !== 2) throw Error(`Unexpected section in ${file}`)
    const a = content.indexOf(start), b = content.indexOf(end, a)
    if (b < a) throw Error(`Reversed section in ${file}`)
    return content.slice(0, a) + replacement + content.slice(b)
  })
}
fs.copyFileSync(path.join(source, 'salon-branch-inquiry-v675.js'), path.join(root, 'salon-branch-inquiry-v675.js'))
fs.copyFileSync(path.join(source, 'inquiry-dialog.js'), path.join(root, 'salon-branch-inquiry-v675-dialog.js'))
const master = 'salon-group-master-v672.js', approvals = 'business-account-approvals-v643.js'
replace(master, "const { passwordHash, verifyPassword }", "const branchInquiry = require('./salon-branch-inquiry-v675')\nconst { verifyPassword }")
replace(master, '    return schemaPromise', '    await schemaPromise\n    await branchInquiry.ensureSchema(prisma)')
between(master, '  async function createStore(session, input) {', '  async function linkStore(session, input) {', `  async function createStore(session, input) {
    return branchInquiry.submitInquiry({ prisma, crypto, session, input, clean, prefectures: PREFECTURES, ensureGroup })
  }
`)
const page = 'salon-group-master-v672-page.js'
replace(page, "const h = value", "const { renderInquiryDialog } = require('./salon-branch-inquiry-v675-dialog')\nconst h = value")
replace(page, "  const plan = h(data.plan.name || '契約プラン未設定')\n", '')
replace(page, '${!data.plan.key ? \' disabled\' : \'\'}', '')
between(page, '    <dialog class="sg-dialog" id="sg-create"', '    <dialog class="sg-dialog" id="sg-link"', '    ${renderInquiryDialog(data, prefectures)}\n')
const client = 'salon-group-master-v672-client.js'
replace(client, "feedback.textContent = '登録しています…'", "feedback.textContent = '申請を送信しています…'")
between(client, "      const section = document.getElementById('sg-created')", '    } catch (error) { feedback.textContent = error.message } finally', fs.readFileSync(path.join(source, 'inquiry-success.js.txt'), 'utf8') + '\n')
edit('salon-group-master-v672.css', css => css + '\n/* salon-branch-inquiry-v675 */\n.sg-field textarea{width:100%;min-width:0;min-height:100px;resize:vertical;border:1px solid #d9cfd5;border-radius:6px;background:#fff;padding:10px 12px;color:#302d30;font:inherit}#sg-created{overflow-wrap:anywhere}@media(max-width:680px){.sg-field textarea{font-size:16px}}\n')
for (const file of [page, 'server.js']) edit(file, text => text.replaceAll('salon-group-master-v672.css?v=672-1', 'salon-group-master-v672.css?v=675-1').replaceAll('salon-group-master-v672-client.js?v=672-1', 'salon-group-master-v672-client.js?v=675-1'))
replace(approvals, 'function createBusinessAccountApprovalService(options) {', "const branchInquiryV675 = require('./salon-branch-inquiry-v675')\nfunction createBusinessAccountApprovalService(options) {")
replace(approvals, '    schemaPromise = (async function () {', '    schemaPromise = (async function () {\n      await branchInquiryV675.ensureSchema(prisma)')
replace(approvals, "      await audit(tx, type, targetId, 'APPROVE_AND_ISSUE'", "      await branchInquiryV675.attachApprovedStore({ tx, crypto, inquiry, organizationId: targetId, contactName, type, BusinessAccessError })\n      await audit(tx, type, targetId, 'APPROVE_AND_ISSUE'")
replace(approvals, "const message = { already:", "const message = { branch: '申請元の系列店・管理者の利用状態を確認してください。店舗は作成されていません。', already:")
replace(approvals, "const audience = { salon: '美容室', dealer: 'ディーラー', other: 'その他の法人' }[row.audience] || '未設定'", "const audience = row.sourcePath === '/admin/salon-master' ? '系列店の新店舗登録' : ({ salon: '美容室', dealer: 'ディーラー', other: 'その他の法人' }[row.audience] || '未設定')")
replace('server.js', "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Desktop-Quality', 'v674') /* customer-desktop-quality-v674-ready */", "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Desktop-Quality', 'v674') /* customer-desktop-quality-v674-ready */\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Salon-Branch-Inquiry', 'v675') /* salon-branch-inquiry-v675-ready */")
console.log('Salon branch inquiry v675 runtime patched')
