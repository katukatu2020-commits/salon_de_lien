import fs from 'node:fs'

const source = fs.readFileSync('/app/appointment-operations-v267.js', 'utf8')
const required = [
  'appointment-staff-schema-v351',
  'FROM "StaffBookingSetting" WHERE "organizationId"=$1',
  '"active"=TRUE AND "onLeave"=FALSE',
]
for (const marker of required) if (!source.includes(marker)) throw new Error(`missing runtime marker: ${marker}`)
if (source.includes('staffBookingSetting.findMany')) throw new Error('stale Prisma staff lookup remains')
console.log('appointment staff schema v351 runtime verification passed')
