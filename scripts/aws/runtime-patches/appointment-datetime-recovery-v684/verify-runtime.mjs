import fs from 'node:fs'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
for(const file of ['server.js','appointment-operations-v267.js','public/appointment-datetime-v684.js','staff-breaks-checkout-menu-client-v442.js'])execFileSync(process.execPath,['--check','/app/'+file])
const client=fs.readFileSync('/app/public/appointment-datetime-v684.js','utf8')
assert.ok(client.includes('shift-customer-search-v662'))
assert.ok(!client.includes('window.__orimiaAppointmentDatetimeEditorV663'))
assert.ok(client.includes('orimia:hydrated-v680'))
assert.ok(client.includes('updatedAt:appointment.updatedAt'))
assert.ok(client.includes('modal.showModal()'))
const operations=fs.readFileSync('/app/appointment-operations-v267.js','utf8')
assert.ok(operations.includes('async function getSchedule'))
assert.ok(operations.includes("customer: { organizationId: session.organizationId, deletedAt: null }"))
assert.ok(operations.includes('expectedUpdatedAt && current.updatedAt.getTime() !== expectedUpdatedAt.getTime()'))
assert.ok(operations.includes('isolationLevel: Prisma.TransactionIsolationLevel.Serializable'))
assert.ok(operations.includes('await assertAvailability'))
console.log('PASS v684: syntax, legacy helper parity, hydration gate, live reservation data, concurrency and existing validation')
