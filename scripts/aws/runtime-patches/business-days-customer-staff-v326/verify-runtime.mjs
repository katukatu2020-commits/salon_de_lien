import fs from 'node:fs'

function assertIncludes(file, needles) {
  const source = fs.readFileSync(file, 'utf8')
  for (const needle of needles) {
    if (!source.includes(needle)) throw new Error(`${file}: missing ${needle}`)
  }
}

assertIncludes('/app/tenant-setup.js', [
  'const requestedDays = Array.isArray(input.days) ? input.days : [input]',
  'await prisma.$transaction(async database =>',
  'count: normalizedDays.length',
])

assertIncludes('/app/tenant-setup-client.js', [
  'function saveBusinessDays(root)',
  'data-save-all',
  "state.dailyScheduleDate = ''",
  '複数の日を続けて変更し、最後に一度だけまとめて保存できます。',
])

const client = fs.readFileSync('/app/tenant-setup-client.js', 'utf8')
if (client.includes('data-save>保存')) throw new Error('per-day save button remains')

assertIncludes('/app/.next/server/chunks/3491.js', [
  'appointments:{orderBy:{scheduledAt:"desc"},take:20}',
  '前回担当:',
])

const patchedHelpers = fs.readdirSync('/app/.next/server/chunks')
  .filter((name) => name.endsWith('.js'))
  .map((name) => fs.readFileSync('/app/.next/server/chunks/' + name, 'utf8'))
  .filter((source) => source.includes('前回担当:'))
if (!patchedHelpers.length) throw new Error('customer attendant helper output was not patched')

assertIncludes('/app/.next/server/app/admin/customers/messages/page.js', [
  '"data-recipient-staff"',
  'scheduledAt: { lte: new Date() }',
])

assertIncludes('/app/public/broadcast-recipient-modal.js', [
  '前回担当者で絞り込み',
  'function applyFilters()',
  'broadcast-recipient-staff',
])

console.log('business-days-customer-staff-v326 verification passed')
