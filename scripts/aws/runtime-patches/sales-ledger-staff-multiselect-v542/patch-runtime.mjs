import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const clientPath = path.join(root, 'sales-ledger-client-v318.js')
const servicePath = path.join(root, 'sales-ledger-accounts-v318.js')
const serverPath = path.join(root, 'server.js')
const marker = 'sales-ledger-staff-multiselect-v542'

let client = fs.readFileSync(clientPath, 'utf8')
let service = fs.readFileSync(servicePath, 'utf8')
let server = fs.readFileSync(serverPath, 'utf8')
const styles = fs.readFileSync(path.join(patchRoot, 'sales-ledger-staff-multiselect-v542.css'), 'utf8')

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${label}: target was not found`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: target was not unique`)
  return source.slice(0, first) + after + source.slice(first + before.length)
}

function appendStyles(source, anchor, addition) {
  const start = source.indexOf(anchor)
  if (start < 0) throw new Error('staff filter style anchor was not found')
  if (source.indexOf(anchor, start + anchor.length) >= 0) throw new Error('staff filter style anchor was not unique')
  const end = source.indexOf('\n\n    `', start)
  if (end < 0) throw new Error('sales ledger style template end was not found')
  return source.slice(0, end) + '\n' + addition.trimEnd() + source.slice(end)
}

