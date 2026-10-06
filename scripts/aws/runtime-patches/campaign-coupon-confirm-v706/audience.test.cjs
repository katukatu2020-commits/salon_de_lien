'use strict'
const test = require('node:test'), assert = require('node:assert/strict'), { Readable } = require('node:stream')
const audience = require('./audience.cjs')
process.env.ADMIN_AUTH_SECRET = 'isolated-unit-test-key-v706'
const session = { organizationId: 'org-a', userId: 'staff-a', role: 'ADMIN' }
const customers = [
  { id: 'a', name: 'Customer A', gender: '女性', birthYear: 2000, phone: '09000000001', appUsers: [{ email: 'a@example.test' }] },
  { id: 'b', name: 'Customer B', gender: '男性', birthYear: 1990, appUsers: [] },
  { id: 'c', name: 'Customer C', gender: null, birthYear: null, appUsers: [] },
]
const form = extra => new URLSearchParams({ title: 'Test', body: 'Body', deliveryMethod: 'app', audienceGender: 'all', ...extra })
test('gender and age narrow recipients; unknown ages are excluded only for age filters', () => {
  assert.equal(audience.select(customers, audience.criteria(form())).recipients.length, 3)
  assert.deepEqual(audience.select(customers, audience.criteria(form({ audienceGender: 'female', audienceMinAge: '20', audienceMaxAge: '30' })), new Date('2026-10-07')).recipients.map(x => x.id), ['a'])
  assert.equal(audience.select(customers, audience.criteria(form({ audienceMinAge: '1' }))).recipients.length, 2)
})
test('individual selection overrides demographic filters without inventing recipients', () => {
  const input = form({ audienceGender: 'female', audienceMinAge: '100' }); input.append('targetCustomerId', 'b'); input.append('targetCustomerId', 'foreign')
  assert.deepEqual(audience.select(customers, audience.criteria(input)).recipients.map(x => x.id), ['b'])
})
test('email preview excludes customers without an active account email', () => {
  const result = audience.select(customers, audience.criteria(form({ deliveryMethod: 'email' })))
  assert.deepEqual(result.recipients.map(x => x.id), ['a']); assert.equal(result.skipped.length, 2)
})
test('invalid criteria fail before recipient queries', () => {
  for (const extra of [{ audienceGender: 'invalid' }, { audienceMinAge: '-1' }, { audienceMinAge: '30', audienceMaxAge: '20' }, { deliveryMethod: 'external' }]) assert.throws(() => audience.criteria(form(extra)))
})
test('recipient query is tenant scoped and excludes withdrawn and store-hidden customers', async () => {
  let args
  const db = { customer: { findMany: async value => { args = value; return customers } } }
  await audience.resolve(db, 'org-a', form())
  assert.deepEqual(args.where, { organizationId: 'org-a', deletedAt: null, storeHiddenAt: null })
  assert.deepEqual(args.select.appUsers.where, { role: 'CUSTOMER', active: true })
})
test('confirmation binds recipients, sender, tenant and every delivery field', () => {
  const input = form(), now = Date.now(), token = audience.issue(session, input, customers, now)
  const id = audience.verify(session, input, customers, token, now)
  assert.match(id, /^broadcast-confirm-/)
  assert.equal(audience.verify(session, input, customers.slice().reverse(), token, now), id)
  assert.throws(() => audience.verify({ ...session, organizationId: 'other' }, input, customers, token, now))
  assert.throws(() => audience.verify({ ...session, userId: 'other' }, input, customers, token, now))
  assert.throws(() => audience.verify(session, input, customers.slice(1), token, now))
  for (const field of ['title', 'body', 'deliveryMethod', 'couponDiscountRate', 'couponTargetMenu', 'couponEnabled']) {
    const changed = new URLSearchParams(input); changed.set(field, 'changed')
    assert.throws(() => audience.verify(session, changed, customers, token, now))
  }
  assert.throws(() => audience.verify(session, input, customers, token, now + 600001))
  assert.throws(() => audience.verify(session, input, customers, token.slice(0, -3) + 'bad', now))
  assert.throws(() => audience.verify(session, input, customers, null, now))
})
async function request({ user = session, origin = 'http://qa.test', method = 'POST', payload = { entries: [...form()] } } = {}) {
  const req = Readable.from([JSON.stringify(payload)])
  req.method = method; req.headers = { host: 'qa.test', 'x-forwarded-proto': 'http', origin }
  let response, queries = 0
  const service = audience.createService({ prisma: { customer: { findMany: async () => { queries++; return customers } } }, sessionProvider: async () => user, json: (_, status, body) => { response = { status, body } } })
  assert.equal(await service.handle(req, {}, new URL('http://qa.test/api/admin/broadcast-preview')), true)
  return { ...response, queries }
}
test('preview requires staff session, POST and same origin before querying personal data', async () => {
  for (const [input, status] of [[{ user: null }, 401], [{ user: { ...session, role: 'CUSTOMER' } }, 401], [{ origin: 'https://evil.test' }, 403], [{ method: 'GET' }, 405]]) {
    const result = await request(input); assert.equal(result.status, status); assert.equal(result.queries, 0)
  }
})
test('preview lists recipients with masked contacts and cannot create any delivery', async () => {
  const result = await request({ payload: { entries: [...form({ deliveryMethod: 'email' })] } })
  assert.equal(result.status, 200); assert.equal(result.body.recipients.length, 1); assert.equal(result.body.skipped.length, 2)
  assert.equal(result.body.recipients[0].phone, '0001')
  assert.equal(result.body.recipients[0].email, 'a***@example.test')
  assert.ok(result.body.token)
})
test('preflight rejects modified content after preview', async () => {
  const result = await request()
  const valid = await request({ payload: { entries: [...form()], token: result.body.token } })
  assert.equal(valid.status, 200)
  const invalid = await request({ payload: { entries: [...form({ body: 'changed' })], token: result.body.token } })
  assert.equal(invalid.status, 409)
})
