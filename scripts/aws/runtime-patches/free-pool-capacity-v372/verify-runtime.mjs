import fs from 'node:fs'

function includes(file, markers) {
  const source = fs.readFileSync(file, 'utf8')
  for (const marker of markers) {
    if (!source.includes(marker)) throw new Error(`${file}: missing ${marker}`)
  }
  return source
}

includes('/app/tenant-setup.js', [
  'function workingPhysicalCapacity',
  'const physicalCapacity = workingPhysicalCapacity',
  'const effectiveCapacity = Math.min',
  'physicalCapacity > 0 && overlappingCount < effectiveCapacity',
])

includes('/app/appointment-operations-v267.js', [
  'async function workingStaffForSlot',
  'この時間の残り受付数が0です。別の時間を選んでください。',
  'if (staff.staffKey !== \'free\')',
])

const server = includes('/app/.next/server/app/admin/appointments/page.js', [
  '"active"=TRUE AND "onLeave"=FALSE',
  'isVirtualFree: true',
  'remaining: null === o ? a : Math.min(a, o)',
])
new Function(server)

const chunk = includes('/app/.next/static/chunks/app/admin/appointments/page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.free-pool-v372.js', [
  '__shiftWeekday',
  '!r.isVirtualFree',
  'remaining: null === o ? a : Math.min(a, o)',
])
new Function(chunk)

for (const manifest of [
  '/app/.next/app-build-manifest.json',
  '/app/.next/server/app/admin/appointments/page_client-reference-manifest.js',
]) {
  includes(manifest, ['free-pool-v372.js'])
}

console.log('free pool physical capacity v372 verified')
