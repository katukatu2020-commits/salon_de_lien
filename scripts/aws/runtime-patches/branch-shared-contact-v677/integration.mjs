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
const schema = 'branch_inquiry_' + crypto.randomBytes(6).toString('hex')
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
const operatorCookie = 'fixture_operator=' + crypto.randomBytes(24).toString('hex')
const approval = createBusinessAccountApprovalService({ prisma: db, crypto, adminSessionProvider: sessionProvider, dealerSessionProvider: async () => null,
  operatorSession: req => req.headers.cookie === operatorCookie ? { subject: 'operator@example.test' } : null,
  renderPlatformPage: (title, body) => '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + '</title></head><body>' + body + '</body></html>',
  mailSender: async mail => { mails.push(mail); if (mail.to === 'fail@example.test') throw Error('Fixture SMTP failure'); return 'fixture-mail' } })
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
  const r = await fetch(base + path, { method: body ? 'POST' : 'GET', redirect: 'manual', headers: { Cookie: cookie, ...(body ? { Origin: origin || base, 'Content-Type': body instanceof URLSearchParams ? 'application/x-www-form-urlencoded' : 'application/json' } : {}) }, ...(body ? { body: body instanceof URLSearchParams ? body : JSON.stringify(body) } : {}) })
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
  await db.$executeRawUnsafe('CREATE TABLE "WholesaleDealer" ("id" TEXT PRIMARY KEY,"loginId" TEXT,"email" TEXT)')
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
  await db.$executeRawUnsafe('DELETE FROM "OrganizationBilling" WHERE "organizationId"=\'org-a\'')
  const noPlanPage = await request('/admin/salon-master', a)
  assert.match(noPlanPage.content, /data-open="sg-create">新店舗を登録/)
  assert.doesNotMatch(noPlanPage.content, /name="planKey"|月額/)
  assert.equal((await request('/api/admin/salon-master/stores', a, input, 'https://foreign.test')).status, 403)
  assert.equal((await request('/api/admin/salon-master/stores', '', input)).status, 401)
  assert.equal((await request('/api/admin/salon-master/stores', b, input)).status, 403)
  const submitted = await ok('/stores', a, input)
  assert.ok(submitted.inquiryId); assert.equal(mails.length, 0)
  assert.equal(submitted.initialPassword, undefined)
  assert.equal((await ok('/stores', a, input)).alreadySubmitted, true)
  assert.equal((await request('/api/admin/salon-master/stores', a, { ...input, name: '変更後' })).status, 409)
  assert.equal((await ok('/data', a)).rows.length, 2, 'No store before operator approval')
  assert.equal((await db.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM "ManagedBusinessAccess"'))[0].n, 0)
  const inquiry = (await db.$queryRawUnsafe('SELECT * FROM "BusinessInquiry" WHERE "id"=$1', submitted.inquiryId))[0]
  assert.equal(inquiry.status, 'new'); assert.equal(inquiry.sourcePath, '/admin/salon-master')
  assert.match(inquiry.message, /新店舗所在地: 岡山県岡山市表町1-2-3/)
  const inbox = await request('/platform/inquiries', operatorCookie)
  assert.match(inbox.content, /系列店の新店舗登録/); assert.match(inbox.content, /Salon de Lien 表町/)
  assert.equal((await request('/platform/inquiries', a)).status, 302)
  const approveInput = email => new URLSearchParams({ accountName: input.name, contactName: input.ownerName, contactEmail: email, planKey: 'take' })
  const approvePath = id => '/api/platform/inquiries/' + id + '/approve'
  assert.equal((await request(approvePath(submitted.inquiryId), a, approveInput(input.email))).status, 302)
  assert.equal((await request(approvePath(submitted.inquiryId), operatorCookie, approveInput(input.email), 'https://foreign.test')).status, 403)
  const approved = await request(approvePath(submitted.inquiryId), operatorCookie, approveInput(input.email))
  assert.match(approved.headers.get('location'), /approved=1&mail=sent/)
  assert.equal(mails.length, 1)
  const access = (await db.$queryRawUnsafe('SELECT * FROM "ManagedBusinessAccess" WHERE "inquiryId"=$1', submitted.inquiryId))[0]
  const created = { organizationId: access.targetId, loginId: access.loginId, initialPassword: mails[0].textBody.match(/初期パスワード: (\S+)/)[1] }
  assert.equal(access.mustChangePassword, true)
  assert.equal((await ok('/data', a)).rows.length, 3)
  const saved = (await db.$queryRawUnsafe('SELECT * FROM "OrganizationStoreProfile" WHERE "organizationId"=$1', created.organizationId))[0]
  assert.equal(saved.orimiaPublished, false)
  const newCookie = await login(created.loginId, created.initialPassword)
  assert.equal((await request('/api/admin/salon-master/data', newCookie)).status, 428)
  assert.equal((await request('/admin/password-change', newCookie)).status, 200)
  assert.equal(saved.prefecture, '岡山県'); assert.equal(saved.addressLine1, input.address)
  assert.equal((await ok('/data', x)).rows.length, 1, 'Approved branch belongs only to the requesting group')
  assert.match((await request(approvePath(submitted.inquiryId), operatorCookie, approveInput(input.email))).headers.get('location'), /error=already/)
  assert.equal((await request('/api/admin/salon-master/stores', shared, input)).status, 403)
  assert.equal((await request('/api/admin/salon-master/stores', a, { ...input, requestKey: crypto.randomUUID(), prefecture: 'Invalid' })).status, 400)
  assert.equal((await request('/api/admin/salon-master/stores', a, { ...input, requestKey: crypto.randomUUID(), phone: '----------' })).status, 400)
  assert.equal((await request('/api/admin/salon-master/stores', a, { ...input, requestKey: crypto.randomUUID(), confirmed: false })).status, 400)
  const failed = await ok('/stores', a, { ...input, requestKey: crypto.randomUUID(), email: 'fail@example.test' })
  assert.match((await request(approvePath(failed.inquiryId), operatorCookie, approveInput('fail@example.test'))).headers.get('location'), /approved=1&mail=failed/)
  assert.match((await request('/platform/inquiries', operatorCookie)).content, /認証情報を再発行してメール送信/)
  const rejected = await ok('/stores', a, { ...input, email: 'rejected@example.test', requestKey: crypto.randomUUID() })
  const reason = '所在地の確認が必要です。'
  const reject = await request('/api/platform/inquiries/' + rejected.inquiryId + '/reject', operatorCookie, new URLSearchParams({ reason }))
  assert.match(reject.headers.get('location'), /rejected=1&mail=sent/)
  assert.match(mails.at(-1).textBody, new RegExp(reason))
  assert.match((await request(approvePath(rejected.inquiryId), operatorCookie, approveInput('rejected@example.test'))).headers.get('location'), /error=rejected/)
  assert.equal((await db.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM "ManagedBusinessAccess" WHERE "inquiryId"=$1', rejected.inquiryId))[0].n, 0)
  const ownerBefore = (await db.$queryRawUnsafe('SELECT * FROM "AppUser" WHERE "id"=\'owner-a\''))[0]
  await db.$executeRawUnsafe('UPDATE "OrganizationStoreProfile" SET "phone"=$1 WHERE "organizationId"=\'org-a\'', input.phone)
  const sharedInput = { ...input, name: '同一オーナー二号店', email: ' A@EXAMPLE.TEST ', requestKey: crypto.randomUUID() }
  const sameContact = await ok('/stores', a, sharedInput)
  const sharedResult = await request(approvePath(sameContact.inquiryId), operatorCookie, approveInput(' A@EXAMPLE.TEST '))
  assert.match(sharedResult.headers.get('location'), /approved=1&mail=sent/)
  const secondAccess = (await db.$queryRawUnsafe('SELECT * FROM "ManagedBusinessAccess" WHERE "inquiryId"=$1', sameContact.inquiryId))[0]
  assert.equal(secondAccess.contactEmail, 'a@example.test')
  assert.notEqual(secondAccess.loginId, ownerBefore.loginId)
  const secondUser = (await db.$queryRawUnsafe('SELECT * FROM "AppUser" WHERE "id"=$1', secondAccess.principalId))[0]
  assert.match(secondUser.email, /@branch\.orimia\.invalid$/)
  const secondProfile = (await db.$queryRawUnsafe('SELECT * FROM "OrganizationStoreProfile" WHERE "organizationId"=$1', secondAccess.targetId))[0]
  assert.equal(secondProfile.phone, input.phone)
  assert.equal(mails.at(-1).to, 'a@example.test')
  const issuedPassword = mails.at(-1).textBody.match(/初期パスワード: (\S+)/)[1]
  const branchCookie = await login(secondAccess.loginId, issuedPassword)
  const changedPassword = 'Branch-Changed-v677!'
  const changeResult = await request('/api/auth/managed-password-change', branchCookie, new URLSearchParams({ currentPassword: issuedPassword, newPassword: changedPassword, newPasswordConfirm: changedPassword }))
  assert.match(changeResult.headers.get('location'), /login/)
  await login(secondAccess.loginId, changedPassword)
  assert.equal((await db.$queryRawUnsafe('SELECT "mustChangePassword" FROM "ManagedBusinessAccess" WHERE "id"=$1', secondAccess.id))[0].mustChangePassword, false)
  const reissued = await request('/api/platform/inquiries/' + sameContact.inquiryId + '/resend', operatorCookie, new URLSearchParams())
  assert.match(reissued.headers.get('location'), /resent=1&mail=sent/)
  assert.equal(mails.at(-1).to, 'a@example.test')
  await login(secondAccess.loginId, mails.at(-1).textBody.match(/初期パスワード: (\S+)/)[1])
  assert.equal(verifyPassword(crypto, password, secondUser.passwordHash), false)
  const ownerAfter = (await db.$queryRawUnsafe('SELECT * FROM "AppUser" WHERE "id"=\'owner-a\''))[0]
  assert.equal(ownerAfter.passwordHash, ownerBefore.passwordHash)
  assert.equal(ownerAfter.email, ownerBefore.email)
  await login('owner-a')
  const mailCount = mails.length
  assert.match((await request(approvePath(sameContact.inquiryId), operatorCookie, approveInput('a@example.test'))).headers.get('location'), /error=already/)
  assert.equal(mails.length, mailCount)

  async function expectDuplicateBranch(cookie, email) {
    const pending = await ok('/stores', cookie, { ...input, email, requestKey: crypto.randomUUID() })
    const result = await request(approvePath(pending.inquiryId), operatorCookie, approveInput(email))
    assert.match(result.headers.get('location'), /error=duplicate/)
    assert.equal((await db.$queryRawUnsafe('SELECT "status" FROM "BusinessInquiry" WHERE "id"=$1', pending.inquiryId))[0].status, 'new')
    assert.equal((await db.$queryRawUnsafe('SELECT "id" FROM "ManagedBusinessAccess" WHERE "inquiryId"=$1', pending.inquiryId)).length, 0)
    return pending.inquiryId
  }
  await expectDuplicateBranch(x, 'a@example.test')
  await expectDuplicateBranch(x, input.email)
  await db.$executeRawUnsafe('INSERT INTO "WholesaleDealer" ("id","loginId","email") VALUES (\'foreign-dealer\',\'foreign-dealer\',\'dealer@example.test\')')
  await expectDuplicateBranch(a, 'dealer@example.test')
  const retryId = await expectDuplicateBranch(a, 'x@example.test')
  assert.match((await request(approvePath(retryId), operatorCookie, approveInput('a@example.test'))).headers.get('location'), /approved=1&mail=sent/, 'An existing failed/pending request can be approved without resubmission')

  async function normalInquiry(email, audience) {
    const id = crypto.randomUUID()
    await db.$executeRawUnsafe(`INSERT INTO "BusinessInquiry" ("id","requestKey","audience","organizationName","contactName","email","phone","preferredContact","message","sourcePath","status") VALUES ($1,$1,$2,'通常申請','管理者',$3,$4,'email','通常申請','/business','new')`, id, audience, email, input.phone)
    return id
  }
  for (const audience of ['salon', 'dealer']) {
    for (const email of ['a@example.test', input.email]) {
      const id = await normalInquiry(email, audience)
      assert.match((await request(approvePath(id), operatorCookie, approveInput(email))).headers.get('location'), /error=duplicate/)
    }
  }
  const ordinary = await normalInquiry('ordinary@example.test', 'salon')
  assert.match((await request(approvePath(ordinary), operatorCookie, approveInput('ordinary@example.test'))).headers.get('location'), /approved=1&mail=sent/)
  assert.equal((await db.$queryRawUnsafe('SELECT "id" FROM "AppUser" WHERE "email"=\'ordinary@example.test\'')).length, 1)

  const familyInputs = await Promise.all([1,2].map(() => ok('/stores', a, { ...input, email: input.email, requestKey: crypto.randomUUID() })))
  const familyResults = await Promise.all(familyInputs.map(row => request(approvePath(row.inquiryId), operatorCookie, approveInput(input.email))))
  familyResults.forEach(result => assert.match(result.headers.get('location'), /approved=1&mail=sent/))
  const familyAccounts = await db.$queryRawUnsafe('SELECT "loginId","principalId","targetId" FROM "ManagedBusinessAccess" WHERE "contactEmail"=$1', input.email)
  assert.equal(familyAccounts.length, 3)
  assert.equal(new Set(familyAccounts.map(row => row.loginId)).size, 3)

  const colliding = await ok('/stores', a, { ...input, email: 'a@example.test', requestKey: crypto.randomUUID() })
  await db.$executeRawUnsafe('UPDATE "AppUser" SET "loginId"=\'salon-000000000000\' WHERE "id"=\'second-admin\'')
  const randomBytes = crypto.randomBytes
  try {
    crypto.randomBytes = size => size === 6 ? Buffer.alloc(size) : randomBytes(size)
    assert.match((await request(approvePath(colliding.inquiryId), operatorCookie, approveInput('a@example.test'))).headers.get('location'), /error=duplicate/, 'Shared contacts must not permit duplicate login IDs')
  } finally { crypto.randomBytes = randomBytes }

  const wrongType = await ok('/stores', a, { ...input, email: 'a@example.test', requestKey: crypto.randomUUID() })
  await db.$executeRawUnsafe('UPDATE "BusinessInquiry" SET "audience"=\'dealer\' WHERE "id"=$1', wrongType.inquiryId)
  assert.match((await request(approvePath(wrongType.inquiryId), operatorCookie, approveInput('a@example.test'))).headers.get('location'), /error=branch/)
  const revoked = await ok('/stores', a, { ...input, email: 'a@example.test', requestKey: crypto.randomUUID() })
  await db.$executeRawUnsafe('UPDATE "AppUser" SET "active"=FALSE WHERE "id"=\'owner-a\'')
  assert.match((await request(approvePath(revoked.inquiryId), operatorCookie, approveInput('a@example.test'))).headers.get('location'), /error=branch/)
  await db.$executeRawUnsafe('UPDATE "AppUser" SET "active"=TRUE WHERE "id"=\'owner-a\'')
  assert.equal((await db.$queryRawUnsafe('SELECT "id" FROM "ManagedBusinessAccess" WHERE "inquiryId"=$1', revoked.inquiryId)).length, 0)
  console.log('v677 same-group contacts, unique logins, unchanged owner, mail routing, ordinary/foreign rejection, pending retry and concurrent branches passed')


  const concurrentInput = { ...input, name: '同時登録確認', email: 'concurrent@example.test', requestKey: crypto.randomUUID() }
  const [firstConcurrent, secondConcurrent] = await Promise.all([ok('/stores', a, concurrentInput), ok('/stores', a, concurrentInput)])
  assert.equal(firstConcurrent.inquiryId, secondConcurrent.inquiryId)
  assert.equal([firstConcurrent, secondConcurrent].filter(item => item.alreadySubmitted).length, 1)
  await db.$executeRawUnsafe(`INSERT INTO "BusinessAccountControl" ("accountType","targetId","status") VALUES ('SALON','org-a','SUSPENDED')`)
  assert.equal((await request('/api/admin/salon-master/data', a)).status, 403)
  assert.match((await request(approvePath(firstConcurrent.inquiryId), operatorCookie, approveInput('concurrent@example.test'))).headers.get('location'), /error=branch/)
  assert.equal((await db.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM "AppUser" WHERE "email"=\'concurrent@example.test\''))[0].n, 0, 'Failed group validation rolls the entire approval back')
  await db.$executeRawUnsafe(`DELETE FROM "BusinessAccountControl" WHERE "targetId"='org-a'`)
  for (let i=0;i<5;i++) assert.equal((await request('/api/admin/salon-master/link', x, { loginId: 'nonexistent', password })).status, i < 4 ? 400 : 429)
  const page = await request('/admin/salon-master?month=2026-09', a)
  assert.equal(page.status, 200); assert.match(page.headers.get('cache-control'), /no-store/)
  assert.match(page.content, /27,000円/); assert.doesNotMatch(page.content, /別会社のサロン/)
  console.log(JSON.stringify({ release: 'branch-shared-contact-v677', isolation: true, ownerOnly: true, noPlanRequired: true, pendingUntilApproval: true, groupLinkedOnApproval: true, rejectionMail: true, idempotency: true, initialPasswordGate: true, jstTotals: true, emailFailureRecovery: true, originProtection: true }))
  if (process.env.KEEP_TEST_SERVER === '1') {
    keeping = true
    console.log('V677_BROWSER_READY ' + base)
    fs.writeFileSync('/tmp/v677-browser-fixture.json', JSON.stringify({ base, operatorCookie }))
    process.on('SIGTERM', async () => { await cleanup(); process.exit(0) })
    process.on('SIGINT', async () => { await cleanup(); process.exit(0) })
  }
} finally { if (!keeping) await cleanup() }
