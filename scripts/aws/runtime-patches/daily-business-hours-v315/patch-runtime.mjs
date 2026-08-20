import fs from 'node:fs'

const serviceFile = '/app/tenant-setup.js'
const clientFile = '/app/tenant-setup-client.js'

const replaceOnce = (source, search, replacement, label) => {
  const count = source.split(search).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(search, replacement)
}

const replaceFirst = (source, search, replacement, label) => {
  const index = source.indexOf(search)
  if (index < 0) throw new Error(`${label}: match missing`)
  return source.slice(0, index) + replacement + source.slice(index + search.length)
}

const replaceBetween = (source, start, end, replacement, label) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (startIndex < 0 || endIndex < 0) throw new Error(`unable to locate ${label}`)
  return source.slice(0, startIndex) + replacement + source.slice(endIndex)
}

let service = fs.readFileSync(serviceFile, 'utf8')

service = replaceOnce(
  service,
  `    await prisma.$executeRawUnsafe(\`CREATE TABLE IF NOT EXISTS "OrganizationGmailConnection" (`,
  `    await prisma.$executeRawUnsafe(\`CREATE TABLE IF NOT EXISTS "OrganizationDailySchedule" (
      "organizationId" TEXT NOT NULL,
      "date" TEXT NOT NULL,
      "isClosed" BOOLEAN NOT NULL DEFAULT FALSE,
      "openMinutes" INTEGER NOT NULL,
      "closeMinutes" INTEGER NOT NULL,
      "capacity" INTEGER NOT NULL DEFAULT 1,
      "updatedByUserId" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY ("organizationId", "date")
    )\`)
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "OrganizationDailySchedule_org_date_idx" ON "OrganizationDailySchedule"("organizationId","date")')
    await prisma.$executeRawUnsafe(\`CREATE TABLE IF NOT EXISTS "OrganizationGmailConnection" (`,
  'daily schedule schema',
)

