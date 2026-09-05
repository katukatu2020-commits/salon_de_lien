import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const clientPath = path.join(root, 'sales-ledger-client-v318.js')
const serverPath = path.join(root, 'server.js')
const marker = 'sales-ledger-staff-filter-v539'

let client = fs.readFileSync(clientPath, 'utf8')
let server = fs.readFileSync(serverPath, 'utf8')
const styles = fs.readFileSync(path.join(patchRoot, 'sales-ledger-staff-filter-v539.css'), 'utf8')

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${label}: target was not found`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: target was not unique`)
  return source.slice(0, first) + after + source.slice(first + before.length)
}

function appendStyles(source, anchor, addition) {
  const start = source.indexOf(anchor)
  if (start < 0) throw new Error('detail modal style anchor was not found')
  if (source.indexOf(anchor, start + anchor.length) >= 0) throw new Error('detail modal style anchor was not unique')
  const end = source.indexOf('\n\n    `', start)
  if (end < 0) throw new Error('sales ledger style template end was not found')
  return source.slice(0, end) + '\n' + addition.trimEnd() + source.slice(end)
}

client = replaceOnce(client, `  const VERSION = 'sales-ledger-detail-modal-v538'`, `  const VERSION = '${marker}'`, 'client release version')
client = replaceOnce(
  client,
  `    root.querySelector('[data-sl-summary-period]').textContent = selectedPeriodLabel(root)`,
  `    const selectedStaff = root.querySelector('[data-sl-summary-staff]')?.value || ''
    root.querySelector('[data-sl-summary-period]').textContent = selectedPeriodLabel(root) + ' / 担当者：' + (selectedStaff || 'すべて')`,
  'daily summary staff caption',
)
client = replaceOnce(
  client,
  "    root.querySelector('[data-sl-status]').textContent = `${period}を読み込んでいます…`",
  `    root.querySelector('[data-sl-status]').textContent = \`\${period}を読み込んでいます…\`
    root.querySelector('[data-sl-print]').disabled = true`,
  'disable print while filtering',
)
client = replaceOnce(
  client,
  `<section class="sl-card sl-report-filter"><form data-sl-search>`,
  `<section class="sl-card sl-report-filter"><form id="sl-ledger-filter-form" data-sl-search>`,
  'ledger filter form identity',
)
client = replaceOnce(
  client,
  `<div class="sl-field"><label>主担当スタッフ</label><select aria-label="主担当スタッフ" name="staff"><option value="">すべてのスタッフ</option></select></div>`,
  ``,
  'old report staff filter',
)
client = replaceOnce(
  client,
  `<button class="sl-button" type="button" data-sl-print disabled>\${icon('print')}印刷</button></div><div class="sl-kpi-strip">`,
  `<div class="sl-summary-head-actions"><label class="sl-summary-staff-filter"><span>担当者</span><select aria-label="日別売上集計の担当者" name="staff" form="sl-ledger-filter-form" data-sl-summary-staff><option value="">すべての担当者</option></select></label><button class="sl-button" type="button" data-sl-print disabled>\${icon('print')}印刷</button></div></div><div class="sl-kpi-strip">`,
  'daily summary staff control',
)
client = replaceOnce(
  client,
  `    syncMonthControls(root)
    root.querySelector('[data-select-all]').addEventListener('change', event => {`,
  `    syncMonthControls(root)
    root.querySelector('[data-sl-summary-staff]').addEventListener('change', () => {
      state.selected.clear()
      state.detailDate = ''
      load(root)
    })
    root.querySelector('[data-select-all]').addEventListener('change', event => {`,
  'daily summary staff interaction',
)
client = appendStyles(client, '      /* sales-ledger-detail-modal-v538 */', styles)

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Sales-Ledger-Detail-Modal', 'v538') /* sales-ledger-detail-modal-v538 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Sales-Ledger-Staff-Filter', 'v539') /* ${marker} */`,
  'sales ledger staff filter readiness marker',
)

fs.writeFileSync(clientPath, client)
fs.writeFileSync(serverPath, server)
console.log(JSON.stringify({ release:marker, patched:true }))
