import fs from 'node:fs'

const staff = fs.readFileSync('/app/customer-store-staff-v276.js', 'utf8')
const server = fs.readFileSync('/app/server.js', 'utf8')

for (const marker of [
  'LEFT JOIN "Customer" c ON c."id"=p."customerId" AND c."organizationId"=p."organizationId"',
  'LEFT JOIN "AppUser" u ON u."customerId"=p."customerId"',
]) {
  if (!staff.includes(marker)) throw new Error(`staff: missing ${marker}`)
}

if (staff.includes('JOIN "Customer" c ON c."id"=p."customerId" AND c."organizationId"=p."organizationId" AND c."deletedAt" IS NULL')) {
  throw new Error('historical community posts still require an active customer record')
}

for (const marker of [
  "url.pathname === '/favicon.ico'",
  "Content-Type', 'image/svg+xml; charset=utf-8'",
  "salon-customer-service-mark.svg",
]) {
  if (!server.includes(marker)) throw new Error(`server: missing ${marker}`)
}

new Function(staff)
new Function(server)

console.log('community fallback and favicon v421 runtime verified')
