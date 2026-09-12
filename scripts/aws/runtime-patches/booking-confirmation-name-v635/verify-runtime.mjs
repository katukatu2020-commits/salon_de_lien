import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const page = fs.readFileSync(path.join(root, '.next/server/app/admin/appointments/page.js'), 'utf8')
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const helper = require(path.join(root, 'booking-confirmation-name-v635.js'))

assert.equal(
  helper.displayBookingConfirmationNameV635('中島 弾正ナカジマ ダンジョウ'),
  '中島 弾正',
)
assert.match(page, /data-booking-confirmation-name-v635/)
assert.match(page, /displayBookingConfirmationNameV635\(e\.customer\.name\)/)
assert.match(page, /"予約登録" === e\.purpose && "予約確定" === e\.outcome/)
assert.match(server, /X-Lien-Booking-Confirmation-Name', 'v635'/)

console.log(JSON.stringify({
  release: 'booking-confirmation-name-v635',
  runtimeVerified: true,
  confirmedBookingHistoryOnly: true,
}))
