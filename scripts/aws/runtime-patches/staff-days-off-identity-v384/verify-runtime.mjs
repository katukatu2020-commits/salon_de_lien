import fs from 'node:fs'

const staffServicePath = '/app/customer-store-staff-v276.js'
const tenantServicePath = '/app/tenant-setup.js'
const tenantClientPath = '/app/tenant-setup-client.js'
const shiftChunkPath = '/app/.next/static/chunks/app/admin/appointments/page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.shift-day-nav-v382.js'

const staffService = fs.readFileSync(staffServicePath, 'utf8')
for (const marker of [
  `.split(',').filter(value => value.trim() !== '').map(Number)`,
  `.filter(item => String(item).trim() !== '')`,
  `WHERE "organizationId"=$6 AND "staffKey"=$7`,
]) {
  if (!staffService.includes(marker)) throw new Error(`staff management marker is missing: ${marker}`)
}
if (staffService.includes(`String(row.closedWeekdays || '').split(',').map(Number)`)) throw new Error('staff directory still maps an empty value to Sunday')

const tenantService = fs.readFileSync(tenantServicePath, 'utf8')
if (!tenantService.includes(`String(row.closedWeekdays || '').split(',').filter(value => value.trim() !== '').map(Number)`)) throw new Error('tenant staff normalization does not preserve an empty weekday selection')
if (tenantService.includes(`String(row.closedWeekdays || '').split(',').map(Number)`)) throw new Error('tenant staff normalization still maps an empty value to Sunday')

const tenantClient = fs.readFileSync(tenantClientPath, 'utf8')
for (const marker of [
  `const byKey = new Map(state.setup.staff.map(staff => [String(staff.staffKey || staff.key || ''), staff])`,
  `const staffKey = String(lane.dataset.staffKey || '')`,
  `const staff = staffKey ? byKey.get(staffKey) : byName.get(`,
  `byName.set(name, byName.has(name) ? null : staff)`,
]) {
  if (!tenantClient.includes(marker)) throw new Error(`tenant client identity marker is missing: ${marker}`)
}
new Function(tenantClient)

const shiftChunk = fs.readFileSync(shiftChunkPath, 'utf8')
if (!shiftChunk.includes(`"data-staff-key": e.key`)) throw new Error('shift lane does not expose the stable staff key')
new Function(shiftChunk)

const normalizeWeekdays = value => [...new Set(String(value || '').split(',').filter(item => item.trim() !== '').map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))].sort((left, right) => left - right)
if (JSON.stringify(normalizeWeekdays('')) !== '[]') throw new Error('empty weekday regression: Sunday must not be selected')
if (JSON.stringify(normalizeWeekdays('0,2,2')) !== '[0,2]') throw new Error('explicit weekday normalization regression')

const staffRows = [
  { staffKey: 'tanizaki', staffName: '谷崎 太二', closedWeekdays: [1] },
  { staffKey: 'watanabe', staffName: '渡邉 浩明', closedWeekdays: [] },
]
const byKey = new Map(staffRows.map(staff => [staff.staffKey, staff]))
if (byKey.get('tanizaki')?.staffName !== '谷崎 太二') throw new Error('Tanizaki identity regression')
if (byKey.get('watanabe')?.closedWeekdays.length !== 0) throw new Error('Watanabe identity regression')
if (byKey.get('watanabe')?.staffName === '渡邊 浩明') throw new Error('identity test must retain the real-world name variant')

console.log('staff days off identity v384 verified')
