'use strict'

const MINIMUM_STAFF_START_GAP_MINUTES = 30

function normalizedStaffName(value) {
  return String(value || '').normalize('NFKC').replace(/[\s\u3000]/g, '')
}

function weekdayForDate(date) {
  const match = /^(20\d{2})-(\d{2})-(\d{2})$/.exec(String(date || ''))
  if (!match) return -1
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).getUTCDay()
}

function appointmentMinutes(value) {
  const date = value instanceof Date ? value : new Date(value)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  return 60 * Number(parts.find(part => part.type === 'hour')?.value || 0)
    + Number(parts.find(part => part.type === 'minute')?.value || 0)
}

function rangesOverlap(startA, durationA, startB, durationB) {
  return startA < startB + durationB && startB < startA + durationA
}

function isPhysicalStaff(staff) {
  return staff.staffKey !== 'free' && normalizedStaffName(staff.staffName) !== normalizedStaffName('フリー')
}

function isWorkingForRange(staff, date, startMinutes, durationMinutes) {
  const closedWeekdays = Array.isArray(staff.closedWeekdays) ? staff.closedWeekdays : []
  return isPhysicalStaff(staff)
    && !closedWeekdays.includes(weekdayForDate(date))
    && startMinutes >= Number(staff.workStartMinutes)
    && startMinutes + durationMinutes <= Number(staff.workEndMinutes)
}

function overlappingAppointments(appointments, startMinutes, durationMinutes) {
  return appointments.filter(appointment => rangesOverlap(
    startMinutes,
    durationMinutes,
    appointmentMinutes(appointment.scheduledAt),
    Number(appointment.durationMinutes || 60),
  ))
}

function startsWithinGap(appointments, startMinutes) {
  return appointments.filter(appointment => (
    Math.abs(appointmentMinutes(appointment.scheduledAt) - startMinutes) < MINIMUM_STAFF_START_GAP_MINUTES
  ))
}

function appointmentMatchesStaff(appointment, staff) {
  return normalizedStaffName(appointment.staffName) === normalizedStaffName(staff.staffName)
}

function isStaffOnBreak(breaks, staff, startMinutes, durationMinutes) {
  return (breaks || []).some(item =>
    (String(item.staffKey || '') === String(staff.staffKey || '')
      || normalizedStaffName(item.staffName) === normalizedStaffName(staff.staffName))
    && rangesOverlap(startMinutes, durationMinutes, Number(item.startMinutes), Number(item.durationMinutes)),
  )
}

function evaluateBookingSlot({
  staff,
  appointments,
  staffKey,
  date,
  startMinutes,
  durationMinutes,
  dailyCapacity,
  breaks = [],
}) {
  const workingStaff = staff
    .filter(member => isWorkingForRange(member, date, startMinutes, durationMinutes))
    .filter(member => !isStaffOnBreak(breaks, member, startMinutes, durationMinutes))
  const physicalCapacity = workingStaff.reduce(
    (total, member) => total + Math.max(1, Number(member.maxConcurrentAppointments) || 1),
    0,
  )
  const allOverlapping = overlappingAppointments(appointments, startMinutes, durationMinutes)
  const configuredCapacity = Number.isInteger(Number(dailyCapacity)) && Number(dailyCapacity) > 0
    ? Number(dailyCapacity)
    : physicalCapacity
  const effectiveCapacity = Math.min(configuredCapacity, physicalCapacity)
  const simultaneousStarts = startsWithinGap(appointments, startMinutes)

  if (physicalCapacity < 1 || allOverlapping.length >= effectiveCapacity) {
    return {
      available: false,
      reason: physicalCapacity < 1 ? 'no-working-staff' : 'store-capacity',
      physicalCapacity,
      effectiveCapacity,
      overlappingCount: allOverlapping.length,
    }
  }

  if (staffKey === 'free') {
    if (simultaneousStarts.length >= workingStaff.length) {
      return {
        available: false,
        reason: 'no-staff-start-capacity',
        physicalCapacity,
        effectiveCapacity,
        overlappingCount: allOverlapping.length,
        simultaneousStartCount: simultaneousStarts.length,
        simultaneousStartCapacity: workingStaff.length,
      }
    }
    return {
      available: true,
      reason: 'available',
      physicalCapacity,
      effectiveCapacity,
      overlappingCount: allOverlapping.length,
      simultaneousStartCount: simultaneousStarts.length,
      simultaneousStartCapacity: workingStaff.length,
    }
  }

  const selected = workingStaff.find(member => member.staffKey === staffKey)
  if (!selected) {
    return {
      available: false,
      reason: 'selected-staff-unavailable',
      physicalCapacity,
      effectiveCapacity,
      overlappingCount: allOverlapping.length,
    }
  }

  const selectedAppointments = appointments.filter(appointment => appointmentMatchesStaff(appointment, selected))
  const selectedStartConflicts = startsWithinGap(selectedAppointments, startMinutes)
  if (selectedStartConflicts.length > 0) {
    return {
      available: false,
      reason: 'selected-staff-start-gap',
      physicalCapacity,
      effectiveCapacity,
      overlappingCount: allOverlapping.length,
      selectedStartConflictCount: selectedStartConflicts.length,
      minimumStartGapMinutes: MINIMUM_STAFF_START_GAP_MINUTES,
    }
  }
  if (simultaneousStarts.length >= workingStaff.length) {
    return {
      available: false,
      reason: 'no-staff-start-capacity',
      physicalCapacity,
      effectiveCapacity,
      overlappingCount: allOverlapping.length,
      simultaneousStartCount: simultaneousStarts.length,
      simultaneousStartCapacity: workingStaff.length,
    }
  }

  const selectedOverlapping = allOverlapping.filter(appointment => appointmentMatchesStaff(appointment, selected))
  const selectedCapacity = Math.max(1, Number(selected.maxConcurrentAppointments) || 1)

  return {
    available: selectedOverlapping.length < selectedCapacity,
    reason: selectedOverlapping.length < selectedCapacity ? 'available' : 'selected-staff-capacity',
    physicalCapacity,
    effectiveCapacity,
    overlappingCount: allOverlapping.length,
    selectedOverlappingCount: selectedOverlapping.length,
    selectedCapacity,
  }
}

module.exports = {
  MINIMUM_STAFF_START_GAP_MINUTES,
  evaluateBookingSlot,
  isStaffOnBreak,
  isWorkingForRange,
  normalizedStaffName,
  weekdayForDate,
}
