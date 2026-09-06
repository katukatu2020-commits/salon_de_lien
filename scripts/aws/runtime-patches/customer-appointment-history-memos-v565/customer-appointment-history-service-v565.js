'use strict'

const RELEASE = 'customer-appointment-history-memos-v565'
const MAX_JSON_BYTES = 16 * 1024
const MAX_MEMO_LENGTH = 4000
const INACTIVE_APPOINTMENT_STATUSES = new Set([
  'キャンセル',
  'キャンセル済み',
  '無断キャンセル',
  '来店済み',
  '来店完了',
  '会計済み',
  '会計完了',
  'cancelled',
  'canceled',
  'cancel',
  'completed',
  'no-show',
  'no_show',
  'noshow',
])

function json(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(payload))
}

function statusError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode })
}

async function readBody(req, maxBytes = MAX_JSON_BYTES) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBytes) throw statusError('入力内容が長すぎます。', 413)
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

async function readJson(req) {
  const body = await readBody(req)
  try {
    return body.length ? JSON.parse(body.toString('utf8')) : {}
  } catch {
    throw statusError('入力内容を確認してください。', 400)
  }
}

function requestOrigin(req) {
  const protocol = String(req.headers['x-forwarded-proto'] || (req.socket?.encrypted ? 'https' : 'http')).split(',')[0].trim()
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  return `${protocol}://${host}`
}

function sameOrigin(req) {
  const supplied = String(req.headers.origin || '').trim()
  if (!supplied) return false
  try {
    const allowed = new Set([new URL(requestOrigin(req)).origin, 'https://salon-de-lien.com'])
    for (const key of ['APP_BASE_URL', 'AUTH_BASE_URL', 'NEXTAUTH_URL', 'NEXT_PUBLIC_APP_URL']) {
      const value = String(process.env[key] || '').trim()
      if (!value) continue
      try { allowed.add(new URL(value).origin) } catch {}
    }
    return allowed.has(new URL(supplied).origin)
  } catch {
    return false
  }
}

function cleanText(value, maxLength) {
  return String(value == null ? '' : value).trim().slice(0, maxLength)
}

function historyRoute(pathname) {
  const match = /^\/api\/admin\/customers\/([^/]+)\/visit-history(\/memo)?$/.exec(pathname)
  if (!match) return null
  try {
    return { customerId: decodeURIComponent(match[1]), memo: Boolean(match[2]) }
  } catch {
    return null
  }
}

