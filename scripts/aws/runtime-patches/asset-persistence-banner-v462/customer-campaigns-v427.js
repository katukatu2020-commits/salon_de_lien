'use strict'

const crypto = require('crypto')
const sharp = require('sharp')
const { GetObjectCommand, PutObjectCommand, S3Client } = require('@aws-sdk/client-s3')

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function createCustomerCampaignService({
  prisma,
  customerSession,
  staffSession,
  json,
  sendCustomerHtml,
  customerShell,
  customerIcon,
  htmlEscape,
  jpDate,
}) {
  const s3 = globalThis.__lienCampaignS3 || new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' })
  globalThis.__lienCampaignS3 = s3
  let tablesReady = false

  async function ensureTables() {
    if (tablesReady) return
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CustomerCampaign" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
      "createdByStaffId" TEXT REFERENCES "AppUser"("id") ON DELETE SET NULL,
      "title" TEXT NOT NULL,
      "summary" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "imageKey" TEXT,
      "targetMenu" TEXT,
      "discountRate" INTEGER,
      "startsAt" TIMESTAMP(3) NOT NULL,
      "endsAt" TIMESTAMP(3) NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'published',
      "audienceGender" TEXT,
      "audienceMinAge" INTEGER,
      "audienceMaxAge" INTEGER,
      "audienceMatchedCount" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CustomerCampaign_dates_check" CHECK ("endsAt" > "startsAt"),
      CONSTRAINT "CustomerCampaign_discount_check" CHECK ("discountRate" IS NULL OR ("discountRate" BETWEEN 1 AND 100))
    )`)
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CustomerCampaignRecipient" (
      "id" TEXT PRIMARY KEY,
      "campaignId" TEXT NOT NULL REFERENCES "CustomerCampaign"("id") ON DELETE CASCADE,
      "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,
      "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "viewedAt" TIMESTAMP(3),
      CONSTRAINT "CustomerCampaignRecipient_campaign_customer_key" UNIQUE ("campaignId", "customerId")
    )`)
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerCampaign_organizationId_status_startsAt_endsAt_idx" ON "CustomerCampaign"("organizationId", "status", "startsAt", "endsAt")')
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerCampaign_createdByStaffId_createdAt_idx" ON "CustomerCampaign"("createdByStaffId", "createdAt")')
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerCampaignRecipient_customerId_deliveredAt_idx" ON "CustomerCampaignRecipient"("customerId", "deliveredAt" DESC)')
    tablesReady = true
  }

  function safeSegment(value, fallback) {
    const safe = String(value || '').replace(/[^A-Za-z0-9_-]/g, '')
    return safe || fallback
  }

  function requestOriginIsValid(req) {
    const origin = String(req.headers.origin || '')
    if (!origin) return true
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
    const protocol = String(req.headers['cloudfront-forwarded-proto'] || req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()
    return origin === `${protocol}://${host}` || origin === `https://${host}` || origin === `http://${host}`
  }

  function requestedAudience(req, url) {
    const explicit = String(url.searchParams.get('audience') || '').toLowerCase()
    if (explicit === 'staff' || explicit === 'customer') return explicit

    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
    const referer = String(req.headers.referer || '').trim()
    try {
      const source = new URL(referer)
      if (host && source.host !== host) return null
      if (source.pathname === '/admin' || source.pathname.startsWith('/admin/')) return 'staff'
      if (source.pathname === '/u' || source.pathname.startsWith('/u/')) return 'customer'
    } catch {}
    return null
  }

  function privateObjectKey(value) {
    let key = String(value || '').trim()
    if (key.startsWith('s3-private://')) key = key.slice('s3-private://'.length)
    if (!key.startsWith('private/') || key.includes('..') || key.includes('\\')) return null
    return key
  }

  async function readBuffer(req, maximum) {
    const chunks = []
    let total = 0
    for await (const chunk of req) {
      total += chunk.length
      if (total > maximum) throw Object.assign(new Error('too_large'), { status: 413 })
      chunks.push(chunk)
    }
    return Buffer.concat(chunks)
  }

  async function readJson(req) {
    const raw = await readBuffer(req, 64 * 1024)
    try { return raw.length ? JSON.parse(raw.toString('utf8')) : {} } catch { throw Object.assign(new Error('invalid_json'), { status: 400 }) }
  }

  function text(value, label, maximum, required = true) {
    const result = String(value || '').trim()
    if (required && !result) throw Object.assign(new Error(`${label}を入力してください。`), { status: 400 })
    if (result.length > maximum) throw Object.assign(new Error(`${label}は${maximum}文字以内で入力してください。`), { status: 400 })
    return result || null
  }

  function optionalInteger(value, label, minimum, maximum) {
    if (value === null || value === undefined || value === '') return null
    const result = Number(value)
    if (!Number.isInteger(result) || result < minimum || result > maximum) {
      throw Object.assign(new Error(`${label}は${minimum}〜${maximum}で入力してください。`), { status: 400 })
    }
    return result
  }

  function parseCampaignInput(input, organizationId) {
    const title = text(input.title, 'キャンペーン名', 60)
    const summary = text(input.summary, '広告の短い説明', 140)
    const campaignBody = text(input.body, 'キャンペーン詳細', 800)
    const targetMenu = text(input.targetMenu, '対象メニュー', 80, false)
    const discountRate = optionalInteger(input.discountRate, '割引率', 1, 100)
    const audienceGender = ['female', 'male', 'other'].includes(String(input.audienceGender || '')) ? String(input.audienceGender) : null
    const audienceMinAge = optionalInteger(input.audienceMinAge, '年齢下限', 0, 120)
    const audienceMaxAge = optionalInteger(input.audienceMaxAge, '年齢上限', 0, 120)
    if (audienceMinAge !== null && audienceMaxAge !== null && audienceMinAge > audienceMaxAge) {
      throw Object.assign(new Error('年齢範囲を確認してください。'), { status: 400 })
    }
    const startsAt = new Date(input.startsAt)
    const endsAt = new Date(input.endsAt)
    if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt) {
      throw Object.assign(new Error('掲載期間を確認してください。'), { status: 400 })
    }
    if (endsAt.getTime() - startsAt.getTime() > 366 * 24 * 60 * 60 * 1000) {
      throw Object.assign(new Error('掲載期間は1年以内にしてください。'), { status: 400 })
    }
    const imageKey = text(input.imageKey, '広告画像', 500, false)
    const allowedPrefix = `private/campaign-images/${safeSegment(organizationId, 'organization')}/`
    if (imageKey && (!imageKey.startsWith(allowedPrefix) || imageKey.includes('..'))) {
      throw Object.assign(new Error('広告画像を確認してください。'), { status: 400 })
    }
    return { title, summary, body: campaignBody, targetMenu, discountRate, startsAt, endsAt, audienceGender, audienceMinAge, audienceMaxAge, imageKey }
  }

  function ageOf(customer, now = new Date()) {
    if (customer.birthDate) {
      const date = new Date(customer.birthDate)
      let age = now.getFullYear() - date.getFullYear()
      const birthday = new Date(now.getFullYear(), date.getMonth(), date.getDate())
      if (birthday > now) age -= 1
      return age
    }
    return customer.birthYear ? now.getFullYear() - Number(customer.birthYear) : null
  }

  function genderOf(value) {
    const normalized = String(value || '').trim().toLowerCase()
    if (/女性|female|woman|^f$/.test(normalized)) return 'female'
    if (/男性|male|man|^m$/.test(normalized) && !/female|woman/.test(normalized)) return 'male'
    return 'other'
  }

  async function matchingRecipients(organizationId, input) {
    const customers = await prisma.$queryRawUnsafe(
      'SELECT "id","gender","birthDate","birthYear" FROM "Customer" WHERE "organizationId"=$1 AND "deletedAt" IS NULL AND "storeHiddenAt" IS NULL',
      organizationId,
    )
    return customers.filter(customer => {
      if (input.audienceGender && genderOf(customer.gender) !== input.audienceGender) return false
      const age = ageOf(customer)
      if (input.audienceMinAge !== null && (age === null || age < input.audienceMinAge)) return false
      if (input.audienceMaxAge !== null && (age === null || age > input.audienceMaxAge)) return false
      return true
    })
  }

  async function activeCampaignsForCustomer(session) {
    await ensureTables()
    return prisma.$queryRawUnsafe(`SELECT c.*
      FROM "CustomerCampaignRecipient" r
      JOIN "CustomerCampaign" c ON c."id"=r."campaignId"
      WHERE r."customerId"=$1 AND c."organizationId"=$2 AND c."status"='published'
        AND c."startsAt"<=CURRENT_TIMESTAMP AND c."endsAt">=CURRENT_TIMESTAMP
      ORDER BY c."startsAt" DESC, c."createdAt" DESC LIMIT 30`, session.customerId, session.organizationId)
  }

  async function notificationUnreadForCustomer(session) {
    const [broadcasts, chats] = await Promise.all([
      prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count
        FROM "CustomerBroadcastRecipient" r
        JOIN "CustomerBroadcast" b ON b."id"=r."broadcastId"
        WHERE r."customerId"=$1 AND r."readAt" IS NULL AND b."status"='sent'`, session.customerId),
      prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count
        FROM "ChatMessage" m JOIN "ChatThread" t ON t."id"=m."threadId"
        WHERE t."customerId"=$1 AND t."organizationId"=$2 AND m."senderType"='staff'
          AND (t."customerLastReadAt" IS NULL OR m."createdAt">t."customerLastReadAt")`, session.customerId, session.organizationId),
    ])
    return Number(broadcasts[0]?.count || 0) + Number(chats[0]?.count || 0)
  }

  function homeSection(campaigns) {
    const items = campaigns.length ? campaigns.slice(0, 3).map(item => `<a class="home-campaign" href="/u/campaigns">${item.imageKey ? `<img src="/api/lien-campaign-image?id=${encodeURIComponent(item.id)}&audience=customer" alt="${htmlEscape(item.title)}">` : '<span class="home-campaign-visual">SALON CAMPAIGN</span>'}<span class="home-campaign-copy">${item.discountRate ? `<b>${item.discountRate}% OFF</b>` : '<b>EVENT & CAMPAIGN</b>'}<strong>${htmlEscape(item.title)}</strong><p>${htmlEscape(item.summary)}</p></span></a>`).join('') : `<div class="notice"><span>${customerIcon('news')}</span><div><strong>現在、開催中のキャンペーンはありません</strong><p>新しいイベントや期間限定情報が届くと、ここに表示されます。</p></div></div>`
    return `<section class="section"><style>.home-campaigns{display:grid;gap:12px}.home-campaign{display:grid;grid-template-columns:104px minmax(0,1fr);overflow:hidden;border:1px solid #eadbd5;border-radius:15px;background:#fff;color:inherit;text-decoration:none;box-shadow:0 8px 22px #684a3d0d}.home-campaign img,.home-campaign-visual{width:104px;height:100%;min-height:96px;object-fit:cover}.home-campaign-visual{display:grid;place-items:center;background:linear-gradient(135deg,#f7dce4,#eee4dc);color:#8f4f42;font:700 9px Georgia,serif;letter-spacing:.1em}.home-campaign-copy{min-width:0;padding:13px}.home-campaign-copy b{display:block;color:#8f4f42;font-size:9px}.home-campaign-copy strong{display:block;margin-top:5px;overflow:hidden;color:#4d403a;font-size:12px;text-overflow:ellipsis;white-space:nowrap}.home-campaign-copy p{display:-webkit-box;margin:5px 0 0;overflow:hidden;color:#81746d;font-size:9px;line-height:1.55;-webkit-box-orient:vertical;-webkit-line-clamp:2}</style><div class="section-head"><div><h2>キャンペーン</h2><p>広告・チラシ・イベント・期間限定メニュー</p></div><a href="/u/campaigns">すべて見る</a></div><div class="home-campaigns">${items}</div></section>`
  }

  async function uploadImage(req, res) {
    const session = await staffSession(req)
    if (!session) return json(res, 401, { error: 'ログインが必要です。' })
    if (!requestOriginIsValid(req)) return json(res, 403, { error: '安全性を確認できませんでした。' })
    const contentType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase()
    if (!IMAGE_TYPES.has(contentType)) return json(res, 415, { error: '広告画像は JPG / PNG / WebP を選択してください。' })
    const declared = Number(req.headers['content-length'] || 0)
    if (declared > MAX_IMAGE_BYTES) return json(res, 413, { error: '広告画像は5MB以下にしてください。' })
    try {
      const source = await readBuffer(req, MAX_IMAGE_BYTES)
      const normalized = await sharp(source, { failOn: 'error', limitInputPixels: 40_000_000 })
        .rotate()
        .resize({ width: 1600, height: 900, fit: 'cover', position: 'attention' })
        .jpeg({ quality: 88, mozjpeg: true })
        .toBuffer()
      const bucket = String(process.env.S3_PRIVATE_ASSETS_BUCKET || '').trim()
      if (!bucket) return json(res, 503, { error: '画像保存先が設定されていません。' })
      const key = `private/campaign-images/${safeSegment(session.organizationId, 'organization')}/${crypto.randomUUID()}.jpg`
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: normalized,
        ContentType: 'image/jpeg',
        ContentLength: normalized.length,
        ServerSideEncryption: 'AES256',
        CacheControl: 'private, max-age=0, no-store',
      }))
      return json(res, 201, { imageKey: key })
    } catch (error) {
      if (error?.status === 413) return json(res, 413, { error: '広告画像は5MB以下にしてください。' })
      console.error('[customer-campaign] image upload failed', { name: error?.name || 'UnknownError' })
      return json(res, 500, { error: '広告画像を保存できませんでした。時間をおいてもう一度お試しください。' })
    }
  }

  async function streamImage(req, res, url) {
    const id = String(url.searchParams.get('id') || '')
    if (!id) return json(res, 400, { error: '画像を確認してください。' })
    await ensureTables()
    let rows = []
    const audience = requestedAudience(req, url)
    if (audience === 'customer') {
      const customer = await customerSession(req)
      if (!customer) return json(res, 401, { error: 'ログインが必要です。' })
      rows = await prisma.$queryRawUnsafe(`SELECT c."imageKey" FROM "CustomerCampaign" c
        JOIN "CustomerCampaignRecipient" r ON r."campaignId"=c."id"
        WHERE c."id"=$1 AND c."organizationId"=$2 AND r."customerId"=$3 LIMIT 1`, id, customer.organizationId, customer.customerId)
    } else if (audience === 'staff') {
      const staff = await staffSession(req)
      if (!staff) return json(res, 401, { error: 'ログインが必要です。' })
      rows = await prisma.$queryRawUnsafe('SELECT "imageKey" FROM "CustomerCampaign" WHERE "id"=$1 AND "organizationId"=$2 LIMIT 1', id, staff.organizationId)
    } else {
      const staff = await staffSession(req)
      if (staff) {
        rows = await prisma.$queryRawUnsafe('SELECT "imageKey" FROM "CustomerCampaign" WHERE "id"=$1 AND "organizationId"=$2 LIMIT 1', id, staff.organizationId)
      } else {
        const customer = await customerSession(req)
        if (!customer) return json(res, 401, { error: 'ログインが必要です。' })
        rows = await prisma.$queryRawUnsafe(`SELECT c."imageKey" FROM "CustomerCampaign" c
          JOIN "CustomerCampaignRecipient" r ON r."campaignId"=c."id"
          WHERE c."id"=$1 AND c."organizationId"=$2 AND r."customerId"=$3 LIMIT 1`, id, customer.organizationId, customer.customerId)
      }
    }
    const key = privateObjectKey(rows[0]?.imageKey)
    if (!key) return json(res, 404, { error: '画像がありません。' })
    const bucket = String(process.env.S3_PRIVATE_ASSETS_BUCKET || '').trim()
    if (!bucket) return json(res, 503, { error: '画像保存先が設定されていません。' })
    try {
      const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
      res.statusCode = 200
      res.setHeader('Content-Type', object.ContentType || 'image/jpeg')
      res.setHeader('Cache-Control', 'private, max-age=120')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      if (object.ContentLength != null) res.setHeader('Content-Length', String(object.ContentLength))
      if (Buffer.isBuffer(object.Body) || object.Body instanceof Uint8Array) return res.end(Buffer.from(object.Body))
      if (object.Body && typeof object.Body.pipe === 'function') return object.Body.pipe(res)
      if (!object.Body || typeof object.Body.transformToByteArray !== 'function') throw new Error('empty_s3_body')
      const bytes = await object.Body.transformToByteArray()
      return res.end(Buffer.from(bytes))
    } catch (error) {
      console.warn('[customer-campaign] image read failed', { name: error?.name || 'UnknownError' })
      return json(res, 404, { error: '画像を読み込めませんでした。' })
    }
  }

  async function createCampaign(req, res) {
    const session = await staffSession(req)
    if (!session) return json(res, 401, { error: 'ログインが必要です。' })
    if (!requestOriginIsValid(req)) return json(res, 403, { error: '安全性を確認できませんでした。' })
    try {
      await ensureTables()
      const input = parseCampaignInput(await readJson(req), session.organizationId)
      const recipients = await matchingRecipients(session.organizationId, input)
      if (!recipients.length) return json(res, 400, { error: '配信条件に一致する顧客がいません。' })
      const campaignId = crypto.randomUUID()
      await prisma.$transaction(async tx => {
        await tx.$executeRawUnsafe(`INSERT INTO "CustomerCampaign" (
          "id","organizationId","createdByStaffId","title","summary","body","imageKey","targetMenu","discountRate",
          "startsAt","endsAt","status","audienceGender","audienceMinAge","audienceMaxAge","audienceMatchedCount","updatedAt"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'published',$12,$13,$14,$15,CURRENT_TIMESTAMP)`,
          campaignId, session.organizationId, session.userId || null, input.title, input.summary, input.body, input.imageKey,
          input.targetMenu, input.discountRate, input.startsAt, input.endsAt, input.audienceGender,
          input.audienceMinAge, input.audienceMaxAge, recipients.length)
        for (const customer of recipients) {
          await tx.$executeRawUnsafe('INSERT INTO "CustomerCampaignRecipient" ("id","campaignId","customerId") VALUES ($1,$2,$3) ON CONFLICT ("campaignId","customerId") DO NOTHING', crypto.randomUUID(), campaignId, customer.id)
        }
      }, { timeout: 60_000 })
      return json(res, 201, { success: true, campaignId, recipientCount: recipients.length })
    } catch (error) {
      const status = Number(error?.status || 500)
      if (status < 500) return json(res, status, { error: error.message })
      console.error('[customer-campaign] create failed', { name: error?.name || 'UnknownError' })
      return json(res, 500, { error: 'キャンペーンを配信できませんでした。時間をおいてもう一度お試しください。' })
    }
  }

  async function updateCampaign(req, res, url) {
    const session = await staffSession(req)
    if (!session) return json(res, 401, { error: 'ログインが必要です。' })
    if (!requestOriginIsValid(req)) return json(res, 403, { error: '安全性を確認できませんでした。' })
    const campaignId = String(url.searchParams.get('id') || '').trim()
    if (!campaignId) return json(res, 400, { error: '編集するキャンペーンを確認してください。' })
    try {
      await ensureTables()
      const existing = await prisma.$queryRawUnsafe(
        'SELECT "id" FROM "CustomerCampaign" WHERE "id"=$1 AND "organizationId"=$2 AND "status"<>\'deleted\' LIMIT 1',
        campaignId,
        session.organizationId,
      )
      if (!existing.length) return json(res, 404, { error: 'キャンペーンが見つかりません。' })
      const input = parseCampaignInput(await readJson(req), session.organizationId)
      const recipients = await matchingRecipients(session.organizationId, input)
      if (!recipients.length) return json(res, 400, { error: '配信条件に一致する顧客がいません。' })
      await prisma.$transaction(async tx => {
        await tx.$executeRawUnsafe(`UPDATE "CustomerCampaign" SET
          "title"=$3,"summary"=$4,"body"=$5,"imageKey"=$6,"targetMenu"=$7,"discountRate"=$8,
          "startsAt"=$9,"endsAt"=$10,"audienceGender"=$11,"audienceMinAge"=$12,"audienceMaxAge"=$13,
          "audienceMatchedCount"=$14,"updatedAt"=CURRENT_TIMESTAMP
          WHERE "id"=$1 AND "organizationId"=$2`,
          campaignId, session.organizationId, input.title, input.summary, input.body, input.imageKey,
          input.targetMenu, input.discountRate, input.startsAt, input.endsAt, input.audienceGender,
          input.audienceMinAge, input.audienceMaxAge, recipients.length)
        await tx.$executeRawUnsafe('DELETE FROM "CustomerCampaignRecipient" WHERE "campaignId"=$1', campaignId)
        for (const customer of recipients) {
          await tx.$executeRawUnsafe('INSERT INTO "CustomerCampaignRecipient" ("id","campaignId","customerId") VALUES ($1,$2,$3) ON CONFLICT ("campaignId","customerId") DO NOTHING', crypto.randomUUID(), campaignId, customer.id)
        }
      }, { timeout: 60_000 })
      return json(res, 200, { success: true, campaignId, recipientCount: recipients.length })
    } catch (error) {
      const status = Number(error?.status || 500)
      if (status < 500) return json(res, status, { error: error.message })
      console.error('[customer-campaign] update failed', { name: error?.name || 'UnknownError' })
      return json(res, 500, { error: 'キャンペーンを更新できませんでした。時間をおいてもう一度お試しください。' })
    }
  }

  async function deleteCampaign(req, res, url) {
    const session = await staffSession(req)
    if (!session) return json(res, 401, { error: 'ログインが必要です。' })
    if (!requestOriginIsValid(req)) return json(res, 403, { error: '安全性を確認できませんでした。' })
    const campaignId = String(url.searchParams.get('id') || '').trim()
    if (!campaignId) return json(res, 400, { error: '削除するキャンペーンを確認してください。' })
    try {
      await ensureTables()
      const changed = await prisma.$executeRawUnsafe(
        'UPDATE "CustomerCampaign" SET "status"=\'deleted\',"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1 AND "organizationId"=$2 AND "status"<>\'deleted\'',
        campaignId,
        session.organizationId,
      )
      if (!Number(changed)) return json(res, 404, { error: 'キャンペーンが見つかりません。' })
      return json(res, 200, { success: true })
    } catch (error) {
      console.error('[customer-campaign] delete failed', { name: error?.name || 'UnknownError' })
      return json(res, 500, { error: 'キャンペーンを削除できませんでした。時間をおいてもう一度お試しください。' })
    }
  }

  function adminCss() { return adminCssV429() }

  function adminShell(session, content) { return adminShellV429(session, content, 'Salon de Lien') }

  function localDateTimeValue(date) {
    const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    return shifted.toISOString().slice(0, 16)
  }

  async function adminPage(req, res, session) { return adminPageV429(req, res, session) }

  function adminIconV429(name) {
    const paths = {
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
      users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
      package: '<path d="m16.5 9.4-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
      image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
      chart: '<path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
      bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
      store: '<path d="M3 10h18"/><path d="m5 10 1-5h12l1 5"/><path d="M5 10v9h14v-9"/><path d="M9 19v-5h6v5"/>',
      chevronLeft: '<path d="m15 18-6-6 6-6"/>',
      settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/>',
      edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
      trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/>',
      message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>',
      megaphone: '<path d="m3 11 18-5v12L3 14v-3Z"/><path d="M11.6 16.1 13 21H7l-1.5-6"/>',
      logout: '<path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>',
      chevronRight: '<path d="m9 18 6-6-6-6"/>',
      campaign: '<path d="M3 11v2a2 2 0 0 0 2 2h2l4 5h3l-2-5 7-3V6l-12 4H5a2 2 0 0 0-2 1Z"/><path d="M19 8a3 3 0 0 0 0-6"/>',
    }
    return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.campaign}</svg>`
  }

  // ui-regression-audit-v432
function adminCssV429() {
    return `/* campaign-admin-shell-v458 campaign-header-collision-v459 */
