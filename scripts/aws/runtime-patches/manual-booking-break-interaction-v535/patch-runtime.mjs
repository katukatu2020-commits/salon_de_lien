import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const clientPath = path.join(root, 'staff-breaks-checkout-menu-client-v442.js')
const serverPath = path.join(root, 'server.js')
const marker = 'manual-booking-break-interaction-v535'
let client = fs.readFileSync(clientPath, 'utf8')
let server = fs.readFileSync(serverPath, 'utf8')

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${label}: target was not found`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: target was not unique`)
  return source.slice(0, first) + after + source.slice(first + before.length)
}

if (client.includes(marker)) throw new Error(`${marker}: runtime is already patched`)

client = replaceOnce(
  client,
  `/* manual-break-booking-v521 */`,
  `/* ${marker} */\n/* manual-break-booking-v521 */`,
  'release marker',
)

client = replaceOnce(
  client,
  `    end.value = timeLabel(Math.min(1439, (timeMinutes(start.value) || 600) + 60))\n\n    const feedback = document.createElement('p')`,
  `    end.value = timeLabel(Math.min(1439, (timeMinutes(start.value) || 600) + 60))\n\n    // Hidden required controls must not participate in normal appointment validation.\n    for (const control of [staff, start, end]) {\n      control.disabled = true\n      control.required = false\n    }\n\n    const feedback = document.createElement('p')`,
  'inactive break controls',
)

client = replaceOnce(
  client,
  `  function dispatchChange(control) {\n    control?.dispatchEvent(new Event('change', { bubbles: true }))\n  }\n\n  function setMode(state, enabled) {`,
  `  function dispatchChange(control) {\n    control?.dispatchEvent(new Event('change', { bubbles: true }))\n  }\n\n  function setBreakControlsActive(state, enabled) {\n    for (const control of [state.ui.staff, state.ui.start, state.ui.end]) {\n      control.disabled = !enabled\n      control.required = enabled\n    }\n  }\n\n  function syncBreakTimingFromAppointment(state) {\n    const source = state.form.querySelector('input[name="startTime"]')\n    const startMinutes = timeMinutes(source?.value)\n    if (!Number.isInteger(startMinutes)) return\n    const currentStart = timeMinutes(state.ui.start.value)\n    const currentEnd = timeMinutes(state.ui.end.value)\n    const duration = Number.isInteger(currentStart) && Number.isInteger(currentEnd) && currentEnd > currentStart\n      ? currentEnd - currentStart\n      : 60\n    state.ui.start.value = timeLabel(startMinutes)\n    state.ui.end.value = timeLabel(Math.min(1439, startMinutes + Math.max(SNAP_MINUTES, duration)))\n  }\n\n  function setMode(state, enabled) {`,
  'break control mode helpers',
)

client = replaceOnce(
  client,
  `    state.enabled = enabled\n    if (enabled) state.form.setAttribute('data-lien-break-mode-v521', '1')`,
  `    state.enabled = enabled\n    setBreakControlsActive(state, enabled)\n    if (enabled) state.form.setAttribute('data-lien-break-mode-v521', '1')`,
  'break control activation',
)

client = replaceOnce(
  client,
  `    if (enabled) {\n      state.savedCustomerMode = {`,
  `    if (enabled) {\n      syncBreakTimingFromAppointment(state)\n      state.savedCustomerMode = {`,
  'selected cell timing synchronization',
)

client = replaceOnce(
  client,
  `    ui.toggle.addEventListener('change', () => setMode(formState, ui.toggle.checked))\n    ui.staff.addEventListener('change', () => updateTimeBounds(formState))`,
  `    ui.toggle.addEventListener('change', () => setMode(formState, ui.toggle.checked))\n    const sourceStart = form.querySelector('input[name="startTime"]')\n    const syncSourceStart = () => {\n      if (!formState.enabled) return\n      syncBreakTimingFromAppointment(formState)\n      updateTimeBounds(formState)\n    }\n    sourceStart?.addEventListener('input', syncSourceStart)\n    sourceStart?.addEventListener('change', syncSourceStart)\n    ui.staff.addEventListener('change', () => updateTimeBounds(formState))`,
  'late selected time synchronization',
)

fs.writeFileSync(clientPath, client)

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Sales-Ledger-Month-Filter', 'v534') /* sales-ledger-month-filter-v534 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Manual-Booking-Break-Interaction', 'v535') /* ${marker} */`,
  'readiness marker',
)
fs.writeFileSync(serverPath, server)

console.log(`${marker}: patched ${clientPath} and ${serverPath}`)
