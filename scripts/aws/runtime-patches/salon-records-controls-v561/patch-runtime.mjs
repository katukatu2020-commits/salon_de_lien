import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const serverPath = path.join(root, 'server.js')
const commercialPath = path.join(root, 'commercial-admin-v101.js')
const attendanceServicePath = path.join(root, 'attendance-history-editor-v497.js')
const attendanceClientPath = path.join(root, 'attendance-client-v497.js')
const salesClientPath = path.join(root, 'sales-ledger-client-v318.js')
const customerMergePath = path.join(root, 'customer-merge-v385.js')
const customerAutoMergePath = path.join(root, 'customer-name-auto-merge-v489.js')
const serviceTargetPath = path.join(root, 'salon-operations-v561.js')
const marker = 'salon-records-controls-v561'

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${label}: target was not found`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: target was not unique`)
  return source.slice(0, first) + after + source.slice(first + before.length)
}

function appendTemplateStyles(source, anchor, addition) {
  const start = source.indexOf(anchor)
  if (start < 0) throw new Error('sales ledger style anchor was not found')
  if (source.indexOf(anchor, start + anchor.length) >= 0) throw new Error('sales ledger style anchor was not unique')
  const end = source.indexOf('\n\n    `', start)
  if (end < 0) throw new Error('sales ledger style template end was not found')
  return source.slice(0, end) + '\n' + addition.trim() + source.slice(end)
}

fs.copyFileSync(path.join(patchRoot, 'salon-operations-v561.js'), serviceTargetPath)

