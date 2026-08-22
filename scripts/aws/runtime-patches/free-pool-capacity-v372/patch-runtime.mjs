import fs from 'node:fs'
import path from 'node:path'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

// Customer application availability and booking validation.
const tenantPath = '/app/tenant-setup.js'
let tenant = fs.readFileSync(tenantPath, 'utf8')

tenant = replaceOnce(
  tenant,
  `  function freeCanAccept({ staff, appointments, startMinutes, durationMinutes, date }) {
    const working = staff.filter(row => !(row.closedWeekdays || []).includes(weekdayForDate(date)) && startMinutes >= Number(row.workStartMinutes) && startMinutes + durationMinutes <= Number(row.workEndMinutes))
    if (!working.length) return false
    const totalCapacity = working.reduce((sum, row) => sum + Number(row.maxConcurrentAppointments || 1), 0)
    const overlapping = appointments.filter(appointment => overlaps(startMinutes, durationMinutes, jstMinutes(appointment.scheduledAt), Number(appointment.durationMinutes || 60)))
    return overlapping.length < totalCapacity
  }`,
  `  function workingPhysicalCapacity({ staff, date, startMinutes, durationMinutes }) {
    const weekday = weekdayForDate(date)
    return staff
      .filter(row => row.staffKey !== 'free' && String(row.staffName || '').replace(/\\s/g, '') !== 'フリー')
      .filter(row => !(row.closedWeekdays || []).includes(weekday))
      .filter(row => startMinutes >= Number(row.workStartMinutes) && startMinutes + durationMinutes <= Number(row.workEndMinutes))
      .reduce((sum, row) => sum + Math.max(1, Number(row.maxConcurrentAppointments) || 1), 0)
  }

  function freeCanAccept({ staff, appointments, startMinutes, durationMinutes, date }) {
    const totalCapacity = workingPhysicalCapacity({ staff, date, startMinutes, durationMinutes })
    if (!totalCapacity) return false
    const overlapping = appointments.filter(appointment => overlaps(startMinutes, durationMinutes, jstMinutes(appointment.scheduledAt), Number(appointment.durationMinutes || 60)))
    return overlapping.length < totalCapacity
  }`,
  'customer physical capacity helper',
)

tenant = replaceOnce(
  tenant,
  `        const overlappingCount = dayAppointments.filter(appointment => overlaps(minutes, Number(menu.durationMinutes), jstMinutes(appointment.scheduledAt), Number(appointment.durationMinutes || 60))).length
        const belowDailyCapacity = overlappingCount < Number(daySchedule.capacity || defaultCapacity || 1)
        const available = belowDailyCapacity && (staffKey === 'free'`,
  `        const overlappingCount = dayAppointments.filter(appointment => overlaps(minutes, Number(menu.durationMinutes), jstMinutes(appointment.scheduledAt), Number(appointment.durationMinutes || 60))).length
        const physicalCapacity = workingPhysicalCapacity({ staff: candidates, date, startMinutes: minutes, durationMinutes: Number(menu.durationMinutes) })
        const effectiveCapacity = Math.min(Number(daySchedule.capacity || defaultCapacity || physicalCapacity || 1), physicalCapacity)
        const belowDailyCapacity = physicalCapacity > 0 && overlappingCount < effectiveCapacity
        const available = belowDailyCapacity && (staffKey === 'free'`,
  'customer availability physical pool',
)

tenant = replaceOnce(
  tenant,
  `        const overlappingCount = appointments.filter(appointment => overlaps(startMinutes, Number(menu.durationMinutes), jstMinutes(appointment.scheduledAt), Number(appointment.durationMinutes || 60))).length
        const available = overlappingCount < Number(currentSchedule.capacity || 1) && (staffKey === 'free'`,
  `        const overlappingCount = appointments.filter(appointment => overlaps(startMinutes, Number(menu.durationMinutes), jstMinutes(appointment.scheduledAt), Number(appointment.durationMinutes || 60))).length
        const physicalCapacity = workingPhysicalCapacity({ staff, date, startMinutes, durationMinutes: Number(menu.durationMinutes) })
        const effectiveCapacity = Math.min(Number(currentSchedule.capacity || physicalCapacity || 1), physicalCapacity)
        const available = physicalCapacity > 0 && overlappingCount < effectiveCapacity && (staffKey === 'free'`,
  'customer booking physical pool',
)

