import fs from 'node:fs'

const registrationRequestPath = '/app/.next/server/app/api/customer-auth/registration-link/request/route.js'
const phoneRequestPath = '/app/.next/server/app/api/customer-auth/phone-verification/request/route.js'

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
  'process.env.CUSTOMER_REGISTRATION_ORGANIZATION_ID ?? "org_showcase_yohaku"',
  'process.env.DEFAULT_ORGANIZATION_ID ?? "org_salon_de_lien"',
  1,
  'registration invite organization',
)
fs.writeFileSync(registrationRequestPath, registrationRequest)

let phoneRequest = fs.readFileSync(phoneRequestPath, 'utf8')
phoneRequest = replaceExact(
  phoneRequest,
  'process.env.CUSTOMER_REGISTRATION_ORGANIZATION_ID||"org_showcase_yohaku"',
  'process.env.DEFAULT_ORGANIZATION_ID||"org_salon_de_lien"',
  1,
  'registration phone verification organization',
)
fs.writeFileSync(phoneRequestPath, phoneRequest)

console.log('customer registration default Salon v472 patched')
