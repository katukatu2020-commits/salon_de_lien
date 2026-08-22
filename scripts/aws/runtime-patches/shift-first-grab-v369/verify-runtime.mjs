import fs from 'node:fs'

const chunk = '/app/.next/static/chunks/app/admin/appointments/page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.shift-first-grab-v369.js'
const source = fs.readFileSync(chunk, 'utf8')

const required = [
  'e.preventDefault();',
  'r.setPointerCapture(e.pointerId)',
  '(1 & Number(e.buttons || 0)) !== 0',
  '(1 & Number(a.buttons || 0)) !== 0',
  'Number(e.pressure || a.pressure || 0) > 0',
  'Math.hypot(i, o) <= 3',
]

for (const marker of required) {
  if (!source.includes(marker)) throw new Error(`missing first-grab marker: ${marker}`)
}

if (source.includes('(1 & a.buttons) == 0')) {
  throw new Error('unreliable coalesced-event-only button check remains')
}

new Function(source)
console.log('shift first-grab runtime verified')
