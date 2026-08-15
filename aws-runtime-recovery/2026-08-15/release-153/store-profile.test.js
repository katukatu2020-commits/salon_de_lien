'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { Readable } = require('node:stream')
const { createStoreProfileService, verifyScryptPassword, normalizedBusinessSchedule } = require('./store-profile')

const AUTH_SECRET = 'store-profile-test-secret-0123456789-abcdefghijklmnopqrstuvwxyz'

function passwordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  return 'scrypt$' + salt + '$' + crypto.scryptSync(password, salt, 64).toString('hex')
}

function cookie(payload = {}) {
  const body = Buffer.from(JSON.stringify({ version: 2, subject: 'owner@example.com', role: 'ADMIN', organizationId: 'org-a', userId: 'owner-a', expiresAt: Math.floor(Date.now() / 1000) + 3600, ...payload })).toString('base64url')
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(body).digest('base64url')
  return 'lien_admin_session=' + body + '.' + signature
}

function request(method = 'GET', body = '', payload = {}) {
  const req = Readable.from(body ? [body] : [])
  req.method = method
  req.headers = { cookie: cookie(payload), origin: 'https://salon-de-lien.com', host: 'salon-de-lien.com', 'x-forwarded-proto': 'https', 'content-type': 'application/json' }
  return req
}

function response() {
  return { statusCode: 200, headers: {}, body: '', setHeader(name, value) { this.headers[name.toLowerCase()] = value }, end(value = '') { this.body += value } }
}

function prismaMock() {
  const calls = []
  const owner = { id: 'owner-a', email: 'owner@example.com', loginId: 'owner-login', displayName: 'Owner', role: 'ADMIN', passwordHash: passwordHash('correct-password') }
  return {
    calls,
    organization: {
      findUnique: async args => { calls.push(['organization.findUnique', args]); return { id: 'org-a', name: '店舗A', slug: 'store-a', updatedAt: new Date() } },
      update: async args => { calls.push(['organization.update', args]); return { id: args.where.id, name: args.data.name } },
    },
    appUser: {
      findFirst: async args => { calls.push(['appUser.findFirst', args]); return args.where.id && args.where.id.not ? null : owner },
      update: async args => { calls.push(['appUser.update', args]); return { id: args.where.id } },
    },
    $executeRawUnsafe: async function (...args) { calls.push(['execute', ...args]); return 1 },
    $queryRawUnsafe: async function (...args) {
      calls.push(['query', ...args])
      if (String(args[0]).includes('StaffBookingSetting')) return [{ count: 2 }]
      if (String(args[0]).includes('SalonMenu')) return [{ total: 4, active: 3 }]
      if (String(args[0]).includes('OrganizationStoreProfile')) return []
      return [{ address: 'booking-random@inbound.salon-de-lien.com', lastReceivedAt: null }]
    },
  }
}

test.beforeEach(() => { process.env.ADMIN_AUTH_SECRET = AUTH_SECRET; process.env.APP_URL = 'https://salon-de-lien.com' })

test('store profile reads only the organization from the signed session', async function () {
  const prisma = prismaMock()
  const service = createStoreProfileService({ prisma, crypto })
  const res = response()
  await service.handle(request(), res, new URL('https://salon-de-lien.com/api/admin/store-profile?organizationId=org-b'))
  assert.equal(res.statusCode, 200)
  const profile = JSON.parse(res.body).profile
  assert.equal(profile.storeName, '店舗A')
  assert.equal(profile.currentUserName, 'Owner')
  const organizationRead = prisma.calls.find(call => call[0] === 'organization.findUnique')
  assert.equal(organizationRead[1].where.id, 'org-a')
})

test('owner can change store name but client organization id is ignored', async function () {
  const prisma = prismaMock()
  const service = createStoreProfileService({ prisma, crypto })
  const res = response()
  await service.handle(request('POST', JSON.stringify({ action: 'update-store', organizationId: 'org-b', storeName: '新店舗名' })), res, new URL('https://salon-de-lien.com/api/admin/store-profile'))
  assert.equal(res.statusCode, 200)
  const update = prisma.calls.find(call => call[0] === 'organization.update')
  assert.equal(update[1].where.id, 'org-a')
  assert.equal(update[1].data.name, '新店舗名')
})