const dailyService = `
  async function defaultDailyCapacity(organizationId, database = prisma) {
    const rows = await database.$queryRawUnsafe('SELECT COALESCE(SUM("maxConcurrentAppointments"),0)::int AS capacity FROM "StaffBookingSetting" WHERE "organizationId"=$1 AND "active"=TRUE AND "onLeave"=FALSE', organizationId).catch(() => [])
    const capacity = Number(rows[0]?.capacity || 0)
    if (capacity > 0) return capacity
    return organizationId === LEGACY_ORGANIZATION_ID ? LEGACY_BOOKING_STAFF.reduce((sum, staff) => sum + staff.maxConcurrentAppointments, 0) : 1
  }

  function scheduleForDate(base, override, date, capacity) {
    if (override) return {
      openMinutes: Number(override.openMinutes),
      closeMinutes: Number(override.closeMinutes),
      closedWeekdays: base.closedWeekdays,
      isClosed: override.isClosed === true,
      capacity: Number(override.capacity || capacity || 1),
      overridden: true,
    }
    return {
      ...base,
      isClosed: base.closedWeekdays.includes(weekdayForDate(date)),
      capacity: Math.max(1, Number(capacity || 1)),
      overridden: false,
    }
  }

  async function dailySchedule(organizationId, date, database = prisma) {
    const [base, capacity, rows] = await Promise.all([
      businessSchedule(organizationId, database),
      defaultDailyCapacity(organizationId, database),
      database.$queryRawUnsafe('SELECT "date","isClosed","openMinutes","closeMinutes","capacity" FROM "OrganizationDailySchedule" WHERE "organizationId"=$1 AND "date"=$2 LIMIT 1', organizationId, date).catch(() => []),
    ])
    return scheduleForDate(base, rows[0] || null, date, capacity)
  }

  async function businessDays(req, res, url) {
    const session = await sessionProvider(req)
    if (!session) return json(res, 401, { error: 'ログインが必要です。' })
    if (req.method === 'GET') {
      const requestedDate = String(url.searchParams.get('date') || '')
      const month = String(url.searchParams.get('month') || requestedDate.slice(0, 7))
      if (!/^20\\d{2}-(0[1-9]|1[0-2])$/.test(month)) return json(res, 400, { error: '対象月を確認してください。' })
      const [base, defaultCapacity, overrides] = await Promise.all([
        businessSchedule(session.organizationId),
        defaultDailyCapacity(session.organizationId),
        prisma.$queryRawUnsafe('SELECT "date","isClosed","openMinutes","closeMinutes","capacity" FROM "OrganizationDailySchedule" WHERE "organizationId"=$1 AND "date">=$2 AND "date"<$3 ORDER BY "date"', session.organizationId, month + '-01', month === '2099-12' ? '2100-01-01' : (() => { const [year, value] = month.split('-').map(Number); return value === 12 ? (year + 1) + '-01-01' : year + '-' + String(value + 1).padStart(2, '0') + '-01' })()),
      ])
      const lookup = new Map(overrides.map(row => [row.date, row]))
      const [year, monthNumber] = month.split('-').map(Number)
      const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
      const days = Array.from({ length: count }, (_, index) => {
        const date = month + '-' + String(index + 1).padStart(2, '0')
        return { date, ...scheduleForDate(base, lookup.get(date), date, defaultCapacity) }
      })
      return json(res, 200, { month, role: session.role, defaultSchedule: { ...base, capacity: defaultCapacity }, days })
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })
    if (session.role !== 'ADMIN') return json(res, 403, { error: '日別営業時間はオーナーのみ変更できます。' })
    if (!sameOrigin(req)) return json(res, 403, { error: '不正なリクエストです。' })
    const data = await readJson(req)
    const date = String(data.date || '')
    if (!/^20\\d{2}-(0[1-9]|1[0-2])-([0-2]\\d|3[01])$/.test(date) || weekdayForDate(date) < 0) return json(res, 400, { error: '日付を確認してください。' })
    if (data.reset === true) {
      await prisma.$executeRawUnsafe('DELETE FROM "OrganizationDailySchedule" WHERE "organizationId"=$1 AND "date"=$2', session.organizationId, date)
      return json(res, 200, { success: true, reset: true, date })
    }
    const isClosed = data.isClosed === true
    const openMinutes = Number(data.openMinutes)
    const closeMinutes = Number(data.closeMinutes)
    const capacity = Number(data.capacity)
    if (![openMinutes, closeMinutes].every(value => Number.isInteger(value) && value >= 0 && value <= 1440 && value % 30 === 0) || closeMinutes - openMinutes < 60) return json(res, 400, { error: '営業時間は30分単位で、1時間以上になるよう設定してください。' })
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 99) return json(res, 400, { error: '受付可能数は1〜99で設定してください。' })
    await prisma.$executeRawUnsafe('INSERT INTO "OrganizationDailySchedule" ("organizationId","date","isClosed","openMinutes","closeMinutes","capacity","updatedByUserId","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW()) ON CONFLICT ("organizationId","date") DO UPDATE SET "isClosed"=EXCLUDED."isClosed","openMinutes"=EXCLUDED."openMinutes","closeMinutes"=EXCLUDED."closeMinutes","capacity"=EXCLUDED."capacity","updatedByUserId"=EXCLUDED."updatedByUserId","updatedAt"=NOW()', session.organizationId, date, isClosed, openMinutes, closeMinutes, capacity, session.userId || null)
    return json(res, 200, { success: true, date, isClosed, openMinutes, closeMinutes, capacity })
  }
`

service = replaceOnce(service, '  async function connectionRow(organizationId) {', dailyService + '\n  async function connectionRow(organizationId) {', 'daily schedule service')

service = replaceOnce(
  service,
  `  function scheduleAllows({ schedule, date, startMinutes, durationMinutes }) {
    return !schedule.closedWeekdays.includes(weekdayForDate(date)) && startMinutes >= schedule.openMinutes && startMinutes + durationMinutes <= schedule.closeMinutes
  }`,
  `  function scheduleAllows({ schedule, date, startMinutes, durationMinutes }) {
    const isClosed = schedule.isClosed === true || (schedule.isClosed == null && schedule.closedWeekdays.includes(weekdayForDate(date)))
    return !isClosed && startMinutes >= schedule.openMinutes && startMinutes + durationMinutes <= schedule.closeMinutes
  }`,
  'schedule allowance',
)

service = replaceFirst(service, `    const [menu, staff, schedule] = await Promise.all([tenantMenu(session.organizationId, menuKey), staffRows(session.organizationId), businessSchedule(session.organizationId)])`, `    const [menu, staff, schedule, dailyOverrides, defaultCapacity] = await Promise.all([
      tenantMenu(session.organizationId, menuKey),
      staffRows(session.organizationId),
      businessSchedule(session.organizationId),
      prisma.$queryRawUnsafe('SELECT "date","isClosed","openMinutes","closeMinutes","capacity" FROM "OrganizationDailySchedule" WHERE "organizationId"=$1 AND "date">=$2 AND "date"<$3', session.organizationId, month + '-01', (() => { const [year, value] = month.split('-').map(Number); return value === 12 ? (year + 1) + '-01-01' : year + '-' + String(value + 1).padStart(2, '0') + '-01' })()),
      defaultDailyCapacity(session.organizationId),
    ])`, 'availability schedule query')
