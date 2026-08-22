import fs from 'node:fs'

const staffServicePath = '/app/customer-store-staff-v276.js'
const tenantServicePath = '/app/tenant-setup.js'
const tenantClientPath = '/app/tenant-setup-client.js'
const shiftChunkPath = '/app/.next/static/chunks/app/admin/appointments/page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.shift-day-nav-v382.js'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

let staffService = fs.readFileSync(staffServicePath, 'utf8')
staffService = replaceOnce(
  staffService,
  `closedWeekdays: [...new Set(String(row.closedWeekdays || '').split(',').map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))].sort((left, right) => left - right),`,
  `closedWeekdays: [...new Set(String(row.closedWeekdays || '').split(',').filter(value => value.trim() !== '').map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))].sort((left, right) => left - right),`,
  'staff directory empty weekday normalization',
)
staffService = replaceOnce(
  staffService,
  `    const source = Array.isArray(value) ? value : String(value || '').split(',')
    return [...new Set(source.map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))].sort((left, right) => left - right).join(',')`,
  `    const source = (Array.isArray(value) ? value : String(value || '').split(',')).filter(item => String(item).trim() !== '')
    return [...new Set(source.map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))].sort((left, right) => left - right).join(',')`,
  'staff management empty weekday normalization',
)
fs.writeFileSync(staffServicePath, staffService)

let tenantService = fs.readFileSync(tenantServicePath, 'utf8')
tenantService = replaceOnce(
  tenantService,
  `    const normalize = row => ({ ...row, closedWeekdays: [...new Set(String(row.closedWeekdays || '').split(',').map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))].sort((left, right) => left - right) })`,
  `    const normalize = row => ({ ...row, closedWeekdays: [...new Set(String(row.closedWeekdays || '').split(',').filter(value => value.trim() !== '').map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))].sort((left, right) => left - right) })`,
  'tenant staff empty weekday normalization',
)
fs.writeFileSync(tenantServicePath, tenantService)

let tenantClient = fs.readFileSync(tenantClientPath, 'utf8')
tenantClient = replaceOnce(
  tenantClient,
  `    const byName = new Map(state.setup.staff.map(staff => [String(staff.staffName || staff.name || '').replace(/\\s/g, ''), staff]))
    document.querySelectorAll('.shift-lane').forEach(lane => {
      const staff = byName.get(String(lane.dataset.staffName || '').replace(/\\s/g, ''))`,
  `    const byKey = new Map(state.setup.staff.map(staff => [String(staff.staffKey || staff.key || ''), staff]).filter(([key]) => key))
    const byName = new Map()
    state.setup.staff.forEach(staff => {
      const name = String(staff.staffName || staff.name || '').replace(/\\s/g, '')
      if (!name) return
      byName.set(name, byName.has(name) ? null : staff)
    })
    document.querySelectorAll('.shift-lane').forEach(lane => {
      const staffKey = String(lane.dataset.staffKey || '')
      const staff = staffKey ? byKey.get(staffKey) : byName.get(String(lane.dataset.staffName || '').replace(/\\s/g, ''))`,
  'shift recurring days off stable staff identity',
)
fs.writeFileSync(tenantClientPath, tenantClient)

let shiftChunk = fs.readFileSync(shiftChunkPath, 'utf8')
shiftChunk = replaceOnce(
  shiftChunk,
  `                            "data-staff-name": e.name,
                            style: { height: l },`,
  `                            "data-staff-name": e.name,
                            "data-staff-key": e.key,
                            style: { height: l },`,
  'shift lane stable staff key',
)
fs.writeFileSync(shiftChunkPath, shiftChunk)