fs.writeFileSync(tenantPath, tenant)

// Store-side manual booking and drag/move validation.
const operationsPath = '/app/appointment-operations-v267.js'
let operations = fs.readFileSync(operationsPath, 'utf8')

operations = replaceOnce(
  operations,
  `      return { staffKey: 'free', staffName: 'フリー', maxConcurrentAppointments: 1, workStartMinutes: hours.openMinutes, workEndMinutes: hours.closeMinutes }`,
  `      return { staffKey: 'free', staffName: 'フリー', maxConcurrentAppointments: 1, workStartMinutes: hours.openMinutes, workEndMinutes: hours.closeMinutes, closedWeekdays: [] }`,
  'manual free staff marker',
)

operations = replaceOnce(
  operations,
  `'SELECT "staffKey","staffName","maxConcurrentAppointments","workStartMinutes","workEndMinutes" FROM "StaffBookingSetting" WHERE "organizationId"=$1 AND "active"=TRUE AND "onLeave"=FALSE ORDER BY "createdAt","staffName"'`,
  `'SELECT "staffKey","staffName","maxConcurrentAppointments","workStartMinutes","workEndMinutes","closedWeekdays" FROM "StaffBookingSetting" WHERE "organizationId"=$1 AND "active"=TRUE AND "onLeave"=FALSE ORDER BY "createdAt","staffName"'`,
  'manual staff recurring schedule query',
)

operations = replaceOnce(
  operations,
  `      workEndMinutes: Number.isInteger(Number(row.workEndMinutes)) ? Number(row.workEndMinutes) : hours.closeMinutes,
    }
  }

  async function assertAvailability`,
  `      workEndMinutes: Number.isInteger(Number(row.workEndMinutes)) ? Number(row.workEndMinutes) : hours.closeMinutes,
      closedWeekdays: [...new Set(String(row.closedWeekdays || '').split(',').map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))],
    }
  }

  function weekdayForDate(date) {
    return new Date(date + 'T00:00:00Z').getUTCDay()
  }

  async function workingStaffForSlot(db, organizationId, date, startMinutes, durationMinutes) {
    const rows = await db.$queryRawUnsafe('SELECT "staffKey","staffName","maxConcurrentAppointments","workStartMinutes","workEndMinutes","closedWeekdays" FROM "StaffBookingSetting" WHERE "organizationId"=$1 AND "active"=TRUE AND "onLeave"=FALSE ORDER BY "createdAt","staffName"', organizationId)
    const weekday = weekdayForDate(date)
    return rows.filter(row => {
      const closed = String(row.closedWeekdays || '').split(',').map(Number)
      return row.staffKey !== 'free' && normalizeStaff(row.staffName) !== normalizeStaff('フリー') && !closed.includes(weekday) && startMinutes >= Number(row.workStartMinutes) && startMinutes + durationMinutes <= Number(row.workEndMinutes)
    })
  }

  async function assertAvailability`,
  'manual physical staff helpers',
)

operations = replaceOnce(
  operations,
  `    const staffToken = normalizeStaff(staff.staffName)
    for (let slot = startMinutes; slot < startMinutes + durationMinutes; slot += 15) {
      const count = rows.filter(row => normalizeStaff(row.staffName || 'フリー') === staffToken && overlaps(slot, 15, jstMinutes(row.scheduledAt), row.durationMinutes || 60)).length
      if (count + 1 > staff.maxConcurrentAppointments) throw new RequestError(\`${'${staff.staffName}'}の受付可能数を超えています。\`)
    }`,
  `    const workingStaff = await workingStaffForSlot(db, organizationId, date, startMinutes, durationMinutes)
    if (!workingStaff.length) throw new RequestError('この時間に受付可能なスタッフがいません。')
    const staffToken = normalizeStaff(staff.staffName)
    if (staff.staffKey !== 'free' && !workingStaff.some(row => normalizeStaff(row.staffName) === staffToken || normalizeStaff(row.staffKey) === normalizeStaff(staff.staffKey))) {
      throw new RequestError(\`${'${staff.staffName}'}はこの時間に受付できません。\`)
    }
    const totalCapacity = workingStaff.reduce((sum, row) => sum + Math.max(1, Number(row.maxConcurrentAppointments) || 1), 0)
    for (let slot = startMinutes; slot < startMinutes + durationMinutes; slot += 15) {
      const overlapping = rows.filter(row => overlaps(slot, 15, jstMinutes(row.scheduledAt), row.durationMinutes || 60))
      if (overlapping.length + 1 > totalCapacity) throw new RequestError('この時間の残り受付数が0です。別の時間を選んでください。')
      if (staff.staffKey !== 'free') {
        const count = overlapping.filter(row => normalizeStaff(row.staffName || 'フリー') === staffToken).length
        if (count + 1 > staff.maxConcurrentAppointments) throw new RequestError(\`${'${staff.staffName}'}の受付可能数を超えています。\`)
      }
    }`,
  'manual and drag physical pool validation',
)

