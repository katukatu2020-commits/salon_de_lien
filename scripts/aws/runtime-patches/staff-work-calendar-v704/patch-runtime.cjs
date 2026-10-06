'use strict'
const fs = require('node:fs'), path = require('node:path')
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const asset = file => fs.readFileSync(path.join(__dirname, file), 'utf8').replace(/\r\n/g, '\n')
const write = (file, content) => fs.writeFileSync(path.join(root, file), content)
function replace(source, before, after, count = 1) {
  if (source.split(before).length !== count + 1) throw Error('Unexpected anchor count: ' + before.slice(0, 120))
  return source.split(before).join(after)
}
write('staff-work-calendar-v704.cjs', asset('schedule.cjs'))
write('staff-work-calendar-v704.sql', asset('schedule.sql'))
let server = read('server.js')
server = replace(server, 'const salonOperations = createSalonOperationsService({', "const staffWorkCalendarV704 = require('./staff-work-calendar-v704.cjs').createService({ prisma, sessionProvider: req => chatSession(req, 'staff'), json })\nconst salonOperations = createSalonOperationsService({")
server = replace(server, '  await attendanceNotificationProduct.ensureSchema() /* attendance-history-editor-v497-schema */', '  await attendanceNotificationProduct.ensureSchema() /* attendance-history-editor-v497-schema */\n  await staffWorkCalendarV704.ensureSchema()')
server = replace(server, '      if (await attendanceNotificationProduct.handle(req, res, url)) return', '      if (await staffWorkCalendarV704.handle(req, res, url)) return\n      if (await attendanceNotificationProduct.handle(req, res, url)) return')
server = replace(server, "res.setHeader('X-Lien-Hotpepper-Menu-Restore', 'v703')", "res.setHeader('X-Lien-Hotpepper-Menu-Restore', 'v703')\n    res.setHeader('X-Lien-Staff-Work-Calendar', 'v704')")
write('server.js', server)
for (const file of ['commercial-admin-v101.js', 'attendance-client-v497.js']) {
  let client = read(file)
  client = replace(client, '  function policyMarkup(data) {', '  function basePolicyMarkupV704(data) {')
  client = replace(client, '  function attendanceMarkup(data, view) {', asset('calendar-client.js') + '\n  function attendanceMarkup(data, view) {')
  client = replace(client, '  function bindAttendanceEvents(root, data, view) {', '  function bindAttendanceEvents(root, data, view) {\n    if (view === "policy") bindWorkCalendarV704(root, data)')
  client = replace(client, "async function renderAttendance(month, view = window.__lienAttendanceView || 'clock')", "async function renderAttendance(month, view = new URLSearchParams(location.search).get('view') || window.__lienAttendanceView || 'clock')")
  client = replace(client, '      const data = await attendanceData(month)', `      const data = await attendanceData(month)
      if (view === 'policy') {
        const query = new URLSearchParams(location.search)
        const workMonth = query.get('workMonth') || data.todayDate.slice(0, 7)
        const response = await fetch('/api/admin/staff-work-calendar?month=' + encodeURIComponent(workMonth), { credentials: 'same-origin', cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || '勤務予定を取得できませんでした。')
        data.workCalendar = payload
      }
      if (!isAttendanceRoute() || !root.isConnected) return`)
  client = replace(client, "button.addEventListener('click', () => renderAttendance(data.month, button.dataset.attendanceView))", `button.addEventListener('click', () => {
      const url = new URL(location.href)
      url.searchParams.set('view', button.dataset.attendanceView)
      if (button.dataset.attendanceView !== 'policy') { url.searchParams.delete('workDate'); url.searchParams.delete('workMonth') }
      history.replaceState(history.state, '', url)
      renderAttendance(data.month, button.dataset.attendanceView)
    })`)
  const marker = '  style.dataset.lienAttendanceV497'
  const start = client.indexOf(marker), end = client.indexOf('document.head.appendChild(style)', start)
  if (start < 0 || end < start) throw Error('Attendance style anchor missing')
  client = client.slice(0, end) + 'style.textContent += ' + JSON.stringify(asset('calendar.css')) + '\n  ' + client.slice(end)
  write(file, client)
}
let tenant = read('tenant-setup.js')
tenant = "const workCalendarV704 = require('./staff-work-calendar-v704.cjs')\n" + tenant
tenant = replace(tenant, '    const dailyLookup = new Map(dailyOverrides.map(row => [row.date, row]))', '    const staffPlanV704 = await workCalendarV704.loadPlan(prisma, session.organizationId, month + "-01", month + "-31")\n    const dailyLookup = new Map(dailyOverrides.map(row => [row.date, row]))')
tenant = replace(tenant, '          staff,\n          appointments: dayAppointments,', '          staff: workCalendarV704.effectiveRows(staff, date, staffPlanV704),\n          appointments: dayAppointments,')
tenant = replace(tenant, '      const result = await prisma.$transaction(async transaction => {', '      const result = await prisma.$transaction(async transaction => {\n        await workCalendarV704.lock(transaction, session.organizationId, date)\n        const currentStaffV704 = await workCalendarV704.rowsForDate(transaction, session.organizationId, date)')
tenant = replace(tenant, '          staff,\n          appointments,', '          staff: currentStaffV704,\n          appointments,')
write('tenant-setup.js', tenant)
let operations = read('appointment-operations-v267.js')
operations = "const workCalendarV704 = require('./staff-work-calendar-v704.cjs')\n" + operations
const rowsQuery = `const rows = await db.$queryRawUnsafe('SELECT "staffKey","staffName","maxConcurrentAppointments","workStartMinutes","workEndMinutes","closedWeekdays" FROM "StaffBookingSetting" WHERE "organizationId"=$1 AND "active"=TRUE AND "onLeave"=FALSE ORDER BY "createdAt","staffName"', organizationId)`
operations = replace(operations, rowsQuery, 'const rows = await workCalendarV704.rowsForDate(db, organizationId, date)')
operations = replace(operations, '    if (startMinutes < staff.workStartMinutes || startMinutes + durationMinutes > staff.workEndMinutes) {', `    await workCalendarV704.lock(db, organizationId, date)
    if (staff.staffKey !== 'free') staff = (await workCalendarV704.rowsForDate(db, organizationId, date, [staff]))[0]
    if (startMinutes < staff.workStartMinutes || startMinutes + durationMinutes > staff.workEndMinutes) {`)
