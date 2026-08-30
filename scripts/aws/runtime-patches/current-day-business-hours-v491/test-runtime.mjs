import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const require = createRequire(import.meta.url)
const { createStoreProfileService } = require(`${root}/store-profile.js`)

function serviceWith(previousSchedule) {
  const executions = []
  const prisma = {
    organization: {
      update: async () => ({ id: 'org-test', name: 'Test Salon' }),
    },
    $queryRawUnsafe: async sql => {
      if (sql.includes('SELECT "businessOpenMinutes","businessCloseMinutes","closedWeekdays"')) {
        return previousSchedule ? [previousSchedule] : []
      }
      return []
    },
    $executeRawUnsafe: async (sql, ...values) => {
      executions.push({ sql, values })
      return 1
    },
  }
  return {
    service: createStoreProfileService({ prisma, crypto }),
    executions,
  }
}

const input = {
  storeName: 'Test Salon',
  ownerName: 'Owner',
  phone: '',
  postalCode: '',
  prefecture: '',
  city: '',
  addressLine1: '',
  addressLine2: '',
  businessOpen: '10:00',
  businessClose: '20:00',
  closedWeekdays: [0, 1, 2, 3, 4, 5, 6],
  websiteUrl: '',
}
const session = { role: 'ADMIN', organizationId: 'org-test' }

const changed = serviceWith({
  businessOpenMinutes: 480,
  businessCloseMinutes: 1260,
  closedWeekdays: '1',
})
await changed.service.updateStore(session, input)
const changedUpdates = changed.executions.filter(call => call.sql.includes('UPDATE "OrganizationDailySchedule"'))
assert.equal(changedUpdates.length, 1)
assert.deepEqual(changedUpdates[0].values, ['org-test', 600, 1200, true])
assert.match(changedUpdates[0].sql, /Asia\/Tokyo/)

const unchanged = serviceWith({
  businessOpenMinutes: 600,
  businessCloseMinutes: 1200,
  closedWeekdays: '0,1,2,3,4,5,6',
})
await unchanged.service.updateStore(session, input)
assert.equal(
  unchanged.executions.filter(call => call.sql.includes('UPDATE "OrganizationDailySchedule"')).length,
  0,
  'an unrelated profile save must preserve an explicit current-day override',
)

console.log('current-day-business-hours-v491 runtime behavior tested')
