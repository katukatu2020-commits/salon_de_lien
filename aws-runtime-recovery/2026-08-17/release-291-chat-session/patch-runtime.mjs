import fs from 'node:fs'
import path from 'node:path'

const root = process.argv[2] ? path.resolve(process.argv[2]) : '/app'
const serverPath = path.join(root, 'server.js')
const source = fs.readFileSync(serverPath, 'utf8')

const before = `  const users = await prisma.$queryRawUnsafe('SELECT "id", "displayName", "role" FROM "AppUser" WHERE "id"=$1 AND "organizationId"=$2 AND "active"=true LIMIT 1', value.userId, value.organizationId)
  return users[0] ? { ...value, displayName: users[0].displayName, role: users[0].role } : null`

const after = `  const users = value.userId
    ? await prisma.$queryRawUnsafe('SELECT "id", "displayName", "role" FROM "AppUser" WHERE "id"=$1 AND "organizationId"=$2 AND "active"=true LIMIT 1', value.userId, value.organizationId)
    : await prisma.$queryRawUnsafe('SELECT "id", "displayName", "role" FROM "AppUser" WHERE "organizationId"=$1 AND "active"=true AND (LOWER("loginId")=LOWER($2) OR LOWER("email")=LOWER($2)) LIMIT 1', value.organizationId, value.subject)
  return users[0] ? { ...value, userId: value.userId || users[0].id, displayName: users[0].displayName, role: users[0].role } : null`

const occurrences = source.split(before).length - 1
if (occurrences !== 1) {
  throw new Error(`Expected one admin chat session lookup, found ${occurrences}`)
}

fs.writeFileSync(serverPath, source.replace(before, after), 'utf8')
console.log('Release 291 chat session patch complete.')
