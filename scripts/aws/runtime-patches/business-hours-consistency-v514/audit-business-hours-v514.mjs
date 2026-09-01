import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')
const { createTenantSetupService } = require('./tenant-setup.js')

const prisma = new PrismaClient()
const service = createTenantSetupService({
  prisma,
  sessionProvider: async () => null,
  customerSessionProvider: async () => null,
  crypto,
  customerNameAutoMerge: async () => null,
})

try {
  const profiles = await prisma.$queryRawUnsafe(
    'SELECT "organizationId","businessOpenMinutes","businessCloseMinutes","closedWeekdays" FROM "OrganizationStoreProfile" ORDER BY "organizationId"',
  )
  let explicitEmptyProfiles = 0
  for (const profile of profiles) {
    const schedule = await service.businessSchedule(profile.organizationId)
    const expected = [...new Set(
      String(profile.closedWeekdays == null ? '1' : profile.closedWeekdays)
        .split(',')
        .filter(value => value.trim() !== '')
        .map(Number)
        .filter(day => Number.isInteger(day) && day >= 0 && day <= 6),
    )].sort((left, right) => left - right)
    assert.deepEqual(schedule.closedWeekdays, expected, `${profile.organizationId} has inconsistent closed weekdays`)
    if (String(profile.closedWeekdays ?? '') === '') {
      explicitEmptyProfiles += 1
      assert.deepEqual(schedule.closedWeekdays, [], `${profile.organizationId} must not infer Sunday from an empty value`)
    }
  }
  console.log(JSON.stringify({
    release: 'business-hours-consistency-v514',
    checkedProfiles: profiles.length,
    explicitEmptyProfiles,
    audit: 'passed',
  }, null, 2))
} finally {
  await prisma.$disconnect()
}
