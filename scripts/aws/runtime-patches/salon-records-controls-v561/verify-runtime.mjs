import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')

const server = read('server.js')
const operations = read('salon-operations-v561.js')
const commercial = read('commercial-admin-v101.js')
const attendanceService = read('attendance-history-editor-v497.js')
const attendanceClient = read('attendance-client-v497.js')
const salesClient = read('sales-ledger-client-v318.js')
const customerMerge = read('customer-merge-v385.js')
const customerAutoMerge = read('customer-name-auto-merge-v489.js')

assert.match(server, /createSalonOperationsService/)
assert.match(server, /salonOperations\.ensureSchema\(\)/)
assert.match(server, /salonOperations\.handle\(req, res, url\)/)
assert.match(server, /X-Lien-Salon-Records-Controls', 'v561'/)
assert.match(server, /X-Lien-Customer-Comment-Layout', 'v560'/)

assert.match(operations, /CREATE TABLE IF NOT EXISTS "CustomerChartPhoto"/)
assert.match(operations, /private\/customer-chart-photos/)
assert.match(operations, /S3_PRIVATE_ASSETS_BUCKET/)
assert.match(operations, /ServerSideEncryption: 'AES256'/)
assert.match(operations, /expiresIn: 300/)
assert.match(operations, /organizationId"=\$1 AND "customerId"=\$2/)
assert.match(operations, /CREATE TABLE IF NOT EXISTS "SalesVoidAudit"/)
assert.match(operations, /FOR UPDATE OF s/)
assert.match(operations, /UPDATE "Product" p/)
assert.match(operations, /DELETE FROM "ServiceSale"/)
assert.match(operations, /ownerOnly && session\.role !== 'ADMIN'/)

assert.match(commercial, /__lienCustomerChartPhotosV561/)
assert.match(commercial, /data-chart-latest-card-v561/)
assert.match(commercial, /過去のカルテを見る/)
assert.match(commercial, /while \(items\.length < Number\(data\.count \|\| 0\)\)/)
assert.match(commercial, /店舗アカウントだけが閲覧できます/)
for (const source of [customerMerge, customerAutoMerge]) {
  assert.match(source, /CustomerChartPhoto/)
  assert.match(source, /salon-records-controls-v561/)
}

assert.match(salesClient, /function openVoid\(root, row\)/)
assert.match(salesClient, /data-sl-void-confirm/)
assert.match(salesClient, /\/api\/admin\/sales-ledger\/void/)
assert.match(salesClient, /会計データ管理から取消/)
assert.doesNotMatch(salesClient, /取消メモ（任意）/)

for (const source of [attendanceService, attendanceClient, commercial]) {
  assert.match(source, /salon-records-controls-v561/)
}
assert.match(attendanceService, /SELECT "isSharedStoreAccount" FROM "AppUser"/)
assert.match(attendanceService, /canEditRecords: !sharedStoreAccount/)
assert.match(attendanceService, /action === 'save_record' && await isSharedStoreAccount\(session\)/)
assert.match(attendanceService, /店舗共通アカウントでは、確定済みの勤務実績を追加・変更できません/)
for (const source of [attendanceClient, commercial]) {
  assert.match(source, /data\.canEditRecords === false && view === 'history'/)
  assert.match(source, /data-attendance-save-record/)
  assert.match(source, /data-attendance-add-shift/)
  assert.match(source, /ca-attendance-readonly/)
}

console.log(JSON.stringify({
  release: 'salon-records-controls-v561',
  chartPhotos: true,
  auditedSaleCancellation: true,
  sharedAttendanceGuard: true,
  verified: true,
}))
