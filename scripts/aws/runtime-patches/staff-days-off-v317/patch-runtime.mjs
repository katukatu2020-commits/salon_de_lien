import fs from 'node:fs'

const replaceOnce = (source, search, replacement, label) => {
  const count = source.split(search).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(search, replacement)
}

const customerFile = '/app/customer-store-staff-v276.js'
let customer = fs.readFileSync(customerFile, 'utf8')
customer = replaceOnce(customer,
  `      await prisma.$executeRawUnsafe('ALTER TABLE "StaffBookingSetting" ADD COLUMN IF NOT EXISTS "onLeave" BOOLEAN NOT NULL DEFAULT FALSE')`,
  `      await prisma.$executeRawUnsafe('ALTER TABLE "StaffBookingSetting" ADD COLUMN IF NOT EXISTS "onLeave" BOOLEAN NOT NULL DEFAULT FALSE')
      await prisma.$executeRawUnsafe(\`ALTER TABLE "StaffBookingSetting" ADD COLUMN IF NOT EXISTS "closedWeekdays" TEXT NOT NULL DEFAULT ''\`)`,
  'staff recurring-day-off schema')
customer = replaceOnce(customer,
  `              s."maxConcurrentAppointments",s."workStartMinutes",s."workEndMinutes",`,
  `              s."maxConcurrentAppointments",s."workStartMinutes",s."workEndMinutes",s."closedWeekdays",`,
  'staff directory schedule query')
customer = replaceOnce(customer,
  `      onLeave: row.onLeave === true,
      maxConcurrentAppointments: Number(row.maxConcurrentAppointments || 1),`,
  `      onLeave: row.onLeave === true,
      closedWeekdays: [...new Set(String(row.closedWeekdays || '').split(',').map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))].sort((left, right) => left - right),
      maxConcurrentAppointments: Number(row.maxConcurrentAppointments || 1),`,
  'staff directory schedule response')
customer = replaceOnce(customer,
  `  async function staffManagement(req, res) {`,
  `  function normalizeStaffClosedWeekdays(value) {
    const source = Array.isArray(value) ? value : String(value || '').split(',')
    return [...new Set(source.map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))].sort((left, right) => left - right).join(',')
  }

  async function staffManagement(req, res) {`,
  'staff recurring-day-off normalization')
customer = replaceOnce(customer,
  `      const capacity = Math.min(9, Math.max(1, Number(data.maxConcurrentAppointments) || 1))`,
  `      const capacity = Math.min(9, Math.max(1, Number(data.maxConcurrentAppointments) || 1))
      const closedWeekdays = normalizeStaffClosedWeekdays(data.closedWeekdays)`,
  'new staff recurring days off')
customer = replaceOnce(customer,
  `        if (settingDuplicate[0]) await tx.$executeRawUnsafe('UPDATE "StaffBookingSetting" SET "staffName"=$1,"userId"=$2,"active"=TRUE,"onLeave"=FALSE,"maxConcurrentAppointments"=$3,"updatedAt"=NOW() WHERE "id"=$4 AND "organizationId"=$5', name, userId, capacity, settingDuplicate[0].id, session.organizationId)
        else await tx.$executeRawUnsafe('INSERT INTO "StaffBookingSetting" ("id","organizationId","staffKey","staffName","userId","active","onLeave","maxConcurrentAppointments","workStartMinutes","workEndMinutes","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,TRUE,FALSE,$6,$7,$8,NOW(),NOW())', crypto.randomUUID(), session.organizationId, key, name, userId, capacity, workStartMinutes, workEndMinutes)`,
  `        if (settingDuplicate[0]) await tx.$executeRawUnsafe('UPDATE "StaffBookingSetting" SET "staffName"=$1,"userId"=$2,"active"=TRUE,"onLeave"=FALSE,"maxConcurrentAppointments"=$3,"closedWeekdays"=$4,"updatedAt"=NOW() WHERE "id"=$5 AND "organizationId"=$6', name, userId, capacity, closedWeekdays, settingDuplicate[0].id, session.organizationId)
        else await tx.$executeRawUnsafe('INSERT INTO "StaffBookingSetting" ("id","organizationId","staffKey","staffName","userId","active","onLeave","maxConcurrentAppointments","workStartMinutes","workEndMinutes","closedWeekdays","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,TRUE,FALSE,$6,$7,$8,$9,NOW(),NOW())', crypto.randomUUID(), session.organizationId, key, name, userId, capacity, workStartMinutes, workEndMinutes, closedWeekdays)`,
  'persist new staff recurring days off')
