import fs from 'node:fs'

const source = fs.readFileSync('/app/store-profile.js', 'utf8')

if (!source.includes('customer-card-store-profile-v352')) {
  throw new Error('store profile runtime marker is missing')
}
if (source.includes('publicCode: true, updatedAt: true')) {
  throw new Error('unsupported Organization.publicCode Prisma select remains')
}
if (!source.includes('SELECT "id","name","slug","publicCode","updatedAt" FROM "Organization" WHERE "id"=$1 LIMIT 1')) {
  throw new Error('tenant-scoped raw Organization lookup is missing')
}

const customerPage = fs.readFileSync('/app/.next/server/chunks/3244.js', 'utf8')
if (!customerPage.includes('!el.appUsers')) {
  throw new Error('nullable customer AppUser check is missing')
}
if (!customerPage.includes('el.appUsers?.email')) {
  throw new Error('nullable customer email read is missing')
}
if (customerPage.includes('el.appUsers.length') || customerPage.includes('el.appUsers[0]?.email')) {
  throw new Error('array access remains on singular Customer.appUsers relation')
}