service = replaceOnce(service, `    const days = dates.map(date => {
      if (date < today || date > maximumDate) return { date, available: false, slots: [], schedule }
      if (schedule.closedWeekdays.includes(weekdayForDate(date))) return { date, available: false, slots: [], closed: true, schedule }
      const dayAppointments`, `    const dailyLookup = new Map(dailyOverrides.map(row => [row.date, row]))
    const days = dates.map(date => {
      const daySchedule = scheduleForDate(schedule, dailyLookup.get(date), date, defaultCapacity)
      if (date < today || date > maximumDate) return { date, available: false, slots: [], schedule: daySchedule }
      if (daySchedule.isClosed) return { date, available: false, slots: [], closed: true, schedule: daySchedule }
      const dayAppointments`, 'availability daily selection')
service = replaceOnce(service, `      for (let minutes = schedule.openMinutes; minutes + Number(menu.durationMinutes) <= schedule.closeMinutes; minutes += 30) {`, `      for (let minutes = daySchedule.openMinutes; minutes + Number(menu.durationMinutes) <= daySchedule.closeMinutes; minutes += 30) {`, 'availability daily hours')
service = replaceOnce(service, `        const available = staffKey === 'free'
          ? freeCanAccept({ staff: candidates, appointments: dayAppointments, startMinutes: minutes, durationMinutes: Number(menu.durationMinutes) })
          : candidates.some(row => staffCanAccept({ staff: row, appointments: dayAppointments, startMinutes: minutes, durationMinutes: Number(menu.durationMinutes) }))`, `        const overlappingCount = dayAppointments.filter(appointment => overlaps(minutes, Number(menu.durationMinutes), jstMinutes(appointment.scheduledAt), Number(appointment.durationMinutes || 60))).length
        const belowDailyCapacity = overlappingCount < Number(daySchedule.capacity || defaultCapacity || 1)
        const available = belowDailyCapacity && (staffKey === 'free'
          ? freeCanAccept({ staff: candidates, appointments: dayAppointments, startMinutes: minutes, durationMinutes: Number(menu.durationMinutes) })
          : candidates.some(row => staffCanAccept({ staff: row, appointments: dayAppointments, startMinutes: minutes, durationMinutes: Number(menu.durationMinutes) })))`, 'availability capacity')
service = replaceOnce(service, `      return { date, available: slots.length > 0, slots, schedule }`, `      return { date, available: slots.length > 0, slots, schedule: daySchedule }`, 'availability response schedule')

service = replaceOnce(service, `    const [menu, staff, schedule] = await Promise.all([tenantMenu(session.organizationId, menuKey), staffRows(session.organizationId), businessSchedule(session.organizationId)])`, `    const [menu, staff, schedule] = await Promise.all([tenantMenu(session.organizationId, menuKey), staffRows(session.organizationId), dailySchedule(session.organizationId, date)])`, 'booking daily schedule')
service = replaceOnce(service, `    if (!scheduleAllows({ schedule, date, startMinutes, durationMinutes: Number(menu.durationMinutes) })) return json(res, 400, { error: schedule.closedWeekdays.includes(weekdayForDate(date)) ? '選択した日は定休日です。別の日を選んでください。' : '選択した時間は営業時間外です。別の時間を選んでください。' })`, `    if (!scheduleAllows({ schedule, date, startMinutes, durationMinutes: Number(menu.durationMinutes) })) return json(res, 400, { error: schedule.isClosed ? '選択した日は休業日です。別の日を選んでください。' : '選択した時間は営業時間外です。別の時間を選んでください。' })`, 'booking daily validation')
service = replaceOnce(service, `        const customer = await transaction.customer.findFirst`, `        const currentSchedule = await dailySchedule(session.organizationId, date, transaction)
        if (!scheduleAllows({ schedule: currentSchedule, date, startMinutes, durationMinutes: Number(menu.durationMinutes) })) throw new Error(currentSchedule.isClosed ? '選択した日は休業日です。' : '選択した時間は営業時間外です。')
        const customer = await transaction.customer.findFirst`, 'transaction schedule validation')
