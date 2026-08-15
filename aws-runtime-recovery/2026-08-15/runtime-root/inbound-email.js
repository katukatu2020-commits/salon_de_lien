'use strict'

const INBOUND_DOMAIN = String(process.env.INBOUND_EMAIL_DOMAIN || 'inbound.salon-de-lien.com').trim().toLowerCase()
const MAX_BODY_BYTES = 512 * 1024
const SIGNATURE_TOLERANCE_SECONDS = 5 * 60

function digest(crypto, value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex')
}

function cleanHeaderValue(value, maximum = 1000) {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim().slice(0, maximum) || null
}

function safeEqual(crypto, expected, received) {
  const a = Buffer.from(String(expected), 'utf8')
  const b = Buffer.from(String(received), 'utf8')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function createInboundEmailService({ prisma, sessionProvider, crypto, parseReservationMail, normalizePhone }) {
  function json(res, status, value) {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify(value))
  }

  async function readBody(req) {
    const chunks = []
    let size = 0
    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      size += buffer.length
      if (size > MAX_BODY_BYTES) throw new Error('request_too_large')
      chunks.push(buffer)
    }
    return Buffer.concat(chunks)
  }

  function signingSecret() {
    const value = String(process.env.INBOUND_EMAIL_HMAC_SECRET || '')
    if (value.length < 32) throw new Error('INBOUND_EMAIL_HMAC_SECRET is not configured')
    return value
  }

  function verifySignature(req, rawBody) {
    const timestamp = String(req.headers['x-lien-inbound-timestamp'] || '')
    const received = String(req.headers['x-lien-inbound-signature'] || '').replace(/^sha256=/i, '')
    const timestampNumber = Number(timestamp)
    if (!Number.isFinite(timestampNumber) || Math.abs(Math.floor(Date.now() / 1000) - timestampNumber) > SIGNATURE_TOLERANCE_SECONDS) return false
    const expected = crypto.createHmac('sha256', signingSecret()).update(`${timestamp}.`).update(rawBody).digest('hex')
    return safeEqual(crypto, expected, received)
  }

  function validOrigin(req) {
    const origin = String(req.headers.origin || '').trim()
    if (!origin) return true
    const configured = String(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://salon-de-lien.com').trim()
    try { return new URL(origin).origin === new URL(configured).origin }
    catch { return false }
  }

  async function ensureSchema() {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "OrganizationInboundEmail" (
      "organizationId" TEXT PRIMARY KEY,
      "localPart" TEXT NOT NULL UNIQUE,
      "address" TEXT NOT NULL UNIQUE,
      "status" TEXT NOT NULL DEFAULT 'active',
      "lastReceivedAt" TIMESTAMPTZ,
      "lastImportedAt" TIMESTAMPTZ,
      "lastError" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`)
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "InboundEmailMessage" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "sesMessageId" TEXT NOT NULL UNIQUE,
      "internetMessageId" TEXT,
      "provider" TEXT,
      "bookingReference" TEXT,
      "status" TEXT NOT NULL,
      "appointmentId" TEXT,
      "s3Bucket" TEXT,
      "s3ObjectKey" TEXT,
      "errorMessage" TEXT,
      "attemptCount" INTEGER NOT NULL DEFAULT 1,
      "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "processedAt" TIMESTAMPTZ,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`)
    await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "InboundEmailMessage_org_internet_id_key" ON "InboundEmailMessage"("organizationId","internetMessageId") WHERE "internetMessageId" IS NOT NULL')
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "InboundEmailMessage_org_booking_idx" ON "InboundEmailMessage"("organizationId","bookingReference")')
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "InboundEmailMessage_org_received_idx" ON "InboundEmailMessage"("organizationId","receivedAt" DESC)')
  }

  async function rowForOrganization(organizationId) {
    return (await prisma.$queryRawUnsafe('SELECT "organizationId","address","status","lastReceivedAt","lastImportedAt","lastError","createdAt" FROM "OrganizationInboundEmail" WHERE "organizationId"=$1 LIMIT 1', organizationId))[0] || null
  }

  async function issueAddressForOrganization(organizationId) {
    const existing = await rowForOrganization(organizationId)
    if (existing) return existing
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const localPart = `booking-${crypto.randomBytes(12).toString('hex')}`
      const address = `${localPart}@${INBOUND_DOMAIN}`
      const rows = await prisma.$queryRawUnsafe(`INSERT INTO "OrganizationInboundEmail" ("organizationId","localPart","address","status","createdAt","updatedAt") VALUES ($1,$2,$3,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING RETURNING "organizationId","address","status","lastReceivedAt","lastImportedAt","lastError","createdAt"`, organizationId, localPart, address)
      if (rows[0]) return rows[0]
      const raced = await rowForOrganization(organizationId)
      if (raced) return raced
    }
    throw new Error('専用受信アドレスを発行できませんでした。')
  }

  async function issueAddress(req, res) {
    const session = await sessionProvider(req)
    if (!session) return json(res, 401, { error: 'ログインが必要です。' })
    if (session.role !== 'ADMIN') return json(res, 403, { error: '専用受信アドレスはオーナーのみ発行できます。' })
    if (!validOrigin(req)) return json(res, 403, { error: '不正なリクエストです。' })
    try {
      const inbound = await issueAddressForOrganization(session.organizationId)
      return json(res, 200, { success: true, inbound })
    } catch (error) {
      console.error('inbound address issue failed', session.organizationId, error)
      return json(res, 500, { error: '専用受信アドレスを発行できませんでした。' })
    }
  }

  async function statusForOrganization(organizationId) {
    const row = await rowForOrganization(organizationId)
    return row ? {
      address: row.address,
      active: row.status === 'active',
      lastReceivedAt: row.lastReceivedAt,
      lastImportedAt: row.lastImportedAt,
      lastError: row.lastError,
      createdAt: row.createdAt,
    } : { address: null, active: false, lastReceivedAt: null, lastImportedAt: null, lastError: null, createdAt: null }
  }

  async function findOrCreateCustomer(organizationId, parsed, hash) {
    const customers = await prisma.customer.findMany({ where: { organizationId, deletedAt: null }, select: { id: true, name: true, phone: true }, take: 5000 })
    const phone = normalizePhone(parsed.phone)
    const samePhone = phone ? customers.find(customer => normalizePhone(customer.phone) === phone) : null
    const compactName = String(parsed.customerName || '').replace(/\s/g, '')
    const sameName = customers.find(customer => String(customer.name || '').replace(/\s/g, '') === compactName)
    if (samePhone || sameName) return samePhone || sameName
    return prisma.customer.create({
      data: {
        id: `mail-customer-${hash.slice(0, 20)}`,
        organizationId,
        name: parsed.customerName,
        phone: parsed.phone || null,
        memo: '予約メールから自動登録。内容確認後に正式な顧客情報へ更新してください。',
      },
      select: { id: true, name: true, phone: true },
    })
  }

  async function existingAppointmentForBooking(organizationId, bookingReference) {
    if (!bookingReference) return null
    return prisma.appointment.findFirst({
      where: { customer: { organizationId }, note: { contains: `予約番号: ${bookingReference}` } },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, estimatedPrice: true },
    })
  }

  async function importParsedReservation(organizationId, parsed, payload) {
    const messageHash = digest(crypto, payload.internetMessageId || payload.sesMessageId || `${payload.subject}\n${payload.body}`)
    const customerHash = digest(crypto, `${organizationId}:${parsed.phone || `${parsed.customerName}:${messageHash}`}`)
    const customer = await findOrCreateCustomer(organizationId, parsed, customerHash)
    const byReference = await existingAppointmentForBooking(organizationId, parsed.bookingReference)
    let appointmentId = byReference?.id || (parsed.bookingReference
      ? `gmail-appt-${digest(crypto, `${organizationId}:booking:${parsed.bookingReference}`).slice(0, 24)}`
      : `gmail-appt-${digest(crypto, `${organizationId}:message:${messageHash}`).slice(0, 24)}`)
    if (parsed.status === 'キャンセル' && !parsed.bookingReference) {
      const existing = await prisma.appointment.findFirst({
        where: { customerId: customer.id, scheduledAt: parsed.scheduledAt, status: { notIn: ['キャンセル', '無断キャンセル', '来店済み'] } },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, estimatedPrice: true },
      })
      if (existing) appointmentId = existing.id
    }
    const existing = byReference || await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { id: true, estimatedPrice: true } })
    const estimatedPrice = parsed.status === 'キャンセル' && existing?.estimatedPrice != null
      ? existing.estimatedPrice
      : (parsed.estimatedPrice ?? existing?.estimatedPrice ?? null)
    const note = [
      parsed.bookingReference ? `予約番号: ${parsed.bookingReference}` : null,
      parsed.staffName ? `担当: ${parsed.staffName}` : null,
      parsed.durationMinutes ? `所要時間: ${parsed.durationMinutes}分` : null,
      parsed.subject ? `メール件名: ${parsed.subject}` : null,
      `予約元: ${parsed.provider}`,
      '店舗専用の予約メールアドレスから自動取込。原文は暗号化S3へ保存しています。',
    ].filter(Boolean).join('\n')
    const appointment = await prisma.appointment.upsert({
      where: { id: appointmentId },
      update: { customerId: customer.id, scheduledAt: parsed.scheduledAt, durationMinutes: parsed.durationMinutes, menu: parsed.menu, staffName: parsed.staffName, estimatedPrice, status: parsed.status, source: `ses:${messageHash}`, bookingProvider: parsed.provider, note },
      create: { id: appointmentId, customerId: customer.id, scheduledAt: parsed.scheduledAt, durationMinutes: parsed.durationMinutes, menu: parsed.menu, staffName: parsed.staffName, estimatedPrice, status: parsed.status, source: `ses:${messageHash}`, bookingProvider: parsed.provider, note },
      select: { id: true },
    })
    return appointment.id
  }

  async function reserveMessage(organizationId, payload) {
    const sesMessageId = cleanHeaderValue(payload.sesMessageId, 512)
    const internetMessageId = cleanHeaderValue(payload.internetMessageId, 512)
    const id = `ses-ingest-${digest(crypto, `${organizationId}:${sesMessageId}`).slice(0, 24)}`
    const rows = await prisma.$queryRawUnsafe(`INSERT INTO "InboundEmailMessage" ("id","organizationId","sesMessageId","internetMessageId","status","s3Bucket","s3ObjectKey","receivedAt","createdAt","updatedAt") VALUES ($1,$2,$3,$4,'processing',$5,$6,COALESCE($7::timestamptz,CURRENT_TIMESTAMP),CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING RETURNING "id"`, id, organizationId, sesMessageId, internetMessageId, cleanHeaderValue(payload.s3Bucket, 255), cleanHeaderValue(payload.s3ObjectKey, 1000), payload.receivedAt || null)
    if (rows[0]) return { id, process: true }
    const existing = (await prisma.$queryRawUnsafe('SELECT "id","status","attemptCount" FROM "InboundEmailMessage" WHERE "sesMessageId"=$1 OR ("organizationId"=$2 AND "internetMessageId"=$3 AND $3 IS NOT NULL) ORDER BY "createdAt" LIMIT 1', sesMessageId, organizationId, internetMessageId))[0]
    if (existing?.status === 'error' && Number(existing.attemptCount || 0) < 5) {
      await prisma.$executeRawUnsafe('UPDATE "InboundEmailMessage" SET "status"=\'processing\',"attemptCount"="attemptCount"+1,"errorMessage"=NULL,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1', existing.id)
      return { id: existing.id, process: true }
    }
    return { id: existing?.id || id, process: false }
  }

  async function ingest(req, res) {
    let rawBody
    try { rawBody = await readBody(req) }
    catch { return json(res, 413, { error: 'payload_too_large' }) }
    try {
      if (!verifySignature(req, rawBody)) return json(res, 401, { error: 'invalid_signature' })
    } catch (error) {
      console.error('inbound signature configuration error', error.message)
      return json(res, 503, { error: 'ingest_unavailable' })
    }
    let payload
    try { payload = JSON.parse(rawBody.toString('utf8')) }
    catch { return json(res, 400, { error: 'invalid_json' }) }
    const recipient = cleanHeaderValue(payload.recipient, 320)?.toLowerCase()
    const sesMessageId = cleanHeaderValue(payload.sesMessageId, 512)
    if (!recipient || !sesMessageId || !recipient.endsWith(`@${INBOUND_DOMAIN}`)) return json(res, 202, { accepted: false })
    const address = (await prisma.$queryRawUnsafe('SELECT "organizationId","status" FROM "OrganizationInboundEmail" WHERE lower("address")=$1 LIMIT 1', recipient))[0]
    if (!address || address.status !== 'active') return json(res, 202, { accepted: false })
    const organizationId = address.organizationId
    const reserved = await reserveMessage(organizationId, payload)
    if (!reserved.process) return json(res, 200, { accepted: true, duplicate: true })
    try {
      await prisma.$executeRawUnsafe('UPDATE "OrganizationInboundEmail" SET "lastReceivedAt"=CURRENT_TIMESTAMP,"lastError"=NULL,"updatedAt"=CURRENT_TIMESTAMP WHERE "organizationId"=$1', organizationId)
      if (String(payload.spamVerdict || '').toUpperCase() === 'FAIL' || String(payload.virusVerdict || '').toUpperCase() === 'FAIL') {
        await prisma.$executeRawUnsafe('UPDATE "InboundEmailMessage" SET "status"=\'rejected\',"errorMessage"=\'SES malware or spam verdict failed\',"processedAt"=CURRENT_TIMESTAMP,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1', reserved.id)
        return json(res, 200, { accepted: true, rejected: true })
      }
      const parsedResult = parseReservationMail({ subject: payload.subject, sender: payload.from, body: payload.body, messageId: payload.internetMessageId || payload.sesMessageId })
      if (!parsedResult.ok) {
        await prisma.$executeRawUnsafe('UPDATE "InboundEmailMessage" SET "status"=\'ignored\',"errorMessage"=$2,"processedAt"=CURRENT_TIMESTAMP,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1', reserved.id, cleanHeaderValue(parsedResult.error, 1000))
        return json(res, 200, { accepted: true, ignored: true })
      }
      const parsed = parsedResult.value
      const appointmentId = await importParsedReservation(organizationId, parsed, payload)
      await prisma.$executeRawUnsafe('UPDATE "InboundEmailMessage" SET "status"=\'imported\',"provider"=$2,"bookingReference"=$3,"appointmentId"=$4,"errorMessage"=NULL,"processedAt"=CURRENT_TIMESTAMP,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1', reserved.id, parsed.provider, parsed.bookingReference, appointmentId)
      await prisma.$executeRawUnsafe('UPDATE "OrganizationInboundEmail" SET "lastImportedAt"=CURRENT_TIMESTAMP,"lastError"=NULL,"updatedAt"=CURRENT_TIMESTAMP WHERE "organizationId"=$1', organizationId)
      return json(res, 200, { accepted: true, imported: true, appointmentId })
    } catch (error) {
      console.error('SES reservation mail ingest failed', organizationId, reserved.id, error)
      await prisma.$executeRawUnsafe('UPDATE "InboundEmailMessage" SET "status"=\'error\',"errorMessage"=$2,"processedAt"=CURRENT_TIMESTAMP,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1', reserved.id, String(error.message || error).slice(0, 1000)).catch(() => {})
      await prisma.$executeRawUnsafe('UPDATE "OrganizationInboundEmail" SET "lastError"=$2,"updatedAt"=CURRENT_TIMESTAMP WHERE "organizationId"=$1', organizationId, String(error.message || error).slice(0, 1000)).catch(() => {})
      return json(res, 500, { error: 'ingest_failed' })
    }
  }

  async function handle(req, res, url) {
    if (url.pathname === '/api/lien-tenant-setup/inbound/address' && req.method === 'POST') { await issueAddress(req, res); return true }
    if (url.pathname === '/api/lien-tenant-setup/inbound/ses' && req.method === 'POST') { await ingest(req, res); return true }
    return false
  }

  return { ensureSchema, statusForOrganization, issueAddressForOrganization, handle }
}

module.exports = { createInboundEmailService, INBOUND_DOMAIN }
