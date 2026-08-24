import fs from 'node:fs'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function patchFile(file, patcher) {
  const source = fs.readFileSync(file, 'utf8')
  const patched = patcher(source)
  if (patched === source) throw new Error(`${file}: patch produced no change`)
  fs.writeFileSync(file, patched)
}

patchFile('/app/tenant-setup.js', source => {
  source = replaceOnce(
    source,
    "const { createInboundEmailService } = require('./inbound-email')",
    "const { createInboundEmailService } = require('./inbound-email')\nconst { evaluateBookingSlot } = require('./booking-availability-v430')",
    'availability policy import',
  )

  source = replaceOnce(
    source,
    `        const overlappingCount = dayAppointments.filter(appointment => overlaps(minutes, Number(menu.durationMinutes), jstMinutes(appointment.scheduledAt), Number(appointment.durationMinutes || 60))).length
        const physicalCapacity = workingPhysicalCapacity({ staff: candidates, date, startMinutes: minutes, durationMinutes: Number(menu.durationMinutes) })
        const effectiveCapacity = Math.min(Number(daySchedule.capacity || defaultCapacity || physicalCapacity || 1), physicalCapacity)
        const belowDailyCapacity = physicalCapacity > 0 && overlappingCount < effectiveCapacity
        const available = belowDailyCapacity && (staffKey === 'free'
          ? freeCanAccept({ staff: candidates, appointments: dayAppointments, startMinutes: minutes, durationMinutes: Number(menu.durationMinutes), date })
          : candidates.some(row => staffCanAccept({ staff: row, appointments: dayAppointments, startMinutes: minutes, durationMinutes: Number(menu.durationMinutes), date })))`,
    `        const availability = evaluateBookingSlot({
          staff,
          appointments: dayAppointments,
          staffKey,
          date,
          startMinutes: minutes,
          durationMinutes: Number(menu.durationMinutes),
          dailyCapacity: Number(daySchedule.capacity || defaultCapacity || 0),
        })
        const available = availability.available`,
    'customer availability separates store and selected staff capacity',
  )

  source = replaceOnce(
    source,
    `        const overlappingCount = appointments.filter(appointment => overlaps(startMinutes, Number(menu.durationMinutes), jstMinutes(appointment.scheduledAt), Number(appointment.durationMinutes || 60))).length
        const physicalCapacity = workingPhysicalCapacity({ staff, date, startMinutes, durationMinutes: Number(menu.durationMinutes) })
        const effectiveCapacity = Math.min(Number(currentSchedule.capacity || physicalCapacity || 1), physicalCapacity)
        const available = physicalCapacity > 0 && overlappingCount < effectiveCapacity && (staffKey === 'free'
          ? freeCanAccept({ staff, appointments, startMinutes, durationMinutes: Number(menu.durationMinutes), date })
          : staff.filter(row => row.staffKey === staffKey).some(row => staffCanAccept({ staff: row, appointments, startMinutes, durationMinutes: Number(menu.durationMinutes), date })))`,
    `        const availability = evaluateBookingSlot({
          staff,
          appointments,
          staffKey,
          date,
          startMinutes,
          durationMinutes: Number(menu.durationMinutes),
          dailyCapacity: Number(currentSchedule.capacity || 0),
        })
        const available = availability.available`,
    'booking submission uses the same slot policy',
  )
  return source
})

