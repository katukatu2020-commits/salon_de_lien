import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const commercial = fs.readFileSync(path.join(root, 'commercial-admin-v101.js'), 'utf8')
const service = fs.readFileSync(path.join(root, 'customer-chart-attachments-v564.js'), 'utf8')

assert.match(server, /createCustomerChartAttachmentsService/)
assert.match(server, /X-Lien-Customer-Chart-Attachments', 'v564'/)
assert.ok(server.indexOf('customerChartAttachments.handle') < server.indexOf('salonOperations.handle'), 'attachment route must precede the legacy chart route')
assert.match(server, /X-Lien-Daily-Sales-Print-Fit', 'v563'/)
assert.match(commercial, /__lienCustomerChartAttachmentsV564/)
assert.match(commercial, /input\.matches\('\[data-chart-file\]'\)/)
assert.match(commercial, /application\/pdf/)
assert.match(commercial, /カルテファイル/)
assert.match(commercial, /downloadUrl/)
assert.doesNotMatch(commercial.slice(commercial.lastIndexOf(';(() => {', commercial.indexOf('salon-records-controls-v561-customer-chart')), commercial.indexOf('salon-records-controls-v561-customer-chart')), /画像は12MB以下/)
assert.match(service, /MAX_ATTACHMENT_BYTES = 20 \* 1024 \* 1024/)
assert.match(service, /ResponseContentDisposition/)
assert.match(service, /application\/pdf/)
assert.match(service, /private\/customer-chart-photos/)

console.log(JSON.stringify({ release:'customer-chart-attachments-v564', verified:true }))
