import fs from 'node:fs'

const servicePath = '/app/appointment-operations-v267.js'
let service = fs.readFileSync(servicePath, 'utf8')

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

service = replaceOnce(
  service,
  `closedWeekdays: [...new Set(String(row.closedWeekdays || '').split(',').map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))],`,
  `closedWeekdays: [...new Set(String(row.closedWeekdays || '').split(',').filter(value => value.trim() !== '').map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))],`,
  'resolved staff empty weekday normalization',
)

service = replaceOnce(
  service,
  `const closed = String(row.closedWeekdays || '').split(',').map(Number)`,
  `const closed = String(row.closedWeekdays || '').split(',').filter(value => value.trim() !== '').map(Number)`,
  'working staff empty weekday normalization',
)

fs.writeFileSync(servicePath, service)
