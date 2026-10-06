import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
const read = file => fs.readFileSync('/app/' + file, 'utf8')
for (const file of ['staff-work-calendar-v704.cjs', 'server.js', 'tenant-setup.js', 'appointment-operations-v267.js', 'line-reservations-v436.js', 'commercial-admin-v101.js', '.next/server/app/admin/appointments/page.js']) execFileSync('node', ['--check', '/app/' + file])
assert.ok(read('server.js').includes('await staffWorkCalendarV704.ensureSchema()'))
assert.ok(read('server.js').includes('await staffWorkCalendarV704.handle(req, res, url)'))
assert.ok(read('commercial-admin-v101.js').includes('work-calendar-v704'))
assert.ok(read('tenant-setup.js').includes('staff: currentStaffV704'))
assert.ok(read('tenant-setup.js').includes('workCalendarV704.lock(transaction, session.organizationId, date)'))
assert.ok(read('appointment-operations-v267.js').includes('workCalendarV704.lock(db, organizationId, date)'))
assert.ok(read('line-reservations-v436.js').includes('workCalendarV704.lock(tx, connection.organizationId, date)'))
assert.ok(read('.next/server/app/admin/appointments/page.js').includes('rowsForDate(v._, x.organizationId, P || N + "-01")'))
assert.equal(read('staff-work-calendar-v704.sql'), fs.readFileSync('/tmp/lien-v704/schedule.sql', 'utf8').replace(/\r\n/g, '\n'))
execFileSync('node', ['/tmp/lien-v704/runtime-tests.cjs'], { stdio: 'inherit' })
console.log('PASS v704 runtime: shared date resolver, transaction locks, authenticated calendar, atomic schedule and existing shift props')