customer = replaceOnce(customer,
  `    const capacity = Math.min(9, Math.max(1, Number(data.maxConcurrentAppointments) || target.maxConcurrentAppointments || 1))
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe('UPDATE "StaffBookingSetting" SET "staffName"=$1,"active"=$2,"onLeave"=$3,"maxConcurrentAppointments"=$4,"updatedAt"=NOW() WHERE "organizationId"=$5 AND "staffKey"=$6', name, active, onLeave, capacity, session.organizationId, key)`,
  `    const capacity = Math.min(9, Math.max(1, Number(data.maxConcurrentAppointments) || target.maxConcurrentAppointments || 1))
    const closedWeekdays = normalizeStaffClosedWeekdays(data.closedWeekdays)
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe('UPDATE "StaffBookingSetting" SET "staffName"=$1,"active"=$2,"onLeave"=$3,"maxConcurrentAppointments"=$4,"closedWeekdays"=$5,"updatedAt"=NOW() WHERE "organizationId"=$6 AND "staffKey"=$7', name, active, onLeave, capacity, closedWeekdays, session.organizationId, key)`,
  'persist edited staff recurring days off')
fs.writeFileSync(customerFile, customer)

const staffClientFile = '/app/admin-staff-experience-v276.js'
let staffClient = fs.readFileSync(staffClientFile, 'utf8')
staffClient = replaceOnce(staffClient,
  `.sm-check input{width:17px;height:17px;accent-color:#9d5546}`,
  `.sm-check input{width:17px;height:17px;accent-color:#9d5546}.sm-days-off{margin:12px 0 0;border:1px solid #e5d7d0;border-radius:16px;background:#fffaf7;padding:14px}.sm-days-off legend{padding:0 7px;color:#4d3e37;font-size:11px;font-weight:900}.sm-days-off p{margin:0 0 10px;color:#806f68;font-size:10px;line-height:1.6}.sm-weekday-list{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}.sm-weekday{display:grid;min-height:45px;place-items:center;border:1px solid #e4d5ce;border-radius:12px;background:#fff;color:#67544c;font-size:11px;font-weight:900;cursor:pointer}.sm-weekday:has(input:checked){border-color:#a65a4b;background:#a65a4b;color:#fff;box-shadow:0 5px 14px rgba(118,61,49,.18)}.sm-weekday input{position:absolute;width:1px;height:1px;opacity:0}.sm-days-summary{color:#9b5a4d!important;font-weight:800}@media(max-width:600px){.sm-weekday-list{grid-template-columns:repeat(4,minmax(0,1fr))}}`,
  'staff recurring-day-off styles')
staffClient = replaceOnce(staffClient,
  `  async function ensureAccountProfile() {`,
  `  const weekdayLabels = ['日','月','火','水','木','金','土']

  function recurringDaysOffMarkup(selected = []) {
    const values = new Set((Array.isArray(selected) ? selected : []).map(Number))
    return '<fieldset class="sm-days-off"><legend>毎週の定休日</legend><p>選択した曜日は、お客様予約と店頭予約の受付対象から除外されます。</p><div class="sm-weekday-list">' + weekdayLabels.map((label, day) => '<label class="sm-weekday"><input type="checkbox" name="closedWeekdays" value="' + day + '" ' + (values.has(day) ? 'checked' : '') + '><span>' + label + '曜</span></label>').join('') + '</div></fieldset>'
  }

  function selectedRecurringDaysOff(form) {
    return new FormData(form).getAll('closedWeekdays').map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6)
  }

  async function ensureAccountProfile() {`,
  'staff recurring-day-off form helpers')
