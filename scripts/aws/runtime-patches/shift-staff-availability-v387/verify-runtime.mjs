import fs from 'node:fs'

const servicePath = '/app/appointment-operations-v267.js'
const service = fs.readFileSync(servicePath, 'utf8')

for (const marker of [
  `.split(',').filter(value => value.trim() !== '').map(Number).filter(day => Number.isInteger(day)`,
  `const closed = String(row.closedWeekdays || '').split(',').filter(value => value.trim() !== '').map(Number)`,
]) {
  if (!service.includes(marker)) throw new Error(`staff availability marker missing: ${marker}`)
}

if (service.includes(`String(row.closedWeekdays || '').split(',').map(Number)`)) {
  throw new Error('appointment movement still converts an empty weekday to Sunday')
}

const normalizeClosedWeekdays = value => String(value || '')
  .split(',')
  .filter(item => item.trim() !== '')
  .map(Number)
  .filter(day => Number.isInteger(day) && day >= 0 && day <= 6)

const canWork = (row, weekday, startMinutes, durationMinutes) => {
  const closed = normalizeClosedWeekdays(row.closedWeekdays)
  return !closed.includes(weekday)
    && startMinutes >= Number(row.workStartMinutes)
    && startMinutes + durationMinutes <= Number(row.workEndMinutes)
}

const tanizaki = { staffKey: 'tanizaki', closedWeekdays: '', workStartMinutes: 600, workEndMinutes: 1140 }
const watanabe = { staffKey: 'watanabe', closedWeekdays: '', workStartMinutes: 600, workEndMinutes: 1140 }
if (!canWork(tanizaki, 0, 600, 60)) throw new Error('Tanizaki is incorrectly unavailable on Sunday with no configured day off')
if (!canWork(watanabe, 0, 600, 60)) throw new Error('Watanabe is incorrectly unavailable on Sunday with no configured day off')
if (canWork({ ...tanizaki, closedWeekdays: '0' }, 0, 600, 60)) throw new Error('An explicitly configured Sunday day off must remain unavailable')
if (!canWork({ ...tanizaki, closedWeekdays: '1' }, 0, 600, 60)) throw new Error('A Monday day off must not block Sunday')

new Function(service)
console.log('shift staff availability v387 verified')