service = replaceOnce(service, `        const available = staffKey === 'free'
          ? freeCanAccept({ staff, appointments, startMinutes, durationMinutes: Number(menu.durationMinutes) })
          : staff.filter(row => row.staffKey === staffKey).some(row => staffCanAccept({ staff: row, appointments, startMinutes, durationMinutes: Number(menu.durationMinutes) }))`, `        const overlappingCount = appointments.filter(appointment => overlaps(startMinutes, Number(menu.durationMinutes), jstMinutes(appointment.scheduledAt), Number(appointment.durationMinutes || 60))).length
        const available = overlappingCount < Number(currentSchedule.capacity || 1) && (staffKey === 'free'
          ? freeCanAccept({ staff, appointments, startMinutes, durationMinutes: Number(menu.durationMinutes) })
          : staff.filter(row => row.staffKey === staffKey).some(row => staffCanAccept({ staff: row, appointments, startMinutes, durationMinutes: Number(menu.durationMinutes) })))`, 'booking daily capacity')
service = replaceOnce(service, `    if (url.pathname === '/api/lien-tenant-setup/status' && req.method === 'GET') { await setupStatus(req, res); return true }`, `    if (url.pathname === '/api/lien-tenant-setup/status' && req.method === 'GET') { await setupStatus(req, res); return true }
    if (url.pathname === '/api/lien-business-days' && ['GET','POST'].includes(req.method)) { await businessDays(req, res, url); return true }`, 'daily schedule route')

fs.writeFileSync(serviceFile, service)

let client = fs.readFileSync(clientFile, 'utf8')
client = replaceOnce(client, `    businessSchedule: { openMinutes: 600, closeMinutes: 1140, closedWeekdays: [1] },`, `    businessSchedule: { openMinutes: 600, closeMinutes: 1140, closedWeekdays: [1], isClosed: false, capacity: 1 },
    dailyScheduleDate: '',
    dailyScheduleLoading: '',`, 'client daily state')
client = replaceOnce(client, `      spark: '<path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z"/>',`, `      spark: '<path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z"/>',
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="m8 15 2 2 5-5"/>',`, 'calendar icon')

