'use strict'

const CUSTOMER_CANCELLATION_POLICY_MESSAGE = 'アプリからのキャンセルは予約日の前日までです。当日の変更・キャンセルは店舗へ電話またはチャットでお問い合わせください。'
const CANCELLATION_STATUSES = ['キャンセル', 'キャンセル済み', '無断キャンセル', 'cancelled', 'canceled', 'no-show', 'no_show']
const COMPLETED_STATUSES = ['来店済み', '来店完了', '会計済み', '会計完了', 'completed']

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
  try { return raw ? JSON.parse(raw) : {} }
  catch { throw Object.assign(new Error('送信内容を確認してください。'), { status: 400 }) }
}

function validOrigin(req) {
  const origin = String(req.headers.origin || '')
  if (!origin) return true
  try { return new URL(origin).host === req.headers.host } catch { return false }
}

function tokyoDateKey(value) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value))
  const part = type => parts.find(item => item.type === type)?.value || ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function customerCancellationDeadline(value) {
  return new Date(`${tokyoDateKey(value)}T00:00:00+09:00`)
}

function canCustomerCancel(value, now = new Date()) {
  return now.getTime() < customerCancellationDeadline(value).getTime()
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
         FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId"
         WHERE a."id"=$1 AND a."customerId"=$2 AND c."organizationId"=$3 AND c."deletedAt" IS NULL
         FOR UPDATE OF a`,
        appointmentId,
        session.customerId,
        session.organizationId,
      )
      const appointment = rows[0]
      if (!appointment) throw Object.assign(new Error('予約が見つかりません。'), { status: 404 })
      if (CANCELLATION_STATUSES.includes(appointment.status)) {
        throw Object.assign(new Error('この予約はすでにキャンセル済みです。'), { status: 409 })
      }
      if (!canCustomerCancel(appointment.scheduledAt)) {
        throw Object.assign(new Error(CUSTOMER_CANCELLATION_POLICY_MESSAGE), { status: 409 })
      }
      if (appointment.hasSale || COMPLETED_STATUSES.includes(appointment.status)) {
        throw Object.assign(new Error('会計済みの予約はキャンセルできません。'), { status: 409 })
      }

      const deadline = customerCancellationDeadline(appointment.scheduledAt)
      const note = [String(appointment.note || '').trim(), 'お客様アプリからキャンセル'].filter(Boolean).join('\n')
      const changed = await tx.$executeRawUnsafe(
        `UPDATE "Appointment" SET "status"='キャンセル',"note"=$2,"couponIssueId"=NULL,"updatedAt"=CURRENT_TIMESTAMP
         WHERE "id"=$1 AND "customerId"=$3
           AND "status" NOT IN ('キャンセル','キャンセル済み','無断キャンセル','cancelled','canceled','no-show','no_show')
           AND CURRENT_TIMESTAMP<$4::timestamptz`,
        appointment.id,
        note,
        session.customerId,
        deadline.toISOString(),
      )
      if (Number(changed) !== 1) throw Object.assign(new Error(CUSTOMER_CANCELLATION_POLICY_MESSAGE), { status: 409 })

      const when = new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit'
      }).format(new Date(appointment.scheduledAt))
      await tx.$executeRawUnsafe(
        'INSERT INTO "ContactLog" ("id","customerId","channel","purpose","message","outcome","createdAt") VALUES ($1,$2,\'お客様アプリ\',\'予約キャンセル\',$3,\'キャンセル\',CURRENT_TIMESTAMP)',
        crypto.randomUUID(),
        appointment.customerId,
        `${when} / ${appointment.menu || 'メニュー未設定'} / 担当 ${appointment.staffName || 'フリー'}`,
      )
      return { id: appointment.id, customerName: appointment.customerName, menu: appointment.menu }
    })

    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "StaffSystemNotification" ("id","organizationId","type","title","body","href","entityType","entityId","source","createdAt")
         VALUES ($1,$2,'customer_cancellation','お客様が予約をキャンセルしました',$3,$4,'appointment',$5,'customer_app',CURRENT_TIMESTAMP)
         ON CONFLICT ("organizationId","type","entityId") DO NOTHING`,
        crypto.randomUUID(),
        session.organizationId,
        `${result.customerName || 'お客様'}様が${result.menu || '施術'}の予約をキャンセルしました。`,
        `/admin/appointments/${encodeURIComponent(result.id)}`,
        result.id,
      )
    } catch (notificationError) {
      console.warn('[customer-appointment-cancellation-v616] staff notification could not be recorded', {
        appointmentId: result.id,
        error: notificationError instanceof Error ? notificationError.message : String(notificationError),
      })
    }
    return json(res, 200, { success: true, appointmentId: result.id, status: 'キャンセル' })
  }

  async function handle(req, res, url) {
    if (url.pathname !== '/api/lien-customer-appointment-cancel') return false
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      json(res, 405, { error: 'この操作は利用できません。' })
      return true
    }
    try { await cancel(req, res) }
    catch (error) {
      console.error('[customer-appointment-cancellation-v616]', { error: error instanceof Error ? error.message : String(error) })
      json(res, Number(error?.status) || 500, {
        error: Number(error?.status) ? error.message : '予約をキャンセルできませんでした。時間をおいて再度お試しください。'
      })
    }
    return true
  }

  return { handle }
}

module.exports = {
  CUSTOMER_CANCELLATION_POLICY_MESSAGE,
  canCustomerCancel,
  customerCancellationDeadline,
  createCustomerAppointmentCancellationService,
}
