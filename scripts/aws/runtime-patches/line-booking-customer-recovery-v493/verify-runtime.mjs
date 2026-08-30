import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_APP_ROOT || '/app'
const line = fs.readFileSync(`${root}/line-reservations-v436.js`, 'utf8')
const server = fs.readFileSync(`${root}/server.js`, 'utf8')

assert.match(line, /line-booking-customer-recovery-v493/)
assert.match(line, /async function resolveLineBookingCustomer\(/)
assert.match(line, /Number\(error\?\.statusCode\) !== 404/)
assert.match(line, /existingCustomerId: null/)
assert.match(line, /let customer = await resolveLineBookingCustomer\(customerNameAutoMerge, tx, mergeOptions\)/)
assert.match(line, /resolveLineBookingCustomer,\n  slotAvailable,/)
assert.doesNotMatch(line, /let customer = await customerNameAutoMerge\.resolveOrCreate\(tx, \{\n      organizationId: connection\.organizationId,/)
assert.match(server, /X-Lien-Line-Booking-Customer-Recovery', 'v493'/)

console.log('line-booking-customer-recovery-v493 runtime verified')
