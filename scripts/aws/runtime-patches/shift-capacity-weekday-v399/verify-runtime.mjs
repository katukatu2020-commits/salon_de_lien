import fs from 'node:fs'

const pagePath = '/app/.next/server/app/admin/appointments/page.js'
const page = fs.readFileSync(pagePath, 'utf8')
const fixedFragment = `.split(',').filter(value => value.trim() !== '').map(Number).filter(Number.isInteger)`

if (page.includes(`.split(',').map(Number).filter(Number.isInteger)`)) {
  throw new Error('empty closed weekdays can still be converted to Sunday')
}

if (page.split(fixedFragment).length - 1 !== 2) {
  throw new Error('staff weekday normalization was not applied to both staff mapping paths')
}

function parseClosedWeekdays(value) {
  return String(value || '')
    .split(',')
    .filter((entry) => entry.trim() !== '')
    .map(Number)
    .filter(Number.isInteger)
}

function remainingCapacity({ staff, appointments, weekday, slotStart, slotEnd }) {
  const capacity = staff.reduce((sum, member) => {
    const closedWeekdays = parseClosedWeekdays(member.closedWeekdays)
    const isWorking =
      member.active !== false &&
      member.onLeave !== true &&
      member.staffKey !== 'free' &&
      member.staffName !== 'フリー' &&
      !closedWeekdays.includes(weekday) &&
      member.workStartMinutes < slotEnd &&
      slotStart < member.workEndMinutes
    return sum + (isWorking ? Math.max(1, Number(member.maxConcurrentAppointments) || 1) : 0)
  }, 0)
  const booked = appointments.filter(
    (appointment) =>
      appointment.status !== 'キャンセル' &&
      appointment.startMinutes < slotEnd &&
      slotStart < appointment.startMinutes + appointment.durationMinutes,
  ).length
  return Math.max(0, capacity - booked)
}

const staff = [
  { staffKey: 'amemiya', staffName: '雨宮 透', maxConcurrentAppointments: 2, workStartMinutes: 480, workEndMinutes: 1140, closedWeekdays: '' },
  { staffKey: 'takase', staffName: '高瀬 美月', maxConcurrentAppointments: 1, workStartMinutes: 480, workEndMinutes: 1140, closedWeekdays: '0' },
  { staffKey: 'manabe', staffName: '真鍋 蓮', maxConcurrentAppointments: 1, workStartMinutes: 480, workEndMinutes: 1140, closedWeekdays: '2,3' },
  { staffKey: 'shiraishi', staffName: '白石 直子', maxConcurrentAppointments: 1, workStartMinutes: 480, workEndMinutes: 1140, closedWeekdays: '' },
  { staffKey: 'free', staffName: 'フリー', maxConcurrentAppointments: 1, workStartMinutes: 480, workEndMinutes: 1140, closedWeekdays: '' },
]

if (parseClosedWeekdays('').length !== 0) {
  throw new Error('an empty day-off setting must mean no weekly day off')
}

if (remainingCapacity({ staff, appointments: [], weekday: 0, slotStart: 480, slotEnd: 510 }) !== 4) {
  throw new Error('Sunday capacity must sum working physical staff: 2 + 1 + 1 = 4')
}

if (
  remainingCapacity({
    staff,
    appointments: [
      { startMinutes: 480, durationMinutes: 60, status: '予約確定' },
      { startMinutes: 480, durationMinutes: 60, status: 'キャンセル' },
    ],
    weekday: 0,
    slotStart: 480,
    slotEnd: 510,
  }) !== 3
) {
  throw new Error('remaining capacity must subtract active overlapping reservations only')
}

console.log('shift capacity weekday v399 verified')
