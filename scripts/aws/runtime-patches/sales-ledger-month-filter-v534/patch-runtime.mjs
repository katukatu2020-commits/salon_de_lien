import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const clientPath = path.join(root, 'sales-ledger-client-v318.js')
const serverPath = path.join(root, 'server.js')
const helperPath = path.join(patchRoot, 'sales-ledger-month-filter-v534.js')
const marker = 'sales-ledger-month-filter-v534'

let client = fs.readFileSync(clientPath, 'utf8')
let server = fs.readFileSync(serverPath, 'utf8')
const helper = fs.readFileSync(helperPath, 'utf8')

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${label}: target was not found`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: target was not unique`)
  return source.slice(0, first) + after + source.slice(first + before.length)
}

function replaceRegion(source, start, end, replacement, label) {
  const first = source.indexOf(start)
  if (first < 0) throw new Error(`${label}: start target was not found`)
  if (source.indexOf(start, first + start.length) >= 0) throw new Error(`${label}: start target was not unique`)
  const last = source.indexOf(end, first + start.length)
  if (last < 0) throw new Error(`${label}: end target was not found`)
  return source.slice(0, first) + replacement + '\n\n' + source.slice(last)
}

const helperStart = helper.indexOf('/* browser-month-helpers:start */')
const helperEnd = helper.indexOf('/* browser-month-helpers:end */')
if (helperStart < 0 || helperEnd <= helperStart) throw new Error('month helper boundaries were not found')
const browserHelpers = helper.slice(
  helperStart + '/* browser-month-helpers:start */'.length,
  helperEnd,
).trim()

client = replaceOnce(
  client,
  `  const VERSION = 'sales-ledger-layout-v413'`,
  `  const VERSION = '${marker}'`,
  'sales ledger browser version',
)

client = replaceOnce(
  client,
  `  let state = { rows: [], staff: [], selected: new Set() }`,
  `  let state = { rows: [], staff: [], selected: new Set() }\n  let loadSequence = 0`,
  'sales ledger request sequencing state',
)

client = replaceOnce(
  client,
  `      close:'<path d="m6 6 12 12M18 6 6 18"/>',`,
  `      close:'<path d="m6 6 12 12M18 6 6 18"/>',
      calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
      chevronLeft:'<path d="m15 18-6-6 6-6"/>',
      chevronRight:'<path d="m9 18 6-6-6-6"/>',`,
  'month filter icons',
)

const monthStyles = `      /* ${marker} */
      .sl-month-filter{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:20px;padding:16px 18px;border:1px solid var(--sl-line);border-radius:16px;background:var(--lien-surface-soft,#f8f3ee)}
      .sl-month-heading{display:flex;min-width:0;align-items:center;gap:12px}.sl-month-icon{display:grid;width:42px;height:42px;flex:0 0 42px;place-items:center;border-radius:12px;background:var(--sl-rose-soft);color:var(--sl-rose)}.sl-month-icon svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.sl-month-copy{display:grid;gap:3px}.sl-month-copy strong{font-size:13px;line-height:1.4}.sl-month-copy span{color:var(--sl-muted);font-size:11px;line-height:1.45}
      .sl-month-controls{display:grid;grid-template-columns:42px minmax(180px,230px) 42px auto;align-items:center;gap:8px}.sl-month-nav{display:grid;width:42px;height:42px;place-items:center;border:1px solid var(--sl-line);border-radius:50%;background:var(--sl-card);color:var(--sl-ink);cursor:pointer}.sl-month-nav:hover:not(:disabled){border-color:var(--sl-rose);color:var(--sl-rose)}.sl-month-nav:focus-visible{outline:3px solid #d85a7b2b;outline-offset:2px}.sl-month-nav:disabled{opacity:.35;cursor:not-allowed}.sl-month-nav svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.sl-month-input{width:100%;min-width:0;height:42px;border:1px solid var(--sl-line);border-radius:12px;background:var(--sl-card);padding:8px 12px;color:var(--sl-ink);font:700 13px/1.2 inherit;color-scheme:light}.sl-month-input:focus{border-color:var(--sl-rose);outline:3px solid #d85a7b1c}.sl-month-current{min-width:70px;white-space:nowrap}.sl-filter-divider{display:flex;align-items:center;gap:10px;margin:0 0 14px;color:var(--sl-muted);font-size:10px;font-weight:800}.sl-filter-divider::after{height:1px;flex:1;background:var(--sl-line);content:""}
      html[data-ca-theme="dark"] .sl-month-input{color-scheme:dark}
      @media(max-width:700px){.sl-month-filter{align-items:stretch;flex-direction:column;padding:15px}.sl-month-controls{grid-template-columns:42px minmax(0,1fr) 42px}.sl-month-current{grid-column:1/-1;width:100%}.sl-month-copy span{font-size:10px}}
`
client = replaceOnce(
  client,
  `      /* sales-ledger-visual-parity-v413 */`,
  `${monthStyles}      /* sales-ledger-visual-parity-v413 */`,
  'month filter styles',
)