staffClient = replaceOnce(staffClient,
  `    return \`<article class="sm-staff-card \${staff.active ? '' : 'is-inactive'}" data-sm-staff="\${esc(staff.key)}">\${avatar(staff)}<div><h2>\${esc(staff.name)}</h2><p>\${esc(staff.role || 'スタイリスト')}\${staff.loginId ? \` / ID: \${esc(staff.loginId)}\` : ' / アカウント未発行'}</p></div><div class="sm-staff-meta"><p>\${esc(staff.specialties || '得意な施術は未設定')}</p><p>同時受付 \${Number(staff.maxConcurrentAppointments || 1)}件</p></div><div class="sm-staff-status sm-badges">\${status}</div><div class="sm-actions"><button type="button" class="sm-button" data-sm-edit>\${icon('edit')}編集</button><button type="button" class="sm-button danger" data-sm-delete \${staff.accountRole === 'ADMIN' ? 'disabled title="オーナーアカウントは削除できません"' : ''}>\${icon('trash')}削除</button></div></article>\``,
  `    const daysOff = (staff.closedWeekdays || []).map(day => weekdayLabels[day]).filter(Boolean)
    return \`<article class="sm-staff-card \${staff.active ? '' : 'is-inactive'}" data-sm-staff="\${esc(staff.key)}">\${avatar(staff)}<div><h2>\${esc(staff.name)}</h2><p>\${esc(staff.role || 'スタイリスト')}\${staff.loginId ? \` / ID: \${esc(staff.loginId)}\` : ' / アカウント未発行'}</p></div><div class="sm-staff-meta"><p>\${esc(staff.specialties || '得意な施術は未設定')}</p><p>同時受付 \${Number(staff.maxConcurrentAppointments || 1)}件</p><p class="sm-days-summary">定休日：\${daysOff.length ? '毎週 ' + daysOff.join('・') : 'なし'}</p></div><div class="sm-staff-status sm-badges">\${status}</div><div class="sm-actions"><button type="button" class="sm-button" data-sm-edit>\${icon('edit')}編集</button><button type="button" class="sm-button danger" data-sm-delete \${staff.accountRole === 'ADMIN' ? 'disabled title="オーナーアカウントは削除できません"' : ''}>\${icon('trash')}削除</button></div></article>\``,
  'staff card recurring-day-off summary')
staffClient = replaceOnce(staffClient,
  `</label></div><div class="sm-dialog-actions"><button type="button" class="sm-button" data-sm-close-secondary>キャンセル</button><button type="submit" class="sm-button primary">\${icon('plus')}登録する</button></div></form>\`)`,
  `</label></div>\${recurringDaysOffMarkup(preset?.closedWeekdays)}<div class="sm-dialog-actions"><button type="button" class="sm-button" data-sm-close-secondary>キャンセル</button><button type="submit" class="sm-button primary">\${icon('plus')}登録する</button></div></form>\`)`,
  'new staff recurring-day-off UI')
staffClient = replaceOnce(staffClient,
  `      try { await request('/api/admin/staff-management', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) }); state.directory = null; close(); await renderStaffPage(root); toast('スタッフアカウントを登録しました。') }`,
  `      try { const payload = Object.fromEntries(new FormData(event.currentTarget)); payload.closedWeekdays = selectedRecurringDaysOff(event.currentTarget); await request('/api/admin/staff-management', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); state.directory = null; close(); await renderStaffPage(root); toast('スタッフアカウントを登録しました。') }`,
  'submit new staff recurring days off')