client = replaceOnce(client, `      .shift-canvas{font-variant-numeric:tabular-nums;--ts-shift-hours:9;--ts-shift-slots:18}`, `      .shift-canvas{font-variant-numeric:tabular-nums;--ts-shift-hours:9;--ts-shift-slots:18}.shift-lane{position:relative!important}.ts-shift-hover-slot{position:absolute;z-index:5;top:0;bottom:0;border:1px solid #d75b78;border-radius:7px;background:linear-gradient(180deg,rgba(239,125,154,.25),rgba(217,77,112,.14));box-shadow:inset 0 0 0 1px rgba(255,255,255,.7),0 4px 12px rgba(137,57,76,.12);pointer-events:none;transition:left .04s linear}.ts-shift-hover-slot span{position:absolute;top:6px;left:50%;transform:translateX(-50%);border-radius:999px;background:#a7445d;padding:3px 7px;color:#fff;font-size:9px;font-weight:800;white-space:nowrap;box-shadow:0 3px 8px rgba(95,31,48,.22)}.ts-shift-closed .shift-lane{cursor:not-allowed!important;background-color:#f5f1ee!important;opacity:.72}.ts-shift-closed-note{grid-column:1/-1;margin:12px 0 0;border:1px solid #e6d5ce;border-radius:14px;background:#fbf6f3;padding:12px 16px;color:#765f57;font-size:12px;font-weight:800;text-align:center}`, 'hover styles')
client = client.replace(`      .ts-launcher{position:fixed`, `       .ts-launcher{position:fixed`)
client = replaceOnce(client, `       .ts-launcher{position:fixed`, `       .ts-business-days-link{display:inline-flex;min-height:42px;align-items:center;justify-content:center;gap:8px;border:1px solid #e2c9bf;border-radius:999px;background:#fff;padding:0 17px;color:#793f35;font-size:12px;font-weight:800;text-decoration:none;box-shadow:0 6px 18px rgba(84,46,37,.09);transition:.18s}.ts-business-days-link:hover{border-color:#bd7e70;background:#fff8f4;transform:translateY(-1px)}.ts-business-days-link svg{width:17px;height:17px}.ts-business-days-page>main>*:not(#ts-business-days-root){display:none!important}#ts-business-days-root{display:block!important;width:100%;max-width:1280px;margin:0 auto;padding:24px 20px 60px}.ts-days-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;border:1px solid #ead9d1;border-radius:26px;background:linear-gradient(145deg,#fffdfb,#fff8f4);padding:28px;box-shadow:0 12px 34px rgba(76,43,34,.06)}.ts-days-kicker{color:#cf4d70;font-size:11px;font-weight:800;letter-spacing:.08em}.ts-days-hero h1{margin:7px 0 6px;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:30px;color:#2e211d}.ts-days-hero p{margin:0;color:#7b6a63;font-size:12px;line-height:1.8}.ts-days-nav{display:flex;align-items:center;gap:9px}.ts-days-month{min-width:120px;text-align:center;color:#342620;font-size:15px;font-weight:900}.ts-days-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));margin-top:18px;overflow:hidden;border:1px solid #e6d4cc;border-radius:24px;background:#e6d4cc;gap:1px;box-shadow:0 14px 36px rgba(77,42,33,.07)}.ts-day-week{background:#f8f1ec;padding:11px 8px;color:#74645d;font-size:11px;font-weight:800;text-align:center}.ts-day-week.sun{color:#d14b60}.ts-day-week.sat{color:#5277b2}.ts-day-card{min-width:0;min-height:248px;background:#fffdfb;padding:13px;transition:background .16s}.ts-day-card:hover{background:#fffaf7}.ts-day-card.closed{background:#f6f2ef}.ts-day-card.empty{background:#faf7f4}.ts-day-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.ts-day-number{font-family:"Yu Mincho",serif;font-size:23px;font-weight:800}.ts-day-number.sun{color:#d14b60}.ts-day-number.sat{color:#5277b2}.ts-day-badge{border-radius:999px;background:#f4e8e2;padding:4px 7px;color:#8b5c50;font-size:9px;font-weight:800}.ts-day-badge.custom{background:#f9dfe6;color:#a8405d}.ts-day-closed{display:flex;align-items:center;gap:6px;color:#4f403a;font-size:11px;font-weight:800}.ts-day-closed input{accent-color:#cf4f72}.ts-day-fields{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.ts-day-fields label{display:grid;gap:4px;color:#786861;font-size:9px;font-weight:800}.ts-day-fields select,.ts-day-fields input{width:100%;min-width:0;height:34px;border:1px solid #e4d4cd;border-radius:9px;background:#fff;padding:0 8px;color:#3d2e28;font-size:11px}.ts-day-fields .capacity{grid-column:1/-1}.ts-day-actions{display:flex;justify-content:flex-end;gap:6px;margin-top:13px}.ts-day-action{min-height:31px;border:1px solid #e1cec6;border-radius:999px;background:#fff;padding:0 10px;color:#70483e;font-size:10px;font-weight:800;cursor:pointer}.ts-day-action.primary{border-color:#a75547;background:#a75547;color:#fff}.ts-day-action:disabled{opacity:.5;cursor:wait}.ts-days-message{min-height:20px;margin:12px 4px 0;color:#4d7964;font-size:11px;font-weight:800}.ts-days-loading{display:grid;min-height:300px;place-items:center;color:#7b6b64;font-size:13px;font-weight:800}.ts-day-card.closed .ts-day-fields{opacity:.45;pointer-events:none}@media(max-width:1000px){.ts-days-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ts-day-week{display:none}.ts-days-hero{align-items:flex-start;flex-direction:column}}@media(max-width:620px){#ts-business-days-root{padding:14px 12px 50px}.ts-days-grid{grid-template-columns:1fr}.ts-days-hero{padding:21px}.ts-days-nav{width:100%;justify-content:space-between}.ts-day-card{min-height:0}}
       .ts-launcher{position:fixed`, 'business day styles')

client = client.replace('.ts-business-days-page>main>*:not(#ts-business-days-root)', '.ts-business-days-page main>*:not(#ts-business-days-root)')

