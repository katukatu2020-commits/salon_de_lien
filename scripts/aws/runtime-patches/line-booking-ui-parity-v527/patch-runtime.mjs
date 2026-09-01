import fs from 'node:fs'
import path from 'node:path'

const root = process.env.APP_ROOT || '/app'
const serverPath = path.join(root, 'server.js')
const linePath = path.join(root, 'line-reservations-v436.js')
const releaseDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, match => match.slice(1)))
const marker = 'line-booking-ui-parity-v527'

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

for (const fileName of ['line-booking-page-v527.js', 'line-booking-page-v527.html']) {
  fs.copyFileSync(path.join(releaseDir, fileName), path.join(root, fileName))
}

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceExact(
  server,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Shift-Grid-Synchronization', 'v526')`,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Shift-Grid-Synchronization', 'v526')
      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Line-Booking-UI-Parity', 'v527')`,
  1,
  'LINE booking UI readiness marker',
)
fs.writeFileSync(serverPath, server)

let line = fs.readFileSync(linePath, 'utf8')
if (line.includes(marker)) throw new Error(`${marker}: patch already applied`)

line = replaceExact(
  line,
  `store: { code: connection.publicCode || connection.slug, name: data.organization.name, closedWeekdays: data.organization.closedWeekdays },`,
  `store: { code: connection.publicCode || connection.slug, name: data.organization.name, openMinutes: data.organization.openMinutes, closeMinutes: data.organization.closeMinutes, closedWeekdays: data.organization.closedWeekdays },`,
  1,
  'LINE booking store hours payload',
)

line = replaceExact(
  line,
  `    const date = validateDateKey(url.searchParams.get('date'))`,
  `    const requestedWeekStart = url.searchParams.get('weekStart')
    const date = validateDateKey(requestedWeekStart || url.searchParams.get('date'))`,
  1,
  'LINE booking weekly availability input',
)
line = replaceExact(
  line,
  `    const maxDate = tokyoDateKey(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000))
    const located = shouldFindNext`,
  `    const maxDate = tokyoDateKey(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000))
    if (requestedWeekStart) {
      const dates = Array.from({ length: 7 }, (_, offset) => addDaysToDateKey(date, offset))
      const days = await Promise.all(dates.map(async candidateDate => {
        if (candidateDate > maxDate) return { date: candidateDate, slots: [] }
        const result = await availability(connection, candidateDate, menuId, staffKey, prisma, bookingData)
        return { date: candidateDate, slots: result.slots }
      }))
      sendJson(res, 200, { weekStart: date, maximumDate: maxDate, days })
      return
    }
    const located = shouldFindNext`,
  1,
  'LINE booking weekly availability response',
)

const functionStart = line.indexOf('  function liffPage(connection) {')
const functionEnd = line.indexOf('  async function bookingPage(req, res, url) {', functionStart)
if (functionStart < 0 || functionEnd < 0 || functionEnd <= functionStart) {
  throw new Error('LINE booking page function boundaries were not found')
}
const replacement = `  function liffPage(connection) { /* ${marker} */
    return require('./line-booking-page-v527').createLineReservationPageV527({ connection, crypto, escapeHtml })
  }

`
line = line.slice(0, functionStart) + replacement + line.slice(functionEnd)
line += `\n/* ${marker} */\n`
fs.writeFileSync(linePath, line)

console.log(JSON.stringify({ release: marker, patched: true }))
