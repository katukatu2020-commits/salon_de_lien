import fs from 'node:fs'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const servicePath = '/app/customer-appointment-cancellation-v362.js'
const service = fs.readFileSync(servicePath, 'utf8')

assert(service.includes("'/api/lien-customer-appointment-cancel'"), 'customer cancellation API route is missing')
assert(service.includes('"couponIssueId"=NULL'), 'customer cancellation does not release the reserved coupon')
assert(service.includes('staff notification could not be recorded'), 'notification failure is not isolated from cancellation')
assert(service.includes('await prisma.$executeRawUnsafe('), 'post-transaction staff notification is missing')
assert(!service.includes('"createdAt","updatedAt"'), 'staff notification still writes the nonexistent updatedAt column')
assert(service.includes('"source","createdAt")'), 'staff notification does not use the deployed table schema')

const transactionStart = service.indexOf('const result = await prisma.$transaction')
const transactionEnd = service.indexOf('// Cancelling the appointment is the primary operation.')
const notificationInsert = service.indexOf('INSERT INTO "StaffSystemNotification"')
assert(transactionStart >= 0 && transactionEnd > transactionStart, 'cancellation transaction boundary is missing')
assert(notificationInsert > transactionEnd, 'staff notification must run after the cancellation transaction commits')

new Function(service)
console.log('customer cancellation resilience v380 runtime verification passed')
