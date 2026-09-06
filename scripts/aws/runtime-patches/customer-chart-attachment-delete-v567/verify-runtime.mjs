import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const commercial = fs.readFileSync(path.join(root, 'commercial-admin-v101.js'), 'utf8')
const service = fs.readFileSync(path.join(root, 'customer-chart-attachments-v567.js'), 'utf8')
const oldChartMarker = commercial.indexOf('/* salon-records-controls-v561-customer-chart */')
const chartStart = commercial.lastIndexOf(';(() => {', oldChartMarker)
const chartClient = commercial.slice(chartStart, oldChartMarker)

assert.match(server, /customer-chart-attachments-v567/)
assert.match(server, /X-Lien-Customer-Chart-Delete', 'v567'/)
assert.match(server, /X-Lien-Style-Post-Directions', 'v566'/)
assert.ok(server.indexOf('customerChartAttachments.handle') < server.indexOf('salonOperations.handle'))
assert.match(service, /req\.method === 'DELETE'/)
assert.match(service, /storage\.delete\(attachment\.storageReference\)/)
assert.match(service, /"organizationId"=\$2 AND "customerId"=\$3/)
assert.match(service, /安全性を確認できないため削除できませんでした/)
assert.match(chartClient, /__lienCustomerChartAttachmentDeleteV567/)
assert.match(chartClient, /data-chart-delete-confirm/)
assert.match(chartClient, /このカルテファイルを完全に削除することを確認しました/)
assert.match(chartClient, /method:'DELETE'/)
assert.doesNotMatch(chartClient, /window\.prompt/)

console.log(JSON.stringify({ release:'customer-chart-attachment-delete-v567', verified:true }))