client = replaceOnce(client, `  const VERSION = 'sales-ledger-staff-filter-v539'`, `  const VERSION = '${marker}'`, 'client release version')
client = replaceOnce(
  client,
  `let state = { rows: [], staff: [], paymentMethods: [], summary: { days: [], totals: {}, staff: [] }, selected: new Set(), detailDate: '', reopenDetailAfterEdit: false }`,
  `let state = { rows: [], staff: [], staffFilter: null, paymentMethods: [], summary: { days: [], totals: {}, staff: [] }, selected: new Set(), detailDate: '', reopenDetailAfterEdit: false }`,
  'staff filter state',
)
client = replaceOnce(
  client,
  `  function filters(root) {
    return Object.fromEntries(new FormData(root.querySelector('[data-sl-search]')).entries())
  }
`,
  `  function filters(root) {
    return Object.fromEntries(new FormData(root.querySelector('[data-sl-search]')).entries())
  }

  function selectedStaffNames() {
    if (state.staffFilter === null) return []
    return [...state.staffFilter].filter(name => state.staff.includes(name))
  }

  function staffSelectionLabel() {
    if (state.staffFilter === null) return 'すべてのスタッフ'
    const names = selectedStaffNames()
    if (!names.length) return 'スタッフ未選択'
    if (names.length === 1) return names[0]
    return \`\${names.length}名を選択\`
  }

  function staffSelectionCaption() {
    if (state.staffFilter === null) return 'すべて'
    const names = selectedStaffNames()
    if (!names.length) return '未選択'
    return names.length <= 2 ? names.join('、') : \`\${names.length}名選択\`
  }

  function renderStaffFilter(root) {
    const triggerLabel = root.querySelector('[data-sl-staff-label]')
    const allCheckbox = root.querySelector('[data-sl-staff-all]')
    const options = root.querySelector('[data-sl-staff-options]')
    if (!triggerLabel || !allCheckbox || !options) return
    triggerLabel.textContent = staffSelectionLabel()
    const selected = state.staffFilter === null ? new Set(state.staff) : new Set(selectedStaffNames())
    allCheckbox.checked = Boolean(state.staff.length) && state.staffFilter === null
    allCheckbox.indeterminate = state.staffFilter !== null && selected.size > 0
    allCheckbox.disabled = !state.staff.length
    options.innerHTML = state.staff.length
      ? state.staff.map(name => \`<label class="sl-staff-option"><input type="checkbox" value="\${esc(name)}" data-sl-staff-option \${selected.has(name) ? 'checked' : ''}><span>\${esc(name)}</span></label>\`).join('')
      : '<span class="sl-staff-option-empty">選択できるスタッフがいません</span>'
  }
`,
  'staff multiselect helpers',
)
client = replaceOnce(
  client,
  `    const selectedStaff = root.querySelector('[data-sl-summary-staff]')?.value || ''
    root.querySelector('[data-sl-summary-period]').textContent = selectedPeriodLabel(root) + ' / 担当者：' + (selectedStaff || 'すべて')`,
  `    root.querySelector('[data-sl-summary-period]').textContent = selectedPeriodLabel(root) + ' / 担当者：' + staffSelectionCaption()`,
  'multiple staff summary caption',
)
client = replaceOnce(
  client,
  `      const params = new URLSearchParams(filters(root))
      const payload = await request(\`/api/admin/sales-ledger?\${params}\`)`,
  `      const params = new URLSearchParams(filters(root))
      if (state.staffFilter !== null) {
        const selectedStaff = selectedStaffNames()
        if (selectedStaff.length) selectedStaff.forEach(name => params.append('staff', name))
        else params.set('staffMode', 'none')
      }
      const payload = await request(\`/api/admin/sales-ledger?\${params}\`)`,
  'multiple staff request params',
)
client = replaceOnce(
  client,
  `      const staffSelect = root.querySelector('[name=staff]')
      const previousStaff = staffSelect.value
      staffSelect.innerHTML = '<option value="">すべてのスタッフ</option>' + state.staff.map(name => \`<option value="\${esc(name)}">\${esc(name)}</option>\`).join('')
      staffSelect.value = previousStaff`,
  `      if (state.staffFilter !== null) state.staffFilter = new Set([...state.staffFilter].filter(name => state.staff.includes(name)))
      renderStaffFilter(root)`,
  'multiple staff option rendering',
)
client = replaceOnce(
  client,
  `<label class="sl-summary-staff-filter"><span>担当者</span><select aria-label="日別売上集計の担当者" name="staff" form="sl-ledger-filter-form" data-sl-summary-staff><option value="">すべての担当者</option></select></label>`,
  `<div class="sl-summary-staff-filter" data-sl-summary-staff><span>担当者</span><div class="sl-staff-picker" data-sl-staff-picker><button class="sl-staff-picker-trigger" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="sl-staff-picker-menu" data-sl-staff-trigger><span data-sl-staff-label>すべてのスタッフ</span>\${icon('chevronDown')}</button><div class="sl-staff-picker-popover" id="sl-staff-picker-menu" role="group" aria-label="表示する担当者" data-sl-staff-popover hidden><label class="sl-staff-option sl-staff-option-all"><input type="checkbox" data-sl-staff-all checked><span>すべて選択</span></label><div class="sl-staff-option-list" data-sl-staff-options></div></div></div></div>`,
  'staff multiselect markup',
)
client = replaceOnce(
  client,
  `    syncMonthControls(root)
    root.querySelector('[data-sl-summary-staff]').addEventListener('change', () => {
      state.selected.clear()
      state.detailDate = ''
      load(root)
    })
    root.querySelector('[data-select-all]').addEventListener('change', event => {`,
  `    syncMonthControls(root)
    const staffPicker = root.querySelector('[data-sl-staff-picker]')
    const staffTrigger = root.querySelector('[data-sl-staff-trigger]')
    const staffPopover = root.querySelector('[data-sl-staff-popover]')
    const positionStaffPopover = () => {
      const rect = staffTrigger.getBoundingClientRect()
      const edgeReserve = innerWidth <= 700 ? 84 : 12
      const availableBelow = Math.max(0, innerHeight - rect.bottom - edgeReserve - 6)
      const availableAbove = Math.max(0, rect.top - 12)
      const placeAbove = availableBelow < 180 && availableAbove > availableBelow
      staffPopover.dataset.placement = placeAbove ? 'above' : 'below'
      const available = placeAbove ? availableAbove : availableBelow
      staffPopover.style.maxHeight = \`\${Math.max(140, Math.min(360, available))}px\`
    }
    const setStaffPickerOpen = open => {
      staffPopover.hidden = !open
      staffTrigger.setAttribute('aria-expanded', String(open))
      if (open) positionStaffPopover()
    }
    staffTrigger.addEventListener('click', () => setStaffPickerOpen(staffPopover.hidden))
    root.querySelector('[data-sl-staff-all]').addEventListener('change', event => {
      state.staffFilter = event.target.checked ? null : new Set()
      renderStaffFilter(root)
      state.selected.clear()
      state.detailDate = ''
      void load(root)
    })
    root.querySelector('[data-sl-staff-options]').addEventListener('change', event => {
      if (!event.target.matches('[data-sl-staff-option]')) return
      const next = state.staffFilter === null ? new Set(state.staff) : new Set(state.staffFilter)
      if (event.target.checked) next.add(event.target.value)
      else next.delete(event.target.value)
      state.staffFilter = next.size === state.staff.length ? null : next
      renderStaffFilter(root)
      state.selected.clear()
      state.detailDate = ''
      void load(root)
    })
    const closeStaffPickerOnPointer = event => { if (!staffPicker.contains(event.target)) setStaffPickerOpen(false) }
    const closeStaffPickerOnEscape = event => {
      if (event.key !== 'Escape' || staffPopover.hidden) return
      setStaffPickerOpen(false)
      staffTrigger.focus()
    }
    document.addEventListener('pointerdown', closeStaffPickerOnPointer)
    document.addEventListener('keydown', closeStaffPickerOnEscape)
    addEventListener('resize', positionStaffPopover, { passive:true })
    portal.addEventListener('scroll', positionStaffPopover, { passive:true })
    portal.addEventListener('sl:cleanup', () => {
      document.removeEventListener('pointerdown', closeStaffPickerOnPointer)
      document.removeEventListener('keydown', closeStaffPickerOnEscape)
      removeEventListener('resize', positionStaffPopover)
      portal.removeEventListener('scroll', positionStaffPopover)
    }, { once:true })
    root.querySelector('[data-select-all]').addEventListener('change', event => {`,
  'staff multiselect interactions',
)
client = appendStyles(client, '      /* sales-ledger-staff-filter-v539 */', styles)
client += `\n/* ${marker} */\n`