let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes(`/* ${marker} */`)) throw new Error(`${marker}: patch already applied`)
server = replaceOnce(
  server,
  `const { createAttendanceNotificationProductService } = require('./attendance-history-editor-v497') /* attendance-history-editor-v497 */`,
  `const { createAttendanceNotificationProductService } = require('./attendance-history-editor-v497') /* attendance-history-editor-v497 */\nconst { createSalonOperationsService } = require('./salon-operations-v561') /* ${marker} */`,
  'salon operations import',
)
server = replaceOnce(
  server,
  `const attendanceNotificationProduct = createAttendanceNotificationProductService({\n  prisma,\n  crypto,\n  sessionProvider: req => chatSession(req, 'staff'),\n}) /* attendance-history-editor-v497-service */`,
  `const attendanceNotificationProduct = createAttendanceNotificationProductService({\n  prisma,\n  crypto,\n  sessionProvider: req => chatSession(req, 'staff'),\n}) /* attendance-history-editor-v497-service */\nconst salonOperations = createSalonOperationsService({\n  prisma,\n  crypto,\n  sessionProvider: req => chatSession(req, 'staff'),\n}) /* ${marker}-service */`,
  'salon operations service',
)
server = replaceOnce(
  server,
  `  await attendanceNotificationProduct.ensureSchema() /* attendance-history-editor-v497-schema */`,
  `  await attendanceNotificationProduct.ensureSchema() /* attendance-history-editor-v497-schema */\n  await salonOperations.ensureSchema() /* ${marker}-schema */`,
  'salon operations schema',
)
server = replaceOnce(
  server,
  `      if (await attendanceNotificationProduct.handle(req, res, url)) return /* attendance-history-editor-v497-route */`,
  `      if (await attendanceNotificationProduct.handle(req, res, url)) return /* attendance-history-editor-v497-route */\n      if (await salonOperations.handle(req, res, url)) return /* ${marker}-route */`,
  'salon operations route',
)
const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Comment-Layout', 'v560') /* customer-comment-owner-v560 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Salon-Records-Controls', 'v561') /* ${marker} */`,
  'readiness marker',
)
server += `\n/* ${marker} */\n`

let attendanceService = fs.readFileSync(attendanceServicePath, 'utf8')
attendanceService = replaceOnce(
  attendanceService,
  `  async function getAttendance(res, url, session) {\n    const month = validMonth(url.searchParams.get('month'))`,
  `  async function isSharedStoreAccount(session) {\n    if (!session.userId) return false\n    const rows = await prisma.$queryRawUnsafe('SELECT "isSharedStoreAccount" FROM "AppUser" WHERE "id"=$1 AND "organizationId"=$2 AND "active"=TRUE LIMIT 1', session.userId, session.organizationId)\n    return Boolean(rows[0]?.isSharedStoreAccount)\n  }\n\n  async function getAttendance(res, url, session) {\n    const sharedStoreAccount = await isSharedStoreAccount(session)\n    const month = validMonth(url.searchParams.get('month'))`,
  'shared attendance identity',
)
attendanceService = replaceOnce(
  attendanceService,
  `      canEditRecords: true,`,
  `      canEditRecords: !sharedStoreAccount,\n      sharedStoreAccount,`,
  'attendance edit capability',
)
attendanceService = replaceOnce(
  attendanceService,
  `    const action = String(input.action || '')\n    const staffKey = String(input.staffKey || '').trim()`,
  `    const action = String(input.action || '')\n    if (action === 'save_record' && await isSharedStoreAccount(session)) {\n      return json(res, 403, { ok: false, error: '店舗共通アカウントでは、確定済みの勤務実績を追加・変更できません。オーナーへ依頼してください。' })\n    }\n    const staffKey = String(input.staffKey || '').trim()`,
  'shared attendance write guard',
)
attendanceService += `\n/* ${marker} */\n`

let customerMerge = fs.readFileSync(customerMergePath, 'utf8')
customerMerge = replaceOnce(
  customerMerge,
  `'Visit','VisitPhoto','StyleSuggestion'`,
  `'Visit','VisitPhoto','CustomerChartPhoto','StyleSuggestion'`,
  'manual customer merge chart photos',
)
customerMerge += `\n/* ${marker} */\n`

let customerAutoMerge = fs.readFileSync(customerAutoMergePath, 'utf8')
customerAutoMerge = replaceOnce(
  customerAutoMerge,
  `'Visit', 'VisitPhoto', 'StyleSuggestion'`,
  `'Visit', 'VisitPhoto', 'CustomerChartPhoto', 'StyleSuggestion'`,
  'automatic customer merge chart photos',
)
customerAutoMerge += `\n/* ${marker} */\n`

function patchAttendanceClient(source, label) {
  source = replaceOnce(
    source,
    `    .ca-attendance-feedback{min-height:18px;margin-top:10px;color:#9c493e;font-size:11px;font-weight:800}`,
    `    .ca-attendance-feedback{min-height:18px;margin-top:10px;color:#9c493e;font-size:11px;font-weight:800}\n    .ca-attendance-readonly{display:flex;align-items:flex-start;gap:9px;margin:14px 0;border:1px solid #d8e5dc;border-radius:7px;background:#f2f8f4;padding:11px 12px;color:#3f6852;font-size:11px;font-weight:800;line-height:1.7}.ca-attendance-readonly svg{width:17px;height:17px;flex:0 0 auto;margin-top:1px}`,
    `${label} readonly style`,
  )
  source = replaceOnce(
    source,
    `  function bindAttendanceEvents(root, data, view) {\n    root.querySelectorAll('[data-attendance-view]')`,
    `  function bindAttendanceEvents(root, data, view) {\n    if (data.canEditRecords === false && view === 'history') {\n      const editor = root.querySelector('.ca-day-editor')\n      if (editor && !editor.querySelector('.ca-attendance-readonly')) {\n        const notice = document.createElement('div')\n        notice.className = 'ca-attendance-readonly'\n        notice.innerHTML = icon('save') + '<span>店舗共通アカウントでは、確定済みの勤務実績を追加・変更できません。修正が必要な場合はオーナーへ依頼してください。</span>'\n        editor.querySelector('.ca-day-editor-header')?.after(notice)\n      }\n      root.querySelectorAll('[data-attendance-record-editor] input').forEach(input => { input.disabled = true })\n      root.querySelectorAll('[data-attendance-save-record],[data-attendance-add-shift]').forEach(button => button.remove())\n    }\n    root.querySelectorAll('[data-attendance-view]')`,
    `${label} readonly behavior`,
  )
  return source
}

let commercial = patchAttendanceClient(fs.readFileSync(commercialPath, 'utf8'), 'commercial attendance')
const chartClient = fs.readFileSync(path.join(patchRoot, 'customer-chart-client-v561.js'), 'utf8')
if (commercial.includes('__lienCustomerChartPhotosV561')) throw new Error('customer chart client already exists')
commercial += `\n${chartClient}\n/* ${marker}-customer-chart */\n`

let attendanceClient = patchAttendanceClient(fs.readFileSync(attendanceClientPath, 'utf8'), 'standalone attendance')
attendanceClient += `\n/* ${marker} */\n`

let salesClient = fs.readFileSync(salesClientPath, 'utf8')
salesClient = replaceOnce(
  salesClient,
  `  function openDetailEdit(root, row, bulk = false) {\n    const detailDialog = root.querySelector('[data-sl-detail-dialog]')\n    state.reopenDetailAfterEdit = Boolean(detailDialog?.open)\n    if (detailDialog?.open) {\n      detailDialog.dataset.preserveState = '1'\n      detailDialog.close()\n    }\n    openEdit(root, row, bulk)\n  }`,
  `  function openDetailEdit(root, row, bulk = false) {\n    const detailDialog = root.querySelector('[data-sl-detail-dialog]')\n    state.reopenDetailAfterEdit = Boolean(detailDialog?.open)\n    if (detailDialog?.open) {\n      detailDialog.dataset.preserveState = '1'\n      detailDialog.close()\n    }\n    openEdit(root, row, bulk)\n  }\n\n  function openVoid(root, row) {\n    const detailDialog = root.querySelector('[data-sl-detail-dialog]')\n    state.reopenDetailAfterEdit = Boolean(detailDialog?.open)\n    if (detailDialog?.open) {\n      detailDialog.dataset.preserveState = '1'\n      detailDialog.close()\n    }\n    const dialog = root.querySelector('[data-sl-dialog]')\n    dialog.innerHTML = \`<form method="dialog" data-sl-void-form><div class="sl-dialog-head"><div><span class="sl-eyebrow">PAYMENT CANCELLATION</span><h2>決済を取り消す</h2></div><button class="sl-close" type="button" data-close aria-label="閉じる">\${icon('close')}</button></div><div class="sl-dialog-body"><p class="sl-void-warning"><strong>\${esc(row.displayCustomerName)} / \${esc(yen(row.amount))}</strong><span>この決済を日別売上集計から除外します。店販商品がある場合は在庫数を戻し、取消記録は監査用に保持します。</span></p><label class="sl-field wide"><span>取消メモ（任意）</span><textarea name="reason" maxlength="500" placeholder="例：決済端末で取消済み"></textarea></label><label class="sl-void-confirm"><input type="checkbox" data-sl-void-confirm><span>対象の決済と金額を確認しました</span></label><div class="sl-dialog-foot"><button class="sl-button" type="button" data-close>キャンセル</button><button class="sl-button danger" type="submit" data-sl-void-submit disabled>決済を取消</button></div></div></form>\`\n    const form = dialog.querySelector('[data-sl-void-form]')\n    const confirmation = form.querySelector('[data-sl-void-confirm]')\n    const submit = form.querySelector('[data-sl-void-submit]')\n    confirmation.addEventListener('change', () => { submit.disabled = !confirmation.checked })\n    dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => dialog.close()))\n    form.addEventListener('submit', async event => {\n      event.preventDefault()\n      if (!confirmation.checked) return\n      submit.disabled = true\n      try {\n        await request('/api/admin/sales-ledger/void', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ saleId:row.id, reason:new FormData(form).get('reason') || '', confirmed:true }) })\n        dialog.close()\n        state.selected.clear()\n        await load(root)\n      } catch (error) {\n        alert(error.message)\n        submit.disabled = false\n      }\n    })\n    dialog.showModal()\n  }`,
  'sales void dialog',
)
salesClient = replaceOnce(
  salesClient,
  `<label class="sl-field wide"><span>取消メモ（任意）</span><textarea name="reason" maxlength="500" placeholder="例：決済端末で取消済み"></textarea></label>`,
  ``,
  'sales void confirmation only',
)
salesClient = replaceOnce(
  salesClient,
  `reason:new FormData(form).get('reason') || ''`,
  `reason:'会計データ管理から取消'`,
  'sales void audit reason',
)
salesClient = replaceOnce(
  salesClient,
  `<button class="sl-button danger" type="submit" data-sl-void-submit disabled>決済を取消</button>`,
  `<button class="sl-button danger" type="submit" data-sl-void-submit disabled>取り消す</button>`,
  'sales void submit label',
)
salesClient = replaceOnce(
  salesClient,
  `<td><button class="sl-button" type="button" data-edit>\${icon('edit')}修正</button></td></tr>`,
  `<td><div class="sl-row-actions"><button class="sl-button" type="button" data-edit>\${icon('edit')}修正</button><button class="sl-button sl-danger-button" type="button" data-void>\${icon('close')}取消</button></div></td></tr>`,
  'sales row actions',
)
salesClient = replaceOnce(
  salesClient,
  `      tr.querySelector('[data-edit]').addEventListener('click', () => openDetailEdit(root, state.rows.find(row => row.id === id)))`,
  `      tr.querySelector('[data-edit]').addEventListener('click', () => openDetailEdit(root, state.rows.find(row => row.id === id)))\n      tr.querySelector('[data-void]').addEventListener('click', () => openVoid(root, state.rows.find(row => row.id === id)))`,
  'sales void event',
)
salesClient = appendTemplateStyles(
  salesClient,
  '/* sales-ledger-staff-multiselect-v542 */\n      .sl-summary-staff-filter{min-width:280px}',
  `      /* ${marker} */
      .sl-row-actions{display:flex;align-items:center;gap:6px;white-space:nowrap}
      .sl-danger-button{border-color:#e7c5c5!important;color:#a33d3d!important}.sl-danger-button:hover{background:#fff4f4!important}
      .sl-dialog-foot .sl-button.danger{border-color:#a93f4f;background:#a93f4f;color:#fff}.sl-dialog-foot .sl-button.danger:disabled{opacity:.45;cursor:not-allowed}
      .sl-void-warning{display:grid;gap:7px;border-left:3px solid #b74758;background:#fff5f6;padding:12px 14px;color:#6d4d4d;font-size:12px;line-height:1.7}.sl-void-warning strong{color:#8d3041;font-size:14px}.sl-void-warning span{display:block}
      .sl-void-confirm{display:flex;min-height:48px;align-items:center;gap:10px;border:1px solid var(--sl-line);border-radius:7px;background:#fff;padding:10px 12px;color:var(--sl-ink);font-size:12px;font-weight:800;cursor:pointer}.sl-void-confirm input{width:19px;height:19px;accent-color:#a93f4f}
      @media(max-width:700px){.sl-row-actions{align-items:stretch;flex-direction:column}.sl-row-actions .sl-button{width:100%}}`,
)
salesClient += `\n/* ${marker} */\n`

fs.writeFileSync(serverPath, server)
fs.writeFileSync(attendanceServicePath, attendanceService)
fs.writeFileSync(customerMergePath, customerMerge)
fs.writeFileSync(customerAutoMergePath, customerAutoMerge)
fs.writeFileSync(commercialPath, commercial)
fs.writeFileSync(attendanceClientPath, attendanceClient)
fs.writeFileSync(salesClientPath, salesClient)

console.log(JSON.stringify({ release:marker, server:true, chart:true, salesVoid:true, attendanceGuard:true }))
