import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')
const customerGlobalProfile = require('./customer-global-profile-v512.js')

const prisma = new PrismaClient()
const appUserId = 'qa-v512-app-user'
const canonicalCustomerId = 'qa-v512-canonical-customer'
const linkedCustomerId = 'qa-v512-linked-customer'
const publicCode = 'C-R-512'

async function cleanup() {
  await prisma.customerStoreLink.deleteMany({ where: { appUserId } })
  await prisma.appUser.deleteMany({ where: { id: appUserId } })
  await prisma.hairProfile.deleteMany({ where: { customerId: { in: [canonicalCustomerId, linkedCustomerId] } } })
  await prisma.customer.deleteMany({ where: { id: { in: [canonicalCustomerId, linkedCustomerId] } } })
}

try {
  const organizations = await prisma.organization.findMany({
    where: { id: { in: ['org_salon_de_lien', 'org_showcase_yohaku'] } },
    select: { id: true },
  })
  assert.equal(organizations.length, 2, 'local test organizations are missing')
  await cleanup()

  await prisma.customer.createMany({ data: [
    {
      id: canonicalCustomerId,
      organizationId: 'org_salon_de_lien',
      name: '共通プロフィール 顧客',
      phone: '090-5120-0001',
      gender: '女性',
      birthDate: new Date('1993-05-12T00:00:00.000Z'),
      birthYear: 1993,
      servicePreference: '静かに過ごしたい',
      profileImageUrl: 's3://qa-v512/canonical.webp',
    },
    {
      id: linkedCustomerId,
      organizationId: 'org_showcase_yohaku',
      name: '店舗に残った古い名前',
      phone: '090-0000-0000',
      gender: '男性',
      birthDate: new Date('1980-01-01T00:00:00.000Z'),
      birthYear: 1980,
      servicePreference: '適度に会話したい',
      profileImageUrl: 's3://qa-v512/stale.webp',
    },
  ] })
  await prisma.appUser.create({ data: {
    id: appUserId,
    organizationId: 'org_salon_de_lien',
    customerId: canonicalCustomerId,
    email: 'qa-v512@example.invalid',
    role: 'CUSTOMER',
    active: true,
    displayName: '古いアカウント表示名',
    customerPublicCode: publicCode,
  } })
  await prisma.customerStoreLink.createMany({ data: [
    { id: 'qa-v512-primary-link', appUserId, organizationId: 'org_salon_de_lien', customerId: canonicalCustomerId },
    { id: 'qa-v512-secondary-link', appUserId, organizationId: 'org_showcase_yohaku', customerId: linkedCustomerId },
  ] })
  await prisma.hairProfile.createMany({ data: [
    { id: 'qa-v512-primary-hair', customerId: canonicalCustomerId, hairVolume: '多い', hairTexture: '硬い' },
    { id: 'qa-v512-secondary-hair', customerId: linkedCustomerId, hairVolume: '少ない', hairTexture: '柔らかい' },
  ] })

  const reconciliation = await customerGlobalProfile.reconcileAll(prisma)
  assert.ok(reconciliation.changedCustomers >= 1)
  assert.ok(reconciliation.changedHairProfiles >= 1)

  let rows = await prisma.customer.findMany({
    where: { id: { in: [canonicalCustomerId, linkedCustomerId] } },
    orderBy: { id: 'asc' },
    include: { hairProfile: true },
  })
  assert.equal(rows.length, 2)
  for (const row of rows) {
    assert.equal(row.name, '共通プロフィール 顧客')
    assert.equal(row.phone, '090-5120-0001')
    assert.equal(row.gender, '女性')
    assert.equal(row.birthYear, 1993)
    assert.equal(row.servicePreference, '静かに過ごしたい')
    assert.equal(row.profileImageUrl, 's3://qa-v512/canonical.webp')
    assert.equal(row.hairProfile?.hairVolume, '多い')
    assert.equal(row.hairProfile?.hairTexture, '硬い')
  }
  assert.equal((await prisma.appUser.findUniqueOrThrow({ where: { id: appUserId } })).displayName, '共通プロフィール 顧客')

  await prisma.$transaction(tx => customerGlobalProfile.syncIdentityFromCustomer(tx, linkedCustomerId, {
    name: '店舗側更新後の共通名',
    phone: '080-5120-0002',
    gender: 'その他',
    birthDate: null,
    birthYear: null,
    servicePreference: '適度に会話したい',
  }))
  await prisma.$transaction(tx => customerGlobalProfile.syncHairProfileFromCustomer(tx, linkedCustomerId, {
    hairThickness: '太い',
    hairVolume: '普通',
    hairTexture: '柔らかい',
    scalpCondition: null,
    faceShape: null,
    forehead: null,
    lifestyle: null,
    stylingTimeMinutes: 10,
    hairCurl: '少しある',
  }))
  await prisma.$transaction(tx => customerGlobalProfile.syncProfileImageFromCustomer(tx, linkedCustomerId, 's3://qa-v512/updated.webp'))

  rows = await prisma.customer.findMany({
    where: { id: { in: [canonicalCustomerId, linkedCustomerId] } },
    include: { hairProfile: true },
  })
  for (const row of rows) {
    assert.equal(row.name, '店舗側更新後の共通名')
    assert.equal(row.phone, '080-5120-0002')
    assert.equal(row.birthDate, null)
    assert.equal(row.birthYear, null)
    assert.equal(row.profileImageUrl, 's3://qa-v512/updated.webp')
    assert.equal(row.hairProfile?.hairVolume, '普通')
    assert.equal(row.hairProfile?.stylingTimeMinutes, 10)
  }

  const audit = await customerGlobalProfile.auditConsistency(prisma, { publicCode })
  assert.deepEqual(audit, { checkedAccounts: 1, driftAccounts: 0, publicCode, targetCount: 2 })
  console.log(JSON.stringify({ release: 'customer-global-profile-v512', reconciliation, audit }, null, 2))
} finally {
  await cleanup().catch(() => undefined)
  await prisma.$disconnect()
}
