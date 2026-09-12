import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const TERMINAL_SUBSCRIPTION_STATUSES = new Set(['canceled', 'incomplete_expired'])
const MAX_MIGRATION_SUBSCRIPTIONS = 500

export async function migrateExistingBilling({ prisma, stripe, secretKey }) {
  if (!String(secretKey || '').startsWith('sk_test_')) {
    throw new Error('Automatic billing migration is restricted to the reviewed Stripe test environment.')
  }

  const [salonRows, dealerRows] = await Promise.all([
    prisma.$queryRawUnsafe(`SELECT 'salon'::text AS "accountType","organizationId" AS "accountId","stripeSubscriptionId" AS "subscriptionId" FROM "OrganizationBilling" WHERE "stripeSubscriptionId" IS NOT NULL`),
    prisma.$queryRawUnsafe(`SELECT 'dealer'::text AS "accountType","dealerId" AS "accountId","stripeSubscriptionId" AS "subscriptionId" FROM "WholesaleDealerBilling" WHERE "stripeSubscriptionId" IS NOT NULL`),
  ])
  const rows = [...salonRows, ...dealerRows]
  if (rows.length > MAX_MIGRATION_SUBSCRIPTIONS) throw new Error('Billing migration safety limit exceeded.')

  const subscriptions = new Map()
  for (const row of rows) {
    const subscriptionId = String(row.subscriptionId || '')
    if (!/^sub_[A-Za-z0-9]+$/.test(subscriptionId)) throw new Error('Invalid Stripe subscription reference in billing data.')
    if (!subscriptions.has(subscriptionId)) subscriptions.set(subscriptionId, row.accountType)
  }

  let canceled = 0
  let alreadyTerminal = 0
  for (const [subscriptionId] of subscriptions) {
    const current = await stripe.subscriptions.retrieve(subscriptionId)
    if (current.livemode !== false) throw new Error('Live Stripe subscription detected; automatic migration stopped.')
    if (TERMINAL_SUBSCRIPTION_STATUSES.has(String(current.status || ''))) {
      alreadyTerminal += 1
      continue
    }
    const result = await stripe.subscriptions.cancel(subscriptionId, { invoice_now: false, prorate: false })
    assert.equal(result.livemode, false, 'Canceled subscription unexpectedly used live mode')
    assert.equal(result.status, 'canceled', 'Stripe subscription did not reach canceled state')
    canceled += 1
  }

  await prisma.$transaction(async tx => {
    await tx.$queryRawUnsafe("SELECT 1::int AS locked FROM (SELECT pg_advisory_xact_lock(hashtext('managed_bank_debit_migration_v629'))) AS guard")
    await tx.$executeRawUnsafe(`UPDATE "OrganizationBilling" SET "onboardingStatus"='BANK_DEBIT_MANAGED',"subscriptionStatus"='active',"stripeCustomerId"=NULL,"stripeSubscriptionId"=NULL,"stripeCheckoutSessionId"=NULL,"paymentMethodBrand"=NULL,"paymentMethodLast4"=NULL,"paymentMethodExpMonth"=NULL,"paymentMethodExpYear"=NULL,"paymentMethodRegisteredAt"=NULL,"updatedAt"=NOW()`)
    await tx.$executeRawUnsafe(`UPDATE "WholesaleDealerBilling" SET "onboardingStatus"='BANK_DEBIT_MANAGED',"subscriptionStatus"='active',"stripeCustomerId"=NULL,"stripeSubscriptionId"=NULL,"stripeCheckoutSessionId"=NULL,"paymentMethodBrand"=NULL,"paymentMethodLast4"=NULL,"paymentMethodExpMonth"=NULL,"paymentMethodExpYear"=NULL,"paymentMethodRegisteredAt"=NULL,"updatedAt"=NOW()`)
  })

  const [salonRemaining, dealerRemaining] = await Promise.all([
    prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS "count" FROM "OrganizationBilling" WHERE "onboardingStatus"<>'BANK_DEBIT_MANAGED' OR "subscriptionStatus"<>'active' OR "stripeCustomerId" IS NOT NULL OR "stripeSubscriptionId" IS NOT NULL OR "stripeCheckoutSessionId" IS NOT NULL OR "paymentMethodBrand" IS NOT NULL OR "paymentMethodLast4" IS NOT NULL`),
    prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS "count" FROM "WholesaleDealerBilling" WHERE "onboardingStatus"<>'BANK_DEBIT_MANAGED' OR "subscriptionStatus"<>'active' OR "stripeCustomerId" IS NOT NULL OR "stripeSubscriptionId" IS NOT NULL OR "stripeCheckoutSessionId" IS NOT NULL OR "paymentMethodBrand" IS NOT NULL OR "paymentMethodLast4" IS NOT NULL`),
  ])
  assert.equal(Number(salonRemaining[0] && salonRemaining[0].count || 0), 0, 'Salon billing migration is incomplete')
  assert.equal(Number(dealerRemaining[0] && dealerRemaining[0].count || 0), 0, 'Dealer billing migration is incomplete')

  return {
    discovered: rows.length,
    uniqueSubscriptions: subscriptions.size,
    canceled,
    alreadyTerminal,
    paymentMethod: 'bank_debit',
  }
}

async function main() {
  const require = createRequire(path.join(process.env.LIEN_RUNTIME_ROOT || '/app', 'package.json'))
  const { PrismaClient } = require('@prisma/client')
  const Stripe = require('stripe')
  const prisma = new PrismaClient()
  try {
    const result = await migrateExistingBilling({
      prisma,
      stripe: new Stripe(process.env.STRIPE_SECRET_KEY),
      secretKey: process.env.STRIPE_SECRET_KEY,
    })
    console.log('V629_BANK_DEBIT_MIGRATION=' + JSON.stringify(result))
  } finally {
    await prisma.$disconnect()
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(error => {
    console.error('V629_BANK_DEBIT_MIGRATION_ERROR=' + String(error && (error.code || error.message) || error))
    process.exitCode = 1
  })
}