function historyDateKey(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function displayDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}/${values.month}/${values.day}`
}

function normalizedAppointmentStatus(value) {
  return cleanText(value, 80).normalize('NFKC').replace(/\s+/g, '').toLowerCase()
}

function isActiveAppointment(row) {
  const status = normalizedAppointmentStatus(row.status)
  return !row.hasSale &&
    !INACTIVE_APPOINTMENT_STATUSES.has(status) &&
    !status.includes('キャンセル') &&
    !status.includes('cancel')
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function historySubjectKeys(item) {
  const appointmentIds = unique(item.sales.map(sale => cleanText(sale.appointmentId, 200)))
  const keys = []
  if (appointmentIds.length === 1) keys.push(`APPOINTMENT:${appointmentIds[0]}`)
  if (item.visit?.id) keys.push(`VISIT:${item.visit.id}`)
  if (item.sales[0]?.id) keys.push(`SALE:${item.sales[0].id}`)
  return unique(keys)
}

function buildCompletedHistory(visits, sales) {
  const salesByDate = new Map()
  for (const sale of sales) {
    const occurredAt = sale.scheduledAt || sale.paidAt
    const key = historyDateKey(occurredAt)
    if (!key) continue
    salesByDate.set(key, [...(salesByDate.get(key) || []), sale])
  }

  const items = []
  for (const visit of visits) {
    const key = historyDateKey(visit.visitedAt)
    const groupedSales = salesByDate.get(key) || []
    salesByDate.delete(key)
    items.push({
      id: `visit-${visit.id}`,
      occurredAt: visit.visitedAt,
      dateKey: key,
      visit,
      sales: groupedSales,
    })
  }
  for (const [key, groupedSales] of salesByDate.entries()) {
    items.push({
      id: `sale-${key}`,
      occurredAt: groupedSales[0]?.scheduledAt || groupedSales[0]?.paidAt || new Date(`${key}T00:00:00+09:00`),
      dateKey: key,
      visit: null,
      sales: groupedSales,
    })
  }

  return items
    .map(item => ({ ...item, subjectKeys: historySubjectKeys(item) }))
    .filter(item => item.subjectKeys.length > 0)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
}

function memoPayload(row) {
  if (!row) return null
  return {
    body: String(row.body || ''),
    updatedByName: String(row.updatedByName || '店舗スタッフ'),
    updatedAt: new Date(row.updatedAt).toISOString(),
  }
}

function createCustomerAppointmentHistoryService({ prisma, sessionProvider }) {
  let schemaPromise = null

  async function ensureSchema() {
    if (!schemaPromise) {
      schemaPromise = (async () => {
        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CustomerHistoryMemo" (
          "organizationId" TEXT NOT NULL,
          "subjectKey" TEXT NOT NULL,
          "body" TEXT NOT NULL,
          "updatedByUserId" TEXT,
          "updatedByName" TEXT NOT NULL,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY ("organizationId", "subjectKey")
        )`)
        await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerHistoryMemo_updated_idx" ON "CustomerHistoryMemo"("organizationId","updatedAt" DESC)')
      })().catch(error => {
        schemaPromise = null
        throw error
      })
    }
    return schemaPromise
  }

  async function requireStaff(req, res) {
    const session = await sessionProvider(req)
    if (!session || !session.organizationId || !['ADMIN', 'STAFF'].includes(session.role)) {
      json(res, 401, { ok: false, error: '店舗アカウントでログインしてください。' })
      return null
    }
    return session
  }

  async function ownedCustomer(customerId, organizationId) {
    const rows = await prisma.$queryRawUnsafe(
      'SELECT "id","name" FROM "Customer" WHERE "id"=$1 AND "organizationId"=$2 AND "deletedAt" IS NULL AND "storeHiddenAt" IS NULL LIMIT 1',
      customerId,
      organizationId,
    )
    return rows[0] || null
  }

  async function loadHistory(customerId, organizationId) {
    const [appointments, visits, sales] = await Promise.all([
      prisma.$queryRawUnsafe(`SELECT a."id",a."scheduledAt",a."durationMinutes",a."menu",a."staffName",a."estimatedPrice",a."status",a."source",a."note",a."createdAt",a."updatedAt",
          EXISTS(SELECT 1 FROM "ServiceSale" linked WHERE linked."appointmentId"=a."id") AS "hasSale"
        FROM "Appointment" a
        JOIN "Customer" c ON c."id"=a."customerId"
        WHERE a."customerId"=$1 AND c."organizationId"=$2
        ORDER BY a."scheduledAt" DESC,a."id"`, customerId, organizationId),
      prisma.$queryRawUnsafe(`SELECT v."id",v."visitedAt"
        FROM "Visit" v
        JOIN "Customer" c ON c."id"=v."customerId"
        WHERE v."customerId"=$1 AND c."organizationId"=$2
        ORDER BY v."visitedAt" DESC,v."id"`, customerId, organizationId),
      prisma.$queryRawUnsafe(`SELECT s."id",s."appointmentId",s."paidAt",s."amount",a."scheduledAt"
        FROM "ServiceSale" s
        JOIN "Customer" c ON c."id"=s."customerId"
        LEFT JOIN "Appointment" a ON a."id"=s."appointmentId"
        WHERE s."customerId"=$1 AND c."organizationId"=$2
        ORDER BY s."paidAt" DESC,s."id"`, customerId, organizationId),
    ])

    const currentAppointments = appointments.filter(isActiveAppointment)
    const completed = buildCompletedHistory(visits, sales)
    const subjectKeys = unique([
      ...currentAppointments.map(appointment => `APPOINTMENT:${appointment.id}`),
      ...completed.flatMap(item => item.subjectKeys),
    ])
    const memoRows = subjectKeys.length
      ? await prisma.$queryRawUnsafe(
          'SELECT "subjectKey","body","updatedByName","updatedAt" FROM "CustomerHistoryMemo" WHERE "organizationId"=$1 AND "subjectKey"=ANY($2::text[])',
          organizationId,
          subjectKeys,
        )
      : []
    const memoBySubject = new Map(memoRows.map(row => [row.subjectKey, row]))
    const now = Date.now()
    currentAppointments.sort((a, b) => {
      const aTime = new Date(a.scheduledAt).getTime()
      const bTime = new Date(b.scheduledAt).getTime()
      const aPast = aTime < now
      const bPast = bTime < now
      if (aPast !== bPast) return aPast ? 1 : -1
      return aPast ? bTime - aTime : aTime - bTime
    })

    return {
      appointments: currentAppointments.map(appointment => {
        const subjectKey = `APPOINTMENT:${appointment.id}`
        return {
          id: appointment.id,
          subjectKey,
          scheduledAt: new Date(appointment.scheduledAt).toISOString(),
          dateKey: historyDateKey(appointment.scheduledAt),
          displayDate: displayDate(appointment.scheduledAt),
          durationMinutes: appointment.durationMinutes == null ? null : Number(appointment.durationMinutes),
          menu: appointment.menu,
          staffName: appointment.staffName,
          estimatedPrice: appointment.estimatedPrice == null ? null : Number(appointment.estimatedPrice),
          status: appointment.status,
          source: appointment.source,
          bookingNote: appointment.note,
          isPast: new Date(appointment.scheduledAt).getTime() < now,
          memo: memoPayload(memoBySubject.get(subjectKey)),
        }
      }),
      completed: completed.map(item => {
        const memoRow = item.subjectKeys.map(key => memoBySubject.get(key)).find(Boolean)
        return {
          id: item.id,
          subjectKey: item.subjectKeys[0],
          dateKey: item.dateKey,
          displayDate: displayDate(item.occurredAt),
          memo: memoPayload(memoRow),
        }
      }),
    }
  }

  async function listHistory(res, session, customer) {
    const history = await loadHistory(customer.id, session.organizationId)
    json(res, 200, {
      ok: true,
      customer,
      totalCount: history.appointments.length + history.completed.length,
      ...history,
    })
  }

  async function subjectBelongsToCustomer(subjectKey, customerId, organizationId) {
    const separator = subjectKey.indexOf(':')
    if (separator < 1) return false
    const type = subjectKey.slice(0, separator)
    const subjectId = subjectKey.slice(separator + 1)
    if (!subjectId || subjectId.length > 220) return false
    const tableByType = { APPOINTMENT: 'Appointment', VISIT: 'Visit', SALE: 'ServiceSale' }
    const table = tableByType[type]
    if (!table) return false
    const rows = await prisma.$queryRawUnsafe(
      `SELECT entity."id" FROM "${table}" entity JOIN "Customer" c ON c."id"=entity."customerId" WHERE entity."id"=$1 AND entity."customerId"=$2 AND c."organizationId"=$3 LIMIT 1`,
      subjectId,
      customerId,
      organizationId,
    )
    return rows.length > 0
  }

  async function saveMemo(req, res, session, customer) {
    if (!sameOrigin(req)) return json(res, 403, { ok: false, error: '安全性を確認できないため保存できませんでした。' })
    const input = await readJson(req)
    const subjectKey = cleanText(input.subjectKey, 240)
    const rawBody = String(input.body == null ? '' : input.body)
    if (rawBody.length > MAX_MEMO_LENGTH) return json(res, 400, { ok: false, error: `施術メモは${MAX_MEMO_LENGTH.toLocaleString('ja-JP')}文字以内で入力してください。` })
    const body = rawBody.trim()
    if (!await subjectBelongsToCustomer(subjectKey, customer.id, session.organizationId)) {
      return json(res, 404, { ok: false, error: '対象の予約・来店履歴が見つかりません。' })
    }

    if (!body) {
      await prisma.$executeRawUnsafe(
        'DELETE FROM "CustomerHistoryMemo" WHERE "organizationId"=$1 AND "subjectKey"=$2',
        session.organizationId,
        subjectKey,
      )
      return json(res, 200, { ok: true, subjectKey, memo: null, message: '施術メモを削除しました。' })
    }

    const actorName = cleanText(session.operatorSubject || session.displayName || session.subject || '店舗スタッフ', 160) || '店舗スタッフ'
    const rows = await prisma.$queryRawUnsafe(`INSERT INTO "CustomerHistoryMemo" ("organizationId","subjectKey","body","updatedByUserId","updatedByName","createdAt","updatedAt")
      VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
      ON CONFLICT ("organizationId","subjectKey") DO UPDATE SET
        "body"=EXCLUDED."body","updatedByUserId"=EXCLUDED."updatedByUserId","updatedByName"=EXCLUDED."updatedByName","updatedAt"=NOW()
      RETURNING "body","updatedByName","updatedAt"`,
      session.organizationId,
      subjectKey,
      body,
      session.userId || null,
      actorName,
    )
    json(res, 200, { ok: true, subjectKey, memo: memoPayload(rows[0]), message: '施術メモを保存しました。' })
  }

  async function handle(req, res, url) {
    const route = historyRoute(url.pathname)
    if (!route) return false
    try {
      await ensureSchema()
      const session = await requireStaff(req, res)
      if (!session) return true
      const customer = await ownedCustomer(route.customerId, session.organizationId)
      if (!customer) {
        json(res, 404, { ok: false, error: '顧客カルテが見つかりません。' })
        return true
      }
      if (!route.memo && req.method === 'GET') await listHistory(res, session, customer)
      else if (route.memo && req.method === 'PUT') await saveMemo(req, res, session, customer)
      else {
        res.statusCode = 405
        res.setHeader('Allow', route.memo ? 'PUT' : 'GET')
        res.end()
      }
    } catch (error) {
      const status = Number(error?.statusCode) || 500
      console.error(`[${RELEASE}] request failed`, {
        path: url.pathname,
        status,
        name: String(error?.name || 'Error').slice(0, 80),
      })
      json(res, status, {
        ok: false,
        error: status < 500 ? error.message : '処理を完了できませんでした。時間をおいてもう一度お試しください。',
      })
    }
    return true
  }

  return { ensureSchema, handle, loadHistory }
}

module.exports = {
  createCustomerAppointmentHistoryService,
  __test: {
    buildCompletedHistory,
    displayDate,
    historyDateKey,
    historyRoute,
    historySubjectKeys,
    isActiveAppointment,
    normalizedAppointmentStatus,
    sameOrigin,
  },
}