staffClient = replaceOnce(staffClient,
  `</label></div><div class="sm-dialog-actions"><button type="button" class="sm-button" data-sm-close-secondary>キャンセル</button><button type="submit" class="sm-button primary">\${icon('check')}保存する</button></div></form>\`)`,
  `</label></div>\${recurringDaysOffMarkup(staff.closedWeekdays)}<div class="sm-dialog-actions"><button type="button" class="sm-button" data-sm-close-secondary>キャンセル</button><button type="submit" class="sm-button primary">\${icon('check')}保存する</button></div></form>\`)`,
  'edit staff recurring-day-off UI')
staffClient = replaceOnce(staffClient,
  `body: JSON.stringify({ staffKey: staff.key, displayName: fields.displayName, active: fields.active, onLeave: fields.onLeave, maxConcurrentAppointments: Number(fields.maxConcurrentAppointments) })`,
  `body: JSON.stringify({ staffKey: staff.key, displayName: fields.displayName, active: fields.active, onLeave: fields.onLeave, maxConcurrentAppointments: Number(fields.maxConcurrentAppointments), closedWeekdays: selectedRecurringDaysOff(form) })`,
  'submit edited staff recurring days off')
fs.writeFileSync(staffClientFile, staffClient)

const tenantFile = '/app/tenant-setup.js'
let tenant = fs.readFileSync(tenantFile, 'utf8')
tenant = replaceOnce(tenant,
  String.raw`    await prisma.$executeRawUnsafe('ALTER TABLE "OrganizationStoreProfile" ADD COLUMN IF NOT EXISTS "closedWeekdays" TEXT NOT NULL DEFAULT \'1\'')`,
  String.raw`    await prisma.$executeRawUnsafe('ALTER TABLE "OrganizationStoreProfile" ADD COLUMN IF NOT EXISTS "closedWeekdays" TEXT NOT NULL DEFAULT \'1\'')
    await prisma.$executeRawUnsafe('ALTER TABLE "StaffBookingSetting" ADD COLUMN IF NOT EXISTS "closedWeekdays" TEXT NOT NULL DEFAULT \'\'')`,
  'tenant staff recurring-day-off schema')
tenant = replaceOnce(tenant,
  `    const rows = await prisma.$queryRawUnsafe('SELECT "staffKey","staffName","maxConcurrentAppointments","workStartMinutes","workEndMinutes" FROM "StaffBookingSetting" WHERE "organizationId"=$1 AND "active"=TRUE AND "onLeave"=FALSE ORDER BY "createdAt","staffName"', organizationId)
    if (rows.length || organizationId !== LEGACY_ORGANIZATION_ID) return rows
    const schedule = await businessSchedule(organizationId)
    return legacyStaffRowsForSchedule(schedule)`,
  `    const rows = await prisma.$queryRawUnsafe('SELECT "staffKey","staffName","maxConcurrentAppointments","workStartMinutes","workEndMinutes","closedWeekdays" FROM "StaffBookingSetting" WHERE "organizationId"=$1 AND "active"=TRUE AND "onLeave"=FALSE ORDER BY "createdAt","staffName"', organizationId)
    const normalize = row => ({ ...row, closedWeekdays: [...new Set(String(row.closedWeekdays || '').split(',').map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))].sort((left, right) => left - right) })
    if (rows.length || organizationId !== LEGACY_ORGANIZATION_ID) return rows.map(normalize)
    const schedule = await businessSchedule(organizationId)
    return legacyStaffRowsForSchedule(schedule).map(normalize)`,
  'tenant staff rows include recurring days off')
tenant = replaceOnce(tenant,
  `  function staffCanAccept({ staff, appointments, startMinutes, durationMinutes }) {
    if (startMinutes < Number(staff.workStartMinutes) || startMinutes + durationMinutes > Number(staff.workEndMinutes)) return false`,
  `  function staffCanAccept({ staff, appointments, startMinutes, durationMinutes, date }) {
    if ((staff.closedWeekdays || []).includes(weekdayForDate(date))) return false
    if (startMinutes < Number(staff.workStartMinutes) || startMinutes + durationMinutes > Number(staff.workEndMinutes)) return false`,
  'named staff recurring-day-off availability')