patchFile('/app/store-profile.js', source => {
  source = replaceOnce(
    source,
    `    const websiteUrl = normalizedWebsite(data.websiteUrl)
    const organization = await prisma.organization.update({`,
    `    const websiteUrl = normalizedWebsite(data.websiteUrl)
    const previousScheduleRows = await prisma.$queryRawUnsafe(
      'SELECT "businessOpenMinutes","businessCloseMinutes" FROM "OrganizationStoreProfile" WHERE "organizationId"=$1 LIMIT 1',
      session.organizationId,
    ).catch(() => [])
    const previousSchedule = previousScheduleRows[0] || {}
    const previousOpenMinutes = Number.isInteger(Number(previousSchedule.businessOpenMinutes))
      ? Number(previousSchedule.businessOpenMinutes)
      : DEFAULT_BUSINESS_OPEN_MINUTES
    const previousCloseMinutes = Number.isInteger(Number(previousSchedule.businessCloseMinutes))
      ? Number(previousSchedule.businessCloseMinutes)
      : DEFAULT_BUSINESS_CLOSE_MINUTES
    const organization = await prisma.organization.update({`,
    'capture the previous inherited business hours',
  )

  source = replaceOnce(
    source,
    `    await prisma.$executeRawUnsafe(
      'UPDATE "StaffBookingSetting" SET "workStartMinutes"=$2,"workEndMinutes"=$3,"updatedAt"=NOW() WHERE "organizationId"=$1',`,
    `    await prisma.$executeRawUnsafe(
      \`UPDATE "OrganizationDailySchedule" SET "openMinutes"=$2,"closeMinutes"=$3,"updatedAt"=NOW() WHERE "organizationId"=$1 AND "openMinutes"=$4 AND "closeMinutes"=$5 AND "date">=TO_CHAR(NOW() AT TIME ZONE 'Asia/Tokyo','YYYY-MM-DD')\`,
      session.organizationId,
      schedule.openMinutes,
      schedule.closeMinutes,
      previousOpenMinutes,
      previousCloseMinutes,
    ).catch(() => {})
    await prisma.$executeRawUnsafe(
      'UPDATE "StaffBookingSetting" SET "workStartMinutes"=$2,"workEndMinutes"=$3,"updatedAt"=NOW() WHERE "organizationId"=$1',`,
    'refresh inherited daily schedules before staff hours',
  )
  return source
})

patchFile('/app/tenant-setup-client.js', source => {
  source = replaceOnce(
    source,
    `      if (event.detail && Number.isFinite(Number(event.detail.openMinutes)) && Number.isFinite(Number(event.detail.closeMinutes))) {
        state.businessSchedule = event.detail`,
    `      if (event.detail && Number.isFinite(Number(event.detail.openMinutes)) && Number.isFinite(Number(event.detail.closeMinutes))) {
        if (event.detail.overridden === undefined) state.dailyScheduleDate = ''
        state.businessSchedule = event.detail`,
    'invalidate a cached day after base hours change',
  )
  return source
})

function patchShiftHydration(file) {
  patchFile(file, source => {
    source = source.replace(
      'const t=e.businessSchedule||e;',
      'const t=e.profile?.businessSchedule||e.businessSchedule||e;',
    )
    const oldFetch = 'fetch("/api/admin/store-profile",{headers:{Accept:"application/json"},credentials:"same-origin",cache:"no-store"}).then(e=>e.ok?e.json():null).then(__apply).catch(()=>{});const __onSchedule=e=>__apply(e.detail);window.addEventListener("lien:business-schedule-updated",__onSchedule);return()=>{__cancelled=true;window.removeEventListener("lien:business-schedule-updated",__onSchedule)}},[]);(0,l.useEffect)(()=>{__setShiftHydrated(true)},[]);'
    const newFetch = 'fetch("/api/admin/store-profile",{headers:{Accept:"application/json"},credentials:"same-origin",cache:"no-store"}).then(e=>e.ok?e.json():null).then(__apply).catch(()=>{}).finally(()=>{if(!__cancelled)__setShiftHydrated(true)});const __onSchedule=e=>{__apply(e.detail);__setShiftHydrated(true)};window.addEventListener("lien:business-schedule-updated",__onSchedule);return()=>{__cancelled=true;window.removeEventListener("lien:business-schedule-updated",__onSchedule)}},[]);'
    source = replaceOnce(source, oldFetch, newFetch, `${file} waits for business hours`)
    return source
  })
}

patchShiftHydration('/app/.next/static/chunks/app/admin/appointments/page-shift-staff-drop-v394.js')

patchFile('/app/.next/server/app/admin/appointments/page.js', source => {
  source = replaceOnce(
    source,
    'const t=e.businessSchedule||e;',
    'const t=e.profile?.businessSchedule||e.businessSchedule||e;',
    'server shift profile response shape',
  )
  return source
})

console.log('Business hours and staff availability v430 runtime patched.')
