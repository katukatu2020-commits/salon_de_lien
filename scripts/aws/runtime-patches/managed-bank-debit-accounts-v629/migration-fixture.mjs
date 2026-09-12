import assert from 'node:assert/strict'
import { migrateExistingBilling } from './migrate-existing-billing.mjs'

function fixture() {
  const executions = []
  let migrated = false
  const prisma = {
    async $queryRawUnsafe(sql) {
      const source = String(sql)
      if (source.includes('pg_advisory_xact_lock')) return [{ locked: true }]
      if (source.includes('COUNT(*)')) return [{ count: migrated ? 0 : 1 }]
      if (source.includes('FROM "OrganizationBilling"')) return [{ accountType: 'salon', accountId: 'org-1', subscriptionId: 'sub_salon1' }]
      if (source.includes('FROM "WholesaleDealerBilling"')) return [{ accountType: 'dealer', accountId: 'dealer-1', subscriptionId: 'sub_dealer1' }]
      return []
    },
    async $executeRawUnsafe(sql) {
      executions.push(String(sql))
      return 1
    },
    async $transaction(callback) {
      const result = await callback(this)
      migrated = true
      return result
    },
  }
  const canceled = []
  const stripe = {
    subscriptions: {
      async retrieve(id) {
        return { id, livemode: false, status: id === 'sub_dealer1' ? 'canceled' : 'trialing' }
      },
      async cancel(id, options) {
        canceled.push({ id, options })
        return { id, livemode: false, status: 'canceled' }
      },
    },
  }
  return { prisma, stripe, executions, canceled }
}

{
  const state = fixture()
  const result = await migrateExistingBilling({ ...state, secretKey: 'sk_test_fixture' })
  assert.deepEqual(result, { discovered: 2, uniqueSubscriptions: 2, canceled: 1, alreadyTerminal: 1, paymentMethod: 'bank_debit' })
  assert.deepEqual(state.canceled, [{ id: 'sub_salon1', options: { invoice_now: false, prorate: false } }])
  assert.equal(state.executions.filter(sql => sql.startsWith('UPDATE "')).length, 2)
  assert.ok(state.executions.every(sql => sql.includes('"stripeSubscriptionId"=NULL')))
}

{
  const state = fixture()
  await assert.rejects(
    migrateExistingBilling({ ...state, secretKey: 'sk_live_fixture' }),
    /restricted to the reviewed Stripe test environment/,
  )
  assert.equal(state.canceled.length, 0)
  assert.equal(state.executions.length, 0)
}

console.log(JSON.stringify({ release: 'managed-bank-debit-accounts-v629', billingMigrationFixtureVerified: true }))