const browserMonthFunctions = `${browserHelpers}

  function selectedPeriodLabel(root) {
    const selectedMonth = root.querySelector('[data-sl-month]')?.value || ''
    if (selectedMonth && monthRange(selectedMonth)) return \`\${monthLabel(selectedMonth)}の会計データ\`
    const from = root.querySelector('[name=from]')?.value || ''
    const to = root.querySelector('[name=to]')?.value || ''
    if (from && to) return \`\${from.replaceAll('-', '/')}〜\${to.replaceAll('-', '/')}の会計データ\`
    return '会計データ'
  }

  function syncMonthControls(root) {
    const input = root.querySelector('[data-sl-month]')
    if (!input) return
    const currentMonth = monthValueInTokyo()
    const selectedMonth = input.value
    root.querySelector('[data-sl-month-caption]').textContent = selectedMonth ? monthLabel(selectedMonth) : '日付を個別指定中'
    root.querySelector('[data-sl-month-shift="-1"]').disabled = !selectedMonth
    root.querySelector('[data-sl-month-shift="1"]').disabled = !selectedMonth || selectedMonth >= currentMonth
    root.querySelector('[data-sl-current-month]').disabled = selectedMonth === currentMonth
  }

  function applyMonth(root, value, loadRows = true) {
    const currentMonth = monthValueInTokyo()
    const selectedMonth = value > currentMonth ? currentMonth : value
    const range = monthRange(selectedMonth)
    if (!range) return
    root.querySelector('[data-sl-month]').value = selectedMonth
    root.querySelector('[name=from]').value = range.from
    root.querySelector('[name=to]').value = range.to
    syncMonthControls(root)
    if (loadRows) {
      state.selected.clear()
      void load(root)
    }
  }

  function syncMonthFromDates(root) {
    const from = root.querySelector('[name=from]').value
    const to = root.querySelector('[name=to]').value
    const candidate = from.slice(0, 7)
    const range = monthRange(candidate)
    root.querySelector('[data-sl-month]').value = range && range.from === from && range.to === to ? candidate : ''
    syncMonthControls(root)
  }`

client = replaceOnce(
  client,
  `  function renderRows(root) {`,
  `${browserMonthFunctions}\n\n  function renderRows(root) {`,
  'month filter browser behavior',
)

client = replaceOnce(
  client,
  `  function renderRows(root) {
    const body = root.querySelector('[data-sl-rows]')
    if (!state.rows.length) {`,
  `  function renderRows(root) {
    const body = root.querySelector('[data-sl-rows]')
    root.querySelector('[data-sl-count]').textContent = \`\${state.rows.length.toLocaleString('ja-JP')}件\`
    root.querySelector('[data-sl-selected]').textContent = \`\${state.selected.size}件選択\`
    root.querySelector('[data-sl-bulk]').disabled = !state.selected.size
    root.querySelector('[data-sl-print]').disabled = !state.rows.length
    root.querySelector('[data-select-all]').checked = Boolean(state.rows.length) && state.selected.size === state.rows.length
    if (!state.rows.length) {`,
  'empty monthly result state',
)

