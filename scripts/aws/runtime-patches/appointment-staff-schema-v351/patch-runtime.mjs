import fs from 'node:fs'

const file = '/app/appointment-operations-v267.js'
let source = fs.readFileSync(file, 'utf8')
const before = `    let settings = await db.staffBookingSetting.findMany({
      where: { organizationId, active: true, onLeave: false },
      select: { staffKey: true, staffName: true, maxConcurrentAppointments: true, workStartMinutes: true, workEndMinutes: true },
    })`
const after = `    let settings = await db.$queryRawUnsafe(
      'SELECT "staffKey","staffName","maxConcurrentAppointments","workStartMinutes","workEndMinutes" FROM "StaffBookingSetting" WHERE "organizationId"=$1 AND "active"=TRUE AND "onLeave"=FALSE ORDER BY "createdAt","staffName"',
      organizationId,
    ) /* appointment-staff-schema-v351 */`
const matches = source.split(before).length - 1
if (matches !== 1) throw new Error(`appointment staff lookup: expected one match, found ${matches}`)
source = source.replace(before, after)
fs.writeFileSync(file, source)