const clientFeature = `
  function selectedShiftMinutes(event, lane) {
    const canvas = lane?.closest('.shift-canvas')
    if (!canvas || state.businessSchedule?.isClosed) return null
    const openMinutes = Number(canvas.dataset.tsBusinessOpen || state.businessSchedule?.openMinutes || 600)
    const closeMinutes = Number(canvas.dataset.tsBusinessClose || state.businessSchedule?.closeMinutes || 1140)
    const rect = lane.getBoundingClientRect()
    if (!rect.width || closeMinutes <= openMinutes) return null
    const ratio = Math.max(0, Math.min(0.999999, (event.clientX - rect.left) / rect.width))
    return Math.max(openMinutes, Math.min(closeMinutes - 15, Math.floor((openMinutes + ratio * (closeMinutes - openMinutes)) / 15) * 15))
  }

  function updateShiftHover(event, lane) {
    if (!isShiftRoute() || event.target.closest('button,a,input,select,textarea,label')) return clearShiftHover(lane)
    const minutes = selectedShiftMinutes(event, lane)
    if (minutes == null) return clearShiftHover(lane)
    const canvas = lane.closest('.shift-canvas')
    const openMinutes = Number(canvas.dataset.tsBusinessOpen || state.businessSchedule.openMinutes)
    const closeMinutes = Number(canvas.dataset.tsBusinessClose || state.businessSchedule.closeMinutes)
    let marker = lane.querySelector(':scope > .ts-shift-hover-slot')
    if (!marker) {
      marker = document.createElement('span')
      marker.className = 'ts-shift-hover-slot'
      marker.setAttribute('aria-hidden', 'true')
      marker.innerHTML = '<span></span>'
      lane.appendChild(marker)
    }
    marker.style.left = ((minutes - openMinutes) / (closeMinutes - openMinutes) * 100) + '%'
    marker.style.width = (15 / (closeMinutes - openMinutes) * 100) + '%'
    marker.firstElementChild.textContent = timeValue(minutes)
    lane.dataset.tsHoverMinutes = String(minutes)
  }

  function clearShiftHover(lane) {
    lane?.querySelector(':scope > .ts-shift-hover-slot')?.remove()
    if (lane) delete lane.dataset.tsHoverMinutes
  }

  function shiftDate() {
    const value = new URLSearchParams(location.search).get('date') || todayInJapan()
    return /^20\\d{2}-\\d{2}-\\d{2}$/.test(value) ? value : todayInJapan()
  }

  async function loadDailyScheduleForShift() {
    if (!isShiftRoute()) return
    const date = shiftDate()
    if (state.dailyScheduleDate === date || state.dailyScheduleLoading === date) return
    state.dailyScheduleLoading = date
    try {
      const response = await fetch('/api/lien-business-days?date=' + encodeURIComponent(date), { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      const payload = await response.json().catch(() => null)
      const schedule = payload?.days?.find(day => day.date === date)
      if (!response.ok || !schedule) return
      state.dailyScheduleDate = date
      state.businessSchedule = schedule
      if (state.setup) state.setup.businessSchedule = schedule
      if (typeof window.__lienSetBusinessSchedule === 'function') window.__lienSetBusinessSchedule(schedule)
      window.dispatchEvent(new CustomEvent('lien:business-schedule-updated', { detail: schedule }))
    } catch (error) { console.warn('Daily business schedule could not be loaded', error) }
    finally { state.dailyScheduleLoading = ''; scheduleRouteEnhancement() }
  }

  function ensureBusinessDaysLink() {
    if (currentPage() !== 'appointments' || new URLSearchParams(location.search).has('businessDays')) return
    if (document.querySelector('[data-ts-business-days-link]')) return
    const title = Array.from(document.querySelectorAll('h1,h2')).find(node => /シフト表|予約カレンダー/.test(node.textContent || ''))
    const host = title?.parentElement
    if (!host) return
    const link = document.createElement('a')
    link.href = '/admin/appointments?businessDays=1&month=' + shiftDate().slice(0, 7)
    link.className = 'ts-business-days-link'
    link.dataset.tsBusinessDaysLink = '1'
    link.innerHTML = icon('calendar') + '<span>日別の営業時間・休業日</span>'
    host.appendChild(link)
  }

  const monthShift = (month, delta) => {
    const [year, value] = month.split('-').map(Number)
    const date = new Date(Date.UTC(year, value - 1 + delta, 1))
    return date.getUTCFullYear() + '-' + String(date.getUTCMonth() + 1).padStart(2, '0')
  }

  const timeOptions = selected => {
    let html = ''
    for (let minutes = 480; minutes <= 1320; minutes += 30) html += '<option value="' + minutes + '"' + (minutes === Number(selected) ? ' selected' : '') + '>' + timeValue(minutes) + '</option>'
    return html
  }

  async function saveBusinessDay(card, reset = false) {
    const button = card.querySelector('.ts-day-action.primary')
    const body = reset ? { date: card.dataset.date, reset: true } : {
      date: card.dataset.date,
      isClosed: card.querySelector('[name="isClosed"]').checked,
      openMinutes: Number(card.querySelector('[name="openMinutes"]').value),
      closeMinutes: Number(card.querySelector('[name="closeMinutes"]').value),
      capacity: Number(card.querySelector('[name="capacity"]').value),
    }
    if (button) button.disabled = true
    try {
      const response = await fetch('/api/lien-business-days', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '保存できませんでした。')
      await renderBusinessDaysPage(true)
      const root = document.getElementById('ts-business-days-root')
      root.querySelector('.ts-days-message').textContent = reset ? '通常の営業時間設定へ戻しました。' : '日別の営業時間を保存しました。'
    } catch (error) { document.querySelector('.ts-days-message').textContent = error.message }
    finally { if (button) button.disabled = false }
  }

  async function renderBusinessDaysPage(force = false) {
    const query = new URLSearchParams(location.search)
    if (currentPage() !== 'appointments' || !query.has('businessDays')) {
      document.documentElement.classList.remove('ts-business-days-page')
      document.getElementById('ts-business-days-root')?.remove()
      return
    }
    document.documentElement.classList.add('ts-business-days-page')
    const main = document.querySelector('main')
    if (!main) return
    let root = document.getElementById('ts-business-days-root')
    if (!root) { root = document.createElement('section'); root.id = 'ts-business-days-root'; main.appendChild(root) }
    const month = /^20\\d{2}-(0[1-9]|1[0-2])$/.test(query.get('month') || '') ? query.get('month') : todayInJapan().slice(0, 7)
    if (!force && root.dataset.month === month && root.dataset.ready === '1') return
    root.dataset.month = month
    root.innerHTML = '<div class="ts-days-loading">日別の営業時間を読み込んでいます…</div>'
    try {
      const response = await fetch('/api/lien-business-days?month=' + encodeURIComponent(month), { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '日別設定を読み込めませんでした。')
      const [year, monthNumber] = month.split('-').map(Number)
      const firstWeekday = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay()
      const empty = Array.from({ length: firstWeekday }, () => '<div class="ts-day-card empty" aria-hidden="true"></div>').join('')
      const week = ['日','月','火','水','木','金','土'].map((label, index) => '<div class="ts-day-week ' + (index === 0 ? 'sun' : index === 6 ? 'sat' : '') + '">' + label + '</div>').join('')
      const cards = payload.days.map(day => {
        const weekday = new Date(day.date + 'T00:00:00Z').getUTCDay()
        const number = Number(day.date.slice(-2))
        return '<article class="ts-day-card ' + (day.isClosed ? 'closed' : '') + '" data-date="' + day.date + '">' +
          '<div class="ts-day-head"><span class="ts-day-number ' + (weekday === 0 ? 'sun' : weekday === 6 ? 'sat' : '') + '">' + number + '</span><span class="ts-day-badge ' + (day.overridden ? 'custom' : '') + '">' + (day.overridden ? '個別設定' : '通常設定') + '</span></div>' +
          '<label class="ts-day-closed"><input type="checkbox" name="isClosed" ' + (day.isClosed ? 'checked' : '') + '>休業日にする</label>' +
          '<div class="ts-day-fields"><label>営業開始<select name="openMinutes">' + timeOptions(day.openMinutes) + '</select></label><label>営業終了<select name="closeMinutes">' + timeOptions(day.closeMinutes) + '</select></label><label class="capacity">同時受付可能数<input name="capacity" type="number" min="1" max="99" value="' + day.capacity + '"></label></div>' +
          (payload.role === 'ADMIN' ? '<div class="ts-day-actions">' + (day.overridden ? '<button class="ts-day-action" type="button" data-reset>通常設定に戻す</button>' : '') + '<button class="ts-day-action primary" type="button" data-save>保存</button></div>' : '') + '</article>'
      }).join('')
      root.innerHTML = '<div class="ts-days-hero"><div><div class="ts-days-kicker">DAILY BUSINESS HOURS</div><h1>日別の営業時間・休業日</h1><p>通常の営業時間を基準に、日ごとの休業・営業時間・受付可能数を上書きできます。</p></div><div class="ts-days-nav"><a class="ts-button secondary compact" href="/admin/appointments?businessDays=1&month=' + monthShift(month,-1) + '">' + icon('chevronLeft') + '</a><span class="ts-days-month">' + year + '年' + monthNumber + '月</span><a class="ts-button secondary compact" href="/admin/appointments?businessDays=1&month=' + monthShift(month,1) + '">' + icon('chevronRight') + '</a></div></div><div class="ts-days-message" role="status"></div><div class="ts-days-grid">' + week + empty + cards + '</div>'
      root.dataset.ready = '1'
      root.querySelectorAll('[name="isClosed"]').forEach(input => input.addEventListener('change', () => input.closest('.ts-day-card').classList.toggle('closed', input.checked)))
      root.querySelectorAll('[data-save]').forEach(button => button.addEventListener('click', () => saveBusinessDay(button.closest('.ts-day-card'))))
      root.querySelectorAll('[data-reset]').forEach(button => button.addEventListener('click', () => saveBusinessDay(button.closest('.ts-day-card'), true)))
    } catch (error) { root.innerHTML = '<div class="ts-days-loading">' + error.message + '</div>' }
  }
`

