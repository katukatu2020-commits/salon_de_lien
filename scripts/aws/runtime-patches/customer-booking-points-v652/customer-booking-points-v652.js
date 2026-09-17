'use strict'

const crypto = require('node:crypto')
const {
  couponMatchesMenu,
  createCustomerBookingCouponService: createLegacyService,
} = require('./customer-booking-coupon-v616')

const RELEASE = 'customer-booking-points-v652'
const CANCELLED_STATUSES = [
  'キャンセル', 'キャンセル済み', '無断キャンセル',
  'cancelled', 'canceled', 'no-show', 'no_show',
]

function json(res, status, value) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store')
  res.end(JSON.stringify(value))
}

async function readJson(req) {
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (raw.length > 16384) throw Object.assign(new Error('送信内容が大きすぎます。'), { status: 413 })
  }
  try { return raw ? JSON.parse(raw) : {} }
  catch { throw Object.assign(new Error('送信内容を確認してください。'), { status: 400 }) }
}

function validOrigin(req) {
  const origin = String(req.headers.origin || '')
  if (!origin) return true
  try { return new URL(origin).host === req.headers.host } catch { return false }
}

function parseTargets(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (!value) return []
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []
  } catch { return [] }
}

function integer(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : fallback
}

function yen(value) {
  return `${Math.max(0, integer(value)).toLocaleString('ja-JP')}円`
}

function captureResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name] = value },
    end(value = '') { this.body = String(value) },
  }
}

function adjustmentPayload(row) {
  return {
    bookingApplied: true,
    appointmentId: row.appointmentId,
    couponIssueId: row.couponIssueId || null,
    couponCode: row.couponCode || null,
    discountRate: integer(row.couponRate),
    menuPrice: integer(row.menuPrice),
    couponDiscount: integer(row.couponDiscount),
    pointsUsed: integer(row.pointsUsed),
    finalPrice: integer(row.finalPrice),
    status: row.status,
  }
}

