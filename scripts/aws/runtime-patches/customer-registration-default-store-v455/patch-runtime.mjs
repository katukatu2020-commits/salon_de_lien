import fs from 'node:fs'

const registrationRequestPath = '/app/.next/server/app/api/customer-auth/registration-link/request/route.js'
const phoneRequestPath = '/app/.next/server/app/api/customer-auth/phone-verification/request/route.js'
const registrationActionPath = '/app/.next/server/chunks/2241.js'

function replaceExact(source, before, after, expectedCount, label) {
  const count = source.split(before).length - 1
  if (count !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} matches, found ${count}`)
  }
  return source.split(before).join(after)
}

let registrationRequest = fs.readFileSync(registrationRequestPath, 'utf8')
registrationRequest = replaceExact(
  registrationRequest,
  'process.env.DEFAULT_ORGANIZATION_ID ?? "org_salon_de_lien"',
  'process.env.CUSTOMER_REGISTRATION_ORGANIZATION_ID ?? "org_showcase_yohaku"',
  1,
  'registration invite organization',
)
fs.writeFileSync(registrationRequestPath, registrationRequest)

let phoneRequest = fs.readFileSync(phoneRequestPath, 'utf8')
phoneRequest = replaceExact(
  phoneRequest,
  'process.env.DEFAULT_ORGANIZATION_ID||"org_salon_de_lien"',
  'process.env.CUSTOMER_REGISTRATION_ORGANIZATION_ID||"org_showcase_yohaku"',
  1,
  'registration phone verification organization',
)
fs.writeFileSync(phoneRequestPath, phoneRequest)

let registrationAction = fs.readFileSync(registrationActionPath, 'utf8')
registrationAction = replaceExact(
  registrationAction,
  'select:{id:!0,email:!0,customerId:!0,expiresAt:!0,usedAt:!0}',
  'select:{id:!0,organizationId:!0,email:!0,customerId:!0,expiresAt:!0,usedAt:!0}',
  1,
  'registration invite organization selection',
)
registrationAction = replaceExact(
  registrationAction,
  'P=process.env.DEFAULT_ORGANIZATION_ID??"org_salon_de_lien"',
  'P=n.organizationId',
  1,
  'registration completion organization',
)
fs.writeFileSync(registrationActionPath, registrationAction)

console.log('customer registration default store v455 patched')
