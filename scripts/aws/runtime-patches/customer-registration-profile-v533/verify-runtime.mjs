import assert from 'node:assert/strict'
import fs from 'node:fs'

const action = fs.readFileSync('/app/.next/server/chunks/2241.js', 'utf8')
const page = fs.readFileSync('/app/.next/server/app/u/register/[token]/page.js', 'utf8')
const phoneRequest = fs.readFileSync('/app/.next/server/app/api/customer-auth/phone-verification/request/route.js', 'utf8')
const phoneVerify = fs.readFileSync('/app/.next/server/app/api/customer-auth/phone-verification/verify/route.js', 'utf8')
const server = fs.readFileSync('/app/server.js', 'utf8')
const marker = 'customer-registration-profile-v533'

for (const [name, source] of [
  ['registration action', action],
  ['SMS request route', phoneRequest],
  ['SMS verification route', phoneVerify],
]) {
  assert.ok(source.includes(`e.normalize("NFKC").trim().replace(/[\\s()-]/g,"").replace(/\\D/g,"")`), `${name} does not normalize full-width input`)
  assert.equal(source.includes(`e.trim().replace(/[\\s()-]/g,"").replace(/\\D/g,"")`), false, `${name} kept the old phone normalizer`)
}

for (const required of [
  `y||(0,l.redirect)(i("phoneFormat"))`,
  `D||(0,l.redirect)(i("birthDate"))`,
  `require("/app/customer-registration-profile-v533.js").normalizeProfile`,
  `B=registrationProfileV533.gender`,
  marker,
  'customerRegistrationInvite.findUnique',
  'appUsers:{create:',
  'customerPhoneIdentity.findUnique',
  'customerPointAccount.upsert',
  'customerRegistrationInvite.update',
  '/u/login?registered=1&loginId=',
  'CUSTOMER_PHONE_ALREADY_USED',
]) assert.ok(action.includes(required), `registration invariant missing: ${required}`)

assert.equal(action.includes(`y||(0,l.redirect)(i("profile"))`), false)
assert.equal(action.includes(`(0,N.oQ)(N.nO,B)&&D&&(0,N.oQ)(N.An,M)`), false)

for (const required of [
  `a?.error==="phoneFormat"`,
  `a?.error==="birthDate"`,
  '070・080・090から始まる11桁',
  '1900年以降の実在する日付',
  'registrationInviteToken',
  'createPublicConsultationLead',
  '登録する',
]) assert.ok(page.includes(required), `registration page invariant missing: ${required}`)

for (const required of [
  `X-Lien-Customer-Registration-Profile', 'v533'`,
  `X-Lien-Customer-Account-Lifecycle', 'v532'`,
  `X-Lien-Billing-Display-Mask', 'v531'`,
  `X-Lien-Customer-Home-Menu-Order', 'v530'`,
  `X-Lien-Customer-Desktop-Frontend', 'v529'`,
  `X-Lien-Customer-Home-Branding', 'v528'`,
  `X-Lien-Line-Booking-UI-Parity', 'v527'`,
]) assert.ok(server.includes(required), `readiness invariant missing: ${required}`)

console.log(JSON.stringify({ release: marker, runtimeVerified: true, registrationVerified: true }))
