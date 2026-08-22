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
    if (raw.length > 8192) throw Object.assign(new Error('送信内容が大きすぎます。'), { status: 413 })
  }
  try {
    return raw ? JSON.parse(raw) : {}
  } catch {
    throw Object.assign(new Error('送信内容を確認してください。'), { status: 400 })
  }
}

function validOrigin(req) {
  const origin = String(req.headers.origin || '')
  if (!origin) return true
  try { return new URL(origin).host === req.headers.host } catch { return false }
}

function createCustomerAppointmentCancellationService({ prisma, crypto, sessionProvider }) {
  async function cancel(req, res) {
    if (!validOrigin(req)) return json(res, 403, { error: '不正な送信元です。' })
    const session = await sessionProvider(req)
    if (!session) return json(res, 401, { error: 'ログインが必要です。' })

    const data = await readJson(req)
    const appointmentId = String(data.appointmentId || '').trim()
    if (!appointmentId || appointmentId.length > 100) return json(res, 400, { error: '予約情報を確認してください。' })

    const result = await prisma.$transaction(async tx => {
      const rows = await tx.$queryRawUnsafe(
        `SELECT a."id",a."customerId",a."scheduledAt",a."menu",a."staffName",a."status",a."note",c."name" AS "customerName",
          EXISTS(SELECT 1 FROM "ServiceSale" s WHERE s."appointmentId"=a."id") AS "hasSale"
         FROM "Appointment" a
         JOIN "Customer" c ON c."id"=a."customerId"
         WHERE a."id"=$1 AND a."customerId"=$2 AND c."organizationId"=$3 AND c."deletedAt" IS NULL
         FOR UPDATE OF a`,
        appointmentId,
        session.customerId,
        session.organizationId,
      )
      const appointment = rows[0]
      if (!appointment) throw Object.assign(new Error('予約が見つかりません。'), { status: 404 })
      if (['キャンセル', '無断キャンセル'].includes(appointment.status)) {
        throw Object.assign(new Error('この予約はすでにキャンセル済みです。'), { status: 409 })
      }
      if (new Date(appointment.scheduledAt).getTime() <= Date.now()) {
        throw Object.assign(new Error('開始時刻を過ぎた予約はアプリからキャンセルできません。店舗へお問い合わせください。'), { status: 409 })
      }
      if (appointment.hasSale || appointment.status === '来店済み') {
        throw Object.assign(new Error('会計済みの予約はキャンセルできません。'), { status: 409 })
      }

      const note = [String(appointment.note || '').trim(), 'お客様アプリからキャンセル'].filter(Boolean).join('\n')
      const changed = await tx.$executeRawUnsafe(
        `UPDATE "Appointment" SET "status"='キャンセル',"note"=$2,"updatedAt"=CURRENT_TIMESTAMP
         WHERE "id"=$1 AND "customerId"=$3 AND "status" NOT IN ('キャンセル','無断キャンセル') AND "scheduledAt">CURRENT_TIMESTAMP`,
        appointment.id,
        note,
        session.customerId,
      )
      if (Number(changed) !== 1) throw Object.assign(new Error('予約状況が更新されています。画面を再読み込みしてください。'), { status: 409 })

      const when = new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit'
      }).format(new Date(appointment.scheduledAt))
      await tx.$executeRawUnsafe(
        'INSERT INTO "ContactLog" ("id","customerId","channel","purpose","message","outcome","createdAt") VALUES ($1,$2,\'お客様アプリ\',\'予約キャンセル\',$3,\'キャンセル\',CURRENT_TIMESTAMP)',
        crypto.randomUUID(),
        appointment.customerId,
        `${when} / ${appointment.menu || 'メニュー未設定'} / 担当 ${appointment.staffName || 'フリー'}`,
      )
      await tx.$executeRawUnsafe(
        `INSERT INTO "StaffSystemNotification" ("id","organizationId","type","title","body","href","entityType","entityId","source","createdAt","updatedAt")
         VALUES ($1,$2,'customer_cancellation','お客様が予約をキャンセルしました',$3,$4,'appointment',$5,'customer_app',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
         ON CONFLICT ("organizationId","type","entityId") DO NOTHING`,
        crypto.randomUUID(),
        session.organizationId,
        `${appointment.customerName || 'お客様'}様が${appointment.menu || '施術'}の予約をキャンセルしました。`,
        `/admin/appointments/${encodeURIComponent(appointment.id)}`,
        appointment.id,
      )
      return { id: appointment.id }
    })

    return json(res, 200, { success: true, appointmentId: result.id, status: 'キャンセル' })
  }

  async function handle(req, res, url) {
    if (url.pathname !== '/api/lien-customer-appointment-cancel') return false
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      json(res, 405, { error: 'この操作は利用できません。' })
      return true
    }
    try {
      await cancel(req, res)
    } catch (error) {
      console.error('[customer-appointment-cancellation-v362]', {
        appointmentId: undefined,
        error: error instanceof Error ? error.message : String(error),
      })
      json(res, Number(error?.status) || 500, {
        error: Number(error?.status) ? error.message : '予約をキャンセルできませんでした。時間をおいて再度お試しください。'
      })
    }
    return true
  }

  return { handle }
}

module.exports = { createCustomerAppointmentCancellationService }
