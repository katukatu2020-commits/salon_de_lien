import fs from 'node:fs'

const server = fs.readFileSync('/app/server.js', 'utf8')
const commercial = fs.readFileSync('/app/commercial-admin-v101.js', 'utf8')
const service = fs.readFileSync('/app/attendance-multi-shift-v349.js', 'utf8')
const required = [
  [server, "require('./attendance-multi-shift-v349')", 'v349 service import'],
  [commercial, '__lienAttendanceProductV349', 'v349 client'],
  [commercial, 'cleanupAttendancePage', 'route cleanup'],
  [commercial, '実働合計', 'work total UI'],
  [service, 'StaffAttendanceRecord_org_staff_date_idx', 'non-unique daily index'],
  [service, '"breakSeconds"="breakSeconds"+', 'break accumulator'],
  [service, 'summaries', 'daily summaries'],
]
for (const [source, marker, label] of required) if (!source.includes(marker)) throw new Error(`${label} missing`)
for (const forbidden of ['__lienAttendanceProductV320', 'StaffAttendanceRecord_org_staff_date_key" ON']) {
  if (commercial.includes(forbidden)) throw new Error(`stale client marker remains: ${forbidden}`)
}
if (service.includes('CREATE UNIQUE INDEX IF NOT EXISTS "StaffAttendanceRecord_org_staff_date_key"')) throw new Error('daily unique index remains')
console.log('attendance multi-shift v349 runtime verification passed')
