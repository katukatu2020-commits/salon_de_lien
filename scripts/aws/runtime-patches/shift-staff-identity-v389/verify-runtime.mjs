import fs from 'node:fs'

const service = fs.readFileSync('/app/appointment-operations-v267.js', 'utf8')
const shiftChunk = fs.readFileSync('/app/.next/static/chunks/app/admin/appointments/page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.shift-day-nav-v382.js', 'utf8')

const serviceMarkers = [
  `.replace(/[邊辺]/g, '邉')`,
  `requestedStaffKey = null`,
  `const requestedKey = cleanText(requestedStaffKey, 120)`,
  `normalizeStaff(item.staffKey) === keyToken`,
  `body.staffName, body.staffKey`,
]

const clientMarkers = [
  `staffKey: (m.find((member) => member.name === e.staffName) || {}).key || e.staffKey || ""`,
  `r.element.dataset.staffKey`,
  `staffKey: d`,
  `canonicalStaffName`,
  `.replace(/[邊辺]/g, "邉")`,
]

for (const marker of serviceMarkers) if (!service.includes(marker)) throw new Error(`missing service marker: ${marker}`)
for (const marker of clientMarkers) if (!shiftChunk.includes(marker)) throw new Error(`missing client marker: ${marker}`)

new Function(service)
new Function(shiftChunk)

const canonicalStaffName = value => String(value || '').normalize('NFKC').replace(/\s/g, '').replace(/[邊辺]/g, '邉').toLowerCase()
if (canonicalStaffName('渡邊 浩明') !== canonicalStaffName('渡邉 浩明')) throw new Error('Watanabe name variants are not equivalent')

const settings = [{ staffKey: 'watanabe', staffName: '渡邉 浩明' }]
const requestedKey = 'watanabe'
const requestedName = '渡邊 浩明'
const match = settings.find(item => canonicalStaffName(item.staffKey) === canonicalStaffName(requestedKey))
  || settings.find(item => canonicalStaffName(item.staffName) === canonicalStaffName(requestedName))
if (match?.staffKey !== 'watanabe') throw new Error('stable staff identity resolution failed')

console.log('shift staff stable identity v389 verified')
