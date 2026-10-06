'use strict'
const fs = require('node:fs'), path = require('node:path')
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const asset = file => fs.readFileSync(path.join(__dirname, file), 'utf8').replace(/\r\n/g, '\n')
const write = (file, value) => fs.writeFileSync(path.join(root, file), value)
function replace(source, before, after) {
  if (source.split(before).length !== 2) throw Error('Non-unique anchor: ' + before.slice(0, 120))
  return source.replace(before, () => after)
}
function section(source, start, end, content) {
  const a = source.indexOf(start), b = source.indexOf(end, a)
  if (a < 0 || b <= a) throw Error('Missing section: ' + start)
  return source.slice(0, a) + content + '\n\n' + source.slice(b)
}
const model = asset('break-drag-model.cjs').replace("'use strict'\n", '').replace('module.exports = { calculateBreakPreview }', '')
for (const file of ['staff-breaks-checkout-menu-client-v442.js', 'public/appointment-datetime-v684.js']) {
  let client = read(file)
  const marker = '/* shift-line-break-interaction-v461 */'
  const endMarker = '/* manual-booking-break-interaction-v535 */'
  const start = client.indexOf(marker), end = client.indexOf(endMarker, start)
  if (start < 0 || end < start || client.includes('__lienStaffBreakDragV702')) throw Error('Unexpected parent client: ' + file)
  let controller = client.slice(start, end)
  controller = replace(controller, '  window.__lienShiftLineBreakInteractionV461 = true', '  window.__lienShiftLineBreakInteractionV461 = true\n  window.__lienStaffBreakDragV702 = true')
  controller = replace(controller, '    document.head.appendChild(style)', '    style.textContent += ' + JSON.stringify(asset('break-style.css')) + '\n    document.head.appendChild(style)')
  controller = replace(controller, '    window.clearTimeout(state.scheduleTimer)\n    state.scheduleTimer = window.setTimeout(enhance, 90)', '    if (state.scheduleTimer) return\n    state.scheduleTimer = window.requestAnimationFrame(() => { state.scheduleTimer = 0; enhance() })')
  controller = section(controller, '  function staffLanes()', '  function setHidden(', model + '\n' + asset('break-controller.js'))
  controller = section(controller, '  async function loadBreakData(', 'function calculateBreakPreview(', `  async function loadBreakData(force = false) {
    if (location.pathname !== '/admin/appointments') return null
    const date = selectedDate()
    if (!force && state.breakData?.date === date) return state.breakData
    if (!force && state.loading && state.breakDate === date) return state.loading
    state.breakDate = date
    const request = jsonRequest('/api/admin/staff-breaks?date=' + encodeURIComponent(date))
      .then(payload => {
        if (selectedDate() !== date || state.loading !== request) return null
        state.breakData = payload
        return payload
      })
      .finally(() => { if (state.loading === request) state.loading = null })
    state.loading = request
    return request
  }`)
  let renderer = client.slice(0, start)
  renderer = replace(renderer, 'state.breakData.openMinutes || 600', 'state.breakData.openMinutes ?? 600')
  renderer = replace(renderer, 'state.breakData.closeMinutes || 1140', 'state.breakData.closeMinutes ?? 1140')
  renderer = replace(renderer, "    if (!state.breakData || location.pathname !== '/admin/appointments') return", "    if (!state.breakData || location.pathname !== '/admin/appointments') return\n    if (state.breakData.date !== selectedShiftDate()) { document.querySelectorAll('.lien-shift-break-v442').forEach(block => block.remove()); return }")
  renderer = section(renderer, '  async function loadBreaks(', '  function confirmBreakDelete(', `  async function loadBreaks(force = false) {
    if (location.pathname !== '/admin/appointments') return
    const date = selectedShiftDate()
    if (!force && state.breakData && state.breakDate === date) return renderBreaks()
    if (state.breakLoading) return
    state.breakLoading = true
    try {
      const payload = await jsonRequest('/api/admin/staff-breaks?date=' + encodeURIComponent(date))
      if (date !== selectedShiftDate() || location.pathname !== '/admin/appointments') return
      state.breakData = payload; state.breakDate = date
      renderBreaks()
    } catch (error) {
      console.error('staff break load failed', error)
    } finally {
      state.breakLoading = false
      if (date !== selectedShiftDate()) void loadBreaks()
    }
  }

  window.addEventListener('lien:staff-breaks-updated-v702', event => {
    const payload = event.detail
    if (payload?.date !== selectedShiftDate() || location.pathname !== '/admin/appointments') return
    state.breakData = payload; state.breakDate = payload.date
    document.querySelectorAll('.lien-shift-break-v442').forEach(block => block.remove())
    renderBreaks()
  })`)
  write(file, renderer + controller + client.slice(end))
}
let server = read('server.js')
server = replace(server, "res.setHeader('X-Lien-Checkout-Menu', 'v701')", "res.setHeader('X-Lien-Checkout-Menu', 'v701')\n    res.setHeader('X-Lien-Staff-Break-Drag', 'v702')")
write('server.js', server)
console.log('Staff break drag v702 installed; existing APIs and tables preserved.')
