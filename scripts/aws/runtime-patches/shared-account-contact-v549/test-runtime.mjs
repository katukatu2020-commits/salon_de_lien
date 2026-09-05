import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { saveSharedStoreAccount } = require('./shared-account-service-v549.js')
const crypto = require('node:crypto')

function fakePrisma({ currentId = '', duplicate = false } = {}) {
  const writes = []
  const tx = {
    async $queryRawUnsafe(sql, ...values) {
      if (sql.startsWith('SELECT "name" FROM "Organization"')) return [{ name: '検証店舗' }]
      if (sql.startsWith('SELECT "id" FROM "AppUser" WHERE "organizationId"')) return currentId ? [{ id: currentId }] : []
      if (sql.startsWith('SELECT "id" FROM "AppUser" WHERE "id"<>')) return duplicate ? [{ id: 'duplicate-user' }] : []
      if (sql.startsWith('UPDATE "AppUser"')) {
        writes.push({ operation: 'update', sql, values })
        return [{ id: currentId, loginId: values[0], active: true }]
      }
      if (sql.startsWith('INSERT INTO "AppUser"')) {
        writes.push({ operation: 'insert', sql, values })
        return [{ id: values[0], loginId: values[3], active: true }]
      }
      throw new Error(`Unexpected SQL: ${sql}`)
    },
  }
  return {
    writes,
    async $transaction(callback) { return callback(tx) },
  }
}

const existing = fakePrisma({ currentId: 'shared-existing' })
const updated = await saveSharedStoreAccount({
  prisma: existing,
  crypto,
  organizationId: 'org-existing',
  loginId: 'store.existing',
  password: 'Existing-Shared-Password-549!',
})
assert.equal(updated.created, false)
assert.equal(updated.loginId, 'store.existing')
assert.deepEqual(existing.writes.map(row => row.operation), ['update'])
assert.match(existing.writes[0].values[1], /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/)

const missing = fakePrisma()
const created = await saveSharedStoreAccount({
  prisma: missing,
  crypto,
  organizationId: 'org-missing',
  loginId: 'store.created',
  password: 'Created-Shared-Password-549!',
})
assert.equal(created.created, true)
assert.equal(created.loginId, 'store.created')
assert.deepEqual(missing.writes.map(row => row.operation), ['insert'])
assert.match(missing.writes[0].values[2], /^store-[a-f0-9]{24}@accounts\.invalid$/)

const conflicted = fakePrisma({ currentId: 'shared-existing', duplicate: true })
await assert.rejects(
  saveSharedStoreAccount({
    prisma: conflicted,
    crypto,
    organizationId: 'org-existing',
    loginId: 'already.used',
    password: 'Conflicted-Shared-Password-549!',
  }),
  error => error.statusCode === 409 && /すでに使用/.test(error.message),
)
assert.deepEqual(conflicted.writes, [])

const uniqueFailure = {
  async $transaction() { throw Object.assign(new Error('Raw query failed'), { code: 'P2010', meta: { code: '23505' } }) },
}
await assert.rejects(
  saveSharedStoreAccount({
    prisma: uniqueFailure,
    crypto,
    organizationId: 'org-race',
    loginId: 'race.account',
    password: 'Race-Shared-Password-549!',
  }),
  error => error.statusCode === 409 && /すでに使用/.test(error.message),
)

console.log(JSON.stringify({ release: 'shared-account-contact-v549', update: true, create: true, conflict: true, uniqueRace: true }))
