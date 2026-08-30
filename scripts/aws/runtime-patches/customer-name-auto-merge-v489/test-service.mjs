import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const modulePath = process.env.LIEN_CUSTOMER_NAME_MERGE_SERVICE || '/app/customer-name-auto-merge-v489.js'
const { createCustomerNameAutoMergeService, normalizeCustomerName, chooseCanonicalCustomer } = require(modulePath)

const equivalentNames = [
  '山本 小太郎',
  '山本　小太郎',
  '山本-小太郎',
  '山本－小太郎',
  '山本‐小太郎',
  '山本−小太郎',
  '山本—小太郎',
]
assert.equal(new Set(equivalentNames.map(normalizeCustomerName)).size, 1)
assert.equal(normalizeCustomerName(' ＹＡＭＡＭＯＴＯ－ＫＯＴＡＲＯ '), 'yamamotokotaro')
assert.notEqual(normalizeCustomerName('コータ'), normalizeCustomerName('コタ'), 'Japanese long-vowel marks must remain meaningful')

const candidates = [
  { id: 'old', hasAppAccess: false, activityCount: 9, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'app', hasAppAccess: true, activityCount: 1, createdAt: '2025-01-01T00:00:00Z' },
  { id: 'preferred', hasAppAccess: false, activityCount: 0, createdAt: '2026-01-01T00:00:00Z' },
]
assert.equal(chooseCanonicalCustomer(candidates).id, 'app')
assert.equal(chooseCanonicalCustomer(candidates, { preferredCustomerId: 'preferred' }).id, 'preferred')
assert.equal(chooseCanonicalCustomer(candidates, { mappedCustomerId: 'app' }).id, 'app')
assert.equal(chooseCanonicalCustomer(candidates.filter(row => row.id !== 'app'), { mappedCustomerId: 'preferred' }).id, 'preferred')

const schemaStatements = []
const prisma = { $executeRawUnsafe: async sql => { schemaStatements.push(sql); return 0 } }
const queries = []
const writes = []
const tx = {
  async $queryRawUnsafe(sql, ...parameters) {
    queries.push({ sql, parameters })
    if (sql.includes('pg_advisory_xact_lock')) return [{ locked: '' }]
    if (sql.includes('COALESCE(r."realName"')) return [{ id: 'existing', name: '山本　小太郎', phone: null, createdAt: new Date('2020-01-01'), realName: '' }]
    if (sql.startsWith('SELECT "id" FROM "Customer"')) return [{ id: 'existing' }]
    if (sql.includes('AS "hasAppAccess"')) return [{ id: 'existing', name: '山本　小太郎', phone: null, createdAt: new Date('2020-01-01'), hasAppAccess: false, activityCount: 3 }]
    if (sql.startsWith('SELECT "customerId" FROM "CustomerNormalizedNameIdentity"')) return []
    throw new Error(`Unexpected query: ${sql}`)
  },
  async $executeRawUnsafe(sql, ...parameters) {
    writes.push({ sql, parameters })
    return 1
  },
  customer: {
    async findUniqueOrThrow({ where }) {
      assert.equal(where.id, 'existing')
      return { id: 'existing', name: '山本　小太郎', phone: null }
    },
  },
}

const service = createCustomerNameAutoMergeService({ prisma, crypto: { randomUUID: () => 'test-uuid' } })
const resolved = await service.resolveOrCreate(tx, { organizationId: 'org-a', name: '山本-小太郎', actorLabel: 'test' })
assert.equal(resolved.id, 'existing')
assert.ok(schemaStatements.some(sql => sql.includes('CustomerNormalizedNameIdentity')))
assert.equal(queries.find(item => item.sql.includes('COALESCE(r."realName"')).parameters[0], 'org-a')
assert.ok(writes.some(item => item.sql.includes('CustomerNormalizedNameIdentity') && item.parameters[0] === 'org-a'))

console.log('customer name auto merge v489 service tests passed')