const loadFunction = `  async function load(root) {
    const sequence = ++loadSequence
    const period = selectedPeriodLabel(root)
    root.querySelector('[data-sl-status]').textContent = \`\${period}を読み込んでいます…\`
    try {
      const params = new URLSearchParams(filters(root))
      const payload = await request(\`/api/admin/sales-ledger?\${params}\`)
      if (sequence !== loadSequence || !root.isConnected) return
      state.rows = payload.rows || []
      state.staff = payload.staff || []
      const staffSelect = root.querySelector('[name=staff]')
      const previous = staffSelect.value
      staffSelect.innerHTML = '<option value="">すべて</option>' + state.staff.map(name => \`<option value="\${esc(name)}">\${esc(name)}</option>\`).join('')
      staffSelect.value = previous
      state.selected = new Set([...state.selected].filter(id => state.rows.some(row => row.id === id)))
      root.querySelector('[data-sl-status]').textContent = \`\${period}を表示しています。変更は履歴へ記録されます。\`
      renderRows(root)
    } catch (error) {
      if (sequence !== loadSequence || !root.isConnected) return
      root.querySelector('[data-sl-status]').textContent = error.message
      state.rows = []
      state.selected.clear()
      renderRows(root)
    }
  }`
client = replaceRegion(client, '  async function load(root) {', '  function ledgerMarkup() {', loadFunction, 'sequenced monthly ledger loading')