service = replaceOnce(
  service,
  `    const staff = cleanText(url.searchParams.get('staff'), 100)`,
  `    const requestedStaff = [...new Set(url.searchParams.getAll('staff').map(value => cleanText(value, 100)).filter(Boolean))].slice(0, 100)
    const staffMode = url.searchParams.get('staffMode') === 'none' ? 'none' : 'selected'
    const staffFilter = JSON.stringify(staffMode === 'none' ? ['__ORIMIA_NO_STAFF__'] : requestedStaff)`,
  'multiple staff request parsing',
)
service = replaceOnce(
  service,
  `        AND ($5='' OR COALESCE(a."staffName",'')=$5)`,
  `        AND ($5::text='[]' OR COALESCE(NULLIF(BTRIM(a."staffName"),''),'フリー') IN (SELECT jsonb_array_elements_text($5::text::jsonb)))`,
  'multiple staff SQL filter',
)
service = replaceOnce(
  service,
  `      session.organizationId, start, end, customer, staff, keyword, saleNo, appointmentNo, payment)`,
  `      session.organizationId, start, end, customer, staffFilter, keyword, saleNo, appointmentNo, payment)`,
  'multiple staff SQL parameter',
)
service += `\n/* ${marker} */\n`

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Daily-Sales-Complete-Print', 'v541') /* daily-sales-complete-print-v541 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Sales-Ledger-Staff-Multiselect', 'v542') /* ${marker} */`,
  'staff multiselect readiness marker',
)
server += `\n/* ${marker} */\n`

fs.writeFileSync(clientPath, client)
fs.writeFileSync(servicePath, service)
fs.writeFileSync(serverPath, server)
console.log(JSON.stringify({ release:marker, patched:true }))