write('appointment-operations-v267.js', operations)
let line = read('line-reservations-v436.js')
line = "const workCalendarV704 = require('./staff-work-calendar-v704.cjs')\n" + line
line = replace(line, '    const data = bookingData || await storeBookingData(connection, db)', `    const original = bookingData || await storeBookingData(connection, db)
    const data = { ...original, staff: (await workCalendarV704.rowsForDate(db, connection.organizationId, date, original.staff)).map(row => ({ ...row, closedWeekdays: row.isDayOff ? [weekday(date)] : [] })) }`)
line = replace(line, '        await acquireBookingLock(tx, `line:${connection.organizationId}:${date}`)', '        await workCalendarV704.lock(tx, connection.organizationId, date)\n        await acquireBookingLock(tx, `line:${connection.organizationId}:${date}`)')
write('line-reservations-v436.js', line)
let breaks = read('staff-breaks-checkout-menu-v442.js')
breaks = "const workCalendarV704 = require('./staff-work-calendar-v704.cjs')\n" + breaks
breaks = replace(breaks, 'staffRows(prisma, session.organizationId),', 'workCalendarV704.rowsForDate(prisma, session.organizationId, date),')
breaks = replace(breaks, 'const rows = await staffRows(tx, session.organizationId)', 'const rows = await workCalendarV704.rowsForDate(tx, session.organizationId, date)', 2)
write('staff-breaks-checkout-menu-v442.js', breaks)
const pagePath = '.next/server/app/admin/appointments/page.js'
let page = read(pagePath)
page = replace(page, `v._.$queryRawUnsafe('SELECT "staffKey","staffName","maxConcurrentAppointments","workStartMinutes","workEndMinutes","closedWeekdays" FROM "StaffBookingSetting" WHERE "organizationId"=$1 AND "active"=TRUE AND "onLeave"=FALSE ORDER BY "createdAt","staffName"', x.organizationId)`, 'require("/app/staff-work-calendar-v704.cjs").rowsForDate(v._, x.organizationId, P || N + "-01")')
write(pagePath, page)
console.log('v704 daily staff calendar installed across salon, customer, LINE and break scheduling.')
