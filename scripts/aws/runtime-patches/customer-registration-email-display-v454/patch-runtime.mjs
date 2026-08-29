import fs from 'node:fs'

const customerPageFile = '/app/.next/server/chunks/3244.js'
let source = fs.readFileSync(customerPageFile, 'utf8')

// Prisma returns this filtered to-many relation as an array in the running
// release. v352 incorrectly converted both reads to singular-relation access.
const replacements = [
  {
    label: 'customer app registration state',
    before: '!el.appUsers',
    after: 'el.appUsers.length === 0',
  },
  {
    label: 'registered customer email',
    before: 'el.appUsers?.email',
    after: 'el.appUsers[0]?.email',
  },
]

for (const replacement of replacements) {
  const matches = source.split(replacement.before).length - 1
  if (matches !== 1) {
    throw new Error(`${replacement.label}: expected one parent match, found ${matches}`)
  }
  source = source.replace(replacement.before, replacement.after)
}

fs.writeFileSync(customerPageFile, source)
console.log('customer registration email display v454 patched the customer detail bundle')
