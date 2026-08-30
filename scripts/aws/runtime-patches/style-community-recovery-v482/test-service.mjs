import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { Readable } from 'node:stream'

const require = createRequire(import.meta.url)
const servicePath = process.env.LIEN_CONTENT_SERVICE || './content-management-v482.js'
const { createContentManagementService } = require(servicePath)

const session = { userId: 'staff-1', customerId: null, organizationId: 'org-1' }
const statements = []
const prisma = {
  async $queryRawUnsafe(sql) {
    statements.push(sql)
    if (sql.includes('LEFT JOIN LATERAL')) {
      return [{
        id: 'post-1',
        postKind: 'STORE',
        caption: '',
        published: true,
        publishedAt: new Date('2026-08-01T00:00:00Z'),
        publishedByName: 'staff',
        updatedAt: new Date('2026-08-01T00:00:00Z'),
        coverPhotoReference: '/style.jpg',
      }]
    }
    if (sql.includes('FROM "VisitCommunityPost"')) {
      return [{ id: 'post-1', organizationId: 'org-1', customerId: null, postKind: 'STORE', published: true }]
    }
    return []
  },
  async $executeRawUnsafe(sql, ...params) {
    statements.push({ sql, params })
    return 1
  },
  async $transaction(operations) {
    return Promise.all(operations)
  },
}

function request(method, body = null) {
  const req = Readable.from(body ? [JSON.stringify(body)] : [])
  req.method = method
  req.headers = {
    origin: 'https://salon-de-lien.com',
    host: 'salon-de-lien.com',
    'x-forwarded-proto': 'https',
  }
  req.socket = { encrypted: false }
  return req
}

function response() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name.toLowerCase()] = value },
    end(value = '') { this.body = String(value) },
  }
}

const service = createContentManagementService({
  prisma,
  staffSessionProvider: async () => session,
  customerSessionProvider: async () => null,
  canAccessThread: () => true,
  resolvePostCover: async reference => reference,
})

const listResponse = response()
await service.handle(
  request('GET'),
  listResponse,
  new URL('https://salon-de-lien.com/api/lien-content-management?audience=staff&scope=posts'),
)
assert.equal(listResponse.statusCode, 200)
assert.deepEqual(JSON.parse(listResponse.body).posts.map(post => post.id), ['post-1'])

const schemaStatements = statements.filter(statement => typeof statement === 'object' && /ALTER TABLE|CREATE INDEX/.test(statement.sql))
assert.equal(schemaStatements.length, 3)
assert.ok(schemaStatements.some(statement => statement.sql.includes('ADD COLUMN IF NOT EXISTS "deletedAt"')))
assert.ok(schemaStatements.some(statement => statement.sql.includes('ADD COLUMN IF NOT EXISTS "deletedByUserId"')))
assert.ok(statements.some(statement => typeof statement === 'string' && statement.includes('p."deletedAt" IS NULL')))

const deleteResponse = response()
await service.handle(
  request('DELETE', { target: 'post', postId: 'post-1' }),
  deleteResponse,
  new URL('https://salon-de-lien.com/api/lien-content-management?audience=staff'),
)
assert.equal(deleteResponse.statusCode, 200)
assert.equal(JSON.parse(deleteResponse.body).archived, true)
assert.ok(statements.some(statement => typeof statement === 'object'
  && statement.sql.includes('SET "published"=FALSE,"deletedAt"=CURRENT_TIMESTAMP,"deletedByUserId"=$1')
  && statement.params[0] === 'staff-1'))
assert.equal(statements.some(statement => typeof statement === 'object'
  && statement.sql.includes('DELETE FROM "VisitCommunityPost"')), false)

console.log('style community recoverable deletion service tests passed')