client = replaceOnce(client, `  function openManualAppointmentFromLane(event, lane) {`, clientFeature + '\n  function openManualAppointmentFromLane(event, lane) {', 'client daily feature')
client = replaceOnce(client, `    const canvas = lane.closest('.shift-canvas')
    const launcher = manualAppointmentLauncher()
    if (!canvas || !launcher) return
    const openMinutes = Number(canvas.dataset.tsBusinessOpen || state.businessSchedule?.openMinutes || 600)
    const closeMinutes = Number(canvas.dataset.tsBusinessClose || state.businessSchedule?.closeMinutes || 1140)
    const rect = lane.getBoundingClientRect()
    if (!rect.width || closeMinutes <= openMinutes) return
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    const rawMinutes = openMinutes + ratio * (closeMinutes - openMinutes)
    const startMinutes = Math.max(openMinutes, Math.min(closeMinutes - 15, Math.round(rawMinutes / 15) * 15))`, `    const canvas = lane.closest('.shift-canvas')
    const launcher = manualAppointmentLauncher()
    const startMinutes = selectedShiftMinutes(event, lane)
    if (!canvas || !launcher || startMinutes == null) return`, 'manual booking hover geometry')
client = replaceOnce(client, `    canvas.dataset.tsBusinessClose = String(closeMinutes)
  }`, `    canvas.dataset.tsBusinessClose = String(closeMinutes)
    canvas.classList.toggle('ts-shift-closed', state.businessSchedule?.isClosed === true)
    let note = canvas.querySelector(':scope > .ts-shift-closed-note')
    if (state.businessSchedule?.isClosed === true && !note) {
      note = document.createElement('div'); note.className = 'ts-shift-closed-note'; note.textContent = 'この日は休業日に設定されています。日別営業時間の設定から変更できます。'; canvas.prepend(note)
    } else if (state.businessSchedule?.isClosed !== true) note?.remove()
  }`, 'closed shift state')