tenant = replaceOnce(tenant,
  `  function freeCanAccept({ staff, appointments, startMinutes, durationMinutes }) {
    const working = staff.filter(row => startMinutes >= Number(row.workStartMinutes) && startMinutes + durationMinutes <= Number(row.workEndMinutes))`,
  `  function freeCanAccept({ staff, appointments, startMinutes, durationMinutes, date }) {
    const working = staff.filter(row => !(row.closedWeekdays || []).includes(weekdayForDate(date)) && startMinutes >= Number(row.workStartMinutes) && startMinutes + durationMinutes <= Number(row.workEndMinutes))`,
  'free staff recurring-day-off availability')
tenant = tenant.replaceAll(`freeCanAccept({ staff: candidates, appointments: dayAppointments, startMinutes: minutes, durationMinutes: Number(menu.durationMinutes) })`, `freeCanAccept({ staff: candidates, appointments: dayAppointments, startMinutes: minutes, durationMinutes: Number(menu.durationMinutes), date })`)
tenant = tenant.replaceAll(`staffCanAccept({ staff: row, appointments: dayAppointments, startMinutes: minutes, durationMinutes: Number(menu.durationMinutes) })`, `staffCanAccept({ staff: row, appointments: dayAppointments, startMinutes: minutes, durationMinutes: Number(menu.durationMinutes), date })`)
tenant = tenant.replaceAll(`freeCanAccept({ staff, appointments, startMinutes, durationMinutes: Number(menu.durationMinutes) })`, `freeCanAccept({ staff, appointments, startMinutes, durationMinutes: Number(menu.durationMinutes), date })`)
tenant = tenant.replaceAll(`staffCanAccept({ staff: row, appointments, startMinutes, durationMinutes: Number(menu.durationMinutes) })`, `staffCanAccept({ staff: row, appointments, startMinutes, durationMinutes: Number(menu.durationMinutes), date })`)
fs.writeFileSync(tenantFile, tenant)

const tenantClientFile = '/app/tenant-setup-client.js'
let tenantClient = fs.readFileSync(tenantClientFile, 'utf8')
tenantClient = replaceOnce(tenantClient,
  `.ts-day-card.closed .ts-day-fields{opacity:.45;pointer-events:none}`,
  `.ts-day-card.closed .ts-day-fields{opacity:.45;pointer-events:none}.shift-lane.ts-staff-day-off{cursor:not-allowed!important;background:repeating-linear-gradient(135deg,#f8f4f1,#f8f4f1 12px,#f3ece8 12px,#f3ece8 24px)!important}.ts-staff-day-off-label{position:absolute;z-index:2;inset:0;display:grid;place-items:center;color:#9a7d72;font-size:11px;font-weight:900;letter-spacing:.08em;pointer-events:none}`,
  'shift staff recurring-day-off styles')
tenantClient = replaceOnce(tenantClient,
  `    if (!force && root.dataset.month === month && root.dataset.ready === '1') return
    root.dataset.month = month
    root.innerHTML = '<div class="ts-days-loading">日別の営業時間を読み込んでいます…</div>'`,
  `    if (!force && (root.dataset.interacting === '1' || root.contains(document.activeElement))) return
    if (!force && root.dataset.month === month && root.dataset.ready === '1') return
    if (!force && root.dataset.loading === '1') return
    root.dataset.month = month
    root.dataset.loading = '1'
    root.innerHTML = '<div class="ts-days-loading">日別の営業時間を読み込んでいます…</div>'`,
  'business-day interaction render guard')
