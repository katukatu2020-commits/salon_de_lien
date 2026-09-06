import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const commercial = fs.readFileSync(path.join(root, 'commercial-admin-v101.js'), 'utf8')
const service = fs.readFileSync(path.join(root, 'customer-appointment-history-v565.js'), 'utf8')

assert.match(server, /createCustomerAppointmentHistoryService/)
assert.match(server, /customerAppointmentHistory\.ensureSchema/)
assert.match(server, /customerAppointmentHistory\.handle/)
assert.match(server, /X-Lien-Customer-Appointment-History', 'v565'/)
assert.match(server, /X-Lien-Customer-Chart-Attachments', 'v564'/)
assert.ok(server.indexOf('customerAppointmentHistory.handle') < server.indexOf('customerChartAttachments.handle'))
assert.match(commercial, /__lienCustomerAppointmentHistoryV565/)
assert.match(commercial, /現在の予約/)
assert.match(commercial, /施術メモ/)
assert.match(commercial, /data-treatment-memo-v565/)
assert.match(commercial, /historyApi\(customerId\)\}\/memo/)
assert.match(service, /CREATE TABLE IF NOT EXISTS "CustomerHistoryMemo"/)
assert.match(service, /APPOINTMENT:/)
assert.match(service, /VISIT:/)
assert.match(service, /SALE:/)
assert.match(service, /ON CONFLICT \("organizationId","subjectKey"\)/)
assert.match(service, /\['ADMIN', 'STAFF'\]/)
assert.match(service, /sameOrigin\(req\)/)

console.log(JSON.stringify({ release:'customer-appointment-history-memos-v565', verified:true }))
