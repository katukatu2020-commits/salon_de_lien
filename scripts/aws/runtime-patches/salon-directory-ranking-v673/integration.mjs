import assert from 'node:assert/strict'
import fs from 'node:fs'
import crypto from 'node:crypto'
import http from 'node:http'
import vm from 'node:vm'
import { createRequire } from 'node:module'
if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL is required')
const require = createRequire('/app/package.json')
const { PrismaClient } = require('@prisma/client')
const directory = require('/app/salon-directory-ranking-v673.js')
const schema = 'directory_' + crypto.randomBytes(6).toString('hex')
const url = new URL(process.env.TEST_DATABASE_URL)
const bootstrap = new PrismaClient({ datasources: { db: { url: url.href } } })
await bootstrap.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
url.searchParams.set('schema', schema)
const db = new PrismaClient({ datasources: { db: { url: url.href } } })
process.env.CUSTOMER_AUTH_SECRET = 'directory-v673-fixture-secret-only-000000000000000000'
const profile = require('/app/store-profile.js').createStoreProfileService({ prisma: db, crypto })
const session = { role: 'CUSTOMER', userId: 'user-a', customerId: 'customer-a', organizationId: 'org-a', subject: 'customer@example.test' }
const serverSource = fs.readFileSync('/app/server.js', 'utf8')
const shellStart = serverSource.indexOf('function htmlEscape(value) {')
const shellEnd = serverSource.indexOf('\nasync function customerAppData(')
assert.ok(shellStart > 0 && shellEnd > shellStart)
const renderCustomerShell = vm.runInNewContext(serverSource.slice(shellStart, shellEnd) + '\ncustomerShell')
const links = require('/app/customer-links-v293.js').createCustomerLinkService({
  prisma: db, staffSessionProvider: async () => null,
  customerSessionProvider: async req => req.headers.cookie?.includes('fixture=customer') ? session : null,
  renderCustomerShell,
})
const assets = ['salon-directory-ranking-v673-client.js', 'salon-directory-ranking-v673.css', 'customer-link-ui-v424.js', 'customer-experience-v503.js', 'customer-native-shell-v92.css', 'customer-mobile-nav-v425.css', 'ui-transition-v661.js']
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost')
    if (assets.includes(u.pathname.slice(1))) { res.setHeader('Content-Type', u.pathname.endsWith('.css') ? 'text/css' : 'application/javascript'); res.end(fs.readFileSync((fs.existsSync('/app' + u.pathname) ? '/app' : '/app/public') + u.pathname)); return }
    if (['/brand/orimia-icon-180.png','/brand/orimia-icon-192.png','/brand/orimia-icon-32.png'].includes(u.pathname)) { res.setHeader('Content-Type','image/png'); res.end(fs.readFileSync('/app/public' + u.pathname)); return }
    if (u.pathname === '/api/customer/session') { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({authenticated:true,...session})); return }
    if (u.pathname === '/api/lien-store-icon') { res.setHeader('Content-Type', 'image/png'); res.end(fs.readFileSync('/app/public/brand/orimia-icon-192.png')); return }
    if (u.pathname === '/favicon.ico') { res.statusCode = 204; res.end(); return }
    if (await links.handle(req, res, u)) return
    res.statusCode = 404; res.end('Not found')
  } catch (error) { console.error(error); res.statusCode = 500; res.end('Fixture error') }
})
let base, keeping = false
async function request(path, body, cookie = 'fixture=customer', origin) {
  const r = await fetch(base + path, { method: body ? 'POST' : 'GET', redirect: 'manual', headers: { Cookie: cookie, ...(body ? { Origin: origin || base, 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const text = await r.text(); let data; try { data = JSON.parse(text) } catch {}
  return { status: r.status, headers: r.headers, data, text }
}
async function cleanup() {
  await new Promise(resolve => server.close(resolve))
  await db.$disconnect()
  await bootstrap.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`)
  await bootstrap.$disconnect()
}
try {
  for (const sql of [
    `CREATE TABLE "Organization" ("id" TEXT PRIMARY KEY,"slug" TEXT UNIQUE,"name" TEXT NOT NULL,"publicCode" TEXT,"updatedAt" TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE "AppUser" ("id" TEXT PRIMARY KEY,"organizationId" TEXT,"customerId" TEXT,"email" TEXT,"loginId" TEXT,"displayName" TEXT,"role" TEXT NOT NULL,"active" BOOLEAN DEFAULT TRUE,"updatedAt" TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE "CustomerStoreLink" ("id" TEXT PRIMARY KEY,"appUserId" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"customerId" TEXT NOT NULL,"createdAt" TIMESTAMPTZ DEFAULT NOW(),UNIQUE("appUserId","organizationId"))`,
    `CREATE TABLE "Customer" ("id" TEXT PRIMARY KEY,"organizationId" TEXT NOT NULL,"name" TEXT NOT NULL,"deletedAt" TIMESTAMPTZ,"storeHiddenAt" TIMESTAMPTZ)`,
    `CREATE TABLE "CustomerMergeHistory" ("sourceCustomerId" TEXT PRIMARY KEY,"targetCustomerId" TEXT,"organizationId" TEXT)`,
    `CREATE TABLE "CustomerRegistrationInvite" ("id" TEXT PRIMARY KEY,"organizationId" TEXT,"customerId" TEXT,"email" TEXT,"usedAt" TIMESTAMPTZ)`,
    `CREATE TABLE "Visit" ("id" TEXT PRIMARY KEY,"customerId" TEXT,"visitedAt" TIMESTAMP(3) NOT NULL)`,
    `CREATE INDEX ON "Visit" ("customerId","visitedAt")`,
  ]) await db.$executeRawUnsafe(sql)
  await profile.ensureSchema()
  await directory.ensureSchema(db)
  for (const [id, name, prefecture, visits] of [
    ['a', 'Salon de Lien', '岡山', 2], ['b', 'ヘアサロン ハレルヤ', '岡山県', 6], ['c', '東京サロン', '東京都', 10],
    ['d', '倉敷サロン', '岡山県', 4], ['e', '京都サロン', '京都府', 0], ['f', '札幌サロン', '北海道', 0],
    ['g', '神戸サロン', '兵庫県', 0], ['h', '住所未設定サロン', null, 0], ['hidden', '非公開サロン', '岡山県', 90], ['offline', '停止中サロン', '東京都', 80],
  ]) {
    await db.$executeRawUnsafe('INSERT INTO "Organization" ("id","slug","name","publicCode") VALUES ($1,$1,$2,$1)', 'org-'+id, name)
    await db.$executeRawUnsafe(`INSERT INTO "AppUser" ("id","organizationId","role","active") VALUES ($1,$2,'ADMIN',$3)`, 'staff-'+id, 'org-'+id, id !== 'offline')
    await db.$executeRawUnsafe('INSERT INTO "OrganizationStoreProfile" ("organizationId","prefecture","city","addressLine1","phone","orimiaPublished") VALUES ($1,$2,$3,$4,$5,$6)', 'org-'+id, prefecture, id === 'a' ? '岡山市北区' : '中央区', '駅前町1-1-1', '000-1234-5678', id !== 'hidden')
    await db.$executeRawUnsafe('INSERT INTO "Customer" ("id","organizationId","name") VALUES ($1,$2,$3)', 'customer-'+id, 'org-'+id, '検証 花子')
    for (let i=0; i<visits; i++) await db.$executeRawUnsafe(`INSERT INTO "Visit" ("id","customerId","visitedAt") VALUES ($1,$2,(NOW() AT TIME ZONE 'UTC') - INTERVAL '1 day')`, id+'-'+i, 'customer-'+id)
  }
  await db.$executeRawUnsafe(`INSERT INTO "AppUser" ("id","organizationId","customerId","email","role") VALUES ('user-a','org-a','customer-a','customer@example.test','CUSTOMER'),('user-other','org-e','customer-other','other@example.test','CUSTOMER')`)
  for (const id of ['a','b','hidden','offline']) await db.$executeRawUnsafe('INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId") VALUES ($1,$2,$3,$4)', 'link-'+id, 'user-a', 'org-'+id, 'customer-'+id)
  // Duplicate ownership of A/B, invitation-only C, and previously unlinked D.
  for (const id of ['a','b','c']) await db.$executeRawUnsafe(`INSERT INTO "CustomerRegistrationInvite" ("id","organizationId","customerId","email","usedAt") VALUES ($1,$2,$3,'CUSTOMER@example.test',NOW())`, 'invite-'+id, 'org-'+id, 'customer-'+id)
  await db.$executeRawUnsafe(`INSERT INTO "CustomerStoreExclusion" ("id","appUserId","organizationId","customerId") VALUES ('exclusion-d','user-a','org-d','customer-d')`)
  await db.$executeRawUnsafe(`INSERT INTO "Customer" ("id","organizationId","name","deletedAt") VALUES ('customer-other','org-e','検証 花子',NULL),('customer-deleted','org-f','検証 花子',NOW())`)
  await db.$executeRawUnsafe(`INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId") VALUES ('link-other','user-other','org-e','customer-other'),('link-deleted','user-a','org-f','customer-deleted')`)
  for (const [id, customer, used] of [['unused','customer-other',false],['deleted','customer-deleted',true]]) await db.$executeRawUnsafe(`INSERT INTO "CustomerRegistrationInvite" ("id","organizationId","customerId","email","usedAt") VALUES ($1,$2,$3,'customer@example.test',CASE WHEN $4 THEN NOW() ELSE NULL END)`, id, id === 'deleted' ? 'org-f' : 'org-e', customer, used)
  for (let i=0; i<20; i++) {
    await db.$executeRawUnsafe(`INSERT INTO "Visit" ("id","customerId","visitedAt") VALUES ($1,'customer-other',(NOW() AT TIME ZONE 'UTC')-INTERVAL '1 day'),($2,'customer-deleted',(NOW() AT TIME ZONE 'UTC')-INTERVAL '1 day'),($3,'customer-a',(NOW() AT TIME ZONE 'UTC')+INTERVAL '1 day')`, 'other-'+i, 'deleted-'+i, 'future-'+i)
  }
  const rows = await directory.availableStores(db, session)
  assert.deepEqual(rows.slice(0,4).map(s => [s.organizationId,s.visitCount]), [['org-c',10],['org-b',6],['org-d',4],['org-a',2]])
  assert.equal(rows.length, 8, 'no five-store limit; hidden and inactive salons excluded')
  assert.equal(rows.find(s => s.organizationId === 'org-a').prefecture, '岡山県')
  assert.ok(rows.slice(4).every(s => s.visitCount === 0), 'never visited/deleted/other customer visits not counted')
  assert.deepEqual((await directory.availableStores(db, { ...session, organizationId:'org-b' })).map(s => s.organizationId), rows.map(s => s.organizationId), 'current store does not override ranking')
  assert.equal((await directory.availableStores(db, { userId:'user-other', organizationId:'org-e' }))[0].visitCount, 20)
  assert.ok((await directory.availableStores(db, { userId:'missing', organizationId:'org-a' })).every(s => s.visitCount === 0))
  assert.deepEqual(directory.groupStores(rows).find(g => g.prefecture === '岡山県').stores.map(s => s.visitCount), [6,4,2])
  const markup = directory.renderDirectory(rows)
  assert.doesNotMatch(markup, /登録を解除|新しい店舗を登録|QRを読み取る/)
  assert.match(markup, /すべての都道府県/)
  assert.equal((markup.match(/<option /g) || []).length, 49)
  assert.doesNotMatch(directory.renderDirectory([{ ...rows[0], name:'<script>alert(1)</script>', organizationId:'" onmouseover="alert(1)' }]), /<script>alert|onmouseover="alert/)
  await new Promise(resolve => server.listen(Number(process.env.PORT || 3173), '0.0.0.0', resolve))
  base = 'http://127.0.0.1:' + server.address().port; process.env.APP_URL = base
  const api = await request('/api/lien-customer-stores')
  assert.equal(api.status, 200)
  assert.match(api.headers.get('cache-control'), /private, no-store/)
  assert.deepEqual(api.data.stores.map(s => s.organizationId), rows.map(s => s.organizationId))
  assert.equal(api.data.registrationRequired, false)
  assert.equal((await request('/api/lien-customer-stores', undefined, '')).status, 401)
  assert.equal((await request('/api/lien-customer-stores', { action:'switch',organizationId:'org-b' }, 'fixture=customer','https://foreign.test')).status, 403)
  for (const action of ['link','unlink']) assert.equal((await request('/api/lien-customer-stores', { action, organizationId:'org-b' })).status, 410)
  for (const id of ['hidden','offline']) assert.equal((await request('/api/lien-customer-stores', { action:'switch',organizationId:'org-'+id })).status, 404)
  const switched = await request('/api/lien-customer-stores', { action:'switch',organizationId:'org-b' })
  assert.equal(switched.status, 200, switched.text)
  assert.equal(switched.data.redirect, '/u/home')
  assert.match(switched.headers.get('set-cookie'), /lien_customer_session=/)
  const page = await request('/u/stores')
  assert.equal(page.status,200)
  assert.match(page.headers.get('cache-control'), /no-store/)
  assert.ok(page.text.indexOf('data-organization-id="org-c"') < page.text.indexOf('data-organization-id="org-b"'))
  console.log(JSON.stringify({ release:'salon-directory-ranking-v673', integrationVerified:true, ownVisitsOnly:true, deduplicated:true, pastVisitsOnly:true, publicStores:rows.length, switchApiVerified:true }))
  if (process.env.KEEP_TEST_SERVER === '1') {
    keeping = true
    process.on('SIGTERM', () => cleanup().then(() => process.exit(0)))
    process.on('SIGINT', () => cleanup().then(() => process.exit(0)))
    console.log('V673_BROWSER_READY ' + base)
  }
} finally { if (!keeping) await cleanup() }
