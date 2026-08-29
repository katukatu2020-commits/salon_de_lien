import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { Readable } from 'node:stream'

const require = createRequire(import.meta.url)
const servicePath = process.env.LIEN_CONTENT_SERVICE || './content-management-v470.js'
const { canManagePost, canManageComment, canManageChatMessage, createContentManagementService } = require(servicePath)

const staff = { userId: 'staff-1', customerId: null, organizationId: 'org-1' }
const customer = { userId: 'user-1', customerId: 'customer-1', organizationId: 'org-1' }

assert.equal(canManagePost(staff, 'staff', { postKind: 'VISIT', customerId: 'customer-1' }), true)
assert.equal(canManagePost(staff, 'staff', { postKind: 'STORE', customerId: null }), true)
assert.equal(canManagePost(customer, 'customer', { postKind: 'VISIT', customerId: 'customer-1' }), true)
assert.equal(canManagePost(customer, 'customer', { postKind: 'VISIT', customerId: 'customer-2' }), false)
assert.equal(canManagePost(customer, 'customer', { postKind: 'STORE', customerId: null }), false)
assert.equal(canManageComment(staff, { appUserId: 'staff-1' }), true)
assert.equal(canManageComment(staff, { appUserId: 'staff-2' }), false)
assert.equal(canManageChatMessage(customer, 'customer', { senderType: 'customer', senderUserId: 'user-1', customerId: 'customer-1' }, () => false), true)
assert.equal(canManageChatMessage(customer, 'customer', { senderType: 'staff', senderUserId: 'user-1', customerId: 'customer-1' }, () => true), false)

function request(method, body = null, headers = {}) {
  const req = Readable.from(body ? [JSON.stringify(body)] : [])
  req.method = method
  req.headers = {
    origin: 'https://salon-de-lien.com',
    host: 'salon-de-lien.com',
    'x-forwarded-proto': 'https',
    ...headers,
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

const statements = []
const prisma = {
  async $queryRawUnsafe(sql) {
    statements.push(sql)
    if (sql.includes('LEFT JOIN LATERAL')) {
      return [
        { id: 'post-public', postKind: 'VISIT', caption: '公開投稿', published: true, publishedAt: new Date('2026-08-01T00:00:00Z'), publishedByName: '', updatedAt: new Date(), coverPhotoReference: '/demo/public.jpg' },
        { id: 'post-hidden', postKind: 'STORE', caption: '非公開投稿', published: false, publishedAt: new Date('2026-07-01T00:00:00Z'), publishedByName: 'staff', updatedAt: new Date(), coverPhotoReference: 's3-private://private/customer-photos/org-1/hidden.jpg' },
      ]
    }
    if (sql.includes('FROM "VisitCommunityComment"')) {
      return [{ id: 'comment-own', appUserId: 'staff-1', body: '編集前コメント', deletedAt: null }]
    }
    if (sql.includes('FROM "VisitCommunityPost"')) {
      return [{ id: 'post-public', organizationId: 'org-1', customerId: 'customer-1', postKind: 'VISIT', published: true, caption: '公開投稿', updatedAt: new Date() }]
    }
    return []
  },
  async $executeRawUnsafe(sql, ...params) {
    statements.push({ sql, params })
    return 1
  },
  async $transaction(operations) { return Promise.all(operations) },
}

const service = createContentManagementService({
  prisma,
  staffSessionProvider: async () => staff,
  customerSessionProvider: async () => customer,
  canAccessThread: () => true,
  resolvePostCover: async reference => `resolved:${reference}`,
})

const listResponse = response()
assert.equal(await service.handle(request('GET'), listResponse, new URL('https://salon-de-lien.com/api/lien-content-management?audience=staff&scope=posts')), true)
assert.equal(listResponse.statusCode, 200)
const listed = JSON.parse(listResponse.body)
assert.deepEqual(listed.posts.map(post => post.published), [true, false])
assert.deepEqual(listed.posts.map(post => post.coverPhotoUrl), [
  'resolved:/demo/public.jpg',
  'resolved:s3-private://private/customer-photos/org-1/hidden.jpg',
])
assert.ok(statements.some(statement => typeof statement === 'string' && statement.includes('WHERE p."organizationId"=$1')))

const visibilityResponse = response()
await service.handle(
  request('PATCH', { target: 'post', action: 'visibility', postId: 'post-public', published: false }),
  visibilityResponse,
  new URL('https://salon-de-lien.com/api/lien-content-management?audience=staff'),
)
assert.equal(visibilityResponse.statusCode, 200)
assert.equal(JSON.parse(visibilityResponse.body).published, false)
assert.ok(statements.some(statement => typeof statement === 'object' && statement.sql.includes('SET "published"=$1') && statement.params[0] === false))

const localVisibilityResponse = response()
await service.handle(
  request(
    'PATCH',
    { target: 'post', action: 'visibility', postId: 'post-public', published: true },
    { origin: 'http://localhost:3099', host: 'localhost:3099', 'x-forwarded-proto': '' },
  ),
  localVisibilityResponse,
  new URL('http://localhost:3099/api/lien-content-management?audience=staff'),
)
assert.equal(localVisibilityResponse.statusCode, 200)
assert.equal(JSON.parse(localVisibilityResponse.body).published, true)

const deleteResponse = response()
await service.handle(
  request('DELETE', { target: 'post', postId: 'post-public' }),
  deleteResponse,
  new URL('https://salon-de-lien.com/api/lien-content-management?audience=staff'),
)
assert.equal(deleteResponse.statusCode, 200)
assert.ok(statements.some(statement => typeof statement === 'object' && statement.sql.includes('DELETE FROM "VisitCommunityPost"')))
assert.equal(statements.some(statement => typeof statement === 'object' && /DELETE FROM "(?:Visit|VisitPhoto)"/.test(statement.sql)), false)

const commentPatchResponse = response()
await service.handle(
  request('PATCH', { target: 'comment', postId: 'post-public', id: 'comment-own', body: '編集後コメント' }),
  commentPatchResponse,
  new URL('https://salon-de-lien.com/api/lien-content-management?audience=staff'),
)
assert.equal(commentPatchResponse.statusCode, 200)
assert.equal(JSON.parse(commentPatchResponse.body).body, '編集後コメント')
assert.ok(statements.some(statement => typeof statement === 'object' && statement.sql.includes('UPDATE "VisitCommunityComment" SET "body"=$1') && statement.params[0] === '編集後コメント'))

const commentDeleteResponse = response()
await service.handle(
  request('DELETE', { target: 'comment', postId: 'post-public', id: 'comment-own' }),
  commentDeleteResponse,
  new URL('https://salon-de-lien.com/api/lien-content-management?audience=staff'),
)
assert.equal(commentDeleteResponse.statusCode, 200)
assert.ok(statements.some(statement => typeof statement === 'object' && statement.sql.includes('UPDATE "VisitCommunityComment" SET "deletedAt"=CURRENT_TIMESTAMP')))

console.log('style community card controls v470 ownership tests passed')
