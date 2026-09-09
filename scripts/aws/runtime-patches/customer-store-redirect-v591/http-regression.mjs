import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
const require = createRequire('/app/package.json')
const { PrismaClient } = require('@prisma/client')
assert.equal(process.env.ALLOW_LOCAL_SESSION_FIXTURES, 'true', 'disposable local database only')
const prisma = new PrismaClient()
const prefix = 'qa-v591-http-'
const ids = ['canonical', 'source', 'target'].map(x => prefix + x)
const userId = prefix + 'user'
const organizationId = 'org_showcase_yohaku'
const base = 'http://localhost:3000'
const now = Math.floor(Date.now() / 1000)
const payload = { version: 1, role: 'CUSTOMER', userId, customerId: ids[0], organizationId: 'org_salon_de_lien', subject: prefix + '@example.invalid', issuedAt: now, expiresAt: now + 3600, sessionId: crypto.randomUUID() }
function sign(value) {
  const encoded = Buffer.from(JSON.stringify(value)).toString('base64url')
  return 'lien_customer_session=' + encoded + '.' + crypto.createHmac('sha256', process.env.ADMIN_AUTH_SECRET).update(encoded).digest('base64url')
}
async function trace(cookie, route) {
  const hops = []
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(base + route, { redirect: 'manual', headers: { Cookie: cookie, Accept: 'text/html' } })
    const location = res.headers.get('location')
    hops.push({ route, status: res.status, location })
    if (!location) { assert.equal(res.status, 200, JSON.stringify(hops)); return hops }
    route = new URL(location, base).pathname
  }
  assert.fail('redirect loop: ' + JSON.stringify(hops))
}
async function cleanup() {
  await prisma.$executeRawUnsafe('DELETE FROM "CustomerMergeHistory" WHERE "id"=$1', prefix + 'merge')
  await prisma.customerStoreLink.deleteMany({ where: { appUserId: userId } })
  await prisma.appUser.deleteMany({ where: { id: userId } })
  await prisma.customer.deleteMany({ where: { id: { in: ids } } })
}
try {
  await cleanup()
  await prisma.customer.createMany({ data: ids.map((id, index) => ({ id, name: id, organizationId: index ? organizationId : 'org_salon_de_lien', storeHiddenAt: index === 1 ? new Date() : null })) })
  await prisma.appUser.create({ data: { id: userId, organizationId: 'org_salon_de_lien', customerId: ids[0], email: payload.subject, role: 'CUSTOMER', active: true } })
  await prisma.customerStoreLink.createMany({ data: [{ id: prefix + 'link-a', appUserId: userId, organizationId: 'org_salon_de_lien', customerId: ids[0] }, { id: prefix + 'link-b', appUserId: userId, organizationId, customerId: ids[1] }] })
  await prisma.$executeRawUnsafe(`INSERT INTO "CustomerMergeHistory" ("id","organizationId","sourceCustomerId","targetCustomerId","actorDisplayName","actorRole","sourceSnapshotJson","targetSnapshotJson","resultJson") VALUES ($1,$2,$3,$4,'QA','ADMIN','{}','{}','{}')`, prefix + 'merge', organizationId, ids[1], ids[2])
  const canonicalCookie = sign(payload)
  const oldCookie = sign({ ...payload, organizationId, customerId: ids[1] })
  const switched = await fetch(base + '/api/lien-customer-stores', { method: 'POST', redirect: 'manual', headers: { Cookie: canonicalCookie, Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'switch', organizationId }) })
  assert.equal(switched.status, 409)
  assert.equal(switched.headers.get('set-cookie'), null)
  const staleTrace = await trace(oldCookie, '/u/home')
  assert.deepEqual(staleTrace.map(hop => hop.route), ['/u/home', '/u/login'])
  assert.equal((await trace(canonicalCookie, '/u/home')).length, 1)
  await prisma.customerStoreLink.update({ where: { id: prefix + 'link-b' }, data: { customerId: ids[2] } })
  assert.equal((await trace(oldCookie, '/u/home')).length, 1)
  assert.deepEqual((await trace(oldCookie, '/u/login')).map(hop => hop.route), ['/u/login', '/u/home'])
  for (const route of ['/u/appointments', '/u/history', '/u/profile']) assert.equal((await trace(oldCookie, route)).length, 1, route)
  for (const cookie of [sign({ ...payload, expiresAt: now - 1 }), sign({ ...payload, subject: 'wrong-account' }), canonicalCookie + 'tampered']) {
    assert.equal((await trace(cookie, '/u/home')).at(-1).route, '/u/login')
  }
  console.log(JSON.stringify({ release: 'customer-store-redirect-v591', staleTrace, mergedCookieAcrossNextPages: true, invalidSwitchPreservesSession: true, expiredAndTamperedRejected: true }))
} finally { await cleanup(); await prisma.$disconnect() }
