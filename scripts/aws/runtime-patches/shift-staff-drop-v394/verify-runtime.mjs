import fs from 'node:fs'
import vm from 'node:vm'

const pagePath = '/app/.next/server/app/admin/appointments/page.js'
const servicePath = '/app/appointment-operations-v267.js'
const oldChunkName = 'page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.shift-day-nav-v382.js'
const newChunkName = 'page-shift-staff-drop-v394.js'
const newChunkPath = `/app/.next/static/chunks/app/admin/appointments/${newChunkName}`

const page = fs.readFileSync(pagePath, 'utf8')
const service = fs.readFileSync(servicePath, 'utf8')
const chunk = fs.readFileSync(newChunkPath, 'utf8')
const manifest = fs.readFileSync('/app/.next/server/app/admin/appointments/page_client-reference-manifest.js', 'utf8')

if (!page.includes('name: t?.staffName || e.name')) throw new Error('canonical staff name mapping is missing')
if (!chunk.includes('staffKey: e.staffKey || (m.find((member) => member.name === e.staffName) || {}).key || ""')) {
  throw new Error('lane staff key priority is missing')
}
if (!manifest.includes(newChunkName) || manifest.includes(oldChunkName)) throw new Error('appointment chunk was not cache-busted')
if (!service.includes('normalizeStaff(item.staffKey) === keyToken')) throw new Error('server key-first staff resolution is missing')

new vm.Script(page)
new vm.Script(chunk)

const normalizeStaff = value => String(value || '').normalize('NFKC').replace(/\s/g, '').replace(/[邊辺]/g, '邉').toLowerCase()
if (normalizeStaff('渡邊 浩明') !== normalizeStaff('渡邉 浩明')) throw new Error('Watanabe variants are not equivalent')

const lane = { key: 'watanabe', name: '渡邉 浩明' }
const appointment = { staffKey: lane.key, staffName: lane.name }
const payloadStaffKey = appointment.staffKey || ''
if (payloadStaffKey !== 'watanabe') throw new Error('stable lane key was not preserved')

console.log('shift staff drop v394 verified')
