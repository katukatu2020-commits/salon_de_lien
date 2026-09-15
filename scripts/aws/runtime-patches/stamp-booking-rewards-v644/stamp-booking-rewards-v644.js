'use strict'

const crypto = require('node:crypto')
const { createCustomerBookingCouponService: createBaseService } = require('./customer-booking-coupon-v616')
const { ensureStampProgramSchema } = require('./stamp-program-v603')

const RELEASE = 'stamp-booking-rewards-v644'
const CANCELLED_STATUSES = "'キャンセル','キャンセル済み','無断キャンセル','cancelled','canceled','no-show','no_show'"
const REWARD_EXPIRY = new Date('2099-12-31T14:59:59.000Z')

function generatedId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`
}

function generatedCouponCode() {
  return `STAMP-${crypto.randomBytes(8).toString('hex').toUpperCase()}`
}

function createCustomerBookingCouponService({ prisma, sessionProvider }) {
  const base = createBaseService({ prisma, sessionProvider })
  let schemaPromise = null

  async function ensureSchema() {
    if (!schemaPromise) {
      schemaPromise = (async () => {
        await base.ensureSchema()
        await ensureStampProgramSchema(prisma)
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "CustomerStampRewardGrantV644" (
            "id" TEXT PRIMARY KEY,
            "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
            "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,
            "rewardSequence" INTEGER NOT NULL,
            "programUpdatedAt" TIMESTAMPTZ NOT NULL,
            "rewardType" TEXT NOT NULL,
            "displayName" TEXT NOT NULL,
            "rewardMenuId" TEXT,
            "rewardMenuName" TEXT,
            "discountRate" INTEGER NOT NULL,
            "couponIssueId" TEXT UNIQUE REFERENCES "CouponIssue"("id") ON DELETE SET NULL,
            "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT "CustomerStampRewardGrantV644_sequence_key"
              UNIQUE ("organizationId", "customerId", "rewardSequence"),
            CONSTRAINT "CustomerStampRewardGrantV644_type_check"
              CHECK ("rewardType" IN ('MENU_FREE','DISCOUNT_PERCENT')),
            CONSTRAINT "CustomerStampRewardGrantV644_rate_check"
              CHECK ("discountRate" BETWEEN 1 AND 100)
          )
        `)
        await prisma.$executeRawUnsafe(
          'CREATE INDEX IF NOT EXISTS "CustomerStampRewardGrantV644_customer_idx" ON "CustomerStampRewardGrantV644" ("customerId","rewardSequence")',
        )
      })().catch(error => {
        schemaPromise = null
        throw error
      })
    }
    return schemaPromise
  }

  async function synchronizeStampRewards(session) {
    if (!session?.organizationId || !session?.customerId) return { earnedCount: 0, createdCount: 0 }
    await ensureSchema()

    return prisma.$transaction(async tx => {
      await tx.$queryRawUnsafe(
        'SELECT TRUE AS "locked" FROM (SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))) AS lock',
        `stamp-reward-v644:${session.organizationId}`,
        String(session.customerId),
      )

      const customers = await tx.$queryRawUnsafe(
        `SELECT "id","name" FROM "Customer"
          WHERE "id"=$1 AND "organizationId"=$2 AND "deletedAt" IS NULL
          LIMIT 1 FOR UPDATE`,
        session.customerId,
        session.organizationId,
      )
      const customer = customers[0]
      if (!customer) return { earnedCount: 0, createdCount: 0 }

      await tx.$executeRawUnsafe(
        `INSERT INTO "OrganizationStampProgram" ("organizationId")
         SELECT "id" FROM "Organization" WHERE "id"=$1
         ON CONFLICT ("organizationId") DO NOTHING`,
        session.organizationId,
      )
      const programs = await tx.$queryRawUnsafe(
        `SELECT p."requiredVisits",p."rewardType",p."rewardMenuId",p."discountValue",
                p."rewardTitle",p."updatedAt",m."name" AS "rewardMenuName"
           FROM "OrganizationStampProgram" p
           LEFT JOIN "SalonMenu" m ON m."id"=p."rewardMenuId"
             AND m."organizationId"=p."organizationId" AND m."active"=TRUE
          WHERE p."organizationId"=$1 LIMIT 1`,
        session.organizationId,
      )
      const program = programs[0]
      const supported = program?.rewardType === 'MENU_FREE'
        ? Boolean(program.rewardMenuId && program.rewardMenuName)
        : program?.rewardType === 'DISCOUNT_PERCENT'
          && Number(program.discountValue) >= 1
          && Number(program.discountValue) <= 100
      if (!supported) return { earnedCount: 0, createdCount: 0 }

      const totals = await tx.$queryRawUnsafe(
        'SELECT COUNT(*)::int AS "total" FROM "Visit" WHERE "customerId"=$1',
        session.customerId,
      )
      const requiredVisits = Math.max(1, Number(program.requiredVisits || 1))
      const earnedCount = Math.floor(Number(totals[0]?.total || 0) / requiredVisits)
      if (earnedCount < 1) return { earnedCount: 0, createdCount: 0 }

      const existingRows = await tx.$queryRawUnsafe(
        `SELECT "id","rewardSequence","rewardType","displayName","rewardMenuId",
                "rewardMenuName","discountRate","couponIssueId"
           FROM "CustomerStampRewardGrantV644"
          WHERE "organizationId"=$1 AND "customerId"=$2
          ORDER BY "rewardSequence"`,
        session.organizationId,
        session.customerId,
      )
      const existing = new Map(existingRows.map(row => [Number(row.rewardSequence), row]))
      let createdCount = 0

      for (let rewardSequence = 1; rewardSequence <= earnedCount; rewardSequence += 1) {
        const grant = existing.get(rewardSequence)
        if (grant?.couponIssueId) continue

        const rewardType = String(grant?.rewardType || program.rewardType)
        const rewardMenuId = grant?.rewardMenuId || (rewardType === 'MENU_FREE' ? program.rewardMenuId : null)
        const rewardMenuName = String(grant?.rewardMenuName || (rewardType === 'MENU_FREE' ? program.rewardMenuName : '') || '').trim()
        const discountRate = Number(grant?.discountRate || (rewardType === 'MENU_FREE' ? 100 : program.discountValue))
        const displayName = String(grant?.displayName || program.rewardTitle || (
          rewardType === 'MENU_FREE' ? `${rewardMenuName} 無料` : `スタンプ特典 ${discountRate}%OFF`
        )).trim()
        if (!displayName || discountRate < 1 || discountRate > 100 || (rewardType === 'MENU_FREE' && !rewardMenuName)) continue

        const couponIssueId = generatedId('stamp_coupon')
        const targetMenus = rewardType === 'MENU_FREE' ? [rewardMenuName] : []
        await tx.$executeRawUnsafe(
          `INSERT INTO "CouponIssue"
            ("id","customerId","couponCode","customerName","discountRate","targetMenusJson",
             "issuedAt","expiresAt","salonMessage","templateVersion","status","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6::jsonb,CURRENT_TIMESTAMP,$7,$8,'stamp-reward-v644','issued',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
          couponIssueId,
          session.customerId,
          generatedCouponCode(),
          String(customer.name || '').trim() || 'お客様',
          discountRate,
          JSON.stringify(targetMenus),
          REWARD_EXPIRY,
          `スタンプカード達成特典: ${displayName}`,
        )

        if (grant) {
          await tx.$executeRawUnsafe(
            `UPDATE "CustomerStampRewardGrantV644"
                SET "couponIssueId"=$2,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1`,
            grant.id,
            couponIssueId,
          )
        } else {
          await tx.$executeRawUnsafe(
            `INSERT INTO "CustomerStampRewardGrantV644"
              ("id","organizationId","customerId","rewardSequence","programUpdatedAt","rewardType",
               "displayName","rewardMenuId","rewardMenuName","discountRate","couponIssueId")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            generatedId('stamp_grant'),
            session.organizationId,
            session.customerId,
            rewardSequence,
            program.updatedAt,
            rewardType,
            displayName,
            rewardMenuId,
            rewardMenuName || null,
            discountRate,
            couponIssueId,
          )
        }
        createdCount += 1
      }
      return { earnedCount, createdCount }
    })
  }

  async function availableStampRewards(session) {
    await synchronizeStampRewards(session)
    const rows = await prisma.$queryRawUnsafe(
      `SELECT g."couponIssueId",g."displayName",g."rewardType",g."rewardMenuName",g."discountRate"
         FROM "CustomerStampRewardGrantV644" g
         JOIN "CouponIssue" ci ON ci."id"=g."couponIssueId"
         LEFT JOIN "Appointment" a ON a."couponIssueId"=ci."id"
           AND a."status" NOT IN (${CANCELLED_STATUSES})
        WHERE g."organizationId"=$1 AND g."customerId"=$2
          AND ci."status"='issued' AND ci."issuedAt"<=CURRENT_TIMESTAMP AND ci."expiresAt">=CURRENT_TIMESTAMP
          AND a."id" IS NULL
        ORDER BY g."rewardSequence"`,
      session.organizationId,
      session.customerId,
    )
    const first = rows[0] || null
    return {
      availableCount: rows.length,
      couponIssueId: first?.couponIssueId || null,
      displayName: first?.displayName || '',
      bookingHref: first?.couponIssueId
        ? `/u/appointments?coupon=${encodeURIComponent(first.couponIssueId)}&stampReward=1`
        : '/u/appointments',
    }
  }

  async function stampRewards(session) {
    try {
      return await availableStampRewards(session)
    } catch (error) {
      console.error(`[${RELEASE}] availability failed`, { error: error instanceof Error ? error.message : String(error) })
      return { availableCount: 0, couponIssueId: null, displayName: '', bookingHref: '/u/appointments' }
    }
  }

  async function handle(req, res, url, adminSessionProvider) {
    if (url.pathname === '/api/lien-customer-booking-context' && req.method === 'GET') {
      const session = await sessionProvider(req)
      if (session) {
        try {
          await synchronizeStampRewards(session)
        } catch (error) {
          console.error(`[${RELEASE}] synchronization failed`, { error: error instanceof Error ? error.message : String(error) })
        }
      }
    }
    return base.handle(req, res, url, adminSessionProvider)
  }

  return {
    ensureSchema,
    handle,
    stampRewards,
    synchronizeStampRewards,
  }
}

module.exports = { createCustomerBookingCouponService }
