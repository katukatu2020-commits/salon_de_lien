import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const crypto = require('node:crypto')
const { saveSharedStoreAccount } = require('./shared-account-service-v553.js')

function fakePrisma({ current = null, activeDuplicate = false, inactiveDuplicates = 0 } = {}) {
  const queries = []
  const writes = []
  const tx = {
    async $queryRawUnsafe(sql, ...values) {
      queries.push({ sql, values })
      if (sql.startsWith('SELECT "name" FROM "Organization"')) return [{ name: 'テスト店' }]
      if (sql.startsWith('SELECT "id","loginId" FROM "AppUser"')) return current ? [current] : []
      if (sql.startsWith('SELECT "id" FROM "AppUser"') && sql.includes('"active"=TRUE')) {
        return activeDuplicate ? [{ id: 'other-active-backoffice-user' }] : []
      }
      if (sql.startsWith('UPDATE "AppUser" SET "loginId"=NULL')) {
        writes.push({ operation: 'release-inactive', values })
        return Array.from({ length: inactiveDuplicates }, (_, index) => ({ id: `inactive-${index + 1}` }))
      }
      if (sql.startsWith('UPDATE "AppUser" SET "loginId"=$1')) {
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
  activeDuplicate: true,
})
const reset = await saveSharedStoreAccount({
  prisma: unchanged,
  crypto,
  organizationId: 'org-current',
  loginId: 'lien6007',
  password: 'Reset-Shared-Password-553!',
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
  password: 'Renamed-Shared-Password-553!',
})
assert.equal(renamed.loginId, 'same.as.customer')
const scopedLookup = customerAudienceOnly.queries.find(row => row.sql.includes('"role"::text IN'))
assert.ok(scopedLookup)
assert.match(scopedLookup.sql, /'ADMIN','STAFF','MANUFACTURER'/)
assert.match(scopedLookup.sql, /"active"=TRUE/)

const reclaimable = fakePrisma({
  current: { id: 'shared-current', loginId: 'old-shared-id' },
  inactiveDuplicates: 1,
})
const reclaimed = await saveSharedStoreAccount({
  prisma: reclaimable,
  crypto,
  organizationId: 'org-current',
  loginId: 'retired.staff.id',
  password: 'Reclaimed-Shared-Password-553!',
})
assert.equal(reclaimed.loginId, 'retired.staff.id')
assert.deepEqual(reclaimable.writes.map(row => row.operation), ['release-inactive', 'update'])
const releaseQuery = reclaimable.queries.find(row => row.sql.startsWith('UPDATE "AppUser" SET "loginId"=NULL'))
assert.ok(releaseQuery)
assert.match(releaseQuery.sql, /"active"=FALSE/)
assert.match(releaseQuery.sql, /LOWER\(COALESCE\("loginId"/)

const conflicted = fakePrisma({
  current: { id: 'shared-current', loginId: 'old-shared-id' },
  activeDuplicate: true,
})
await assert.rejects(
  saveSharedStoreAccount({
    prisma: conflicted,
    crypto,
    organizationId: 'org-current',
    loginId: 'other.staff',
    password: 'Conflict-Shared-Password-553!',
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
  password: 'Created-Shared-Password-553!',
})
assert.equal(created.created, true)
assert.equal(created.loginId, 'new.shared.store')
assert.deepEqual(missing.writes.map(row => row.operation), ['release-inactive', 'insert'])

console.log(JSON.stringify({
  release: 'shared-account-available-login-v553',
  sameIdReset: true,
  customerAudienceSeparated: true,
  inactiveBackofficeIdReleased: true,
  backofficeConflictProtected: true,
  initialCreate: true,
}))
