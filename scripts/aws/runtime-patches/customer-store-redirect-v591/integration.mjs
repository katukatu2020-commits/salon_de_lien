import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import fs from 'node:fs'
import vm from 'node:vm'
const require = createRequire('/app/package.json')
const { PrismaClient } = require('@prisma/client')
const { resolveCustomerSession } = require('/app/customer-session-v591.js')
const { createCustomerLinkService } = require('/app/customer-links-v293.js')
const url = new URL(process.env.TEST_DATABASE_URL)
const schema = 'customer_v591_' + randomUUID().replaceAll('-', '')
const admin = new PrismaClient({ datasources: { db: { url: url.toString() } } })
await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
url.searchParams.set('schema', schema)
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } })
let session = { version: 1, role: 'CUSTOMER', userId: 'u', subject: 'member', customerId: 'a', organizationId: 'org-a' }
const original = { ...session }
const server = fs.readFileSync('/app/server.js', 'utf8')
const auth = server.slice(server.indexOf('async function chatSession(req, audience)'), server.indexOf('function canAccessThread('))
const nodeResolver = vm.runInNewContext(auth + '; chatSession', { require, prisma: db, process, cookies: () => ({}), verifySession: () => session })
const compiled = fs.readFileSync('/app/.next/server/app/u/login/page.js', 'utf8')
const moduleStart = compiled.indexOf('65051:') + '65051:'.length
const moduleEnd = compiled.indexOf('.resolveCustomerSession(a._,e)}}', moduleStart) + '.resolveCustomerSession(a._,e)}}'.length
assert(moduleStart > 5 && moduleEnd > moduleStart)
const factory = vm.runInNewContext('(' + compiled.slice(moduleStart, moduleEnd) + ')', { require })
const exports = {}
const webpack = id => ({ 71615: { cookies: () => ({ get: () => ({ value: 'signed' }) }) }, 13538: { _: db }, 60055: { ib: async () => session, LD: () => 'secret', fh: 'cookie' } })[id]
webpack.d = (target, getters) => { for (const [key, getter] of Object.entries(getters)) Object.defineProperty(target, key, { get: getter }) }
factory({}, exports, webpack)
async function sameDecision(expected) {
  const node = await nodeResolver({}, 'customer')
  const next = await exports.j()
  assert.equal(node?.customerId || null, expected)
  assert.equal(next?.customerId || null, expected)
}
const service = createCustomerLinkService({ prisma: db, staffSessionProvider: async () => null, customerSessionProvider: () => resolveCustomerSession(db, session), renderCustomerShell: value => value.body })
async function request(body, origin = 'http://localhost') {
  const req = Readable.from(body ? [JSON.stringify(body)] : [])
  req.method = body ? 'POST' : 'GET'
  req.headers = { host: 'localhost', origin }
  const res = { statusCode: 200, headers: {}, body: '', setHeader(key, value) { this.headers[key.toLowerCase()] = value }, end(value) { this.body = value } }
  await service.handle(req, res, new URL('http://localhost/api/lien-customer-stores'))
  return res
}
const switchStore = organizationId => request({ action: 'switch', organizationId })
try {
  for (const sql of [
    'CREATE TABLE "Organization" ("id" text PRIMARY KEY,"name" text,"publicCode" text)',
    'CREATE TABLE "Customer" ("id" text PRIMARY KEY,"organizationId" text,"name" text,"deletedAt" timestamp,"storeHiddenAt" timestamp,"createdAt" timestamp DEFAULT NOW())',
    'CREATE TABLE "AppUser" ("id" text PRIMARY KEY,"organizationId" text,"customerId" text,"loginId" text,"email" text,"role" text,"active" boolean)',
    'CREATE TABLE "CustomerStoreLink" ("id" text PRIMARY KEY,"appUserId" text,"organizationId" text,"customerId" text,"createdAt" timestamp DEFAULT NOW(),UNIQUE("appUserId","organizationId"))',
    'CREATE TABLE "CustomerMergeHistory" ("sourceCustomerId" text PRIMARY KEY,"targetCustomerId" text,"organizationId" text)',
    'CREATE TABLE "CustomerRegistrationInvite" ("organizationId" text,"customerId" text,"email" text,"usedAt" timestamp)',
    `INSERT INTO "Organization" VALUES ('org-a','A','STORE-A'),('org-b','B','STORE-B'),('org-c','C','STORE-C')`,
    `INSERT INTO "Customer" ("id","organizationId","name") VALUES ('a','org-a','A'),('b','org-b','B'),('source','org-b','Old B'),('other','org-c','Other member')`,
    `INSERT INTO "AppUser" VALUES ('u','org-a','a','member','member@example.invalid','CUSTOMER',TRUE)`,
    `INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId") VALUES ('link-a','u','org-a','a'),('link-b','u','org-b','b')`,
  ]) await db.$executeRawUnsafe(sql)
  await sameDecision('a')
  const canonical = await db.$queryRawUnsafe('SELECT * FROM "AppUser"')
  let result = await request()
  assert.equal(result.statusCode, 200)
  assert.equal(JSON.parse(result.body).stores.length, 2)
  for (const organizationId of ['org-b', 'org-a', 'org-b']) {
    result = await switchStore(organizationId)
    assert.equal(result.statusCode, 200, result.body)
    const cookie = decodeURIComponent(result.headers['set-cookie'].split(';')[0].split('=')[1])
    session = JSON.parse(Buffer.from(cookie.split('.')[0], 'base64url').toString())
    assert.equal(session.organizationId, organizationId)
    await sameDecision(organizationId === 'org-a' ? 'a' : 'b')
    assert.equal((await resolveCustomerSession(db, original)).customerId, 'a', 'another browser session must not change')
  }
  assert.deepEqual(await db.$queryRawUnsafe('SELECT * FROM "AppUser"'), canonical)
  session = { ...original }
  result = await switchStore('org-c')
  assert.equal(result.statusCode, 404)
  assert.equal(result.headers['set-cookie'], undefined)
  assert.equal((await request({ action: 'switch', organizationId: 'org-b' }, 'https://untrusted.invalid')).statusCode, 403)

  await db.$executeRawUnsafe(`INSERT INTO "CustomerMergeHistory" VALUES ('source','b','org-b')`)
  await db.$executeRawUnsafe(`UPDATE "Customer" SET "storeHiddenAt"=NOW() WHERE "id"='source'`)
  session = { ...original, customerId: 'source', organizationId: 'org-b' }
  await sameDecision('b')
  session = { ...original }
  await db.$executeRawUnsafe(`UPDATE "CustomerStoreLink" SET "customerId"='source' WHERE "id"='link-b'`)
  session = { ...original, customerId: 'source', organizationId: 'org-b' }
  await sameDecision(null)
  session = { ...original }
  result = await switchStore('org-b')
  assert.equal(result.statusCode, 409)
  assert.equal(result.headers['set-cookie'], undefined)
  assert.equal(JSON.parse((await request()).body).stores.length, 1)

  await db.$executeRawUnsafe(`DELETE FROM "CustomerStoreLink" WHERE "id"='link-b'`)
  await db.$executeRawUnsafe(`INSERT INTO "CustomerRegistrationInvite" VALUES ('org-b','source','member@example.invalid',NOW())`)
  assert.equal(JSON.parse((await request()).body).stores.length, 1)
  assert.equal((await db.$queryRawUnsafe(`SELECT * FROM "CustomerStoreLink" WHERE "organizationId"='org-b'`)).length, 0, 'hidden source must not be resurrected from an old invite')
  await db.$executeRawUnsafe(`INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId") VALUES ('link-b','u','org-b','b')`)
  session = { ...original, customerId: 'b', organizationId: 'org-b' }
  for (const field of ['deletedAt', 'storeHiddenAt']) {
    await db.$executeRawUnsafe(`UPDATE "Customer" SET "${field}"=NOW() WHERE "id"='b'`)
    await sameDecision(null)
    session = { ...original }
    assert.equal((await switchStore('org-b')).statusCode, 409)
    await db.$executeRawUnsafe(`UPDATE "Customer" SET "${field}"=NULL WHERE "id"='b'`)
    session = { ...original, customerId: 'b', organizationId: 'org-b' }
  }
  for (const change of [{ organizationId: 'org-c' }, { customerId: 'other' }, { userId: 'unknown' }, { subject: 'not-member' }, { role: 'ADMIN' }]) {
    session = { ...original, ...change }; await sameDecision(null)
  }
  session = { ...original }
  await db.$executeRawUnsafe(`UPDATE "AppUser" SET "active"=FALSE`)
  await sameDecision(null)
  await db.$executeRawUnsafe(`UPDATE "AppUser" SET "active"=TRUE`)
  await db.$executeRawUnsafe(`INSERT INTO "CustomerMergeHistory" VALUES ('b','source','org-b')`)
  session = { ...original, customerId: 'source', organizationId: 'org-b' }
  await sameDecision(null)
  await db.$executeRawUnsafe(`DELETE FROM "CustomerMergeHistory" WHERE "sourceCustomerId"='b'`)
  await sameDecision('b')
  await db.$executeRawUnsafe(`UPDATE "CustomerMergeHistory" SET "targetCustomerId"='other' WHERE "sourceCustomerId"='source'`)
  await sameDecision(null)

  await db.$executeRawUnsafe(`INSERT INTO "CustomerMergeHistory" SELECT 'depth-'||i,CASE WHEN i=16 THEN 'b' ELSE 'depth-'||(i+1) END,'org-b' FROM generate_series(0,16) i`)
  session = { ...original, customerId: 'depth-0', organizationId: 'org-b' }
  await sameDecision(null)
  session.customerId = 'depth-1'
  await sameDecision('b')
  session = { ...original }
  await db.$executeRawUnsafe(`UPDATE "AppUser" SET "loginId"=' Member '`)
  await sameDecision('a')
  console.log(JSON.stringify({ release: 'customer-store-redirect-v591', realPostgres: true, nodeAndNextAgree: true, staleMergeDenied: true, mergedSessionRecovered: true, switchValidation: true, accountUnchanged: true, crossTenantDenied: true, hiddenInvitesExcluded: true, cyclesBounded: true }))
} finally {
  await db.$disconnect()
  await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`)
  await admin.$disconnect()
}
