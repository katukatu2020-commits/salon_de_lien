'use strict'

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
  try { return raw ? JSON.parse(raw) : {} } catch { throw Object.assign(new Error('送信内容を確認してください。'), { status: 400 }) }
}

function validOrigin(req) {
  const origin = String(req.headers.origin || '')
  if (!origin) return true
  try { return new URL(origin).host === req.headers.host } catch { return false }
}

function menuKeyFromName(value) {
  const text = String(value || '')
  if (/縮毛|ストレート/.test(text)) return 'straight'
  if (/パーマ/.test(text)) return 'perm'
  if (/カラー/.test(text)) return 'color'
  if (/ヘッドスパ|スパ/.test(text)) return 'headspa'
  if (/トリートメント/.test(text)) return 'treatment'
  if (/カット/.test(text)) return 'cut'
  return ''
}

function parseTargets(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (!value) return []
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []
  } catch { return [] }
}

function couponMatchesMenu(targets, appointmentMenu) {
  if (!targets.length) return true
  const menu = String(appointmentMenu || '').replace(/\s/g, '')
  return targets.some(target => {
    const normalized = String(target || '').replace(/\s/g, '')
    return normalized && (menu.includes(normalized) || normalized.includes(menu))
  })
}

function createCustomerBookingCouponService({ prisma, sessionProvider }) {
  async function ensureSchema() {
    await prisma.$executeRawUnsafe('ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "couponIssueId" TEXT')
    await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_couponIssueId_key" ON "Appointment"("couponIssueId")')
    await prisma.$executeRawUnsafe(`DO $$ BEGIN
      ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_couponIssueId_fkey"
      FOREIGN KEY ("couponIssueId") REFERENCES "CouponIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
    await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION lien_release_appointment_coupon_v366()
      RETURNS trigger AS $$ BEGIN
        IF NEW."status" IN ('キャンセル','キャンセル済み','無断キャンセル') THEN NEW."couponIssueId" := NULL; END IF;
        RETURN NEW;
      END; $$ LANGUAGE plpgsql`)
    await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS lien_release_appointment_coupon_v366 ON "Appointment"')
    await prisma.$executeRawUnsafe(`CREATE TRIGGER lien_release_appointment_coupon_v366
      BEFORE UPDATE OF "status" ON "Appointment" FOR EACH ROW EXECUTE FUNCTION lien_release_appointment_coupon_v366()`)
    await prisma.$executeRawUnsafe(`UPDATE "Product" SET "imageUrl"=CASE
      WHEN "category"='シャンプー' THEN '/images/products/yohaku/shampoo.png'
      WHEN "category"='トリートメント' THEN '/images/products/yohaku/treatment.png'
      WHEN "category"='スタイリング剤' THEN '/images/products/yohaku/styling.png'
      WHEN "category"='アウトバス' THEN '/images/products/yohaku/leave-in.png'
      ELSE '/images/products/yohaku/scalp.png' END
      WHERE "organizationId"='org_showcase_yohaku' AND "active"=TRUE
        AND ("imageUrl" IS NULL OR BTRIM("imageUrl")='')`)
  }

  async function context(req, res, url) {
    const session = await sessionProvider(req)
    if (!session) return json(res, 401, { error: 'ログインが必要です。' })

    const requestedCouponId = String(url.searchParams.get('coupon') || '').trim().slice(0, 160)
    const repeat = ['last', 'previous'].includes(String(url.searchParams.get('repeat') || ''))
    let previous = null
    let coupon = null

    if (repeat) {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT a."menu",a."staffName",s."paidAt"
         FROM "ServiceSale" s JOIN "Appointment" a ON a."id"=s."appointmentId"
         JOIN "Customer" c ON c."id"=a."customerId"
         WHERE a."customerId"=$1 AND c."organizationId"=$2
         ORDER BY s."paidAt" DESC LIMIT 1`,
        session.customerId,
        session.organizationId,
      )
      if (rows[0]) {
        const staffRows = rows[0].staffName
          ? await prisma.$queryRawUnsafe(
              `SELECT "staffKey","staffName" FROM "StaffBookingSetting"
               WHERE "organizationId"=$1 AND REPLACE("staffName",' ','')=REPLACE($2,' ','') LIMIT 1`,
              session.organizationId,
              rows[0].staffName,
            )
          : []
        previous = {
          menu: rows[0].menu || '',
          menuKey: menuKeyFromName(rows[0].menu),
          staffKey: staffRows[0]?.staffKey || 'free',
          staffName: staffRows[0]?.staffName || rows[0].staffName || '指名なし',
        }
      }
    }

    if (requestedCouponId) {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT ci."id",ci."couponCode",ci."discountRate",ci."targetMenusJson",ci."expiresAt",
          a."id" AS "appointmentId",a."status" AS "appointmentStatus"
         FROM "CouponIssue" ci
         LEFT JOIN "Appointment" a ON a."couponIssueId"=ci."id" AND a."status" NOT IN ('キャンセル','キャンセル済み','無断キャンセル')
         WHERE ci."id"=$1 AND ci."customerId"=$2 AND ci."status"='issued'
           AND ci."issuedAt"<=CURRENT_TIMESTAMP AND ci."expiresAt">=CURRENT_TIMESTAMP LIMIT 1`,
        requestedCouponId,
        session.customerId,
      )
      if (rows[0]) coupon = {
        id: rows[0].id,
        couponCode: rows[0].couponCode,
        discountRate: Number(rows[0].discountRate),
        targetMenus: parseTargets(rows[0].targetMenusJson),
        expiresAt: rows[0].expiresAt,
        appointmentId: rows[0].appointmentId || null,
      }
    }

    return json(res, 200, { previous, coupon })
  }

  async function link(req, res) {
    if (!validOrigin(req)) return json(res, 403, { error: '不正な送信元です。' })
    const session = await sessionProvider(req)
    if (!session) return json(res, 401, { error: 'ログインが必要です。' })
    const body = await readJson(req)
    const appointmentId = String(body.appointmentId || '').trim().slice(0, 160)
    const couponIssueId = String(body.couponIssueId || '').trim().slice(0, 160)
    if (!appointmentId || !couponIssueId) return json(res, 400, { error: '予約とクーポンを確認してください。' })

    const result = await prisma.$transaction(async tx => {
      const appointments = await tx.$queryRawUnsafe(
        `SELECT a."id",a."menu",a."note",a."status" FROM "Appointment" a
         JOIN "Customer" c ON c."id"=a."customerId"
         WHERE a."id"=$1 AND a."customerId"=$2 AND c."organizationId"=$3
           AND a."status" NOT IN ('キャンセル','キャンセル済み','無断キャンセル') FOR UPDATE OF a`,
        appointmentId,
        session.customerId,
        session.organizationId,
      )
      const appointment = appointments[0]
      if (!appointment) throw Object.assign(new Error('予約が見つかりません。'), { status: 404 })
      const issues = await tx.$queryRawUnsafe(
        `SELECT "id","couponCode","discountRate","targetMenusJson","expiresAt" FROM "CouponIssue"
         WHERE "id"=$1 AND "customerId"=$2 AND "status"='issued'
           AND "issuedAt"<=CURRENT_TIMESTAMP AND "expiresAt">=CURRENT_TIMESTAMP FOR UPDATE`,
        couponIssueId,
        session.customerId,
      )
      const issue = issues[0]
      if (!issue) throw Object.assign(new Error('このクーポンは期限切れ、使用済み、または利用できません。'), { status: 409 })
      if (!couponMatchesMenu(parseTargets(issue.targetMenusJson), appointment.menu)) {
        throw Object.assign(new Error('このクーポンは選択したメニューでは利用できません。'), { status: 409 })
      }
      const inUse = await tx.$queryRawUnsafe(
        `SELECT "id" FROM "Appointment" WHERE "couponIssueId"=$1 AND "id"<>$2
         AND "status" NOT IN ('キャンセル','キャンセル済み','無断キャンセル') LIMIT 1`,
        issue.id,
        appointment.id,
      )
      if (inUse[0]) throw Object.assign(new Error('このクーポンは別の予約に設定済みです。'), { status: 409 })
      const couponLine = `予約クーポン: ${Number(issue.discountRate)}%OFF（${issue.couponCode}）`
      const noteLines = String(appointment.note || '').split('\n').filter(line => line && !line.startsWith('予約クーポン:'))
      noteLines.push(couponLine)
      await tx.$executeRawUnsafe(
        'UPDATE "Appointment" SET "couponIssueId"=$2,"note"=$3,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1',
        appointment.id,
        issue.id,
        noteLines.join('\n'),
      )
      return { appointmentId: appointment.id, couponIssueId: issue.id, couponCode: issue.couponCode, discountRate: Number(issue.discountRate) }
    })
    return json(res, 200, { success: true, ...result })
  }

  async function adminAppointmentCoupon(req, res, url, adminSessionProvider) {
    const session = await adminSessionProvider(req)
    if (!session || !session.organizationId) return json(res, 401, { error: 'ログインが必要です。' })
    const appointmentId = String(url.searchParams.get('appointmentId') || '').trim().slice(0, 160)
    const rows = await prisma.$queryRawUnsafe(
      `SELECT a."couponIssueId",ci."couponCode",ci."discountRate",ci."status"
       FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId"
       LEFT JOIN "CouponIssue" ci ON ci."id"=a."couponIssueId"
       WHERE a."id"=$1 AND c."organizationId"=$2 LIMIT 1`,
      appointmentId,
      session.organizationId,
    )
    const row = rows[0]
    return json(res, 200, row?.couponIssueId ? {
      couponIssueId: row.couponIssueId,
      couponCode: row.couponCode,
      discountRate: Number(row.discountRate),
      status: row.status,
    } : { couponIssueId: null })
  }

  async function handle(req, res, url, adminSessionProvider) {
    try {
      if (url.pathname === '/api/lien-customer-booking-context' && req.method === 'GET') {
        await context(req, res, url); return true
      }
      if (url.pathname === '/api/lien-customer-booking-coupon' && req.method === 'POST') {
        await link(req, res); return true
      }
      if (url.pathname === '/api/lien-admin-appointment-coupon' && req.method === 'GET') {
        await adminAppointmentCoupon(req, res, url, adminSessionProvider); return true
      }
      return false
    } catch (error) {
      console.error('[customer-booking-coupon-v366]', { error: error instanceof Error ? error.message : String(error) })
      json(res, Number(error?.status) || 500, { error: Number(error?.status) ? error.message : '処理を完了できませんでした。時間をおいて再度お試しください。' })
      return true
    }
  }

  return { ensureSchema, handle }
}

module.exports = { createCustomerBookingCouponService }