function createCustomerBookingCouponService({ prisma, sessionProvider }) {
  const legacy = createLegacyService({ prisma, sessionProvider })
  let schemaPromise = null

  async function ensureSchema() {
    if (!schemaPromise) {
      schemaPromise = (async () => {
        await legacy.ensureSchema()
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "CustomerBookingAdjustmentV652" (
            "id" TEXT PRIMARY KEY,
            "appointmentId" TEXT NOT NULL UNIQUE REFERENCES "Appointment"("id") ON DELETE CASCADE,
            "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
            "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,
            "menuPrice" INTEGER NOT NULL,
            "couponIssueId" TEXT REFERENCES "CouponIssue"("id") ON DELETE SET NULL,
            "couponCode" TEXT,
            "couponRate" INTEGER NOT NULL DEFAULT 0,
            "couponDiscount" INTEGER NOT NULL DEFAULT 0,
            "pointsUsed" INTEGER NOT NULL DEFAULT 0,
            "finalPrice" INTEGER NOT NULL,
            "pointTransactionId" TEXT UNIQUE REFERENCES "PointTransaction"("id") ON DELETE SET NULL,
            "status" TEXT NOT NULL DEFAULT 'active',
            "releasedAt" TIMESTAMPTZ,
            "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "CustomerBookingAdjustmentV652_amounts_check" CHECK (
              "menuPrice" >= 0 AND "couponDiscount" >= 0 AND "pointsUsed" >= 0 AND "finalPrice" >= 0
            )
          )
        `)
        await prisma.$executeRawUnsafe(
          'CREATE INDEX IF NOT EXISTS "CustomerBookingAdjustmentV652_customer_idx" ON "CustomerBookingAdjustmentV652" ("customerId","status")',
        )
        await prisma.$executeRawUnsafe(`
          CREATE OR REPLACE FUNCTION lien_release_booking_adjustment_v652()
          RETURNS trigger AS $$
          DECLARE
            adjustment RECORD;
            transaction_row RECORD;
            balance_after INTEGER;
            refund_id TEXT;
          BEGIN
            IF NEW."status" IN ('キャンセル','キャンセル済み','無断キャンセル','cancelled','canceled','no-show','no_show')
               AND OLD."status" NOT IN ('キャンセル','キャンセル済み','無断キャンセル','cancelled','canceled','no-show','no_show') THEN
              SELECT * INTO adjustment
                FROM "CustomerBookingAdjustmentV652"
               WHERE "appointmentId"=NEW."id" AND "status"='active'
               FOR UPDATE;

              IF FOUND AND NOT EXISTS (SELECT 1 FROM "ServiceSale" WHERE "appointmentId"=NEW."id") THEN
                IF adjustment."pointsUsed" > 0 AND adjustment."pointTransactionId" IS NOT NULL THEN
                  SELECT * INTO transaction_row
                    FROM "PointTransaction"
                   WHERE "id"=adjustment."pointTransactionId"
                   FOR UPDATE;

                  UPDATE "PointLot" lot
                     SET "remainingAmount"=LEAST(lot."originalAmount", lot."remainingAmount"+allocation."amount"),
                         "updatedAt"=CURRENT_TIMESTAMP
                    FROM "PointRedemptionAllocation" allocation
                   WHERE allocation."redeemTransactionId"=adjustment."pointTransactionId"
                     AND allocation."pointLotId"=lot."id";

                  UPDATE "CustomerPointAccount"
                     SET "availablePoints"="availablePoints"+adjustment."pointsUsed",
                         "lifetimeRedeemed"=GREATEST(0,"lifetimeRedeemed"-adjustment."pointsUsed"),
                         "updatedAt"=CURRENT_TIMESTAMP
                   WHERE "id"=transaction_row."accountId"
                   RETURNING "availablePoints" INTO balance_after;

                  refund_id := 'booking_refund_' || md5(NEW."id" || clock_timestamp()::text || random()::text);
                  INSERT INTO "PointTransaction"
                    ("id","customerId","accountId","type","amount","balanceAfter","sourceType","sourceId","reason","note","createdAt")
                  VALUES
                    (refund_id,adjustment."customerId",transaction_row."accountId",'refund',adjustment."pointsUsed",balance_after,
                     'appointment_booking',NEW."id",'予約キャンセルによるポイント返還','customer-booking-points-v652',CURRENT_TIMESTAMP)
                  ON CONFLICT ("sourceType","sourceId","type") DO NOTHING;
                END IF;

                IF adjustment."couponIssueId" IS NOT NULL THEN
                  UPDATE "CouponIssue"
                     SET "status"='issued',"updatedAt"=CURRENT_TIMESTAMP
                   WHERE "id"=adjustment."couponIssueId" AND "status"='used';
                END IF;

                UPDATE "CustomerBookingAdjustmentV652"
                   SET "status"='released',"releasedAt"=CURRENT_TIMESTAMP,"updatedAt"=CURRENT_TIMESTAMP
                 WHERE "id"=adjustment."id";
              END IF;
            END IF;
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql
        `)
        await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS lien_release_booking_adjustment_v652 ON "Appointment"')
        await prisma.$executeRawUnsafe(`
          CREATE TRIGGER lien_release_booking_adjustment_v652
          AFTER UPDATE OF "status" ON "Appointment"
          FOR EACH ROW EXECUTE FUNCTION lien_release_booking_adjustment_v652()
        `)
        await prisma.$executeRawUnsafe(`
          CREATE OR REPLACE FUNCTION lien_settle_booking_adjustment_v652()
          RETURNS trigger AS $$
          BEGIN
            IF NEW."appointmentId" IS NOT NULL THEN
              UPDATE "CustomerBookingAdjustmentV652"
                 SET "status"='settled',"updatedAt"=CURRENT_TIMESTAMP
               WHERE "appointmentId"=NEW."appointmentId" AND "status"='active';
            END IF;
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql
        `)
        await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS lien_settle_booking_adjustment_v652 ON "ServiceSale"')
        await prisma.$executeRawUnsafe(`
          CREATE TRIGGER lien_settle_booking_adjustment_v652
          AFTER INSERT ON "ServiceSale"
          FOR EACH ROW EXECUTE FUNCTION lien_settle_booking_adjustment_v652()
        `)
      })().catch(error => {
        schemaPromise = null
        throw error
      })
    }
    return schemaPromise
  }

  async function legacyContext(req, url) {
    const res = captureResponse()
    await legacy.handle(req, res, url)
    let body = {}
    try { body = res.body ? JSON.parse(res.body) : {} } catch {}
    return { status: res.statusCode, body }
  }

  async function pointSummary(session) {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT COALESCE(account."availablePoints",0)::int AS "accountPoints",
              COALESCE(valid_lots."points",0)::int AS "validLotPoints",
              organization."pointMinimumRedeem"::int AS "minimumRedeem",
              organization."pointMaxRedemptionPercent"::int AS "maxRedemptionPercent"
         FROM "Organization" organization
         LEFT JOIN "CustomerPointAccount" account ON account."customerId"=$1
         LEFT JOIN LATERAL (
           SELECT SUM("remainingAmount")::int AS "points"
             FROM "PointLot"
            WHERE "customerId"=$1 AND "remainingAmount">0 AND "expiresAt">=CURRENT_TIMESTAMP
         ) valid_lots ON TRUE
        WHERE organization."id"=$2 LIMIT 1`,
      session.customerId,
      session.organizationId,
    )
    const row = rows[0] || {}
    return {
      availablePoints: Math.max(0, Math.min(integer(row.accountPoints), integer(row.validLotPoints))),
      minimumRedeem: Math.max(1, integer(row.minimumRedeem, 1)),
      maxRedemptionPercent: Math.max(0, Math.min(100, integer(row.maxRedemptionPercent, 50))),
      yenPerPoint: 1,
    }
  }

  async function context(req, res, url) {
    const session = await sessionProvider(req)
    if (!session) return json(res, 401, { error: 'ログインが必要です。' })
    const [legacyResult, points] = await Promise.all([legacyContext(req, url), pointSummary(session)])
    if (legacyResult.status !== 200) return json(res, legacyResult.status, legacyResult.body)
    return json(res, 200, { ...legacyResult.body, points })
  }

  async function rollbackFailedBooking(session, appointmentId, message) {
    if (!appointmentId) return
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "Appointment" appointment
            SET "status"='キャンセル',"couponIssueId"=NULL,
                "note"=CONCAT_WS(E'\\n',NULLIF(BTRIM(COALESCE(appointment."note",'')),''),$4),
                "updatedAt"=CURRENT_TIMESTAMP
           FROM "Customer" customer
          WHERE appointment."id"=$1 AND appointment."customerId"=$2
            AND customer."id"=appointment."customerId" AND customer."organizationId"=$3
            AND appointment."bookingProvider"='customer_app'
            AND appointment."createdAt">=CURRENT_TIMESTAMP-INTERVAL '10 minutes'
            AND appointment."status" NOT IN ('キャンセル','キャンセル済み','無断キャンセル','cancelled','canceled','no-show','no_show')
            AND NOT EXISTS (SELECT 1 FROM "CustomerBookingAdjustmentV652" adjustment WHERE adjustment."appointmentId"=appointment."id")`,
        appointmentId,
        session.customerId,
        session.organizationId,
        `割引適用に失敗したため予約を取り消しました: ${String(message || '').slice(0, 240)}`,
      )
    } catch (error) {
      console.error(`[${RELEASE}] failed booking rollback`, {
        appointmentId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async function applyBookingAdjustment(req, res) {
    if (!validOrigin(req)) return json(res, 403, { error: '不正な送信元です。' })
    const session = await sessionProvider(req)
    if (!session) return json(res, 401, { error: 'ログインが必要です。' })
    const body = await readJson(req)
    const appointmentId = String(body.appointmentId || '').trim().slice(0, 160)
    const requestedCouponId = String(body.couponIssueId || '').trim().slice(0, 160)
    const pointsToUse = Number(body.pointsToUse ?? 0)
    if (!appointmentId) return json(res, 400, { error: '予約情報を確認してください。' })
    if (!Number.isSafeInteger(pointsToUse) || pointsToUse < 0) {
      await rollbackFailedBooking(session, appointmentId, '利用ポイントが正しくありません。')
      return json(res, 400, { error: '利用ポイントは0pt以上の整数で指定してください。' })
    }

    try {
      const result = await prisma.$transaction(async tx => {
        await tx.$queryRawUnsafe(
          'SELECT TRUE AS "locked" FROM (SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))) lock',
          `${RELEASE}:${session.organizationId}`,
          session.customerId,
        )
        const appointments = await tx.$queryRawUnsafe(
          `SELECT appointment."id",appointment."customerId",appointment."menu",appointment."note",
                  appointment."status",appointment."estimatedPrice",appointment."couponIssueId"
             FROM "Appointment" appointment
             JOIN "Customer" customer ON customer."id"=appointment."customerId"
            WHERE appointment."id"=$1 AND appointment."customerId"=$2
              AND customer."organizationId"=$3 AND customer."deletedAt" IS NULL
              AND appointment."status" NOT IN ('キャンセル','キャンセル済み','無断キャンセル','cancelled','canceled','no-show','no_show')
            LIMIT 1 FOR UPDATE OF appointment`,
          appointmentId,
          session.customerId,
          session.organizationId,
        )
        const appointment = appointments[0]
        if (!appointment) throw Object.assign(new Error('予約が見つかりません。'), { status: 404 })

        const existingRows = await tx.$queryRawUnsafe(
          'SELECT * FROM "CustomerBookingAdjustmentV652" WHERE "appointmentId"=$1 LIMIT 1 FOR UPDATE',
          appointment.id,
        )
        if (existingRows[0]) {
          if (existingRows[0].status === 'released') {
            throw Object.assign(new Error('この予約の割引は取り消し済みです。'), { status: 409 })
          }
          return adjustmentPayload(existingRows[0])
        }

        const menuPrice = integer(appointment.estimatedPrice, -1)
        if (menuPrice < 0) throw Object.assign(new Error('メニュー料金を確認できません。'), { status: 409 })
        const linkedCouponId = String(appointment.couponIssueId || '')
        if (linkedCouponId && requestedCouponId && linkedCouponId !== requestedCouponId) {
          throw Object.assign(new Error('予約に設定されたクーポンが一致しません。'), { status: 409 })
        }
        const couponIssueId = linkedCouponId || requestedCouponId
        let coupon = null
        let couponDiscount = 0
        if (couponIssueId) {
          const couponRows = await tx.$queryRawUnsafe(
            `SELECT issue."id",issue."couponCode",issue."discountRate",issue."targetMenusJson",
                    reward_grant."rewardType" AS "stampRewardType"
               FROM "CouponIssue" issue
               JOIN "Customer" customer ON customer."id"=issue."customerId"
               LEFT JOIN "CustomerStampRewardGrantV644" reward_grant ON reward_grant."couponIssueId"=issue."id"
              WHERE issue."id"=$1 AND issue."customerId"=$2 AND customer."organizationId"=$3
                AND customer."deletedAt" IS NULL AND issue."status"='issued'
                AND issue."issuedAt"<=CURRENT_TIMESTAMP AND issue."expiresAt">=CURRENT_TIMESTAMP
              LIMIT 1 FOR UPDATE OF issue`,
            couponIssueId,
            session.customerId,
            session.organizationId,
          )
          coupon = couponRows[0] || null
          if (!coupon) throw Object.assign(new Error('選択したクーポンは期限切れ、使用済み、または利用できません。'), { status: 409 })
          if (!couponMatchesMenu(parseTargets(coupon.targetMenusJson), appointment.menu, coupon.stampRewardType === 'MENU_FREE')) {
            throw Object.assign(new Error('このクーポンは選択したメニューでは利用できません。'), { status: 409 })
          }
          const rate = Math.max(0, Math.min(100, integer(coupon.discountRate)))
          couponDiscount = Math.min(menuPrice, Math.floor(menuPrice * rate / 100))
        }

        const settingsRows = await tx.$queryRawUnsafe(
          'SELECT "pointMinimumRedeem","pointMaxRedemptionPercent" FROM "Organization" WHERE "id"=$1 LIMIT 1',
          session.organizationId,
        )
        const minimumRedeem = Math.max(1, integer(settingsRows[0]?.pointMinimumRedeem, 1))
        const maxPercent = Math.max(0, Math.min(100, integer(settingsRows[0]?.pointMaxRedemptionPercent, 50)))
        const afterCoupon = Math.max(0, menuPrice - couponDiscount)
        let pointTransactionId = null

        if (pointsToUse > 0) {
          if (pointsToUse < minimumRedeem) {
            throw Object.assign(new Error(`ポイントは${minimumRedeem.toLocaleString('ja-JP')}ptから利用できます。`), { status: 409 })
          }
          const accountRows = await tx.$queryRawUnsafe(
            'SELECT * FROM "CustomerPointAccount" WHERE "customerId"=$1 LIMIT 1 FOR UPDATE',
            session.customerId,
          )
          const account = accountRows[0]
          if (!account) throw Object.assign(new Error('利用できるポイントがありません。'), { status: 409 })
          const lots = await tx.$queryRawUnsafe(
            `SELECT "id","remainingAmount" FROM "PointLot"
              WHERE "customerId"=$1 AND "remainingAmount">0 AND "expiresAt">=CURRENT_TIMESTAMP
              ORDER BY "expiresAt","createdAt" FOR UPDATE`,
            session.customerId,
          )
          const validLotPoints = lots.reduce((sum, lot) => sum + integer(lot.remainingAmount), 0)
          const availablePoints = Math.max(0, Math.min(integer(account.availablePoints), validLotPoints))
          const maxPoints = Math.min(availablePoints, Math.floor(afterCoupon * maxPercent / 100))
          if (pointsToUse > maxPoints) {
            throw Object.assign(new Error(`この予約で利用できるポイントは${maxPoints.toLocaleString('ja-JP')}ptまでです。`), { status: 409 })
          }

          let remaining = pointsToUse
          const allocations = []
          for (const lot of lots) {
            if (remaining <= 0) break
            const amount = Math.min(integer(lot.remainingAmount), remaining)
            if (amount <= 0) continue
            await tx.$executeRawUnsafe(
              'UPDATE "PointLot" SET "remainingAmount"="remainingAmount"-$2,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1',
              lot.id,
              amount,
            )
            allocations.push({ pointLotId: lot.id, amount })
            remaining -= amount
          }
          if (remaining > 0) throw Object.assign(new Error('利用できる有効ポイントが不足しています。'), { status: 409 })

          pointTransactionId = `booking_points_${crypto.randomUUID()}`
          const balanceAfter = integer(account.availablePoints) - pointsToUse
          await tx.$executeRawUnsafe(
            `INSERT INTO "PointTransaction"
              ("id","customerId","accountId","type","amount","balanceAfter","sourceType","sourceId","reason","note","createdAt")
             VALUES ($1,$2,$3,'redeem',$4,$5,'appointment_booking',$6,'予約時ポイント利用',$7,CURRENT_TIMESTAMP)`,
            pointTransactionId,
            session.customerId,
            account.id,
            -pointsToUse,
            balanceAfter,
            appointment.id,
            `${appointment.menu || 'メニュー'} / ${yen(menuPrice)} / 予約時適用`,
          )
          for (const allocation of allocations) {
            await tx.$executeRawUnsafe(
              `INSERT INTO "PointRedemptionAllocation" ("id","redeemTransactionId","pointLotId","amount","createdAt")
               VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP)`,
              `booking_allocation_${crypto.randomUUID()}`,
              pointTransactionId,
              allocation.pointLotId,
              allocation.amount,
            )
          }
          await tx.$executeRawUnsafe(
            `UPDATE "CustomerPointAccount"
                SET "availablePoints"="availablePoints"-$2,
                    "lifetimeRedeemed"="lifetimeRedeemed"+$2,
                    "updatedAt"=CURRENT_TIMESTAMP
              WHERE "id"=$1`,
            account.id,
            pointsToUse,
          )
        }

        const finalPrice = Math.max(0, afterCoupon - pointsToUse)
        if (coupon) {
          const updated = await tx.$executeRawUnsafe(
            'UPDATE "CouponIssue" SET "status"=\'used\',"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1 AND "status"=\'issued\'',
            coupon.id,
          )
          if (Number(updated) !== 1) throw Object.assign(new Error('クーポンの利用状態が更新されました。'), { status: 409 })
        }

        const notePrefixes = ['予約クーポン:', '予約時メニュー料金:', 'クーポン割引:', '利用ポイント:', '支払予定額:']
        const noteLines = String(appointment.note || '').split('\n').map(line => line.trim()).filter(line => (
          line && !notePrefixes.some(prefix => line.startsWith(prefix))
        ))
        noteLines.push(`予約時メニュー料金: ${yen(menuPrice)}`)
        if (coupon) {
          noteLines.push(`予約クーポン: ${integer(coupon.discountRate)}%OFF（${coupon.couponCode}）`)
          noteLines.push(`クーポン割引: ${yen(couponDiscount)}`)
        }
        if (pointsToUse > 0) noteLines.push(`利用ポイント: ${pointsToUse.toLocaleString('ja-JP')}pt`)
        noteLines.push(`支払予定額: ${yen(finalPrice)}`)

        const adjustmentId = `booking_adjustment_${crypto.randomUUID()}`
        await tx.$executeRawUnsafe(
          `INSERT INTO "CustomerBookingAdjustmentV652"
            ("id","appointmentId","organizationId","customerId","menuPrice","couponIssueId","couponCode",
             "couponRate","couponDiscount","pointsUsed","finalPrice","pointTransactionId","status")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'active')`,
          adjustmentId,
          appointment.id,
          session.organizationId,
          session.customerId,
          menuPrice,
          coupon?.id || null,
          coupon?.couponCode || null,
          coupon ? integer(coupon.discountRate) : 0,
          couponDiscount,
          pointsToUse,
          finalPrice,
          pointTransactionId,
        )
        await tx.$executeRawUnsafe(
          `UPDATE "Appointment"
              SET "estimatedPrice"=$2,"couponIssueId"=NULL,"note"=$3,"updatedAt"=CURRENT_TIMESTAMP
            WHERE "id"=$1`,
          appointment.id,
          finalPrice,
          noteLines.join('\n'),
        )

        return adjustmentPayload({
          appointmentId: appointment.id,
          couponIssueId: coupon?.id || null,
          couponCode: coupon?.couponCode || null,
          couponRate: coupon ? integer(coupon.discountRate) : 0,
          menuPrice,
          couponDiscount,
          pointsUsed: pointsToUse,
          finalPrice,
          status: 'active',
        })
      }, { isolationLevel: 'Serializable' })
      return json(res, 200, { success: true, ...result })
    } catch (error) {
      await rollbackFailedBooking(session, appointmentId, error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  async function adminAppointmentCoupon(req, res, url, adminSessionProvider) {
    const session = await adminSessionProvider(req)
    if (!session?.organizationId) return json(res, 401, { error: 'ログインが必要です。' })
    const appointmentId = String(url.searchParams.get('appointmentId') || '').trim().slice(0, 160)
    const rows = await prisma.$queryRawUnsafe(
      `SELECT adjustment."appointmentId",adjustment."couponIssueId",adjustment."couponCode",adjustment."couponRate",
              adjustment."menuPrice",adjustment."couponDiscount",adjustment."pointsUsed",adjustment."finalPrice",adjustment."status",
              appointment."couponIssueId" AS "legacyCouponIssueId",issue."couponCode" AS "legacyCouponCode",
              issue."discountRate" AS "legacyDiscountRate",issue."status" AS "legacyCouponStatus"
         FROM "Appointment" appointment
         JOIN "Customer" customer ON customer."id"=appointment."customerId"
         LEFT JOIN "CustomerBookingAdjustmentV652" adjustment ON adjustment."appointmentId"=appointment."id"
         LEFT JOIN "CouponIssue" issue ON issue."id"=appointment."couponIssueId"
        WHERE appointment."id"=$1 AND customer."organizationId"=$2 LIMIT 1`,
      appointmentId,
      session.organizationId,
    )
    const row = rows[0]
    if (!row) return json(res, 404, { error: '予約が見つかりません。' })
    if (row.appointmentId) return json(res, 200, adjustmentPayload(row))
    return json(res, 200, row.legacyCouponIssueId ? {
      bookingApplied: false,
      couponIssueId: row.legacyCouponIssueId,
      couponCode: row.legacyCouponCode,
      discountRate: integer(row.legacyDiscountRate),
      status: row.legacyCouponStatus,
    } : { bookingApplied: false, couponIssueId: null })
  }

  async function handle(req, res, url, adminSessionProvider) {
    try {
      if (url.pathname === '/api/lien-customer-booking-context' && req.method === 'GET') {
        await context(req, res, url); return true
      }
      if (url.pathname === '/api/lien-customer-booking-coupon' && req.method === 'POST') {
        await applyBookingAdjustment(req, res); return true
      }
      if (url.pathname === '/api/lien-admin-appointment-coupon' && req.method === 'GET') {
        await adminAppointmentCoupon(req, res, url, adminSessionProvider); return true
      }
      return false
    } catch (error) {
      console.error(`[${RELEASE}]`, { error: error instanceof Error ? error.message : String(error) })
      json(res, Number(error?.status) || 500, {
        error: Number(error?.status) ? error.message : '予約の割引を適用できませんでした。画面を更新して再度お試しください。',
      })
      return true
    }
  }

  return { ensureSchema, handle }
}

module.exports = { createCustomerBookingCouponService }
