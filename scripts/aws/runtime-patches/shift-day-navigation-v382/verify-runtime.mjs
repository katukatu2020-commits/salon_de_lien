import fs from 'node:fs'

function includes(file, markers) {
  const source = fs.readFileSync(file, 'utf8')
  for (const marker of markers) {
    if (!source.includes(marker)) throw new Error(`${file}: missing ${marker}`)
  }
  return source
}

const markers = [
  'data-shift-day-nav',
  '前日のシフト表へ',
  '翌日のシフト表へ',
  'day.slice(0, 7)',
  '#staff-schedule',
  'focus-visible:ring-[color:var(--lien-primary)]',
]

const server = includes('/app/.next/server/app/admin/appointments/page.js', markers)
new Function(server)

const chunkPath = '/app/.next/static/chunks/app/admin/appointments/page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.shift-day-nav-v382.js'
const chunk = includes(chunkPath, markers)
new Function(chunk)

for (const manifest of [
  '/app/.next/app-build-manifest.json',
  '/app/.next/server/app/admin/appointments/page_client-reference-manifest.js',
]) {
  const source = includes(manifest, ['shift-day-nav-v382.js'])
  if (source.includes('free-pool-v372.js')) throw new Error(`${manifest}: old shift chunk reference remains`)
}

console.log('shift day navigation v382 verified')