fs.writeFileSync(operationsPath, operations)

// Shift server data: only active/on-duty staff count, and recurring days off reach the client.
const serverPagePath = '/app/.next/server/app/admin/appointments/page.js'
let serverPage = fs.readFileSync(serverPagePath, 'utf8')

serverPage = replaceOnce(
  serverPage,
  `              v._.staffBookingSetting.findMany({
                where: { organizationId: x.organizationId },
              }),`,
  `              v._.$queryRawUnsafe('SELECT "staffKey","staffName","maxConcurrentAppointments","workStartMinutes","workEndMinutes","closedWeekdays" FROM "StaffBookingSetting" WHERE "organizationId"=$1 AND "active"=TRUE AND "onLeave"=FALSE ORDER BY "createdAt","staffName"', x.organizationId),`,
  'shift active staff query',
)

serverPage = replaceOnce(
  serverPage,
  `                workEndMinutes: t?.workEndMinutes ?? 1140,
              };`,
  `                workEndMinutes: t?.workEndMinutes ?? 1140,
                closedWeekdays: String(t?.closedWeekdays || '').split(',').map(Number).filter(Number.isInteger),
                isVirtualFree: false,
              };`,
  'legacy shift staff schedule',
)

serverPage = replaceOnce(
  serverPage,
  `                  workEndMinutes: e.workEndMinutes,
                })), {
                  key: w.jb.key,`,
  `                  workEndMinutes: e.workEndMinutes,
                  closedWeekdays: String(e.closedWeekdays || '').split(',').map(Number).filter(Number.isInteger),
                  isVirtualFree: false,
                })), {
                  key: w.jb.key,`,
  'tenant shift staff schedule',
)

serverPage = replaceOnce(
  serverPage,
  `                  workEndMinutes: 1140,
                }];`,
  `                  workEndMinutes: 1140,
                  closedWeekdays: [],
                  isVirtualFree: true,
                }];`,
  'virtual free shift marker',
)