const ledgerMarkup = `  function ledgerMarkup() {
    const currentMonth = monthValueInTokyo()
    const initialRange = monthRange(currentMonth)
    return \`<div class="sl-page"><nav class="sl-tabs" aria-label="経営ページ切替"><a href="/admin/owner-analytics">経営分析</a><a aria-current="page" class="active" href="/admin/owner-analytics?salesLedger=1">会計データ管理</a><a href="/admin/owner-analytics?section=billing">システム利用料</a></nav>
      <header class="sl-hero lien-glass overflow-hidden rounded-[28px] border p-5 sm:p-6"><div class="min-w-0"><div class="sl-hero-eyebrow">\${icon('receipt')}<span>Sales ledger</span></div><h1 class="text-balance text-2xl font-semibold tracking-normal text-[color:var(--lien-ink)] sm:text-3xl">会計データ管理</h1><p class="mt-3 max-w-3xl text-sm leading-7 text-lien-muted">確定後の売上を検索し、個別または複数選択で修正できます。変更前後と操作担当者は監査履歴へ保存されます。</p></div><span class="sl-hero-mark">\${icon('receipt')}</span></header>
      <section class="sl-card"><form data-sl-search><div class="sl-month-filter" role="group" aria-labelledby="sl-month-title"><div class="sl-month-heading"><span class="sl-month-icon">\${icon('calendar')}</span><div class="sl-month-copy"><strong id="sl-month-title">対象月</strong><span data-sl-month-caption aria-live="polite">\${monthLabel(currentMonth)}</span></div></div><div class="sl-month-controls"><button class="sl-month-nav" type="button" data-sl-month-shift="-1" aria-label="前月" title="前月">\${icon('chevronLeft')}</button><input class="sl-month-input" type="month" data-sl-month value="\${currentMonth}" max="\${currentMonth}" aria-label="対象月"><button class="sl-month-nav" type="button" data-sl-month-shift="1" aria-label="翌月" title="翌月">\${icon('chevronRight')}</button><button class="sl-button sl-month-current" type="button" data-sl-current-month>今月</button></div></div><div class="sl-filter-divider"><span>詳細条件</span></div><div class="sl-filter-grid">
        <div class="sl-field"><label>売上日（開始）</label><input type="date" aria-label="売上日（開始）" name="from" value="\${initialRange.from}"></div><div class="sl-field"><label>売上日（終了）</label><input type="date" aria-label="売上日（終了）" name="to" value="\${initialRange.to}"></div>
        <div class="sl-field"><label>顧客名</label><input aria-label="顧客名" name="customer" maxlength="100" placeholder="顧客名で検索"></div><div class="sl-field"><label>主担当スタッフ</label><select aria-label="主担当スタッフ" name="staff"><option value="">すべて</option></select></div>
        <div class="sl-field"><label>売上No.</label><input aria-label="売上番号" name="saleNo" maxlength="100" placeholder="IDの一部でも可"></div><div class="sl-field"><label>施術No.</label><input aria-label="施術番号" name="appointmentNo" maxlength="100" placeholder="予約IDの一部でも可"></div>
        <div class="sl-field wide"><label>施術・メニュー・メモ</label><input aria-label="施術・メニュー・メモ" name="keyword" maxlength="120" placeholder="内容を検索"></div>
      </div><div class="sl-actions"><span class="sl-status" data-sl-status></span><div class="sl-action-group"><button class="sl-button primary" type="submit">\${icon('search')}検索</button></div></div></form></section>
      <section class="sl-card sl-table-card"><div class="sl-table-head"><div class="sl-section-title">\${icon('receipt')}<div><h2>売上一覧</h2><span class="sl-status"><span data-sl-count>0件</span> / <span data-sl-selected>0件選択</span></span></div></div><div class="sl-action-group"><button class="sl-button" type="button" data-sl-bulk disabled>\${icon('edit')}選択項目を一括修正</button><button class="sl-button" type="button" data-sl-print disabled>\${icon('print')}印刷</button></div></div><div class="sl-table-wrap"><table class="sl-table"><thead><tr><th><input type="checkbox" data-select-all aria-label="表示中をすべて選択"></th><th>売上日 / 売上No.</th><th>顧客名</th><th>主担当</th><th>施術・売上内容</th><th>合計金額</th><th>支払方法</th><th>商品</th><th>施術No.</th><th>履歴</th><th>操作</th></tr></thead><tbody data-sl-rows></tbody></table></div></section><dialog class="sl-dialog" data-sl-dialog></dialog></div>\`
  }`
client = replaceRegion(client, '  function ledgerMarkup() {', '  function cleanupLedgerPortal() {', ledgerMarkup, 'monthly ledger markup')

client = replaceOnce(
  client,
  `    root.querySelector('[data-sl-search]').addEventListener('submit', event => { event.preventDefault(); state.selected.clear(); load(root) })`,
  `    root.querySelector('[data-sl-search]').addEventListener('submit', event => { event.preventDefault(); syncMonthFromDates(root); state.selected.clear(); load(root) })
    root.querySelector('[data-sl-month]').addEventListener('change', event => {
      if (event.currentTarget.value) applyMonth(root, event.currentTarget.value)
      else syncMonthControls(root)
    })
    root.querySelectorAll('[data-sl-month-shift]').forEach(button => button.addEventListener('click', () => {
      const value = shiftMonth(root.querySelector('[data-sl-month]').value, Number(button.dataset.slMonthShift))
      if (value) applyMonth(root, value)
    }))
    root.querySelector('[data-sl-current-month]').addEventListener('click', () => applyMonth(root, monthValueInTokyo()))
    root.querySelectorAll('[name=from],[name=to]').forEach(input => input.addEventListener('change', () => syncMonthFromDates(root)))
    syncMonthControls(root)`,
  'month filter event wiring',
)

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Registration-Profile', 'v533') /* customer-registration-profile-v533 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Sales-Ledger-Month-Filter', 'v534') /* ${marker} */`,
  'sales ledger month filter readiness marker',
)

fs.writeFileSync(clientPath, client)
fs.writeFileSync(serverPath, server)
console.log(JSON.stringify({ release: marker, patched: true }))
