import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')
const customerGlobalProfile = require('./customer-global-profile-v513.js')

const prisma = new PrismaClient()
const appUserId = 'qa-v513-app-user'
const canonicalCustomerId = 'qa-v513-canonical-customer'
const linkedCustomerId = 'qa-v513-linked-customer'
const customerIds = [canonicalCustomerId, linkedCustomerId]
const publicCode = 'C-R-513'

async function cleanup() {
  await prisma.customerStoreLink.deleteMany({ where: { appUserId } })
  await prisma.appUser.deleteMany({ where: { id: appUserId } })
  await prisma.customerRealName.deleteMany({ where: { customerId: { in: customerIds } } })
  await prisma.preference.deleteMany({ where: { customerId: { in: customerIds } } })
  await prisma.hairProfile.deleteMany({ where: { customerId: { in: customerIds } } })
  await prisma.customer.deleteMany({ where: { id: { in: customerIds } } })
}

try {
  await cleanup()
  const organizations = await prisma.organization.findMany({
    where: { id: { in: ['org_salon_de_lien', 'org_showcase_yohaku'] } },
    select: { id: true },
  })
  assert.equal(organizations.length, 2)

  await prisma.customer.createMany({ data: [
    { id: canonicalCustomerId, organizationId: 'org_salon_de_lien', name: 'Global Profile', phone: '090-5130-0001' },
    { id: linkedCustomerId, organizationId: 'org_showcase_yohaku', name: 'Stale Store Profile', phone: '090-0000-0000' },
  ] })
  await prisma.appUser.create({ data: {
    id: appUserId,
    organizationId: 'org_salon_de_lien',
    customerId: canonicalCustomerId,
    email: 'qa-v513@example.invalid',
    role: 'CUSTOMER',
    active: true,
    displayName: 'Stale Account Name',
    customerPublicCode: publicCode,
  } })
  await prisma.customerStoreLink.createMany({ data: [
    { id: 'qa-v513-primary-link', appUserId, organizationId: 'org_salon_de_lien', customerId: canonicalCustomerId },
    { id: 'qa-v513-secondary-link', appUserId, organizationId: 'org_showcase_yohaku', customerId: linkedCustomerId },
  ] })
  await prisma.customerRealName.createMany({ data: [
    { customerId: canonicalCustomerId, organizationId: 'org_salon_de_lien', realName: 'Canonical Real Name' },
    { customerId: linkedCustomerId, organizationId: 'org_showcase_yohaku', realName: 'Stale Real Name' },
  ] })
  await prisma.preference.createMany({ data: [
    { customerId: canonicalCustomerId, preferredStyle: 'Canonical Style', dislikes: 'Canonical NG' },
    { customerId: linkedCustomerId, preferredStyle: 'Stale Style', dislikes: 'Stale NG' },
  ] })

  const reconciliation = await customerGlobalProfile.reconcileAll(prisma)
  assert.ok(reconciliation.changedCustomers >= 1)
  assert.ok(reconciliation.changedRealNames >= 1)
  assert.ok(reconciliation.changedPreferences >= 1)

  let customers = await prisma.customer.findMany({ where: { id: { in: customerIds } } })
  let realNames = await prisma.customerRealName.findMany({ where: { customerId: { in: customerIds } } })
  let preferences = await prisma.preference.findMany({ where: { customerId: { in: customerIds } } })
  assert.ok(customers.every(row => row.name === 'Global Profile' && row.phone === '090-5130-0001'))
  assert.ok(realNames.every(row => row.realName === 'Canonical Real Name'))
  assert.ok(preferences.every(row => row.preferredStyle === 'Canonical Style' && row.dislikes === 'Canonical NG'))

  await prisma.$transaction(tx => customerGlobalProfile.syncRealNameFromCustomer(tx, linkedCustomerId, 'Updated Real Name'))
  await prisma.$transaction(tx => customerGlobalProfile.syncPreferenceFromCustomer(tx, linkedCustomerId, {
    preferredLength: 'Short',
    preferredStyle: 'Updated Style',
    dislikes: 'Updated NG',
    colorPreference: null,
    maintenanceLevel: 'Low',
    referenceNotes: null,
  }))

  realNames = await prisma.customerRealName.findMany({ where: { customerId: { in: customerIds } } })
  preferences = await prisma.preference.findMany({ where: { customerId: { in: customerIds } } })
  assert.ok(realNames.every(row => row.realName === 'Updated Real Name'))
  assert.ok(preferences.every(row => row.preferredStyle === 'Updated Style' && row.dislikes === 'Updated NG'))

  const audit = await customerGlobalProfile.auditConsistency(prisma, { publicCode })
  assert.equal(audit.checkedAccounts, 1)
  assert.equal(audit.driftAccounts, 0)
  assert.equal(audit.targetCount, 2)
  console.log(JSON.stringify({ release: 'customer-global-profile-v513', reconciliation, audit }, null, 2))
} finally {
  await cleanup().catch(() => undefined)
  await prisma.$disconnect()
}