function patchCapacity(source, names, label) {
  const { staff, appointments, slotSize, overrides, weekdayAnchor, capacityVariable, bookedVariable, firstIndent = '                  ', continuationIndent = '                  ' } = names
  source = replaceOnce(
    source,
    `__businessDuration=Math.max(60,__businessClose-__businessOpen),[__shiftHydrated`,
    `__businessDuration=Math.max(60,__businessClose-__businessOpen),__shiftWeekday=new Date(${weekdayAnchor}+"T00:00:00Z").getUTCDay(),[__shiftHydrated`,
    `${label} weekday`,
  )
  const oldCapacity = `${firstIndent}let t = e + ${slotSize},
${continuationIndent}${capacityVariable} = ${staff}.reduce(
${continuationIndent}  (${capacityVariable}, ${bookedVariable}) =>
${continuationIndent}    ${capacityVariable} +
${continuationIndent}    (${bookedVariable}.workStartMinutes < t && e < ${bookedVariable}.workEndMinutes
${continuationIndent}      ? ${bookedVariable}.maxConcurrentAppointments
${continuationIndent}      : 0),
${continuationIndent}  0,
${continuationIndent}),
${continuationIndent}${bookedVariable} = ${appointments}.filter((${capacityVariable}) => {`
  const newCapacity = `${firstIndent}let t = e + ${slotSize},
${continuationIndent}${capacityVariable} = ${staff}.reduce(
${continuationIndent}  (${capacityVariable}, ${bookedVariable}) =>
${continuationIndent}    ${capacityVariable} +
${continuationIndent}    (!${bookedVariable}.isVirtualFree && ${bookedVariable}.key !== "free" && ${bookedVariable}.name !== "フリー" && !(Array.isArray(${bookedVariable}.closedWeekdays) && ${bookedVariable}.closedWeekdays.includes(__shiftWeekday)) && ${bookedVariable}.workStartMinutes < t && e < ${bookedVariable}.workEndMinutes
${continuationIndent}      ? Math.max(1, Number(${bookedVariable}.maxConcurrentAppointments) || 1)
${continuationIndent}      : 0),
${continuationIndent}  0,
${continuationIndent}),
${continuationIndent}${bookedVariable} = ${appointments}.filter((${capacityVariable}) => {`
  source = replaceOnce(source, oldCapacity, newCapacity, `${label} physical staff reduce`)
  const oldRemaining = label === 'server shift'
    ? `                  let a = Math.max(0, ${capacityVariable} - ${bookedVariable});
                  return {
                    slotStart: e,
                    capacity: ${capacityVariable},
                    booked: ${bookedVariable},
                    remaining: Number.isInteger(${overrides}[e]) && ${overrides}[e] >= 0 ? ${overrides}[e] : a,
                  };`
    : `                let a = Math.max(0, ${capacityVariable} - ${bookedVariable});
                return {
                  slotStart: e,
                  capacity: ${capacityVariable},
                  booked: ${bookedVariable},
                  remaining:
                    Number.isInteger(${overrides}[e]) &&
                    ${overrides}[e] >= 0
                      ? ${overrides}[e]
                      : a,
                };`
  const newRemaining = label === 'server shift'
    ? `                  let a = Math.max(0, ${capacityVariable} - ${bookedVariable}),
                    o = Number.isInteger(${overrides}[e]) && ${overrides}[e] >= 0 ? ${overrides}[e] : null;
                  return {
                    slotStart: e,
                    capacity: ${capacityVariable},
                    booked: ${bookedVariable},
                    remaining: null === o ? a : Math.min(a, o),
                  };`
    : `                let a = Math.max(0, ${capacityVariable} - ${bookedVariable}),
                  o = Number.isInteger(${overrides}[e]) && ${overrides}[e] >= 0 ? ${overrides}[e] : null;
                return {
                  slotStart: e,
                  capacity: ${capacityVariable},
                  booked: ${bookedVariable},
                  remaining: null === o ? a : Math.min(a, o),
                };`
  source = replaceOnce(source, oldRemaining, newRemaining, `${label} safe remaining capacity`)
  return source
}

serverPage = patchCapacity(serverPage, { staff: 'd', appointments: 'v', slotSize: 'U', overrides: 'Q', weekdayAnchor: 'e', capacityVariable: 'r', bookedVariable: 'n', continuationIndent: '                    ' }, 'server shift')
fs.writeFileSync(serverPagePath, serverPage)

// Immutable browser chunk so CloudFront/browser caches cannot revive the old math.
const staticDirectory = '/app/.next/static/chunks/app/admin/appointments'
const oldName = 'page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.shift-first-grab-v369.js'
const newName = 'page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.free-pool-v372.js'
const oldPath = path.join(staticDirectory, oldName)
const newPath = path.join(staticDirectory, newName)
let browserChunk = fs.readFileSync(oldPath, 'utf8')
browserChunk = patchCapacity(browserChunk, { staff: 'm', appointments: 'k', slotSize: 'q', overrides: 'capacityOverrides', weekdayAnchor: 't', capacityVariable: 'n', bookedVariable: 'r', firstIndent: '                ' }, 'browser shift')
new Function(browserChunk)
fs.writeFileSync(newPath, browserChunk)

for (const referenceFile of [
  '/app/.next/app-build-manifest.json',
  '/app/.next/server/app/admin/appointments/page_client-reference-manifest.js',
]) {
  const manifest = fs.readFileSync(referenceFile, 'utf8')
  const count = manifest.split(oldName).length - 1
  if (count < 1) throw new Error(`missing shift chunk reference: ${referenceFile}`)
  fs.writeFileSync(referenceFile, manifest.replaceAll(oldName, newName))
}
