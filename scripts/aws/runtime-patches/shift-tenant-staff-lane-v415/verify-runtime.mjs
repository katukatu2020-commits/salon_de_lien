import fs from 'node:fs'
import vm from 'node:vm'

const pagePath = '/app/.next/server/app/admin/appointments/page.js'
const shiftChunkPath = '/app/.next/static/chunks/app/admin/appointments/page-shift-staff-drop-v394.js'
const page = fs.readFileSync(pagePath, 'utf8')
const shiftChunk = fs.readFileSync(shiftChunkPath, 'utf8')

for (const marker of [
  'canonicalStaffName = (value)',
  '.replace(/[邊辺]/g, "邉")',
  'matchedStaff = G.find((entry) => canonicalStaffName(entry.name) === canonicalStaffName(t))',
  'staffKey: matchedStaff?.key ?? w.jb.key',
  'staffName: r',
]) {
  if (!page.includes(marker)) throw new Error(`missing appointment page marker: ${marker}`)
}

if (page.includes('G.some((entry) => entry.name === t)')) {
  throw new Error('exact-name-only lane assignment remains')
}
if (!shiftChunk.includes('canonicalStaffName')) {
  throw new Error('client lane canonicalization was not preserved')
}
if (!shiftChunk.includes('staffKey: e.staffKey ||')) {
  throw new Error('client stable staff key handling was not preserved')
}

new vm.Script(page)
new vm.Script(shiftChunk)

const canonicalStaffName = value => String(value || '')
  .normalize('NFKC')
  .replace(/\s/g, '')
  .replace(/[邊辺]/g, '邉')
  .toLowerCase()
const resolveLane = (requestedName, staff) =>
  staff.find(member => canonicalStaffName(member.name) === canonicalStaffName(requestedName)) ?? null

const salonStaff = [
  { key: 'watanabe', name: '渡邉 浩明' },
  { key: 'free', name: 'フリー' },
]
if (resolveLane('渡邊　浩明', salonStaff)?.key !== 'watanabe') {
  throw new Error('Watanabe character and spacing variants do not resolve')
}

const anotherStoreStaff = [
  { key: 'stylist-custom-1', name: '雨宮 透' },
  { key: 'free', name: 'フリー' },
]
if (resolveLane('雨宮　透', anotherStoreStaff)?.key !== 'stylist-custom-1') {
  throw new Error('tenant-specific staff does not resolve')
}
if (resolveLane('別店舗のスタッフ', anotherStoreStaff) !== null) {
  throw new Error('unknown staff must not be assigned to another tenant lane')
}

console.log('shift tenant staff lane v415 runtime verified')