tenantClient = replaceOnce(tenantClient,
  `      root.dataset.ready = '1'
      root.querySelectorAll('[name="isClosed"]')`,
  `      root.dataset.ready = '1'
      root.dataset.loading = '0'
      if (!root.dataset.interactionGuard) {
        root.dataset.interactionGuard = '1'
        root.addEventListener('pointerdown', () => { root.dataset.interacting = '1' })
        root.addEventListener('focusin', () => { root.dataset.interacting = '1' })
        root.addEventListener('focusout', () => setTimeout(() => { if (!root.contains(document.activeElement)) root.dataset.interacting = '0' }, 180))
        root.addEventListener('pointerup', () => setTimeout(() => { if (!root.contains(document.activeElement)) root.dataset.interacting = '0' }, 180))
      }
      root.querySelectorAll('[name="isClosed"]')`,
  'business-day interaction tracking')
tenantClient = replaceOnce(tenantClient,
  `    } catch (error) { root.innerHTML = '<div class="ts-days-loading">' + error.message + '</div>' }
  }

  function openManualAppointmentFromLane`,
  `    } catch (error) { root.dataset.loading = '0'; root.innerHTML = '<div class="ts-days-loading">' + error.message + '</div>' }
  }

  function staffIsOff(staff, date) {
    const weekday = new Date(date + 'T00:00:00Z').getUTCDay()
    return (staff?.closedWeekdays || []).map(Number).includes(weekday)
  }

  function applyStaffRecurringDaysOff() {
    if (!isShiftRoute() || !Array.isArray(state.setup?.staff)) return
    const date = shiftDate()
    const byName = new Map(state.setup.staff.map(staff => [String(staff.staffName || staff.name || '').replace(/\\s/g, ''), staff]))
    document.querySelectorAll('.shift-lane').forEach(lane => {
      const staff = byName.get(String(lane.dataset.staffName || '').replace(/\\s/g, ''))
      const off = Boolean(staff && staffIsOff(staff, date))
      lane.classList.toggle('ts-staff-day-off', off)
      lane.querySelector(':scope > .ts-staff-day-off-label')?.remove()
      if (off) {
        const label = document.createElement('span')
        label.className = 'ts-staff-day-off-label'
        label.textContent = '定休日'
        lane.prepend(label)
        lane.title = 'このスタッフは定休日です'
      } else if (lane.title === 'このスタッフは定休日です') lane.removeAttribute('title')
    })
  }

  function openManualAppointmentFromLane`,
  'shift recurring-day-off presentation')
tenantClient = replaceOnce(tenantClient,
  `    if (!isShiftRoute() || event.target.closest('button,a,input,select,textarea,label')) return
    const canvas`,
  `    if (!isShiftRoute() || event.target.closest('button,a,input,select,textarea,label') || lane.classList.contains('ts-staff-day-off')) return
    const canvas`,
  'block manual bookings for staff recurring days off')
tenantClient = replaceOnce(tenantClient,
  `    alignShiftAppointments()
    normalizeShiftNowMarker()`,
  `    alignShiftAppointments()
    applyStaffRecurringDaysOff()
    normalizeShiftNowMarker()`,
  'apply staff recurring days off on shift')
tenantClient = replaceOnce(tenantClient,
  `    const routeObserver = new MutationObserver(scheduleRouteEnhancement)`,
  `    const routeObserver = new MutationObserver(records => {
      const businessRoot = document.getElementById('ts-business-days-root')
      if (businessRoot && (businessRoot.dataset.interacting === '1' || businessRoot.contains(document.activeElement)) && records.every(record => businessRoot.contains(record.target))) return
      scheduleRouteEnhancement()
    })`,
  'ignore business-day internal mutations while interacting')
fs.writeFileSync(tenantClientFile, tenantClient)

const serverFile = '/app/server.js'
let server = fs.readFileSync(serverFile, 'utf8')
server = replaceOnce(server,
  `  if (!submitted.length || submitted.length > 100) return json(res, 400, { error: '1件以上100件以下の通知を選択してください。' })`,
  `  if (!submitted.length || submitted.length > 500) return json(res, 400, { error: '1件以上500件以下の通知を選択してください。' })`,
  'bulk-read visible notifications limit')
fs.writeFileSync(serverFile, server)
