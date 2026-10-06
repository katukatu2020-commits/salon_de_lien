'use strict'
const fs = require('node:fs'), path = require('node:path')
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const asset = file => fs.readFileSync(path.join(__dirname, file), 'utf8').replace(/\r\n/g, '\n')
const write = (file, value) => fs.writeFileSync(path.join(root, file), value)
function replace(source, before, after) {
  if (source.split(before).length !== 2) throw Error('Expected unique anchor: ' + before.slice(0, 100))
  return source.replace(before, after)
}
write('bulk-booking-capacity-v705.cjs', asset('capacity.cjs'))
let tenant = read('tenant-setup.js')
tenant = replace(tenant, "    const input = await readJson(req)\n    const requestedDays = Array.isArray(input.days) ? input.days : [input]", `    const input = await readJson(req)
    if (input?.action === 'set-capacity') {
      try {
        const result = await require('./bulk-booking-capacity-v705.cjs').save({ prisma, session, req, input, businessSchedule, defaultDailyCapacity, scheduleForDate, lock: workCalendarV704.lock })
        return json(res, 200, result)
      } catch (error) {
        console.error('[bulk-booking-capacity-v705]', error.message)
        return json(res, error.status || 500, { error: error.status ? error.message : '受付可能数を保存できませんでした。再度お試しください。' })
      }
    }
    const requestedDays = Array.isArray(input.days) ? input.days : [input]`)
tenant = replace(tenant, '      for (const day of normalizedDays) {', '      for (const day of [...normalizedDays].sort((a, b) => a.date.localeCompare(b.date))) await workCalendarV704.lock(database, session.organizationId, day.date)\n      for (const day of normalizedDays) {')
write('tenant-setup.js', tenant)
let client = read('tenant-setup-client.js')
client = replace(client, '  async function renderBusinessDaysPage(force = false) {', asset('client.js') + '\n  async function renderBusinessDaysPage(force = false) {')
client = replace(client, '</div><div class="ts-days-grid">\' + week + empty + cards', '</div>\' + bulkCapacityMarkupV705(payload) + \'<div class="ts-days-grid">\' + week + empty + cards')
client = replace(client, "      root.querySelector('[data-save-all]')?.addEventListener('click', () => saveBusinessDays(root))", "      root.querySelector('[data-save-all]')?.addEventListener('click', () => saveBusinessDays(root))\n      bindBulkCapacityV705(root)")
client += '\n;(() => { const id = "bulk-booking-capacity-v705-style"; if (document.getElementById(id)) return; const style = document.createElement("style"); style.id = id; style.textContent = ' + JSON.stringify(asset('client.css')) + '; document.head.appendChild(style) })();\n'
write('tenant-setup-client.js', client)
const oldChunk = 'page-checkout-shift-v700.js', newChunk = 'page-checkout-shift-v700.capacity-v705.js'
const chunkRoot = '.next/static/chunks/app/admin/appointments/'
let shift = read(chunkRoot + oldChunk)
shift = replace(shift, 'isClosed:n.isClosed===true,overridden:n.overridden===true})', 'isClosed:n.isClosed===true,overridden:n.overridden===true,capacity:Number(n.capacity)>0?Number(n.capacity):null})')
shift = replace(shift, '                let a = Math.max(0, n - r),', '                n = Math.min(n, Number(__businessSchedule.capacity) > 0 ? Number(__businessSchedule.capacity) : n); /* daily-capacity-v705 */\n                let a = Math.max(0, n - r),')
shift = replace(shift, '[k, q, F, m, capacityOverrides],', '[k, q, F, m, capacityOverrides, __businessSchedule.capacity, __businessSchedule.isClosed, __shiftWeekday],')
write(chunkRoot + newChunk, shift)
for (const file of ['.next/app-build-manifest.json', '.next/server/app/admin/appointments/page_client-reference-manifest.js']) {
  const manifest = read(file)
  if (!manifest.includes(oldChunk)) throw Error('Shift manifest missing: ' + file)
  write(file, manifest.split(oldChunk).join(newChunk))
}
let page = read('.next/server/app/admin/appointments/page.js')
page = replace(page, 'isClosed:t.isClosed===true,overridden:t.overridden===true})', 'isClosed:t.isClosed===true,overridden:t.overridden===true,capacity:Number(t.capacity)>0?Number(t.capacity):null})')
page = replace(page, '                  let a = Math.max(0, r - n),', '                  r = Math.min(r, Number(__businessSchedule.capacity) > 0 ? Number(__businessSchedule.capacity) : r); /* daily-capacity-v705 */\n                  let a = Math.max(0, r - n),')
page = replace(page, '[v, U, F, d, Q],', '[v, U, F, d, Q, __businessSchedule.capacity, __businessSchedule.isClosed, __shiftWeekday],')
write('.next/server/app/admin/appointments/page.js', page)
let server = read('server.js')
server = replace(server, "res.setHeader('X-Lien-Staff-Work-Calendar', 'v704')", "res.setHeader('X-Lien-Staff-Work-Calendar', 'v704')\n    res.setHeader('X-Lien-Bulk-Booking-Capacity', 'v705')")
write('server.js', server)
console.log('v705 capacity-only bulk editing installed on existing business days API/calendar.')
