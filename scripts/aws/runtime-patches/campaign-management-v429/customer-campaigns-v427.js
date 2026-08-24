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
  const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' })
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
    const items = campaigns.length ? campaigns.slice(0, 3).map(item => `<a class="home-campaign" href="/u/campaigns">${item.imageKey ? `<img src="/api/lien-campaign-image?id=${encodeURIComponent(item.id)}" alt="${htmlEscape(item.title)}">` : '<span class="home-campaign-visual">SALON CAMPAIGN</span>'}<span class="home-campaign-copy">${item.discountRate ? `<b>${item.discountRate}% OFF</b>` : '<b>EVENT & CAMPAIGN</b>'}<strong>${htmlEscape(item.title)}</strong><p>${htmlEscape(item.summary)}</p></span></a>`).join('') : `<div class="notice"><span>${customerIcon('news')}</span><div><strong>現在、開催中のキャンペーンはありません</strong><p>新しいイベントや期間限定情報が届くと、ここに表示されます。</p></div></div>`
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
    const customer = await customerSession(req)
    let rows = []
    if (customer) {
      rows = await prisma.$queryRawUnsafe(`SELECT c."imageKey" FROM "CustomerCampaign" c
        JOIN "CustomerCampaignRecipient" r ON r."campaignId"=c."id"
        WHERE c."id"=$1 AND c."organizationId"=$2 AND r."customerId"=$3 LIMIT 1`, id, customer.organizationId, customer.customerId)
    } else {
      const staff = await staffSession(req)
      if (!staff) return json(res, 401, { error: 'ログインが必要です。' })
      rows = await prisma.$queryRawUnsafe('SELECT "imageKey" FROM "CustomerCampaign" WHERE "id"=$1 AND "organizationId"=$2 LIMIT 1', id, staff.organizationId)
    }
    const key = rows[0]?.imageKey
    if (!key) return json(res, 404, { error: '画像がありません。' })
    const bucket = String(process.env.S3_PRIVATE_ASSETS_BUCKET || '').trim()
    if (!bucket) return json(res, 503, { error: '画像保存先が設定されていません。' })
    try {
      const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
      res.statusCode = 200
      res.setHeader('Content-Type', object.ContentType || 'image/jpeg')
      res.setHeader('Cache-Control', 'private, max-age=120')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      if (object.Body && typeof object.Body.pipe === 'function') return object.Body.pipe(res)
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

  function adminCss() {
    return `*{box-sizing:border-box}html,body{min-width:1100px}body{margin:0;background:#fbf7f0;color:#2f2a25;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Yu Gothic",sans-serif}a{color:inherit;text-decoration:none}.shell{display:grid;grid-template-columns:256px minmax(0,1fr);min-height:100vh}.side{position:fixed;inset:0 auto 0 0;width:256px;padding:24px 18px;background:#fff;border-right:1px solid #e8ded2}.brand{display:flex;align-items:center;gap:12px}.brand img{width:42px;height:42px}.brand b{display:block}.brand small{display:block;margin-top:4px;color:#8b8178;font-size:10px}.nav{display:grid;gap:7px;margin-top:30px}.nav a{display:flex;align-items:center;min-height:44px;border-radius:14px;padding:0 14px;color:#655b54;font-size:13px;font-weight:700}.nav a.active{background:#8f4f42;color:#fff}.stage{grid-column:2}.top{position:sticky;top:0;z-index:5;display:flex;height:72px;align-items:center;justify-content:space-between;border-bottom:1px solid #e8ded2;background:#fffdf9ee;padding:0 28px;backdrop-filter:blur(12px)}.top a{font-size:13px;font-weight:800;color:#8f4f42}.wrap{max-width:1180px;margin:0 auto;padding:28px}.workspace-tabs{display:grid;grid-template-columns:repeat(4,1fr);overflow:hidden;border:1px solid #e8ded2;border-radius:18px;background:#fff}.workspace-tabs a{display:grid;min-height:54px;place-items:center;color:#756b63;font-size:13px;font-weight:800}.workspace-tabs a.active{background:#f8e9e4;color:#8f4f42}.hero{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-top:24px}.eyebrow{color:#8f4f42;font-size:12px;font-weight:800}.hero h1{margin:7px 0 0;font-family:"Yu Mincho",serif;font-size:32px}.hero p{max-width:760px;margin:10px 0 0;color:#756b63;font-size:14px;line-height:1.8}.grid{display:grid;grid-template-columns:minmax(0,1fr) 350px;gap:22px;margin-top:24px}.card{border:1px solid #e8ded2;border-radius:22px;background:#fff;padding:22px;box-shadow:0 16px 42px #4f372b12}.card h2{margin:0;font-size:18px}.card-intro{margin:7px 0 20px;color:#81756f;font-size:12px;line-height:1.7}.field{display:grid;gap:8px;margin-top:16px;font-size:12px;font-weight:800}.input{width:100%;min-height:48px;border:1px solid #dfd1c7;border-radius:13px;background:#fff;padding:11px 14px;color:#2f2a25;font:inherit;outline:none}.input:focus{border-color:#8f4f42;box-shadow:0 0 0 4px #e9c9be66}textarea.input{min-height:120px;resize:vertical;line-height:1.7}.columns{display:grid;grid-template-columns:1fr 1fr;gap:13px}.preview{display:grid;aspect-ratio:16/9;place-items:center;overflow:hidden;border:1px dashed #d9c6bb;border-radius:17px;background:linear-gradient(135deg,#fff4f6,#f6efe6);color:#9b6b60;text-align:center}.preview img{width:100%;height:100%;object-fit:cover}.preview span{padding:20px;font-size:12px;line-height:1.7}.primary{display:inline-flex;min-height:48px;align-items:center;justify-content:center;border:0;border-radius:999px;background:#8f4f42;padding:0 24px;color:#fff;font-weight:800;box-shadow:0 10px 25px #8f4f4230}.primary:disabled{cursor:wait;opacity:.55}.message{display:none;margin-top:14px;border-radius:13px;padding:12px 14px;font-size:12px;font-weight:700}.message.show{display:block}.message.ok{background:#edf6ee;color:#3d6143}.message.error{background:#fff0ef;color:#9b3934}.history{display:grid;gap:12px;margin-top:16px}.history article{overflow:hidden;border:1px solid #eaded8;border-radius:16px}.history img,.history .fallback{width:100%;aspect-ratio:16/9;object-fit:cover}.history .fallback{display:grid;place-items:center;background:linear-gradient(135deg,#fceaf0,#f2e7dd);color:#8f4f42;font-size:28px}.history-copy{padding:14px}.history h3{margin:0;font-size:14px}.history p{margin:6px 0 0;color:#81756f;font-size:11px;line-height:1.55}.badge{display:inline-flex;margin-top:9px;border-radius:99px;background:#fff1f4;padding:4px 8px;color:#a33d57;font-size:10px;font-weight:800}`
  }

  function adminShell(session, content) {
    return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>キャンペーン配信 | Salon de Lien</title><style>${adminCss()}</style></head><body><div class="shell"><aside class="side"><div class="brand"><img src="/brand/salon-customer-service-mark.svg" alt=""><div><b>Salon de Lien</b><small>Salon customer service</small></div></div><nav class="nav"><a href="/admin/appointments">予約カレンダー</a><a class="active" href="/admin/customers">顧客・チャット・配信</a><a href="/admin/products?section=menus">メニュー・商品棚・集計</a><a href="/admin/community">スタイル共有</a><a href="/admin/owner-analytics">経営分析</a></nav></aside><section class="stage"><header class="top"><strong>キャンペーン配信</strong><a href="/admin/customers/messages">通常のお知らせ配信へ戻る</a></header><main class="wrap"><nav class="workspace-tabs"><a href="/admin/customers">顧客管理</a><a href="/admin/customers/messages/chat">チャット</a><a href="/admin/customers/messages">お知らせ配信</a><a class="active" href="/admin/customers/messages/campaigns">キャンペーン</a></nav>${content}</main></section></div></body></html>`
  }

  function localDateTimeValue(date) {
    const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    return shifted.toISOString().slice(0, 16)
  }

  async function adminPage(req, res, session) {
    await ensureTables()
    const [menus, campaigns] = await Promise.all([
      prisma.$queryRawUnsafe('SELECT "name" FROM "SalonMenu" WHERE "organizationId"=$1 AND "active"=TRUE ORDER BY "sortOrder","name"', session.organizationId),
      prisma.$queryRawUnsafe('SELECT * FROM "CustomerCampaign" WHERE "organizationId"=$1 ORDER BY "createdAt" DESC LIMIT 20', session.organizationId),
    ])
    const start = new Date()
    start.setMinutes(Math.ceil(start.getMinutes() / 10) * 10, 0, 0)
    const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000)
    const history = campaigns.length ? campaigns.map(campaign => `<article>${campaign.imageKey ? `<img src="/api/lien-campaign-image?id=${encodeURIComponent(campaign.id)}" alt="${htmlEscape(campaign.title)}">` : `<div class="fallback">CAMPAIGN</div>`}<div class="history-copy"><h3>${htmlEscape(campaign.title)}</h3><p>${htmlEscape(jpDate(campaign.startsAt))}〜${htmlEscape(jpDate(campaign.endsAt))}</p><p>${htmlEscape(campaign.targetMenu || '全メニュー')}${campaign.discountRate ? ` / ${campaign.discountRate}%OFF` : ''}</p><span class="badge">${Number(campaign.audienceMatchedCount || 0).toLocaleString('ja-JP')}名へ配信</span></div></article>`).join('') : '<p class="card-intro">キャンペーン配信はまだありません。</p>'
    const menuOptions = menus.map(menu => `<option value="${htmlEscape(menu.name)}">${htmlEscape(menu.name)}</option>`).join('')
    const content = `<section class="hero"><div><span class="eyebrow">Campaign studio</span><h1>広告・キャンペーン配信</h1><p>通常のお知らせとは別に、期間限定メニュー、割引、店舗イベントを広告画像と一緒にお客様アプリへ掲載します。</p></div></section><div class="grid"><form id="campaign-form" class="card"><h2>新しいキャンペーン</h2><p class="card-intro">開催中の内容だけが顧客アプリのホームとキャンペーン一覧へ表示されます。</p><label class="field">広告画像（任意・JPG / PNG / WebP）<input id="campaign-image" class="input" type="file" accept="image/jpeg,image/png,image/webp"></label><div id="campaign-preview" class="preview"><span>画像がない場合は、Salon de Lienのブランド背景で表示します。</span></div><label class="field">キャンペーン名<input class="input" name="title" maxlength="60" placeholder="例：髪質改善トリートメント 10%OFF" required></label><label class="field">広告の短い説明<input class="input" name="summary" maxlength="140" placeholder="例：夏の紫外線ダメージを、今だけお得に集中ケア" required></label><label class="field">詳しい内容<textarea class="input" name="body" maxlength="800" placeholder="対象条件やおすすめしたいお客様、イベント内容をご案内します。" required></textarea></label><div class="columns"><label class="field">対象メニュー<select class="input" name="targetMenu"><option value="">全メニュー・イベント</option>${menuOptions}</select></label><label class="field">割引率（任意）<input class="input" name="discountRate" type="number" min="1" max="100" placeholder="10"></label></div><div class="columns"><label class="field">掲載開始<input class="input" name="startsAt" type="datetime-local" value="${localDateTimeValue(start)}" required></label><label class="field">掲載終了<input class="input" name="endsAt" type="datetime-local" value="${localDateTimeValue(end)}" required></label></div><div class="columns"><label class="field">対象の性別<select class="input" name="audienceGender"><option value="">すべて</option><option value="female">女性</option><option value="male">男性</option><option value="other">その他・未設定</option></select></label><div class="columns"><label class="field">年齢 下限<input class="input" name="audienceMinAge" type="number" min="0" max="120"></label><label class="field">年齢 上限<input class="input" name="audienceMaxAge" type="number" min="0" max="120"></label></div></div><div id="campaign-message" class="message" role="status"></div><button id="campaign-submit" class="primary" type="submit">キャンペーンを配信する</button></form><aside class="card"><h2>配信履歴</h2><p class="card-intro">通常のお知らせとは別の広告配信履歴です。</p><div class="history">${history}</div></aside></div><script>const form=document.getElementById('campaign-form'),fileInput=document.getElementById('campaign-image'),preview=document.getElementById('campaign-preview'),message=document.getElementById('campaign-message'),submit=document.getElementById('campaign-submit');let previewUrl='';fileInput.addEventListener('change',()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);const file=fileInput.files[0];if(!file){preview.innerHTML='<span>画像がない場合は、Salon de Lienのブランド背景で表示します。</span>';return}previewUrl=URL.createObjectURL(file);preview.innerHTML='<img alt="広告画像プレビュー">';preview.querySelector('img').src=previewUrl});function show(text,ok){message.className='message show '+(ok?'ok':'error');message.textContent=text}form.addEventListener('submit',async event=>{event.preventDefault();submit.disabled=true;submit.textContent='配信準備中…';message.className='message';try{let imageKey=null;const file=fileInput.files[0];if(file){submit.textContent='広告画像を保存中…';const upload=await fetch('/api/lien-campaign-image',{method:'POST',credentials:'same-origin',headers:{'Content-Type':file.type},body:file});const result=await upload.json();if(!upload.ok)throw Error(result.error||'広告画像を保存できませんでした。');imageKey=result.imageKey}submit.textContent='対象顧客へ配信中…';const data=Object.fromEntries(new FormData(form).entries());delete data.campaignImage;data.imageKey=imageKey;const response=await fetch('/api/lien-campaigns',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await response.json();if(!response.ok)throw Error(result.error||'キャンペーンを配信できませんでした。');show(result.recipientCount+'名へキャンペーンを配信しました。',true);setTimeout(()=>location.reload(),900)}catch(error){show(error.message||'キャンペーンを配信できませんでした。',false);submit.disabled=false;submit.textContent='キャンペーンを配信する'}})</script>`
    sendCustomerHtml(res, adminShell(session, content))
  }

  function adminIconV429(name) {
    const paths = {
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
      users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
      package: '<path d="m16.5 9.4-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
      image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
      chart: '<path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
      settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/>',
      edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
      trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/>',
      campaign: '<path d="M3 11v2a2 2 0 0 0 2 2h2l4 5h3l-2-5 7-3V6l-12 4H5a2 2 0 0 0-2 1Z"/><path d="M19 8a3 3 0 0 0 0-6"/>',
    }
    return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.campaign}</svg>`
  }

  function adminCssV429() {
    return `:root{--bg:#fbf7f0;--surface:#fff;--soft:#f6efe6;--ink:#2f2a25;--muted:#7c7168;--primary:#8f4f42;--primary-dark:#5b332c;--primary-soft:#f7e8e4;--border:#e8ded2;--sage:#8aa58a}*{box-sizing:border-box}html,body{min-width:1180px;min-height:100%}body{margin:0;background:var(--bg);color:var(--ink);font-family:"Noto Sans JP","Hiragino Kaku Gothic ProN","Yu Gothic UI",Meiryo,sans-serif;-webkit-font-smoothing:antialiased}a{color:inherit;text-decoration:none}button,input,select,textarea{font:inherit}.shell{min-height:100vh;padding-left:256px}.side{position:fixed;inset:0 auto 0 0;z-index:20;display:flex;width:256px;flex-direction:column;border-right:1px solid var(--border);background:#fffdf9}.brand{display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--border);padding:18px}.brand img{width:44px;height:44px;object-fit:contain}.brand b{display:block;font-size:16px}.brand small{display:block;margin-top:3px;color:var(--muted);font-size:10px}.nav{display:grid;gap:5px;padding:16px 12px}.nav a{display:flex;min-height:44px;align-items:center;gap:11px;border-radius:999px;padding:0 13px;color:var(--muted);font-size:13px;font-weight:700}.nav a svg{width:17px;height:17px;color:#a79b91}.nav a:hover{background:var(--soft);color:var(--ink)}.nav a.active{background:var(--primary);color:#fff;box-shadow:0 4px 12px #8f4f4225}.nav a.active svg{color:#fff}.side-note{margin:auto 14px 16px;border:1px solid var(--border);border-radius:18px;background:linear-gradient(145deg,#f7e9e2,#efe7dd);padding:16px;color:var(--primary-dark);font-size:12px;font-weight:700;line-height:1.7}.stage{min-width:0}.top{position:sticky;top:0;z-index:10;display:flex;min-height:64px;align-items:center;gap:18px;border-bottom:1px solid var(--border);background:#fffdf9ee;padding:10px 28px;backdrop-filter:blur(14px)}.top-title{min-width:150px}.top-title small{display:block;color:var(--muted);font-size:10px;font-weight:700}.top-title strong{display:block;margin-top:2px;font-size:14px}.top-search{display:flex;height:42px;max-width:520px;flex:1;align-items:center;gap:10px;border:1px solid var(--border);border-radius:999px;background:#fff;padding:0 16px;color:#a4978d;font-size:12px}.top-search svg,.top-settings svg{width:17px;height:17px}.top-account{margin-left:auto;display:flex;align-items:center;gap:9px;border:1px solid var(--border);border-radius:999px;background:#fff;padding:6px 12px;color:var(--ink);font-size:12px;font-weight:700}.top-account span{display:grid;width:27px;height:27px;place-items:center;border-radius:50%;background:#f1dfd7;color:var(--primary-dark)}.top-settings{display:grid;width:40px;height:40px;place-items:center;border:1px solid var(--border);border-radius:50%;background:#fff;color:var(--muted)}.wrap{width:100%;max-width:1280px;margin:0 auto;padding:28px 32px 48px}.workspace-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;border:1px solid var(--border);border-radius:20px;background:#fff;padding:5px;box-shadow:0 8px 24px #49342a0b}.workspace-tabs a{display:flex;min-height:52px;align-items:center;justify-content:center;gap:9px;border-radius:15px;color:var(--muted);font-size:13px;font-weight:800}.workspace-tabs a svg{width:17px;height:17px}.workspace-tabs a:hover{background:var(--soft);color:var(--ink)}.workspace-tabs a.active{background:#f9e7eb;color:#a23f59}.hero{margin-top:26px;border:1px solid var(--border);border-radius:24px;background:linear-gradient(145deg,#fffaf8,#f8f0e9);padding:27px 30px;box-shadow:0 12px 35px #52392e0d}.eyebrow{display:flex;align-items:center;gap:8px;color:#a23f59;font-size:12px;font-weight:800}.eyebrow svg{width:17px;height:17px}.hero h1{margin:8px 0 0;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:30px;font-weight:600}.hero p{max-width:800px;margin:10px 0 0;color:var(--muted);font-size:14px;line-height:1.8}.grid{display:grid;grid-template-columns:minmax(0,1fr) 390px;gap:22px;margin-top:22px;align-items:start}.card{border:1px solid var(--border);border-radius:22px;background:#fff;padding:24px;box-shadow:0 14px 38px #4f372b10}.card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.card h2{margin:0;font-size:18px}.card-intro{margin:7px 0 0;color:var(--muted);font-size:12px;line-height:1.7}.editing{display:none;align-items:center;justify-content:space-between;gap:12px;margin:18px 0 0;border:1px solid #e7c6cf;border-radius:14px;background:#fff3f6;padding:12px 14px;color:#8f3e55;font-size:12px;font-weight:800}.editing.show{display:flex}.text-button{border:0;background:transparent;color:var(--primary);font-size:12px;font-weight:800;cursor:pointer}.field{display:grid;gap:8px;margin-top:17px;color:#4b403a;font-size:12px;font-weight:800}.input{width:100%;min-height:48px;border:1px solid #ded0c7;border-radius:13px;background:#fff;padding:11px 14px;color:var(--ink);font-size:13px;outline:none;transition:.18s}.input:focus{border-color:var(--primary);box-shadow:0 0 0 4px #e9c9be66}textarea.input{min-height:120px;resize:vertical;line-height:1.75}.columns{display:grid;grid-template-columns:1fr 1fr;gap:14px}.preview{display:grid;aspect-ratio:16/9;place-items:center;overflow:hidden;margin-top:10px;border:1px dashed #d8c5ba;border-radius:17px;background:linear-gradient(135deg,#fff5f7,#f4eee7);color:#986e65;text-align:center}.preview img{width:100%;height:100%;object-fit:cover}.preview span{max-width:350px;padding:20px;font-size:12px;line-height:1.7}.form-actions{display:flex;align-items:center;gap:12px;margin-top:20px}.primary,.secondary,.danger{display:inline-flex;min-height:46px;align-items:center;justify-content:center;gap:8px;border-radius:999px;padding:0 21px;font-size:12px;font-weight:800;cursor:pointer}.primary{border:0;background:var(--primary);color:#fff;box-shadow:0 9px 24px #8f4f4230}.secondary{border:1px solid var(--border);background:#fff;color:var(--ink)}.danger{border:1px solid #edcbd0;background:#fff;color:#aa3d54}.primary:disabled,.secondary:disabled,.danger:disabled{cursor:wait;opacity:.55}.message{display:none;margin-top:15px;border-radius:13px;padding:12px 14px;font-size:12px;font-weight:700}.message.show{display:block}.message.ok{background:#edf6ee;color:#3d6143}.message.error{background:#fff0ef;color:#9b3934}.history{display:grid;gap:13px;margin-top:18px}.history article{overflow:hidden;border:1px solid #eaded8;border-radius:17px;background:#fff}.history-media{position:relative}.history img,.history .fallback{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}.history .fallback{display:grid;place-items:center;background:linear-gradient(135deg,#fceaf0,#f2e7dd);color:#8f4f42;font:700 12px Georgia,serif;letter-spacing:.12em}.history-status{position:absolute;top:10px;left:10px;border-radius:999px;background:#fffdf9e8;padding:5px 9px;color:#665850;font-size:10px;font-weight:800;box-shadow:0 4px 12px #36251d18}.history-copy{padding:14px}.history h3{margin:0;font-size:14px;line-height:1.5}.history p{margin:6px 0 0;color:var(--muted);font-size:11px;line-height:1.55}.history-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px}.badge{display:inline-flex;border-radius:99px;background:#fff1f4;padding:5px 9px;color:#a33d57;font-size:10px;font-weight:800}.history-actions{display:flex;gap:7px}.icon-action{display:inline-flex;min-height:34px;align-items:center;gap:5px;border:1px solid var(--border);border-radius:999px;background:#fff;padding:0 10px;color:#62564f;font-size:10px;font-weight:800;cursor:pointer}.icon-action svg{width:14px;height:14px}.icon-action.delete{color:#aa3d54}.empty{border:1px dashed #d8c9c0;border-radius:15px;padding:28px 16px;color:var(--muted);font-size:12px;text-align:center}@media(max-width:1390px){.grid{grid-template-columns:minmax(0,1fr) 350px}.wrap{padding-left:24px;padding-right:24px}}`
  }

  function adminShellV429(session, content) {
    const displayName = htmlEscape(String(session.displayName || session.name || session.email || 'スタッフ').split('@')[0])
    const nav = [
      ['calendar', '予約カレンダー', '/admin/appointments'],
      ['users', '顧客・チャット・配信', '/admin/customers'],
      ['package', 'メニュー・商品棚・集計', '/admin/products?section=menus'],
      ['image', 'スタイル共有', '/admin/community'],
      ['chart', '経営分析', '/admin/owner-analytics'],
    ].map(([icon, label, href], index) => `<a${index === 1 ? ' class="active"' : ''} href="${href}">${adminIconV429(icon)}<span>${label}</span></a>`).join('')
    const tabs = `<nav class="workspace-tabs" aria-label="顧客ページ切替"><a href="/admin/customers">${adminIconV429('users')}<span>顧客管理</span></a><a href="/admin/customers/messages/chat">${adminIconV429('campaign')}<span>チャット</span></a><a href="/admin/customers/messages">${adminIconV429('campaign')}<span>配信</span></a><a class="active" href="/admin/customers/messages/campaigns">${adminIconV429('campaign')}<span>キャンペーン</span></a></nav>`
    return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>キャンペーン配信 | Salon de Lien</title><style>${adminCssV429()}</style></head><body><div class="shell"><aside class="side"><a class="brand" href="/admin/customers"><img src="/brand/salon-customer-service-mark.svg" alt=""><div><b>Salon de Lien</b><small>Salon customer service</small></div></a><nav class="nav">${nav}</nav><div class="side-note">お客様との関係を、日々の接客から育てます。</div></aside><section class="stage"><header class="top"><div class="top-title"><small>Salon de Lien</small><strong>顧客・チャット・配信</strong></div><div class="top-search">${adminIconV429('search')}<span>顧客名・電話・メモで検索</span></div><a class="top-account" href="/admin/account"><span>${displayName.slice(0, 1)}</span>${displayName}</a><a class="top-settings" href="/admin/settings" aria-label="設定">${adminIconV429('settings')}</a></header><main class="wrap">${tabs}${content}</main></section></div></body></html>`
  }

  async function adminPageV429(req, res, session) {
    await ensureTables()
    const [menus, campaigns] = await Promise.all([
      prisma.$queryRawUnsafe('SELECT "name" FROM "SalonMenu" WHERE "organizationId"=$1 AND "active"=TRUE ORDER BY "sortOrder","name"', session.organizationId),
      prisma.$queryRawUnsafe('SELECT * FROM "CustomerCampaign" WHERE "organizationId"=$1 AND "status"<>\'deleted\' ORDER BY "createdAt" DESC LIMIT 40', session.organizationId),
    ])
    const start = new Date()
    start.setMinutes(Math.ceil(start.getMinutes() / 10) * 10, 0, 0)
    const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000)
    const now = Date.now()
    const history = campaigns.length ? campaigns.map(campaign => {
      const starts = new Date(campaign.startsAt).getTime()
      const ends = new Date(campaign.endsAt).getTime()
      const status = starts > now ? '公開予定' : ends < now ? '終了' : '公開中'
      return `<article><div class="history-media">${campaign.imageKey ? `<img src="/api/lien-campaign-image?id=${encodeURIComponent(campaign.id)}" alt="${htmlEscape(campaign.title)}">` : '<div class="fallback">SALON CAMPAIGN</div>'}<span class="history-status">${status}</span></div><div class="history-copy"><h3>${htmlEscape(campaign.title)}</h3><p>${htmlEscape(jpDate(campaign.startsAt))}〜${htmlEscape(jpDate(campaign.endsAt))}</p><p>${htmlEscape(campaign.targetMenu || '全メニュー・イベント')}${campaign.discountRate ? ` / ${campaign.discountRate}%OFF` : ''}</p><div class="history-meta"><span class="badge">${Number(campaign.audienceMatchedCount || 0).toLocaleString('ja-JP')}名へ配信</span><span class="history-actions"><button type="button" class="icon-action" data-edit="${htmlEscape(campaign.id)}">${adminIconV429('edit')}編集</button><button type="button" class="icon-action delete" data-delete="${htmlEscape(campaign.id)}">${adminIconV429('trash')}削除</button></span></div></div></article>`
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
    const content = `<section class="hero"><div class="eyebrow">${adminIconV429('campaign')}Campaign studio</div><h1>広告・キャンペーン配信</h1><p>通常のお知らせとは分けて、期間限定メニュー、割引、店舗イベントを広告画像と一緒にお客様アプリへ掲載します。</p></section><div class="grid"><form id="campaign-form" class="card"><div class="card-head"><div><h2 id="campaign-form-title">新しいキャンペーン</h2><p class="card-intro">公開期間中の内容だけが顧客アプリのホームとキャンペーン一覧へ表示されます。</p></div></div><div id="campaign-editing" class="editing"><span>配信済みキャンペーンを編集中です</span><button id="campaign-cancel-edit" class="text-button" type="button">新規作成に戻る</button></div><label class="field">広告画像（任意・JPG / PNG / WebP）<input id="campaign-image" class="input" type="file" accept="image/jpeg,image/png,image/webp"></label><div id="campaign-preview" class="preview"><span>画像がない場合は、Salon de Lienのブランド背景で表示します。</span></div><label class="field">キャンペーン名<input class="input" name="title" maxlength="60" placeholder="例：髪質改善トリートメント 10%OFF" required></label><label class="field">広告の短い説明<input class="input" name="summary" maxlength="140" placeholder="例：夏の紫外線ダメージを、今だけお得に集中ケア" required></label><label class="field">詳しい内容<textarea class="input" name="body" maxlength="800" placeholder="対象条件やおすすめしたいお客様、イベント内容をご案内します。" required></textarea></label><div class="columns"><label class="field">対象メニュー<select class="input" name="targetMenu"><option value="">全メニュー・イベント</option>${menuOptions}</select></label><label class="field">割引率（任意）<input class="input" name="discountRate" type="number" min="1" max="100" placeholder="10"></label></div><div class="columns"><label class="field">掲載開始<input class="input" name="startsAt" type="datetime-local" value="${localDateTimeValue(start)}" required></label><label class="field">掲載終了<input class="input" name="endsAt" type="datetime-local" value="${localDateTimeValue(end)}" required></label></div><div class="columns"><label class="field">対象の性別<select class="input" name="audienceGender"><option value="">すべて</option><option value="female">女性</option><option value="male">男性</option><option value="other">その他・未設定</option></select></label><div class="columns"><label class="field">年齢 下限<input class="input" name="audienceMinAge" type="number" min="0" max="120"></label><label class="field">年齢 上限<input class="input" name="audienceMaxAge" type="number" min="0" max="120"></label></div></div><div id="campaign-message" class="message" role="status" aria-live="polite"></div><div class="form-actions"><button id="campaign-submit" class="primary" type="submit">キャンペーンを配信する</button><button id="campaign-reset" class="secondary" type="reset">入力をクリア</button></div></form><aside class="card"><h2>配信履歴</h2><p class="card-intro">作成済みの広告は、ここから編集・削除できます。</p><div class="history">${history}</div></aside></div><script>const campaigns=${campaignData};const form=document.getElementById('campaign-form'),fileInput=document.getElementById('campaign-image'),preview=document.getElementById('campaign-preview'),message=document.getElementById('campaign-message'),submit=document.getElementById('campaign-submit'),formTitle=document.getElementById('campaign-form-title'),editing=document.getElementById('campaign-editing'),cancelEdit=document.getElementById('campaign-cancel-edit');let previewUrl='',editingId='',existingImageKey='';const defaults={startsAt:'${localDateTimeValue(start)}',endsAt:'${localDateTimeValue(end)}'};function localValue(value){const date=new Date(value);date.setMinutes(date.getMinutes()-date.getTimezoneOffset());return date.toISOString().slice(0,16)}function setPreview(src){if(src){preview.innerHTML='<img alt="広告画像プレビュー">';preview.querySelector('img').src=src}else{preview.innerHTML='<span>画像がない場合は、Salon de Lienのブランド背景で表示します。</span>'}}function resetMode(){editingId='';existingImageKey='';form.reset();form.elements.startsAt.value=defaults.startsAt;form.elements.endsAt.value=defaults.endsAt;fileInput.value='';setPreview('');formTitle.textContent='新しいキャンペーン';submit.textContent='キャンペーンを配信する';editing.classList.remove('show');message.className='message'}fileInput.addEventListener('change',()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);const file=fileInput.files[0];if(!file){setPreview(editingId&&existingImageKey?'/api/lien-campaign-image?id='+encodeURIComponent(editingId):'');return}previewUrl=URL.createObjectURL(file);setPreview(previewUrl)});function show(text,ok){message.className='message show '+(ok?'ok':'error');message.textContent=text}document.querySelectorAll('[data-edit]').forEach(button=>button.addEventListener('click',()=>{const item=campaigns.find(value=>value.id===button.dataset.edit);if(!item)return;editingId=item.id;existingImageKey=item.imageKey||'';for(const key of ['title','summary','body','targetMenu','discountRate','audienceGender','audienceMinAge','audienceMaxAge'])form.elements[key].value=item[key]??'';form.elements.startsAt.value=localValue(item.startsAt);form.elements.endsAt.value=localValue(item.endsAt);fileInput.value='';setPreview(existingImageKey?'/api/lien-campaign-image?id='+encodeURIComponent(item.id):'');formTitle.textContent='キャンペーンを編集';submit.textContent='変更を保存する';editing.classList.add('show');message.className='message';form.scrollIntoView({behavior:'smooth',block:'start'})}));cancelEdit.addEventListener('click',resetMode);document.getElementById('campaign-reset').addEventListener('click',event=>{event.preventDefault();resetMode()});document.querySelectorAll('[data-delete]').forEach(button=>button.addEventListener('click',async()=>{const item=campaigns.find(value=>value.id===button.dataset.delete);if(!item||!confirm('「'+item.title+'」を削除しますか？\\n顧客アプリには表示されなくなります。'))return;button.disabled=true;try{const response=await fetch('/api/lien-campaigns?id='+encodeURIComponent(item.id),{method:'DELETE',credentials:'same-origin'});const result=await response.json();if(!response.ok)throw Error(result.error||'削除できませんでした。');location.reload()}catch(error){alert(error.message||'削除できませんでした。');button.disabled=false}}));form.addEventListener('submit',async event=>{event.preventDefault();submit.disabled=true;submit.textContent=editingId?'変更を保存中…':'配信準備中…';message.className='message';try{let imageKey=existingImageKey||null;const file=fileInput.files[0];if(file){submit.textContent='広告画像を保存中…';const upload=await fetch('/api/lien-campaign-image',{method:'POST',credentials:'same-origin',headers:{'Content-Type':file.type},body:file});const result=await upload.json();if(!upload.ok)throw Error(result.error||'広告画像を保存できませんでした。');imageKey=result.imageKey}const data=Object.fromEntries(new FormData(form).entries());data.imageKey=imageKey;const endpoint='/api/lien-campaigns'+(editingId?'?id='+encodeURIComponent(editingId):'');const response=await fetch(endpoint,{method:editingId?'PATCH':'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await response.json();if(!response.ok)throw Error(result.error||(editingId?'更新できませんでした。':'配信できませんでした。'));show(editingId?result.recipientCount+'名を対象に変更を保存しました。':result.recipientCount+'名へキャンペーンを配信しました。',true);setTimeout(()=>location.reload(),700)}catch(error){show(error.message||(editingId?'キャンペーンを更新できませんでした。':'キャンペーンを配信できませんでした。'),false);submit.disabled=false;submit.textContent=editingId?'変更を保存する':'キャンペーンを配信する'}})</script>`
    sendCustomerHtml(res, adminShellV429(session, content))
  }

  async function customerPage(req, res, session) {
    const [campaigns, unread] = await Promise.all([
      activeCampaignsForCustomer(session),
      notificationUnreadForCustomer(session),
    ])
    for (const campaign of campaigns) {
      await prisma.$executeRawUnsafe('UPDATE "CustomerCampaignRecipient" SET "viewedAt"=COALESCE("viewedAt",CURRENT_TIMESTAMP) WHERE "customerId"=$1 AND "campaignId"=$2', session.customerId, campaign.id)
    }
    const cards = campaigns.length ? campaigns.map(campaign => `<article class="campaign-card">${campaign.imageKey ? `<img src="/api/lien-campaign-image?id=${encodeURIComponent(campaign.id)}" alt="${htmlEscape(campaign.title)}">` : `<div class="campaign-fallback"><span>Salon campaign</span><strong>${htmlEscape(campaign.title)}</strong></div>`}<div class="campaign-copy"><div class="campaign-meta"><span>${htmlEscape(jpDate(campaign.startsAt))}〜${htmlEscape(jpDate(campaign.endsAt))}</span>${campaign.discountRate ? `<b>${campaign.discountRate}%OFF</b>` : ''}</div><h2>${htmlEscape(campaign.title)}</h2><p class="campaign-summary">${htmlEscape(campaign.summary)}</p><p class="campaign-body">${htmlEscape(campaign.body)}</p>${campaign.targetMenu ? `<div class="campaign-menu">対象メニュー　<strong>${htmlEscape(campaign.targetMenu)}</strong></div>` : ''}<a class="campaign-cta" href="/u/appointments?campaign=${encodeURIComponent(campaign.id)}">このキャンペーンで予約する</a></div></article>`).join('') : `<section class="campaign-empty">${customerIcon('news')}<h2>現在開催中のキャンペーンはありません</h2><p>新しいイベントや期間限定キャンペーンが始まると、こちらに表示されます。</p></section>`
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
