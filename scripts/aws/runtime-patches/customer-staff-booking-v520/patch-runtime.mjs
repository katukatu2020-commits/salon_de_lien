import fs from 'node:fs'
import path from 'node:path'

const root = process.env.APP_ROOT || '/app'
const serverPath = path.join(root, 'server.js')
const tenantPath = path.join(root, 'tenant-setup.js')
const customerAppointmentsPagePath = path.join(root, '.next', 'server', 'app', 'u', '(account)', 'appointments', 'page.js')

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceExact(
  server,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Campaign-Image-Crop', 'v519')`,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Campaign-Image-Crop', 'v519')
      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Staff-Booking', 'v520')`,
  1,
  'customer staff booking readiness marker',
)
fs.writeFileSync(serverPath, server)

let tenant = fs.readFileSync(tenantPath, 'utf8')
tenant = replaceExact(
  tenant,
  `const { evaluateBookingSlot } = require('./booking-availability-v430')`,
  `const { evaluateBookingSlot } = require('./customer-staff-booking-v520')`,
  1,
  'shared booking policy import',
)
tenant = replaceExact(
  tenant,
  `    const rows = await prisma.$queryRawUnsafe('SELECT "staffKey","staffName","maxConcurrentAppointments","workStartMinutes","workEndMinutes","closedWeekdays" FROM "StaffBookingSetting" WHERE "organizationId"=$1 AND "active"=TRUE AND "onLeave"=FALSE ORDER BY "createdAt","staffName"', organizationId)
    const normalize = row => ({ ...row, closedWeekdays: [...new Set(String(row.closedWeekdays || '').split(',').filter(value => value.trim() !== '').map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))].sort((left, right) => left - right) })
    if (rows.length || organizationId !== LEGACY_ORGANIZATION_ID) return rows.map(normalize)`,
  `    const rows = await prisma.$queryRawUnsafe('SELECT "staffKey","staffName","maxConcurrentAppointments","workStartMinutes","workEndMinutes","closedWeekdays","active","onLeave" FROM "StaffBookingSetting" WHERE "organizationId"=$1 ORDER BY "createdAt","staffName"', organizationId)
    const normalize = row => ({ ...row, closedWeekdays: [...new Set(String(row.closedWeekdays || '').split(',').filter(value => value.trim() !== '').map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))].sort((left, right) => left - right) })
    const selectableRows = rows.filter(row => row.active === true && row.onLeave !== true)
    if (rows.length || organizationId !== LEGACY_ORGANIZATION_ID) return selectableRows.map(normalize)`,
  1,
  'staff rows distinguish an empty tenant from all staff being on leave',
)
tenant = replaceExact(
  tenant,
  `    const start = new Date(\`${'${month}'}-01T00:00:00+09:00\`)
    const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1)`,
  `    const [rangeYear, rangeMonth] = month.split('-').map(Number)
    const nextMonth = rangeMonth === 12 ? \`${'${rangeYear + 1}'}-01\` : \`${'${rangeYear}'}-${'${String(rangeMonth + 1).padStart(2, \'0\')}'}\`
    const start = new Date(\`${'${month}'}-01T00:00:00+09:00\`)
    const end = new Date(\`${'${nextMonth}'}-01T00:00:00+09:00\`)`,
  1,
  'customer availability includes the final day of each month',
)
tenant += '\n/* customer-staff-booking-v520 */\n'
fs.writeFileSync(tenantPath, tenant)

let customerAppointmentsPage = fs.readFileSync(customerAppointmentsPagePath, 'utf8')
customerAppointmentsPage = replaceExact(
  customerAppointmentsPage,
  `'SELECT "staffKey","staffName" FROM "StaffBookingSetting" WHERE "organizationId"=$1 ORDER BY "createdAt","staffName"'`,
  `'SELECT "staffKey","staffName","active","onLeave" FROM "StaffBookingSetting" WHERE "organizationId"=$1 ORDER BY "createdAt","staffName"'`,
  1,
  'customer booking staff query includes leave state',
)
customerAppointmentsPage = replaceExact(
  customerAppointmentsPage,
  `defaultStaffKey:r??"free"`,
  `defaultStaffKey:(tenantStaffRows.length===0&&e.organizationId==="org_salon_de_lien"?l.zj.some(e=>e.key===r):tenantStaffRows.some(e=>e.active===true&&e.onLeave!==true&&e.staffKey===r))?r:"free"`,
  1,
  'assigned staff falls back when unavailable',
)
customerAppointmentsPage = replaceExact(
  customerAppointmentsPage,
  `e.organizationId==="org_salon_de_lien"?l.zj:tenantStaffRows.map(e=>({key:e.staffKey,name:e.staffName,role:"\u30b9\u30bf\u30a4\u30ea\u30b9\u30c8"}))`,
  `tenantStaffRows.length===0&&e.organizationId==="org_salon_de_lien"?l.zj:tenantStaffRows.filter(e=>e.active===true&&e.onLeave!==true).map(e=>({key:e.staffKey,name:e.staffName,role:"\u30b9\u30bf\u30a4\u30ea\u30b9\u30c8"}))`,
  1,
  'customer booking candidate list excludes inactive and leave staff',
)
customerAppointmentsPage += '\n/* customer-staff-booking-v520 */\n'
fs.writeFileSync(customerAppointmentsPagePath, customerAppointmentsPage)

console.log(JSON.stringify({ release: 'customer-staff-booking-v520', patched: true }))