test('owner store profile persists contact and address fields inside the signed organization', async function () {
  const prisma = prismaMock()
  const service = createStoreProfileService({ prisma, crypto })
  const res = response()
  await service.handle(request('POST', JSON.stringify({
    action: 'update-store',
    organizationId: 'org-b',
    storeName: '新店舗名',
    ownerName: '山田 花子',
    phone: '03-1234-5678',
    postalCode: '1234567',
    prefecture: '東京都',
    city: '渋谷区',
    addressLine1: '神宮前1-2-3',
    addressLine2: 'Lienビル2F',
    businessOpen: '09:30',
    businessClose: '18:30',
    closedWeekdays: [0, 3],
    websiteUrl: 'https://example.com/store',
  })), res, new URL('https://salon-de-lien.com/api/admin/store-profile'))
  assert.equal(res.statusCode, 200)
  const upsert = prisma.calls.find(call => call[0] === 'execute' && String(call[1]).includes('ON CONFLICT ("organizationId")'))
  assert.ok(upsert)
  assert.equal(upsert[2], 'org-a')
  assert.equal(upsert[3], '山田 花子')
  assert.equal(upsert[4], '03-1234-5678')
  assert.equal(upsert[5], '123-4567')
  assert.equal(upsert[13], 570)
  assert.equal(upsert[14], 1110)
  assert.equal(upsert[15], '0,3')
  const staffHours = prisma.calls.find(call => call[0] === 'execute' && String(call[1]).includes('UPDATE "StaffBookingSetting"'))
  assert.deepEqual(staffHours.slice(2), ['org-a', 570, 1110])
  assert.ok(!upsert.includes('org-b'))
})

test('business schedule validates 30-minute opening hours and multiple closed weekdays', () => {
  assert.deepEqual(normalizedBusinessSchedule({ businessOpen: '08:30', businessClose: '20:00', closedWeekdays: ['0', '2', '2'] }), {
    openMinutes: 510,
    closeMinutes: 1200,
    closedWeekdays: [0, 2],
    businessHours: '08:30〜20:00',
    closedDays: '毎週日曜日・火曜日',
  })
  assert.throws(() => normalizedBusinessSchedule({ businessOpen: '19:00', businessClose: '10:00', closedWeekdays: [] }), /営業終了時刻/)
  assert.throws(() => normalizedBusinessSchedule({ businessOpen: '09:15', businessClose: '18:00', closedWeekdays: [] }), /30分単位/)
})

test('owner email change requires the current password', async function () {
  const prisma = prismaMock()
  const service = createStoreProfileService({ prisma, crypto })
  const res = response()
  await service.handle(request('POST', JSON.stringify({ action: 'update-owner-email', email: 'new-owner@example.com', currentPassword: 'wrong-password' })), res, new URL('https://salon-de-lien.com/api/admin/store-profile'))
  assert.equal(res.statusCode, 403)
  assert.equal(prisma.calls.some(call => call[0] === 'appUser.update'), false)
})

test('verified owner email update changes email without changing login id', async function () {
  const prisma = prismaMock()
  const service = createStoreProfileService({ prisma, crypto })
  const res = response()
  await service.handle(request('POST', JSON.stringify({ action: 'update-owner-email', email: 'new-owner@example.com', currentPassword: 'correct-password' })), res, new URL('https://salon-de-lien.com/api/admin/store-profile'))
  assert.equal(res.statusCode, 200)
  const update = prisma.calls.find(call => call[0] === 'appUser.update')
  assert.deepEqual(update[1].data, { email: 'new-owner@example.com' })
})

test('staff cannot change store settings', async function () {
  const prisma = prismaMock()
  const service = createStoreProfileService({ prisma, crypto })
  const res = response()
  await service.handle(request('POST', JSON.stringify({ action: 'update-store', storeName: '権限外' }), { role: 'STAFF' }), res, new URL('https://salon-de-lien.com/api/admin/store-profile'))
  assert.equal(res.statusCode, 403)
})

test('scrypt verifier accepts only the correct password', () => {
  const hash = passwordHash('secret-value')
  assert.equal(verifyScryptPassword(crypto, 'secret-value', hash), true)
  assert.equal(verifyScryptPassword(crypto, 'incorrect', hash), false)
})