client = replaceOnce(client, `    addStyles()
    polishDemoExperience()`, `    addStyles()
    renderBusinessDaysPage()
    polishDemoExperience()`, 'render business days')
client = replaceBetween(client, `    const expectedHourLabels = Math.floor(slots.length / 2)`, `    timeline.dataset.tsHourLabelsCentered = '1'`, `    const expectedHourLabels = Math.floor(slots.length / 2)
    labels.forEach((label, index) => {
      const visible = index < expectedHourLabels
      label.style.display = visible ? '' : 'none'
      if (!visible) return
      label.style.left = \`\${((index * 2 + 1) / slots.length) * 100}%\`
      label.style.right = 'auto'
      label.style.top = '50%'
      label.style.transform = 'translate(-50%, -50%)'
    })
`, 'react-safe shift labels')
client = replaceOnce(client, `    hideManualAppointmentLauncher()
    document.querySelectorAll('.shift-lane').forEach(lane => {`, `    hideManualAppointmentLauncher()
    ensureBusinessDaysLink()
    loadDailyScheduleForShift()
    document.querySelectorAll('.shift-lane').forEach(lane => {`, 'business link and schedule load')
client = client.replace(`    document.addEventListener('dblclick', event => {`, `     document.addEventListener('dblclick', event => {`)
client = replaceBetween(client, `     document.addEventListener('dblclick', event => {`, `    document.addEventListener('pointerup', event => {`, `    document.addEventListener('pointermove', event => {
      const lane = event.target.closest?.('.shift-lane')
      if (lane) updateShiftHover(event, lane)
    }, true)
    document.addEventListener('pointerout', event => {
      const lane = event.target.closest?.('.shift-lane')
      if (lane && !lane.contains(event.relatedTarget)) clearShiftHover(lane)
    }, true)
    document.addEventListener('dblclick', event => {
      const lane = event.target.closest?.('.shift-lane')
      if (lane) openManualAppointmentFromLane(event, lane)
    }, true)
`, 'shift hover listeners')
client = replaceOnce(client, `        const announceSchedule = () => {
          if (typeof window.__lienSetBusinessSchedule === 'function') {`, `        const announceSchedule = () => {
          if (isShiftRoute() && state.dailyScheduleDate === shiftDate()) return
          if (typeof window.__lienSetBusinessSchedule === 'function') {`, 'preserve daily shift schedule')

fs.writeFileSync(clientFile, client)
