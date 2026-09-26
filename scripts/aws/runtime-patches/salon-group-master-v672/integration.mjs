import assert from 'node:assert/strict'
import fs from 'node:fs'
import crypto from 'node:crypto'
import http from 'node:http'
import { createRequire } from 'node:module'
if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL is required')
const require = createRequire('/app/package.json')
const { PrismaClient } = require('@prisma/client')
const { createSalonGroupMaster, monthRange } = require('/app/salon-group-master-v672.js')
const { createBusinessAccountApprovalService, passwordHash, verifyPassword } = require('/app/business-account-approvals-v643.js')
const { createManagedAccountAccessService } = require('/app/managed-account-access-v629.js')
const { createBusinessInquiryService } = require('/app/business-inquiries-v637.js')
const schema = 'salon_group_' + crypto.randomBytes(6).toString('hex')
const url = new URL(process.env.TEST_DATABASE_URL)
url.searchParams.set('connection_limit', '8')
const bootstrap = new PrismaClient({ datasources: { db: { url: url.href } } })
await bootstrap.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
url.searchParams.set('schema', schema)
const db = new PrismaClient({ datasources: { db: { url: url.href } } })
process.env.ADMIN_AUTH_SECRET = 'salon-group-v672-fixture-secret-only-000000000000000000'
const password = 'Fixture-v672-Only!'
const mails = []
function token(user) {
  const payload = Buffer.from(JSON.stringify({ version: 2, role: user.role, userId: user.id, organizationId: user.organizationId, subject: user.email, issuedAt: Math.floor(Date.now()/1000), expiresAt: Math.floor(Date.now()/1000)+3600, sessionId: crypto.randomUUID() })).toString('base64url')
  return payload + '.' + crypto.createHmac('sha256', process.env.ADMIN_AUTH_SECRET).update(payload).digest('base64url')
}
async function sessionProvider(req) {
  const raw = String(req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('lien_admin_session='))?.slice(19)
  if (!raw) return null
  try {
    const [body, signature] = raw.split('.')
    const expected = crypto.createHmac('sha256', process.env.ADMIN_AUTH_SECRET).update(body).digest('base64url')
    if (signature !== expected) return null
    const payload = JSON.parse(Buffer.from(body, 'base64url'))
    if (payload.expiresAt < Date.now()/1000) return null
    const rows = await db.$queryRawUnsafe('SELECT * FROM "AppUser" WHERE "id"=$1 AND "organizationId"=$2 AND "active"=TRUE', payload.userId, payload.organizationId)
    return rows[0] ? { ...payload, role: rows[0].role, isSharedStoreAccount: rows[0].isSharedStoreAccount } : null
  } catch { return null }
}
const approval = createBusinessAccountApprovalService({ prisma: db, crypto, adminSessionProvider: sessionProvider, dealerSessionProvider: async () => null, operatorSession: () => null, renderPlatformPage: () => '', mailSender: async () => '' })
const service = createSalonGroupMaster({ prisma: db, crypto, sessionProvider, mailSender: async mail => { mails.push(mail); if (mail.to === 'fail@example.test') throw Error('Fixture SMTP failure'); return 'fixture-mail' } })
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost')
    if (u.pathname === '/fixture/login') {
      const chunks = []; for await (const chunk of req) chunks.push(chunk)
      const input = JSON.parse(Buffer.concat(chunks).toString())
      const rows = await db.$queryRawUnsafe('SELECT * FROM "AppUser" WHERE "loginId"=$1 AND "active"=TRUE', input.loginId)
      if (!rows[0] || !verifyPassword(crypto, input.password, rows[0].passwordHash)) { res.statusCode = 401; res.end(); return }
      res.setHeader('Set-Cookie', 'lien_admin_session=' + token(rows[0]) + '; Path=/; HttpOnly; SameSite=Lax'); res.end('OK'); return
    }
    if (await approval.handle(req, res, u)) return
    if (await service.handle(req, res, u)) return
    if (u.pathname === '/admin/settings') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end('<html><head><meta charset="utf-8"><link rel="stylesheet" href="/salon-group-master-v672.css"><script src="/salon-group-master-v672-client.js" defer></script></head><body><section id="store-profile" data-ca-store-settings="1"><header class="ca-setup-hero"><h2>店舗基本設定</h2></header><input aria-label="店舗名" value="Salon de Lien"></section></body></html>'); return
    }
    if (u.pathname.startsWith('/brand/') || u.pathname === '/api/lien-store-icon') { res.setHeader('Content-Type', 'image/png'); res.end(fs.readFileSync('/app/public/brand/orimia-icon-192.png')); return }
    if (u.pathname === '/favicon.ico') { res.statusCode = 204; res.end(); return }
    res.statusCode = 404; res.end('Not found')
  } catch (error) { console.error(error); res.statusCode = 500; res.end('Fixture error') }
})
let base
async function request(path, cookie = '', body, origin) {
  const r = await fetch(base + path, { method: body ? 'POST' : 'GET', redirect: 'manual', headers: { Cookie: cookie, ...(body ? { Origin: origin || base, 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const content = await r.text(); let data; try { data = JSON.parse(content) } catch {}
  return { status: r.status, headers: r.headers, data, content }
}
async function login(loginId, pass = password) { const r = await request('/fixture/login', '', { loginId, password: pass }); assert.equal(r.status, 200); return r.headers.get('set-cookie').split(';')[0] }
async function ok(path, cookie, body) { const r = await request('/api/admin/salon-master' + path, cookie, body); assert.ok([200,201].includes(r.status), `${path}: ${r.status} ${r.content}`); return r.data }
let keeping = false
async function cleanup() {
  await new Promise(resolve => server.close(resolve))
  await db.$disconnect()
  await bootstrap.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`)
  await bootstrap.$disconnect()
}
try {
  for (const sql of fs.readFileSync('/tmp/lien-v672/fixture.sql', 'utf8').split(';').map(v => v.trim()).filter(Boolean)) {
    const table = sql.match(/^CREATE TABLE "([A-Za-z]+)"/)[1]
    await db.$executeRawUnsafe(process.env.TEST_USE_PUBLIC_SCHEMA === '1' ? `CREATE TABLE "${table}" (LIKE public."${table}" INCLUDING ALL)` : sql)
  }
  await approval.ensureSchema()
  await createBusinessInquiryService({ prisma: db, crypto }).ensureSchema()
  await createManagedAccountAccessService({ prisma: db, crypto }).ensureSchema()
  await require('/app/store-profile.js').createStoreProfileService({ prisma: db, crypto }).ensureSchema()
  await service.ensureSchema(); await service.ensureSchema()
  await db.$executeRawUnsafe(`INSERT INTO "BillingPlan" ("planKey","displayName","monthlyAmount","active") VALUES ('take','竹プラン',12800,TRUE)`)
  for (const [id, name] of [['a','Salon de Lien'],['b','Salon de Lien 岡山駅前'],['x','別会社のサロン'],['c','Salon de Lien 倉敷']]) {
    await db.$executeRawUnsafe('INSERT INTO "Organization" ("id","name","slug","publicCode") VALUES ($1,$2,$1,$1)', 'org-'+id, name)
    await db.$executeRawUnsafe(`INSERT INTO "AppUser" ("id","organizationId","email","loginId","passwordHash","role","updatedAt") VALUES ($1,$2,$3,$4,$5,'ADMIN',NOW())`, 'owner-'+id, 'org-'+id, id+'@example.test', 'owner-'+id, passwordHash(crypto, password))
    await db.$executeRawUnsafe(`INSERT INTO "OrganizationBilling" ("organizationId","planKey","subscriptionStatus") VALUES ($1,'take','active')`, 'org-'+id)
    await db.$executeRawUnsafe(`INSERT INTO "OrganizationStoreProfile" ("organizationId","prefecture","city") VALUES ($1,'岡山県','岡山市')`, 'org-'+id)
    await db.$executeRawUnsafe('INSERT INTO "Customer" ("id","organizationId","name","updatedAt") VALUES ($1,$2,$1,NOW())', 'customer-'+id, 'org-'+id)
    await db.$executeRawUnsafe('INSERT INTO "StaffBookingSetting" ("id","organizationId","staffKey","staffName","updatedAt") VALUES ($1,$2,$1,$1,NOW())', 'staff-'+id, 'org-'+id)
  }
  await db.$executeRawUnsafe(`INSERT INTO "AppUser" ("id","organizationId","email","loginId","passwordHash","role","isSharedStoreAccount","updatedAt") VALUES ('shared','org-a','shared@example.test','shared',$1,'STAFF',TRUE,NOW()),('second-admin','org-a','second@example.test','second-admin',$1,'ADMIN',FALSE,NOW())`, passwordHash(crypto, password))
  await new Promise(resolve => server.listen(Number(process.env.PORT || 3172), '0.0.0.0', resolve))
  base = 'http://127.0.0.1:' + server.address().port; process.env.APP_URL = base
  const a = await login('owner-a'), b = await login('owner-b'), x = await login('owner-x'), shared = await login('shared'), second = await login('second-admin')
  assert.equal((await request('/admin/salon-master')).status, 302)
  assert.equal((await request('/api/admin/salon-master/data')).status, 401)
  assert.equal((await request('/api/admin/salon-master/data', shared)).status, 403)
  assert.equal((await ok('/data', a)).rows.length, 1)
  assert.equal((await db.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM "SalonGroup"'))[0].n, 0, 'GET must not create groups')
  assert.equal((await request('/api/admin/salon-master/link', a, { loginId: 'owner-b', password }, 'https://foreign.test')).status, 403)
  assert.equal((await request('/api/admin/salon-master/link', a, { loginId: 'owner-b', password: 'wrong' })).status, 400)
  await ok('/link', a, { loginId: 'owner-b', password })
  assert.equal((await ok('/data', a)).rows.length, 2)
  assert.equal((await request('/api/admin/salon-master/data', b)).status, 403, 'branch owner cannot see the entire group')
  assert.equal((await request('/api/admin/salon-master/data', second)).status, 403)
  assert.equal((await request('/api/admin/salon-master/link', x, { loginId: 'owner-b', password })).status, 409)
  assert.equal((await ok('/data', x)).rows.length, 1)
  assert.equal((await request('/api/admin/salon-master/data?store=org-x', a)).status, 404)
  assert.equal((await request('/api/admin/salon-master/data?month=2026-13', a)).status, 400)
  assert.equal(monthRange('2026-09').start.toISOString(), '2026-08-31T15:00:00.000Z')
  for (const [id, customer, amount, date] of [
    ['before','a',1000,'2026-08-31T14:59:59Z'],['start','a',6000,'2026-08-31T15:00:00Z'],['end','a',9000,'2026-09-30T14:59:59Z'],['after','a',77000,'2026-09-30T15:00:00Z'],['branch','b',12000,'2026-09-14T00:00:00Z'],['foreign','x',990000,'2026-09-12T00:00:00Z'],['january','a',3000,'2025-12-31T15:00:00Z']
  ]) await db.$executeRawUnsafe('INSERT INTO "ServiceSale" ("id","customerId","amount","paidAt","title") VALUES ($1,$2,$3,$4,$1)', id, 'customer-'+customer, amount, new Date(date))
  await db.$executeRawUnsafe(`INSERT INTO "Appointment" ("id","customerId","scheduledAt","status","updatedAt") VALUES ('booking','customer-a','2026-09-15 02:00:00','予約確定',NOW()),('cancelled','customer-a','2026-09-15 02:00:00','キャンセル',NOW()),('outside','customer-a','2026-10-15 02:00:00','予約確定',NOW())`)
  const report = await ok('/data?month=2026-09', a)
  assert.equal(report.summary.revenue, 27000); assert.equal(report.summary.previousRevenue, 1000)
  assert.equal(report.summary.saleCount, 3); assert.equal(report.summary.bookings, 1)
  assert.equal(report.summary.customers, 2); assert.equal(report.trend.length, 12)
  assert.equal(report.trend.find(t => t.month === '2026-01').amount, 3000)
  assert.equal((await ok('/data?month=2026-09&store=org-b', a)).summary.revenue, 12000)
  const input = { name: 'Salon de Lien 表町', ownerName: '店舗管理者', email: 'new-branch@example.test', phone: '086-123-4567', prefecture: '岡山県', city: '岡山市', address: '表町1-2-3', confirmed: true, planKey: 'take', monthlyAmount: 12800, requestKey: crypto.randomUUID() }
  assert.equal((await request('/api/admin/salon-master/stores', a, { ...input, email: 'a@example.test' })).status, 409)
  const created = await ok('/stores', a, input)
  assert.ok(created.emailSent); assert.ok(created.initialPassword.length > 15); assert.equal(mails.length, 1)
  assert.equal((await ok('/stores', a, input)).alreadyCreated, true)
  assert.equal((await ok('/data', a)).rows.length, 3)
  const saved = (await db.$queryRawUnsafe('SELECT * FROM "OrganizationStoreProfile" WHERE "organizationId"=$1', created.organizationId))[0]
  assert.equal(saved.orimiaPublished, false)
  const newCookie = await login(created.loginId, created.initialPassword)
  assert.equal((await request('/api/admin/salon-master/data', newCookie)).status, 428)
  assert.equal((await request('/admin/password-change', newCookie)).status, 200)
  assert.equal((await request('/api/admin/salon-master/stores', a, { ...input, email: 'price-mismatch@example.test', requestKey: crypto.randomUUID(), monthlyAmount: 0 })).status, 409)
  assert.equal((await request('/api/admin/salon-master/stores', shared, input)).status, 403)
  assert.equal((await request('/api/admin/salon-master/stores', a, { ...input, requestKey: crypto.randomUUID(), prefecture: 'Invalid' })).status, 400)
  const failed = await ok('/stores', a, { ...input, requestKey: crypto.randomUUID(), email: 'fail@example.test' })
  assert.equal(failed.emailSent, false); assert.ok(failed.initialPassword)
  const concurrentInput = { ...input, name: '同時登録確認', email: 'concurrent@example.test', requestKey: crypto.randomUUID() }
  const concurrent = await Promise.all([ok('/stores', a, concurrentInput), ok('/stores', a, concurrentInput)])
  assert.equal(concurrent[0].organizationId, concurrent[1].organizationId)
  assert.equal(concurrent.filter(r => r.alreadyCreated).length, 1)
  await db.$executeRawUnsafe(`INSERT INTO "BusinessAccountControl" ("accountType","targetId","status") VALUES ('SALON','org-a','SUSPENDED')`)
  assert.equal((await request('/api/admin/salon-master/data', a)).status, 403)
  await db.$executeRawUnsafe(`DELETE FROM "BusinessAccountControl" WHERE "targetId"='org-a'`)
  for (let i=0;i<5;i++) assert.equal((await request('/api/admin/salon-master/link', x, { loginId: 'nonexistent', password })).status, i < 4 ? 400 : 429)
  const page = await request('/admin/salon-master?month=2026-09', a)
  assert.equal(page.status, 200); assert.match(page.headers.get('cache-control'), /no-store/)
  assert.match(page.content, /27,000円/); assert.doesNotMatch(page.content, /別会社のサロン/)
  console.log(JSON.stringify({ release: 'salon-group-master-v672', isolation: true, ownerOnly: true, atomicRegistration: true, initialPasswordGate: true, jstTotals: true, emailFailureRecovery: true, originProtection: true }))
  if (process.env.KEEP_TEST_SERVER === '1') {
    keeping = true
    console.log('V672_BROWSER_READY ' + base)
    process.on('SIGTERM', async () => { await cleanup(); process.exit(0) })
    process.on('SIGINT', async () => { await cleanup(); process.exit(0) })
  }
} finally { if (!keeping) await cleanup() }
