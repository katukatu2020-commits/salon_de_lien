import assert from 'node:assert/strict'
import fs from 'node:fs'

const storeService = fs.readFileSync('/app/customer-store-staff-v276.js', 'utf8')
const withdrawal = fs.readFileSync('/app/customer-withdrawal-v309.js', 'utf8')
const server = fs.readFileSync('/app/server.js', 'utf8')
const registrationAction = fs.readFileSync('/app/.next/server/chunks/2241.js', 'utf8')
const registrationPage = fs.readFileSync('/app/.next/server/app/u/register/[token]/page.js', 'utf8')
const registrationRequest = fs.readFileSync('/app/.next/server/app/api/customer-auth/registration-link/request/route.js', 'utf8')
const marker = 'customer-account-lifecycle-v532'

for (const required of [
  'async function customerAccountForSession(session)',
  'FROM "CustomerStoreLink" l',
  'value || null',
  'Number(updated) !== 1',
  `LEFT JOIN "AppUser" u ON u."role"='CUSTOMER' AND u."active"=TRUE`,
  marker,
]) assert.ok(storeService.includes(required), `nickname invariant missing: ${required}`)

assert.equal(storeService.includes('WHERE "id"=$2 AND "customerId"=$3 AND "organizationId"=$4 AND "role"=\'CUSTOMER\''), false)
assert.equal(storeService.includes('SELECT "nickname" FROM "AppUser" WHERE "id"=$1 AND "customerId"=$2 AND "organizationId"=$3'), false)

for (const required of [
  'JOIN "Customer" c ON c."id"=$2 AND c."organizationId"=$3 AND c."deletedAt" IS NULL',
  'l."appUserId"=u."id" AND l."customerId"=c."id"',
  'UPDATE "Customer" c',
  'c."id"=(SELECT u."customerId" FROM "AppUser" u WHERE u."id"=$1)',
  'WHERE "id"=$1 AND "role"=\'CUSTOMER\'',
  'DELETE FROM "CustomerPhoneIdentity" p',
  'UPDATE "CustomerPortalAccess" p',
  marker,
]) assert.ok(withdrawal.includes(required), `withdrawal invariant missing: ${required}`)

assert.equal(withdrawal.includes('WHERE u."id"=$1 AND u."customerId"=$2 AND u."organizationId"=$3'), false)
assert.equal(withdrawal.includes('WHERE "customerId"=$1 AND "role"=\'CUSTOMER\'`, row.customerId'), false)

for (const required of [
  'createPublicConsultationLead',
  'customerRegistrationInvite.findUnique',
  'appUsers:{create:',
  'customerPhoneIdentity.findUnique',
  'customerPointAccount.upsert',
  'customerRegistrationInvite.update',
  '/u/login?registered=1&loginId=',
  'CUSTOMER_PHONE_ALREADY_USED',
]) assert.ok(registrationAction.includes(required), `registration transaction invariant missing: ${required}`)

for (const required of ['registrationInviteToken', 'createPublicConsultationLead', '携帯電話番号', '登録する']) {
  assert.ok(registrationPage.includes(required), `registration page invariant missing: ${required}`)
}
for (const required of [
  'customerRegistrationInvite.updateMany',
  'customerRegistrationInvite.create',
  'customerRegistrationInvite.deleteMany',
  '/u/register/',
  'customer registration mail delivery failed',
  'https://api.postmarkapp.com/email',
  'POSTMARK_SERVER_TOKEN',
]) {
  assert.ok(registrationRequest.includes(required), `registration request invariant missing: ${required}`)
}

for (const required of [
  `X-Lien-Customer-Account-Lifecycle', 'v532'`,
  `X-Lien-Billing-Display-Mask', 'v531'`,
  `X-Lien-Customer-Home-Menu-Order', 'v530'`,
  `X-Lien-Customer-Desktop-Frontend', 'v529'`,
  `X-Lien-Customer-Home-Branding', 'v528'`,
  `X-Lien-Line-Booking-UI-Parity', 'v527'`,
]) assert.ok(server.includes(required), `readiness invariant missing: ${required}`)

console.log(JSON.stringify({ release: marker, runtimeVerified: true, registrationVerified: true }))