[data-campaign-admin]{min-width:0}
[data-campaign-admin] .campaign-page-header{border:1px solid var(--lien-border,#e8ded2);border-radius:24px;background:linear-gradient(145deg,#fffaf8,#f8f0e9);padding:24px;box-shadow:0 10px 30px rgba(47,42,37,.05)}
[data-campaign-admin] .eyebrow{display:inline-flex;align-items:center;gap:8px;border:1px solid #eab8c5;border-radius:999px;background:#fff;padding:7px 12px;color:#a23f59;font-size:12px;font-weight:700}
[data-campaign-admin] .eyebrow svg{width:16px;height:16px;flex:0 0 16px}
[data-campaign-admin] .campaign-page-header h1{margin:12px 0 0;color:var(--lien-ink,#2f2a25);font-family:inherit;font-size:30px;font-weight:600;line-height:1.35;letter-spacing:0}
[data-campaign-admin] .campaign-page-header p{max-width:800px;margin:10px 0 0;color:var(--lien-muted,#7c7168);font-size:14px;line-height:1.75}
[data-campaign-admin] .grid{display:grid;grid-template-columns:minmax(0,1fr) 352px;gap:24px;align-items:start;margin-top:24px}
[data-campaign-admin] .card{min-width:0;border:1px solid var(--lien-border,#e8ded2);border-radius:22px;background:#fff;padding:24px;box-shadow:0 8px 24px rgba(47,42,37,.06)}
[data-campaign-admin] .card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
[data-campaign-admin] .card h2{margin:0;color:var(--lien-ink,#2f2a25);font-family:inherit;font-size:18px;font-weight:600;line-height:1.5;letter-spacing:0}
[data-campaign-admin] .card-intro{margin:6px 0 0;color:var(--lien-muted,#7c7168);font-size:13px;line-height:1.7}
[data-campaign-admin] .field{display:grid;gap:8px;margin-top:18px;color:var(--lien-ink,#2f2a25);font-size:13px;font-weight:700}
[data-campaign-admin] .input{width:100%;min-width:0;min-height:48px;box-sizing:border-box;border:1px solid var(--lien-border,#e8ded2);border-radius:12px;background:#fff;padding:0 14px;color:var(--lien-ink,#2f2a25);font:inherit;font-size:14px;outline:none;transition:border-color .16s,box-shadow .16s}
[data-campaign-admin] textarea.input{min-height:116px;resize:vertical;padding-top:12px;line-height:1.7}
[data-campaign-admin] input[type=file].input{padding:10px 12px}
[data-campaign-admin] .input:focus{border-color:var(--lien-primary,#8f4f42);box-shadow:0 0 0 4px rgba(233,201,190,.42)}
[data-campaign-admin] .columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
[data-campaign-admin] .preview{display:grid;min-height:210px;place-items:center;overflow:hidden;margin-top:12px;border:1px dashed #ddc9bf;border-radius:16px;background:#fff8f5;color:#9a8279;font-size:12px;text-align:center}
[data-campaign-admin] .preview img{display:block;width:100%;max-height:360px;object-fit:cover}
[data-campaign-admin] .editing{display:none;align-items:center;justify-content:space-between;gap:12px;margin-top:16px;border-radius:12px;background:#fff3df;padding:12px;color:#855c24;font-size:12px;font-weight:700}
[data-campaign-admin] .editing.show{display:flex}
[data-campaign-admin] .text-button{border:0;background:transparent;color:#8f4f42;font:inherit;font-weight:800;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
[data-campaign-admin] .form-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
[data-campaign-admin] .primary,[data-campaign-admin] .secondary,[data-campaign-admin] .danger{display:inline-flex;min-height:44px;align-items:center;justify-content:center;border-radius:999px;padding:0 18px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;transition:background-color .16s,border-color .16s,transform .16s,opacity .16s}
[data-campaign-admin] .primary{border:1px solid var(--lien-primary,#8f4f42);background:var(--lien-primary,#8f4f42);color:#fff;box-shadow:0 7px 18px rgba(143,79,66,.18)}
[data-campaign-admin] .primary:hover{background:#7d453a;transform:translateY(-1px)}
[data-campaign-admin] .secondary{border:1px solid var(--lien-border,#e8ded2);background:#fff;color:var(--lien-ink,#2f2a25)}
[data-campaign-admin] .secondary:hover{background:var(--lien-surface-soft,#f6efe6)}
[data-campaign-admin] button:disabled{cursor:wait;opacity:.58;transform:none}
[data-campaign-admin] .message{display:none;margin-top:16px;border-radius:12px;padding:12px 14px;font-size:12px;font-weight:700;line-height:1.6}
[data-campaign-admin] .message.show{display:block}
[data-campaign-admin] .message.ok{background:#edf6ed;color:#3e6847}
[data-campaign-admin] .message.error{background:#fff0f0;color:#a13d3d}
[data-campaign-admin] .history{display:grid;gap:16px;margin-top:18px}
[data-campaign-admin] .history article{overflow:hidden;border:1px solid var(--lien-border,#e8ded2);border-radius:16px;background:#fff;box-shadow:0 3px 12px rgba(47,42,37,.04)}
[data-campaign-admin] .history-media{position:relative;overflow:hidden;aspect-ratio:16/9;background:#f7eee8}
[data-campaign-admin] .history-media img,[data-campaign-admin] .history-media .fallback{display:flex;width:100%;height:100%;align-items:center;justify-content:center;object-fit:cover;color:#8f4f42;font-size:11px;font-weight:800;letter-spacing:.08em}
[data-campaign-admin] .history-status{position:absolute;top:10px;left:10px;border-radius:999px;background:#fffdf9e8;padding:5px 9px;color:#67473d;font-size:10px;font-weight:800;box-shadow:0 2px 8px rgba(47,42,37,.12)}
[data-campaign-admin] .history-copy{padding:14px}
[data-campaign-admin] .history-copy h3{margin:0;color:var(--lien-ink,#2f2a25);font-size:14px;line-height:1.55}
[data-campaign-admin] .history-copy p{margin:6px 0 0;color:var(--lien-muted,#7c7168);font-size:11px;line-height:1.55}
[data-campaign-admin] .history-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px}
[data-campaign-admin] .badge{border-radius:999px;background:#fff0f4;padding:5px 9px;color:#af4764;font-size:10px;font-weight:800}
[data-campaign-admin] .history-actions{display:flex;gap:6px}
[data-campaign-admin] .icon-action{display:inline-flex;min-height:34px;align-items:center;gap:5px;border:1px solid var(--lien-border,#e8ded2);border-radius:999px;background:#fff;padding:0 10px;color:#66564e;font:inherit;font-size:10px;font-weight:800;cursor:pointer}
[data-campaign-admin] .icon-action svg{width:13px;height:13px}
[data-campaign-admin] .icon-action.delete{color:#a44747}
[data-campaign-admin] .empty{border:1px dashed var(--lien-border,#e8ded2);border-radius:14px;padding:28px 16px;color:var(--lien-muted,#7c7168);font-size:12px;text-align:center}
.campaign-workspace-tabs svg{width:16px;height:16px;flex:0 0 16px}
.admin-desktop-sidebar .lien-nav-item>svg,.admin-desktop-sidebar form button>svg{width:16px;height:16px;flex:0 0 16px}
html[data-ca-theme="dark"] [data-campaign-admin] .campaign-page-header{border-color:var(--border,#483a34);background:linear-gradient(145deg,#211b18,#2a221e)}
html[data-ca-theme="dark"] [data-campaign-admin] .card,html[data-ca-theme="dark"] [data-campaign-admin] .history article{border-color:var(--border,#483a34);background:#211b18;color:#f4ece7}
html[data-ca-theme="dark"] [data-campaign-admin] .input{border-color:#53433c;background:#191513;color:#f4ece7}
@media(max-width:1279px){[data-campaign-admin] .grid{grid-template-columns:minmax(0,1fr) 320px}}
@media(max-width:1120px){[data-campaign-admin] .grid{grid-template-columns:minmax(0,1fr)}[data-campaign-admin] .history{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(prefers-reduced-motion:reduce){[data-campaign-admin] *,[data-campaign-admin] *::before,[data-campaign-admin] *::after{scroll-behavior:auto!important;transition-duration:.01ms!important}}
`
  }

function adminShellV429(session, content, organizationName) {
    const displayName = htmlEscape(String(session.displayName || session.name || session.email || (session.role === 'ADMIN' ? '管理者' : 'スタッフ')).split('@')[0])
    const storeName = htmlEscape(String(organizationName || 'Salon de Lien'))
    const nav = [
      ['calendar', '予約カレンダー', '/admin/appointments'],
      ['users', '顧客・チャット・配信', '/admin/customers'],
      ['package', 'メニュー・商品棚・集計', '/admin/products?section=menus'],
      ['image', 'スタイル共有', '/admin/community'],
      ['chart', '経営分析', '/admin/owner-analytics'],
    ].map(([icon, label, href], index) => `<a class="lien-nav-item group flex min-h-11 items-center gap-3 rounded-full px-3 text-sm font-semibold transition ${index === 1 ? 'bg-[color:var(--lien-primary)] text-white shadow-sm' : 'text-lien-muted hover:bg-lien-soft hover:text-lien-ink'}"${index === 1 ? ' aria-current="page"' : ''} href="${href}">${adminIconV429(icon)}<span class="truncate">${label}</span></a>`).join('')
    const tabs = `<nav class="campaign-workspace-tabs inline-grid w-full grid-cols-4 gap-1 rounded-[18px] border border-lien bg-white p-1 shadow-lien-sm" aria-label="顧客ページ切替"><a class="lien-segment inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] px-2 text-[13px] font-semibold text-lien-muted transition sm:gap-2 sm:px-4 sm:text-sm hover:bg-lien-soft hover:text-lien-ink" href="/admin/customers">${adminIconV429('users')}<span>顧客管理</span></a><a class="lien-segment inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] px-2 text-[13px] font-semibold text-lien-muted transition sm:gap-2 sm:px-4 sm:text-sm hover:bg-lien-soft hover:text-lien-ink" href="/admin/customers/messages/chat">${adminIconV429('message')}<span>チャット</span></a><a class="lien-segment inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] px-2 text-[13px] font-semibold text-lien-muted transition sm:gap-2 sm:px-4 sm:text-sm hover:bg-lien-soft hover:text-lien-ink" href="/admin/customers/messages">${adminIconV429('megaphone')}<span>配信</span></a><a class="lien-segment inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] bg-[color:var(--lien-primary)] px-2 text-[13px] font-semibold text-white shadow-sm transition sm:gap-2 sm:px-4 sm:text-sm" aria-current="page" href="/admin/customers/messages/campaigns">${adminIconV429('campaign')}<span>キャンペーン</span></a></nav>`
    const sidebar = `<aside class="admin-desktop-sidebar fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-lien bg-white/90 shadow-lien-sm transition-transform duration-200 md:block translate-x-0"><div class="flex h-[100dvh] min-h-0 flex-col bg-[#fffdf9] text-lien-ink md:h-full"><div class="border-b border-lien px-4 py-4"><div class="flex items-center justify-between gap-3"><a class="flex min-w-0 items-center gap-3 text-lien-ink" href="/admin/customers"><span role="img" aria-label="店舗アイコン" class="h-11 w-11 rounded-2xl text-lg inline-flex shrink-0 items-center justify-center border border-[#ead8ca] bg-[#fff7ef] bg-cover bg-center font-semibold text-[color:var(--lien-primary-dark)] shadow-sm" style="background-image:url(/brand/salon-customer-service-mark.svg)"><span class="sr-only">Salon customer servitomer service</span></span><span class="min-w-0"><span class="block truncate text-lg font-semibold tracking-normal">Salon de Lien</span><span class="block truncate text-[11px] font-semibold text-lien-muted">Salon customer servitomer service</span></span></a></div></div><nav class="grid min-h-0 flex-1 content-start gap-1 overflow-y-auto overscroll-contain p-3 pb-3" aria-label="管理画面ナビゲーション">${nav}</nav><div class="mx-3 mb-1 hidden lg:block"><figure class="relative isolate h-28 overflow-hidden rounded-[18px] border border-lien bg-[#efe5da] shadow-sm"><img src="/brand/salon-interior-illustrated.png" alt="Salon de Lienの明るい施術スペースを描いたイラスト" class="absolute inset-0 h-full w-full object-cover object-[24%_58%]"><span aria-hidden="true" class="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#2f2a25]/24 via-transparent to-white/5"></span><div class="relative z-10 h-full"><div class="flex h-full items-end bg-gradient-to-t from-[#2f2a25]/70 via-transparent to-transparent p-3"><p class="text-xs font-semibold leading-5 text-white">今日の接客を、次の関係へ。</p></div></div></figure></div><div class="mt-auto p-3"><form action="/api/auth/logout" method="post"><button type="submit" class="flex min-h-11 w-full items-center gap-3 rounded-full border-0 bg-transparent px-3 text-sm font-semibold text-lien-muted transition hover:bg-lien-soft hover:text-lien-ink">${adminIconV429('logout')}<span>ログアウト</span></button></form></div></div></aside>`
    const header = `<header class="admin-shell-header sticky top-0 z-40 border-b border-lien bg-[#fffdf9]/92 backdrop-blur-xl"><div class="admin-mobile-header hidden h-14 items-center justify-between px-4"><a class="flex min-w-0 items-center gap-2 font-semibold text-lien-ink" href="/admin/customers"><span role="img" aria-label="店舗アイコン" class="h-8 w-8 rounded-full border border-[#ead8ca] bg-[#fff7ef] bg-cover bg-center shadow-sm" style="background-image:url(/brand/salon-customer-service-mark.svg)"></span><span class="truncate">Salon de Lien</span></a><div class="ca-header-store-mount" data-ca-header-actions></div></div><div class="admin-desktop-header hidden min-h-16 min-w-0 items-center gap-3 px-5 py-3 md:flex lg:px-8"><div class="min-w-0"><p class="text-[11px] font-semibold text-lien-muted">Salon de Lien</p><p class="truncate text-sm font-semibold text-lien-ink">顧客・チャット・配信</p></div><div class="ca-header-store-mount" data-ca-header-actions><a class="ca-command-hidden" href="/admin/account" aria-hidden="true" tabindex="-1">${displayName}</a><a class="ca-command-hidden" href="/admin/settings" aria-hidden="true" tabindex="-1">設定</a></div></div></header>`
    const sidebarScript = `<script>(()=>{const button=document.getElementById('campaign-sidebar-toggle'),sidebar=document.querySelector('.admin-desktop-sidebar'),stage=document.querySelector('[data-campaign-stage]');if(!button||!sidebar||!stage)return;const left='<svg class="ts-sidebar-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>',right='<svg class="ts-sidebar-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>';const apply=collapsed=>{sidebar.classList.toggle('translate-x-0',!collapsed);sidebar.classList.toggle('-translate-x-full',collapsed);stage.classList.toggle('md:pl-64',!collapsed);button.setAttribute('aria-label',collapsed?'サイドバーを開く':'サイドバーを閉じる');button.title=button.getAttribute('aria-label');button.style.left=collapsed?'.75rem':'15rem';button.innerHTML=collapsed?right:left;try{localStorage.setItem('salon-admin-sidebar-collapsed',collapsed?'1':'0')}catch{}};let collapsed=false;try{collapsed=localStorage.getItem('salon-admin-sidebar-collapsed')==='1'}catch{}apply(collapsed);button.addEventListener('click',()=>apply(button.getAttribute('aria-label')==='サイドバーを閉じる'))})()</script>`
    return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>キャンペーン配信 | Salon de Lien</title><script>try{if(localStorage.getItem('salon-lien:admin-theme')==='dark')document.documentElement.dataset.caTheme='dark'}catch{}</script><link rel="stylesheet" href="/_next/static/css/51ded9af5ca8c344.customer-native-v82.customer-shell-v88.customer-layout-v92.navigation-v84.sidebar-shift-v87.admin-theme-first-paint-v153.css" data-precedence="next"><style>${adminCssV429()}</style><script src="/tenant-setup-client.js?v=20260829-450" defer data-runtime="admin-route-lifecycle"></script><script src="/commercial-admin-v136.js?v=20260829-449" defer data-runtime="commercial-admin-shell"></script></head><body><div class="admin-app-shell admin-mobile-workspace-v38 admin-staff-unified-v48 min-h-screen overflow-x-hidden bg-lien text-lien-ink">${sidebar}<button id="campaign-sidebar-toggle" type="button" class="fixed top-20 z-50 hidden h-9 w-9 items-center justify-center rounded-full border border-lien bg-white text-base font-bold text-lien-primary shadow-md transition-all hover:bg-lien-soft md:inline-flex ca-sidebar-control ts-sidebar-toggle" style="left:15rem" aria-label="サイドバーを閉じる" title="サイドバーを閉じる">${adminIconV429('chevronLeft')}</button><div class="min-w-0 transition-[padding] duration-200 md:pl-64" data-campaign-stage>${header}<main class="admin-main-content min-w-0 overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8"><div class="mx-auto grid w-full max-w-7xl gap-6" data-layout="campaign-admin-shell-v458">${tabs}<div data-campaign-admin>${content}</div></div></main></div></div>${sidebarScript}</body></html>`
  }

  async function adminPageV429(req, res, session) {
    await ensureTables()
    const [menus, campaigns, organizations] = await Promise.all([
      prisma.$queryRawUnsafe('SELECT "name" FROM "SalonMenu" WHERE "organizationId"=$1 AND "active"=TRUE ORDER BY "sortOrder","name"', session.organizationId),
      prisma.$queryRawUnsafe('SELECT * FROM "CustomerCampaign" WHERE "organizationId"=$1 AND "status"<>\'deleted\' ORDER BY "createdAt" DESC LIMIT 40', session.organizationId),
      prisma.$queryRawUnsafe('SELECT "name" FROM "Organization" WHERE "id"=$1 LIMIT 1', session.organizationId),
    ])
    const start = new Date()
    start.setMinutes(Math.ceil(start.getMinutes() / 10) * 10, 0, 0)
    const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000)
    const now = Date.now()
    const history = campaigns.length ? campaigns.map(campaign => {
      const starts = new Date(campaign.startsAt).getTime()
      const ends = new Date(campaign.endsAt).getTime()
      const status = starts > now ? '公開予定' : ends < now ? '終了' : '公開中'
      return `<article><div class="history-media">${campaign.imageKey ? `<img src="/api/lien-campaign-image?id=${encodeURIComponent(campaign.id)}&audience=staff" alt="${htmlEscape(campaign.title)}">` : '<div class="fallback">SALON CAMPAIGN</div>'}<span class="history-status">${status}</span></div><div class="history-copy"><h3>${htmlEscape(campaign.title)}</h3><p>${htmlEscape(jpDate(campaign.startsAt))}〜${htmlEscape(jpDate(campaign.endsAt))}</p><p>${htmlEscape(campaign.targetMenu || '全メニュー・イベント')}${campaign.discountRate ? ` / ${campaign.discountRate}%OFF` : ''}</p><div class="history-meta"><span class="badge">${Number(campaign.audienceMatchedCount || 0).toLocaleString('ja-JP')}名へ配信</span><span class="history-actions"><button type="button" class="icon-action" data-edit="${htmlEscape(campaign.id)}">${adminIconV429('edit')}編集</button><button type="button" class="icon-action delete" data-delete="${htmlEscape(campaign.id)}">${adminIconV429('trash')}削除</button></span></div></div></article>`
    }).join('') : '<div class="empty">キャンペーン配信はまだありません。</div>'
    const menuNames = [...new Set([...menus.map(menu => String(menu.name)), ...campaigns.map(campaign => String(campaign.targetMenu || '')).filter(Boolean)])]
    const menuOptions = menuNames.map(name => `<option value="${htmlEscape(name)}">${htmlEscape(name)}</option>`).join('')
    const campaignData = JSON.stringify(campaigns.map(campaign => ({
      id: campaign.id,
      title: campaign.title,
      summary: campaign.summary,
      body: campaign.body,
      imageKey: campaign.imageKey,
      targetMenu: campaign.targetMenu,
      discountRate: campaign.discountRate,
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt,
      audienceGender: campaign.audienceGender,
      audienceMinAge: campaign.audienceMinAge,
      audienceMaxAge: campaign.audienceMaxAge,
    }))).replace(/</g, '\\u003c')
    const content = `<section class="campaign-page-header"><div class="eyebrow">${adminIconV429('campaign')}Campaign studio</div><h1>広告・キャンペーン配信</h1><p>通常のお知らせとは分けて、期間限定メニュー、割引、店舗イベントを広告画像と一緒にお客様アプリへ掲載します。</p></section><div class="grid"><form id="campaign-form" class="card"><div class="card-head"><div><h2 id="campaign-form-title">新しいキャンペーン</h2><p class="card-intro">公開期間中の内容だけが顧客アプリのホームとキャンペーン一覧へ表示されます。</p></div></div><div id="campaign-editing" class="editing"><span>配信済みキャンペーンを編集中です</span><button id="campaign-cancel-edit" class="text-button" type="button">新規作成に戻る</button></div><label class="field">広告画像（任意・JPG / PNG / WebP）<input id="campaign-image" class="input" type="file" accept="image/jpeg,image/png,image/webp"></label><div id="campaign-preview" class="preview"><span>画像がない場合は、Salon de Lienのブランド背景で表示します。</span></div><label class="field">キャンペーン名<input class="input" name="title" maxlength="60" placeholder="例：髪質改善トリートメント 10%OFF" required></label><label class="field">広告の短い説明<input class="input" name="summary" maxlength="140" placeholder="例：夏の紫外線ダメージを、今だけお得に集中ケア" required></label><label class="field">詳しい内容<textarea class="input" name="body" maxlength="800" placeholder="対象条件やおすすめしたいお客様、イベント内容をご案内します。" required></textarea></label><div class="columns"><label class="field">対象メニュー<select class="input" name="targetMenu"><option value="">全メニュー・イベント</option>${menuOptions}</select></label><label class="field">割引率（任意）<input class="input" name="discountRate" type="number" min="1" max="100" placeholder="10"></label></div><div class="columns"><label class="field">掲載開始<input class="input" name="startsAt" type="datetime-local" value="${localDateTimeValue(start)}" required></label><label class="field">掲載終了<input class="input" name="endsAt" type="datetime-local" value="${localDateTimeValue(end)}" required></label></div><div class="columns"><label class="field">対象の性別<select class="input" name="audienceGender"><option value="">すべて</option><option value="female">女性</option><option value="male">男性</option><option value="other">その他・未設定</option></select></label><div class="columns"><label class="field">年齢 下限<input class="input" name="audienceMinAge" type="number" min="0" max="120"></label><label class="field">年齢 上限<input class="input" name="audienceMaxAge" type="number" min="0" max="120"></label></div></div><div id="campaign-message" class="message" role="status" aria-live="polite"></div><div class="form-actions"><button id="campaign-submit" class="primary" type="submit">キャンペーンを配信する</button><button id="campaign-reset" class="secondary" type="reset">入力をクリア</button></div></form><aside class="card"><h2>配信履歴</h2><p class="card-intro">作成済みの広告は、ここから編集・削除できます。</p><div class="history">${history}</div></aside></div><script>const campaigns=${campaignData};const form=document.getElementById('campaign-form'),fileInput=document.getElementById('campaign-image'),preview=document.getElementById('campaign-preview'),message=document.getElementById('campaign-message'),submit=document.getElementById('campaign-submit'),formTitle=document.getElementById('campaign-form-title'),editing=document.getElementById('campaign-editing'),cancelEdit=document.getElementById('campaign-cancel-edit');let previewUrl='',editingId='',existingImageKey='';const defaults={startsAt:'${localDateTimeValue(start)}',endsAt:'${localDateTimeValue(end)}'};function localValue(value){const date=new Date(value);date.setMinutes(date.getMinutes()-date.getTimezoneOffset());return date.toISOString().slice(0,16)}function setPreview(src){if(src){preview.innerHTML='<img alt="広告画像プレビュー">';preview.querySelector('img').src=src}else{preview.innerHTML='<span>画像がない場合は、Salon de Lienのブランド背景で表示します。</span>'}}function resetMode(){editingId='';existingImageKey='';form.reset();form.elements.startsAt.value=defaults.startsAt;form.elements.endsAt.value=defaults.endsAt;fileInput.value='';setPreview('');formTitle.textContent='新しいキャンペーン';submit.textContent='キャンペーンを配信する';editing.classList.remove('show');message.className='message'}fileInput.addEventListener('change',()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);const file=fileInput.files[0];if(!file){setPreview(editingId&&existingImageKey?'/api/lien-campaign-image?id='+encodeURIComponent(editingId):'');return}previewUrl=URL.createObjectURL(file);setPreview(previewUrl)});function show(text,ok){message.className='message show '+(ok?'ok':'error');message.textContent=text}document.querySelectorAll('[data-edit]').forEach(button=>button.addEventListener('click',()=>{const item=campaigns.find(value=>value.id===button.dataset.edit);if(!item)return;editingId=item.id;existingImageKey=item.imageKey||'';for(const key of ['title','summary','body','targetMenu','discountRate','audienceGender','audienceMinAge','audienceMaxAge'])form.elements[key].value=item[key]??'';form.elements.startsAt.value=localValue(item.startsAt);form.elements.endsAt.value=localValue(item.endsAt);fileInput.value='';setPreview(existingImageKey?'/api/lien-campaign-image?id='+encodeURIComponent(item.id):'');formTitle.textContent='キャンペーンを編集';submit.textContent='変更を保存する';editing.classList.add('show');message.className='message';form.scrollIntoView({behavior:'smooth',block:'start'})}));cancelEdit.addEventListener('click',resetMode);document.getElementById('campaign-reset').addEventListener('click',event=>{event.preventDefault();resetMode()});document.querySelectorAll('[data-delete]').forEach(button=>button.addEventListener('click',async()=>{const item=campaigns.find(value=>value.id===button.dataset.delete);if(!item||!confirm('「'+item.title+'」を削除しますか？\\n顧客アプリには表示されなくなります。'))return;button.disabled=true;try{const response=await fetch('/api/lien-campaigns?id='+encodeURIComponent(item.id),{method:'DELETE',credentials:'same-origin'});const result=await response.json();if(!response.ok)throw Error(result.error||'削除できませんでした。');location.reload()}catch(error){alert(error.message||'削除できませんでした。');button.disabled=false}}));form.addEventListener('submit',async event=>{event.preventDefault();submit.disabled=true;submit.textContent=editingId?'変更を保存中…':'配信準備中…';message.className='message';try{let imageKey=existingImageKey||null;const file=fileInput.files[0];if(file){submit.textContent='広告画像を保存中…';const upload=await fetch('/api/lien-campaign-image',{method:'POST',credentials:'same-origin',headers:{'Content-Type':file.type},body:file});const result=await upload.json();if(!upload.ok)throw Error(result.error||'広告画像を保存できませんでした。');imageKey=result.imageKey}const data=Object.fromEntries(new FormData(form).entries());data.imageKey=imageKey;const endpoint='/api/lien-campaigns'+(editingId?'?id='+encodeURIComponent(editingId):'');const response=await fetch(endpoint,{method:editingId?'PATCH':'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await response.json();if(!response.ok)throw Error(result.error||(editingId?'更新できませんでした。':'配信できませんでした。'));show(editingId?result.recipientCount+'名を対象に変更を保存しました。':result.recipientCount+'名へキャンペーンを配信しました。',true);setTimeout(()=>location.reload(),700)}catch(error){show(error.message||(editingId?'キャンペーンを更新できませんでした。':'キャンペーンを配信できませんでした。'),false);submit.disabled=false;submit.textContent=editingId?'変更を保存する':'キャンペーンを配信する'}})</script>`
    sendCustomerHtml(res, adminShellV429(session, content, organizations[0]?.name || 'Salon de Lien'))
  }

  async function customerPage(req, res, session) {
    const [campaigns, unread] = await Promise.all([
      activeCampaignsForCustomer(session),
      notificationUnreadForCustomer(session),
    ])
    for (const campaign of campaigns) {
      await prisma.$executeRawUnsafe('UPDATE "CustomerCampaignRecipient" SET "viewedAt"=COALESCE("viewedAt",CURRENT_TIMESTAMP) WHERE "customerId"=$1 AND "campaignId"=$2', session.customerId, campaign.id)
    }
    const cards = campaigns.length ? campaigns.map(campaign => `<article class="campaign-card">${campaign.imageKey ? `<img src="/api/lien-campaign-image?id=${encodeURIComponent(campaign.id)}&audience=customer" alt="${htmlEscape(campaign.title)}">` : `<div class="campaign-fallback"><span>Salon campaign</span><strong>${htmlEscape(campaign.title)}</strong></div>`}<div class="campaign-copy"><div class="campaign-meta"><span>${htmlEscape(jpDate(campaign.startsAt))}〜${htmlEscape(jpDate(campaign.endsAt))}</span>${campaign.discountRate ? `<b>${campaign.discountRate}%OFF</b>` : ''}</div><h2>${htmlEscape(campaign.title)}</h2><p class="campaign-summary">${htmlEscape(campaign.summary)}</p><p class="campaign-body">${htmlEscape(campaign.body)}</p>${campaign.targetMenu ? `<div class="campaign-menu">対象メニュー　<strong>${htmlEscape(campaign.targetMenu)}</strong></div>` : ''}<a class="campaign-cta" href="/u/appointments?campaign=${encodeURIComponent(campaign.id)}">このキャンペーンで予約する</a></div></article>`).join('') : `<section class="campaign-empty">${customerIcon('news')}<h2>現在開催中のキャンペーンはありません</h2><p>新しいイベントや期間限定キャンペーンが始まると、こちらに表示されます。</p></section>`
    const styles = `<style>.campaign-hero{padding:24px 18px;background:linear-gradient(145deg,#fff7f8,#f7eee8);border-bottom:1px solid var(--line)}.campaign-hero span{color:var(--rose-dark);font:700 10px Georgia,serif;letter-spacing:.12em;text-transform:uppercase}.campaign-hero h1{margin:8px 0 0;font-family:"Yu Mincho",serif;font-size:23px}.campaign-hero p{margin:9px 0 0;color:var(--muted);font-size:11px;line-height:1.7}.campaign-list{display:grid;gap:18px;padding:18px}.campaign-card{overflow:hidden;border:1px solid #eadbd5;border-radius:17px;background:#fff;box-shadow:0 10px 26px #684a3d12}.campaign-card>img,.campaign-fallback{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}.campaign-fallback{display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#f8dfe6,#f4e9df);padding:24px;color:#8f4f42;text-align:center}.campaign-fallback span{font:10px Georgia,serif;letter-spacing:.14em;text-transform:uppercase}.campaign-fallback strong{margin-top:10px;font-family:"Yu Mincho",serif;font-size:19px}.campaign-copy{padding:17px}.campaign-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;color:#8b7b73;font-size:9px}.campaign-meta b{border-radius:99px;background:#d45572;padding:5px 9px;color:#fff;font-size:11px}.campaign-copy h2{margin:12px 0 0;font-family:"Yu Mincho",serif;font-size:18px}.campaign-summary{margin:8px 0 0;color:#8f4f42;font-size:11px;font-weight:800;line-height:1.7}.campaign-body{white-space:pre-wrap;margin:11px 0 0;color:#665b55;font-size:11px;line-height:1.8}.campaign-menu{margin-top:13px;border-radius:10px;background:#faf3ef;padding:11px;color:#7b6259;font-size:10px}.campaign-cta{display:flex;min-height:46px;align-items:center;justify-content:center;margin-top:15px;border-radius:999px;background:#8f4f42;color:#fff;font-size:11px;font-weight:900}.campaign-empty{margin:40px 18px;padding:44px 20px;border:1px dashed #dacbc3;border-radius:17px;text-align:center}.campaign-empty .icon{width:34px;height:34px;color:#c36b7f}.campaign-empty h2{margin:14px 0 0;font-family:"Yu Mincho",serif;font-size:17px}.campaign-empty p{margin:9px 0 0;color:var(--muted);font-size:10px;line-height:1.7}@media(min-width:900px){.campaign-list{grid-template-columns:repeat(2,minmax(0,1fr));max-width:1120px;margin:auto;padding:30px}.campaign-hero{padding:34px calc((100% - 1084px)/2)}.campaign-hero h1{font-size:29px}}</style>`
    const body = `<section class="campaign-hero"><span>Salon campaign</span><h1>キャンペーン</h1><p>期間限定メニューやイベントなど、サロンからの特別なご案内です。</p></section><section class="campaign-list">${cards}</section>${styles}`
    sendCustomerHtml(res, customerShell({ title: 'キャンペーン', unread, back: '/u/home', body }))
  }

  async function handle(req, res, url) {
    if (req.method === 'GET' && url.pathname === '/u/campaigns') {
      const session = await customerSession(req)
      if (!session) { res.statusCode = 302; res.setHeader('Location', '/u/login'); res.end(); return true }
      await customerPage(req, res, session)
      return true
    }
    if (req.method === 'GET' && url.pathname === '/admin/customers/messages/campaigns') {
      const session = await staffSession(req)
      if (!session) { res.statusCode = 302; res.setHeader('Location', '/admin/login'); res.end(); return true }
      await adminPageV429(req, res, session)
      return true
    }
    if (url.pathname === '/api/lien-campaign-image') {
      if (req.method === 'POST') await uploadImage(req, res)
      else if (req.method === 'GET') await streamImage(req, res, url)
      else json(res, 405, { error: 'Method not allowed' })
      return true
    }
    if (url.pathname === '/api/lien-campaigns' && ['POST', 'PATCH', 'DELETE'].includes(req.method)) {
      if (req.method === 'POST') await createCampaign(req, res)
      else if (req.method === 'PATCH') await updateCampaign(req, res, url)
      else await deleteCampaign(req, res, url)
      return true
    }
    return false
  }

  return { handle, activeCampaignsForCustomer, homeSection, customerPage, ensureTables }
}

module.exports = { createCustomerCampaignService }
