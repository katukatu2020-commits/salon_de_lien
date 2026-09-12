import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { displayBookingConfirmationNameV635 } = require('./booking-confirmation-name-v635.js')

assert.equal(
  displayBookingConfirmationNameV635('中島 弾正ナカジマ ダンジョウ'),
  '中島 弾正',
)
assert.equal(
  displayBookingConfirmationNameV635('　中島　弾正　ナカジマ　ダンジョウ　'),
  '中島 弾正',
)
assert.equal(displayBookingConfirmationNameV635('中島 弾正'), '中島 弾正')
assert.equal(displayBookingConfirmationNameV635('山田 アンナ'), '山田 アンナ')
assert.equal(displayBookingConfirmationNameV635('山田 アンナ マリア'), '山田 アンナ マリア')
assert.equal(displayBookingConfirmationNameV635('ジョン スミス'), 'ジョン スミス')
assert.equal(displayBookingConfirmationNameV635(null), '')

console.log(JSON.stringify({
  release: 'booking-confirmation-name-v635',
  unitVerified: true,
  duplicatedFuriganaRemoved: true,
  katakanaNamesPreserved: true,
}))
