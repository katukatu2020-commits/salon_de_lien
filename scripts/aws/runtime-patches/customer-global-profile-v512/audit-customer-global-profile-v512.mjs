import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')
const customerGlobalProfile = require('./customer-global-profile-v512.js')

const args = process.argv.slice(2)
const has = flag => args.includes(flag)
const value = flag => {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : null
}

const publicCode = String(value('--code') || '').trim().toUpperCase()
const requiredLinked = Math.max(0, Number.parseInt(value('--require-linked') || '0', 10) || 0)
const prisma = new PrismaClient()

try {
  const reconciliation = has('--reconcile')
    ? await customerGlobalProfile.reconcileAll(prisma)
    : null
  const all = await customerGlobalProfile.auditConsistency(prisma)
  if (all.driftAccounts !== 0) {
    throw new Error(`${all.driftAccounts} customer accounts still have cross-store profile drift`)
  }

  let selected = null
  if (publicCode) {
    selected = await customerGlobalProfile.auditConsistency(prisma, { publicCode })
    if (selected.checkedAccounts !== 1) throw new Error(`${publicCode} was not found as one active customer account`)
    if (selected.driftAccounts !== 0) throw new Error(`${publicCode} still has cross-store profile drift`)
    if (requiredLinked && Number(selected.targetCount || 0) < requiredLinked) {
      throw new Error(`${publicCode} is linked to ${selected.targetCount || 0} customer records; expected at least ${requiredLinked}`)
    }
  }

  console.log(JSON.stringify({
    release: 'customer-global-profile-v512',
    reconciliation,
    all,
    selected,
  }, null, 2))
} finally {
  await prisma.$disconnect()
}
