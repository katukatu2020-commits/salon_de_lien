import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const crypto = require('node:crypto')
const { saveSharedStoreAccount } = require('./shared-account-service-v552.js')

function fakePrisma({ current = null, duplicate = false } = {}) {
  const queries = []
  const writes = []
  const tx = {
    async $queryRawUnsafe(sql, ...values) {
      queries.push({ sql, values })
      if (sql.startsWith('SELECT "name" FROM "Organization"')) return [{ name: 'テスト店' }]
      if (sql.startsWith('SELECT "id","loginId" FROM "AppUser"')) return current ? [current] : []
      if (sql.includes('"role"::text IN')) return duplicate ? [{ id: 'other-backoffice-user' }] : []
      if (sql.startsWith('UPDATE "AppUser"')) {
        writes.push({ operation: 'update', values })
        return [{ id: current.id, loginId: values[0], active: true }]
      }
      if (sql.startsWith('INSERT INTO "AppUser"')) {
        writes.push({ operation: 'insert', values })
        return [{ id: values[0], loginId: values[3], active: true }]
      }
      throw new Error(`Unexpected SQL: ${sql}`)
    },
  }
  return {
    queries,
    writes,
    async $transaction(callback) { return callback(tx) },
  }
}

const unchanged = fakePrisma({
  current: { id: 'shared-current', loginId: 'Lien6007' },
  duplicate: true,
})
const reset = await saveSharedStoreAccount({
  prisma: unchanged,
  crypto,
  organizationId: 'org-current',
  loginId: 'lien6007',
  password: 'Reset-Shared-Password-552!',
})
assert.equal(reset.created, false)
assert.equal(reset.loginId, 'lien6007')
assert.equal(unchanged.queries.filter(row => row.sql.includes('"role"::text IN')).length, 0)
assert.deepEqual(unchanged.writes.map(row => row.operation), ['update'])
assert.match(unchanged.writes[0].values[1], /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/)

const customerAudienceOnly = fakePrisma({
  current: { id: 'shared-current', loginId: 'old-shared-id' },
})
const renamed = await saveSharedStoreAccount({
  prisma: customerAudienceOnly,
  crypto,
  organizationId: 'org-current',
  loginId: 'same.as.customer',
  password: 'Renamed-Shared-Password-552!',
})
assert.equal(renamed.loginId, 'same.as.customer')
const scopedLookup = customerAudienceOnly.queries.find(row => row.sql.includes('"role"::text IN'))
assert.ok(scopedLookup)
assert.match(scopedLookup.sql, /'ADMIN','STAFF','MANUFACTURER'/)

const conflicted = fakePrisma({
  current: { id: 'shared-current', loginId: 'old-shared-id' },
  duplicate: true,
})
await assert.rejects(
  saveSharedStoreAccount({
    prisma: conflicted,
    crypto,
    organizationId: 'org-current',
    loginId: 'other.staff',
    password: 'Conflict-Shared-Password-552!',
  }),
  error => error.statusCode === 409 && error.code === 'SHARED_ACCOUNT_CONFLICT',
)
assert.deepEqual(conflicted.writes, [])

const missing = fakePrisma()
const created = await saveSharedStoreAccount({
  prisma: missing,
  crypto,
  organizationId: 'org-missing',
  loginId: 'new.shared.store',
  password: 'Created-Shared-Password-552!',
})
assert.equal(created.created, true)
assert.equal(created.loginId, 'new.shared.store')
assert.deepEqual(missing.writes.map(row => row.operation), ['insert'])

console.log(JSON.stringify({
  release: 'shared-account-identity-scope-v552',
  sameIdReset: true,
  customerAudienceSeparated: true,
  backofficeConflictProtected: true,
  initialCreate: true,
}))
