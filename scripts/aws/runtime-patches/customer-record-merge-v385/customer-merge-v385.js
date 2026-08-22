'use strict'

const fs = require('fs')
const path = require('path')

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(body))
}

function readJson(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', chunk => {
      size += chunk.length
      if (size > limit) {
        reject(Object.assign(new Error('送信内容が大きすぎます。'), { statusCode: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) }
      catch { reject(Object.assign(new Error('送信内容を確認してください。'), { statusCode: 400 })) }
    })
    req.on('error', reject)
  })
}

function requestOrigin(req) {
  const protocol = String(req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http')).split(',')[0].trim()
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  return `${protocol}://${host}`
}

function sameOrigin(req) {
  const supplied = String(req.headers.origin || '')
  if (!supplied) return true
  try {
    const allowed = new Set([new URL(requestOrigin(req)).origin, 'https://salon-de-lien.com'])
    for (const key of ['APP_BASE_URL', 'AUTH_BASE_URL', 'NEXTAUTH_URL', 'NEXT_PUBLIC_APP_URL']) {
      const configured = String(process.env[key] || '').trim()
      if (!configured) continue
      try { allowed.add(new URL(configured).origin) } catch {}
    }
    return allowed.has(new URL(supplied).origin)
  } catch { return false }
}

function clean(value, max = 160) {
  return String(value == null ? '' : value).trim().slice(0, max)
}

function toNumber(value) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number : 0
}

function createCustomerMergeService({ prisma, crypto, sessionProvider }) {
  let schemaPromise = null

  async function ensureSchema() {
    if (!schemaPromise) schemaPromise = (async () => {
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CustomerMergeHistory" (
        "id" TEXT PRIMARY KEY,
        "organizationId" TEXT NOT NULL,
        "sourceCustomerId" TEXT NOT NULL,
        "targetCustomerId" TEXT NOT NULL,
        "actorUserId" TEXT,
        "actorDisplayName" TEXT NOT NULL,
        "actorRole" TEXT NOT NULL,
        "sourceSnapshotJson" JSONB NOT NULL,
        "targetSnapshotJson" JSONB NOT NULL,
        "resultJson" JSONB NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`)
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "CustomerMergeHistory_source_unique" ON "CustomerMergeHistory"("sourceCustomerId")')
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerMergeHistory_org_created_idx" ON "CustomerMergeHistory"("organizationId","createdAt")')
    })().catch(error => { schemaPromise = null; throw error })
    return schemaPromise
  }

  async function requireStaff(req, res) {
    const session = await sessionProvider(req)
    if (!session || !session.organizationId || !['ADMIN', 'STAFF'].includes(session.role)) {
      json(res, 401, { error: '店舗スタッフとしてログインしてください。' })
      return null
    }
    return session
  }

  async function customerSummary(tx, customerId, organizationId, lock = false) {
    const rows = await tx.$queryRawUnsafe(`SELECT c."id",c."name",c."gender",c."birthDate",c."birthYear",c."phone",c."createdAt",c."updatedAt",c."deletedAt",c."storeHiddenAt",c."organizationId",
        COALESCE(r."realName",c."name") AS "displayName",
        u."id" AS "appUserId",u."email",u."loginId",COALESCE(u."active",FALSE) AS "appUserActive",
        COALESCE(p."availablePoints",0)::int AS "availablePoints",COALESCE(p."pendingPoints",0)::int AS "pendingPoints",
        COALESCE(a."appointmentCount",0)::int AS "appointmentCount",COALESCE(v."visitCount",0)::int AS "visitCount",
        COALESCE(s."saleCount",0)::int AS "saleCount",COALESCE(s."salesTotal",0)::int AS "salesTotal",s."lastPaidAt"
      FROM "Customer" c
      LEFT JOIN "CustomerRealName" r ON r."customerId"=c."id" AND r."organizationId"=c."organizationId"
      LEFT JOIN LATERAL (SELECT x."id",x."email",x."loginId",x."active" FROM "AppUser" x WHERE x."customerId"=c."id" AND x."role"='CUSTOMER' ORDER BY x."createdAt" DESC LIMIT 1) u ON TRUE
      LEFT JOIN "CustomerPointAccount" p ON p."customerId"=c."id"
      LEFT JOIN LATERAL (SELECT COUNT(*)::int AS "appointmentCount" FROM "Appointment" x WHERE x."customerId"=c."id") a ON TRUE
      LEFT JOIN LATERAL (SELECT COUNT(*)::int AS "visitCount" FROM "Visit" x WHERE x."customerId"=c."id") v ON TRUE
      LEFT JOIN LATERAL (SELECT COUNT(*)::int AS "saleCount",COALESCE(SUM(x."amount"),0)::int AS "salesTotal",MAX(x."paidAt") AS "lastPaidAt" FROM "ServiceSale" x WHERE x."customerId"=c."id") s ON TRUE
      WHERE c."id"=$1 AND c."organizationId"=$2 ${lock ? 'FOR UPDATE OF c' : ''} LIMIT 1`, customerId, organizationId)
    return rows[0] || null
  }

  function publicSummary(row) {
    if (!row) return null
    return {
      id: row.id,
      name: row.name,
      displayName: row.displayName,
      gender: row.gender,
      birthDate: row.birthDate,
      birthYear: row.birthYear,
      phone: row.phone,
      email: row.email,
      loginId: row.loginId,
      hasLogin: Boolean(row.appUserId && row.appUserActive),
      availablePoints: toNumber(row.availablePoints),
      pendingPoints: toNumber(row.pendingPoints),
      appointmentCount: toNumber(row.appointmentCount),
      visitCount: toNumber(row.visitCount),
      saleCount: toNumber(row.saleCount),
      salesTotal: toNumber(row.salesTotal),
      lastPaidAt: row.lastPaidAt,
      createdAt: row.createdAt,
    }
  }

  async function listCandidates(res, url, session, targetCustomerId) {
    const target = await customerSummary(prisma, targetCustomerId, session.organizationId)
    if (!target || target.deletedAt || target.storeHiddenAt) return json(res, 404, { error: '統合先の顧客カルテが見つかりません。' })
    const query = clean(url.searchParams.get('q'), 100)
    const rows = await prisma.$queryRawUnsafe(`SELECT c."id",c."name",c."gender",c."birthDate",c."birthYear",c."phone",c."createdAt",
        COALESCE(r."realName",c."name") AS "displayName",u."email",u."loginId",u."id" AS "appUserId",COALESCE(u."active",FALSE) AS "appUserActive",
        COALESCE(p."availablePoints",0)::int AS "availablePoints",COALESCE(p."pendingPoints",0)::int AS "pendingPoints",
        COALESCE(a."appointmentCount",0)::int AS "appointmentCount",COALESCE(v."visitCount",0)::int AS "visitCount",
        COALESCE(s."saleCount",0)::int AS "saleCount",COALESCE(s."salesTotal",0)::int AS "salesTotal",s."lastPaidAt"
      FROM "Customer" c
      LEFT JOIN "CustomerRealName" r ON r."customerId"=c."id" AND r."organizationId"=c."organizationId"
      LEFT JOIN LATERAL (SELECT x."id",x."email",x."loginId",x."active" FROM "AppUser" x WHERE x."customerId"=c."id" AND x."role"='CUSTOMER' ORDER BY x."createdAt" DESC LIMIT 1) u ON TRUE
      LEFT JOIN "CustomerPointAccount" p ON p."customerId"=c."id"
      LEFT JOIN LATERAL (SELECT COUNT(*)::int AS "appointmentCount" FROM "Appointment" x WHERE x."customerId"=c."id") a ON TRUE
      LEFT JOIN LATERAL (SELECT COUNT(*)::int AS "visitCount" FROM "Visit" x WHERE x."customerId"=c."id") v ON TRUE
      LEFT JOIN LATERAL (SELECT COUNT(*)::int AS "saleCount",COALESCE(SUM(x."amount"),0)::int AS "salesTotal",MAX(x."paidAt") AS "lastPaidAt" FROM "ServiceSale" x WHERE x."customerId"=c."id") s ON TRUE
      WHERE c."organizationId"=$1 AND c."id"<>$2 AND c."deletedAt" IS NULL AND c."storeHiddenAt" IS NULL
        AND ($3='' OR c."name" ILIKE '%'||$3||'%' OR COALESCE(r."realName",'') ILIKE '%'||$3||'%' OR COALESCE(c."phone",'') ILIKE '%'||$3||'%' OR COALESCE(u."email",'') ILIKE '%'||$3||'%' OR COALESCE(u."loginId",'') ILIKE '%'||$3||'%' OR c."id" ILIKE '%'||$3||'%')
      ORDER BY CASE WHEN $3<>'' AND (c."name" ILIKE $3 OR COALESCE(r."realName",'') ILIKE $3) THEN 0 ELSE 1 END,s."lastPaidAt" DESC NULLS LAST,c."updatedAt" DESC
      LIMIT 30`, session.organizationId, targetCustomerId, query)
    json(res, 200, { target: publicSummary(target), candidates: rows.map(publicSummary), query })
  }

  async function mergeOneToOneProfile(tx, table, sourceId, targetId, columns) {
    const rows = await tx.$queryRawUnsafe(`SELECT "customerId" FROM "${table}" WHERE "customerId"=ANY($1::text[]) FOR UPDATE`, [sourceId, targetId])
    const hasSource = rows.some(row => row.customerId === sourceId)
    const hasTarget = rows.some(row => row.customerId === targetId)
    if (!hasSource) return 0
    if (!hasTarget) {
      await tx.$executeRawUnsafe(`UPDATE "${table}" SET "customerId"=$1 WHERE "customerId"=$2`, targetId, sourceId)
      return 1
    }
    if (columns.length) {
      const assignments = columns.map(column => `"${column}"=COALESCE(t."${column}",s."${column}")`).join(',')
      await tx.$executeRawUnsafe(`UPDATE "${table}" t SET ${assignments} FROM "${table}" s WHERE t."customerId"=$1 AND s."customerId"=$2`, targetId, sourceId)
    }
    await tx.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "customerId"=$1`, sourceId)
    return 1
  }

  async function movePointLedger(tx, sourceId, targetId, counts) {
    const accounts = await tx.$queryRawUnsafe('SELECT * FROM "CustomerPointAccount" WHERE "customerId"=ANY($1::text[]) FOR UPDATE', [sourceId, targetId])
    const source = accounts.find(row => row.customerId === sourceId)
    const target = accounts.find(row => row.customerId === targetId)
    if (!source) return
    if (!target) {
      await tx.$executeRawUnsafe('UPDATE "CustomerPointAccount" SET "customerId"=$1,"updatedAt"=NOW() WHERE "id"=$2', targetId, source.id)
      counts.pointAccounts = 1
    } else {
      const movedTransactions = await tx.$executeRawUnsafe('UPDATE "PointTransaction" SET "customerId"=$1,"accountId"=$2 WHERE "customerId"=$3', targetId, target.id, sourceId)
      counts.PointTransaction = toNumber(movedTransactions)
      await tx.$executeRawUnsafe(`UPDATE "CustomerPointAccount" SET
        "availablePoints"="availablePoints"+$1,"pendingPoints"="pendingPoints"+$2,
        "lifetimeEarned"="lifetimeEarned"+$3,"lifetimeRedeemed"="lifetimeRedeemed"+$4,
        "lifetimeExpired"="lifetimeExpired"+$5,"updatedAt"=NOW() WHERE "id"=$6`,
      toNumber(source.availablePoints), toNumber(source.pendingPoints), toNumber(source.lifetimeEarned), toNumber(source.lifetimeRedeemed), toNumber(source.lifetimeExpired), target.id)
      await tx.$executeRawUnsafe('DELETE FROM "CustomerPointAccount" WHERE "id"=$1', source.id)
      counts.pointAccounts = 1
    }
    const lots = await tx.$executeRawUnsafe('UPDATE "PointLot" SET "customerId"=$1,"updatedAt"=NOW() WHERE "customerId"=$2', targetId, sourceId)
    counts.PointLot = toNumber(lots)
    if (!target) {
      const transactions = await tx.$executeRawUnsafe('UPDATE "PointTransaction" SET "customerId"=$1 WHERE "customerId"=$2', targetId, sourceId)
      counts.PointTransaction = toNumber(transactions)
    }
  }

  async function moveChatThreads(tx, sourceId, targetId, counts) {
    const sourceThreads = await tx.$queryRawUnsafe('SELECT * FROM "ChatThread" WHERE "customerId"=$1 FOR UPDATE', sourceId)
    let movedMessages = 0
    for (const sourceThread of sourceThreads) {
      const targetRows = await tx.$queryRawUnsafe('SELECT * FROM "ChatThread" WHERE "customerId"=$1 AND "staffKey"=$2 FOR UPDATE', targetId, sourceThread.staffKey)
      const targetThread = targetRows[0]
      if (!targetThread) {
        await tx.$executeRawUnsafe('UPDATE "ChatThread" SET "customerId"=$1,"updatedAt"=NOW() WHERE "id"=$2', targetId, sourceThread.id)
        continue
      }
      movedMessages += toNumber(await tx.$executeRawUnsafe('UPDATE "ChatMessage" SET "threadId"=$1 WHERE "threadId"=$2', targetThread.id, sourceThread.id))
      await tx.$executeRawUnsafe(`UPDATE "ChatThread" SET
        "customerLastReadAt"=GREATEST("customerLastReadAt",$1::timestamptz),
        "staffLastReadAt"=GREATEST("staffLastReadAt",$2::timestamptz),
        "updatedAt"=GREATEST("updatedAt",$3::timestamptz) WHERE "id"=$4`,
      sourceThread.customerLastReadAt, sourceThread.staffLastReadAt, sourceThread.updatedAt, targetThread.id)
      await tx.$executeRawUnsafe('DELETE FROM "ChatThread" WHERE "id"=$1', sourceThread.id)
    }
    counts.ChatThread = sourceThreads.length
    counts.ChatMessage = movedMessages
  }

  async function moveUniqueRecipientRows(tx, sourceId, targetId, counts) {
    counts.CustomerBroadcastRecipientDuplicates = toNumber(await tx.$executeRawUnsafe(`DELETE FROM "CustomerBroadcastRecipient" s USING "CustomerBroadcastRecipient" t
      WHERE s."customerId"=$1 AND t."customerId"=$2 AND s."broadcastId"=t."broadcastId"`, sourceId, targetId))
    counts.CustomerBroadcastRecipient = toNumber(await tx.$executeRawUnsafe('UPDATE "CustomerBroadcastRecipient" SET "customerId"=$1 WHERE "customerId"=$2', targetId, sourceId))
    counts.AutomatedCouponGrantDuplicates = toNumber(await tx.$executeRawUnsafe(`DELETE FROM "AutomatedCouponGrant" s USING "AutomatedCouponGrant" t
      WHERE s."customerId"=$1 AND t."customerId"=$2 AND s."ruleId"=t."ruleId" AND s."triggerKey"=t."triggerKey"`, sourceId, targetId))
    counts.AutomatedCouponGrant = toNumber(await tx.$executeRawUnsafe('UPDATE "AutomatedCouponGrant" SET "customerId"=$1 WHERE "customerId"=$2', targetId, sourceId))
  }

  async function mergeAccounts(tx, source, target, counts) {
    const users = await tx.$queryRawUnsafe('SELECT "id","customerId","email","loginId","active" FROM "AppUser" WHERE "customerId"=ANY($1::text[]) AND "role"=\'CUSTOMER\' FOR UPDATE', [source.id, target.id])
    const sourceUser = users.find(row => row.customerId === source.id)
    const targetUser = users.find(row => row.customerId === target.id)
    let transferredUserId = null
    if (sourceUser && !targetUser) {
      await tx.$executeRawUnsafe('UPDATE "AppUser" SET "customerId"=$1,"organizationId"=$2,"updatedAt"=NOW() WHERE "id"=$3', target.id, target.organizationId, sourceUser.id)
      transferredUserId = sourceUser.id
      counts.loginAccount = 'transferred'
    } else if (sourceUser) {
      await tx.$executeRawUnsafe('UPDATE "AppUser" SET "active"=FALSE,"updatedAt"=NOW() WHERE "id"=$1', sourceUser.id)
      counts.loginAccount = 'source-disabled'
    } else {
      counts.loginAccount = targetUser ? 'target-kept' : 'none'
    }

    const links = await tx.$queryRawUnsafe('SELECT "id","customerId","appUserId" FROM "CustomerStoreLink" WHERE "customerId"=ANY($1::text[]) FOR UPDATE', [source.id, target.id])
    const sourceLink = links.find(row => row.customerId === source.id)
    const targetLink = links.find(row => row.customerId === target.id)
    if (sourceLink) {
      if (!targetLink && transferredUserId && sourceLink.appUserId === transferredUserId) {
        await tx.$executeRawUnsafe('UPDATE "CustomerStoreLink" SET "customerId"=$1 WHERE "id"=$2', target.id, sourceLink.id)
      } else {
        await tx.$executeRawUnsafe('DELETE FROM "CustomerStoreLink" WHERE "id"=$1', sourceLink.id)
      }
    }
    await tx.$executeRawUnsafe('UPDATE "CustomerPortalAccess" SET "revokedAt"=COALESCE("revokedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1', source.id)
    await tx.$executeRawUnsafe('UPDATE "CustomerWithdrawalRequest" SET "usedAt"=COALESCE("usedAt",NOW()) WHERE "customerId"=$1', source.id)
  }

  async function mergeCustomers(req, res, session, targetCustomerId) {
    if (!sameOrigin(req)) return json(res, 403, { error: '安全のため操作を完了できませんでした。画面を更新して再度お試しください。' })
    const body = await readJson(req)
    const sourceCustomerId = clean(body.sourceCustomerId)
    const confirmationName = clean(body.confirmationName, 120)
    if (!sourceCustomerId || sourceCustomerId === targetCustomerId) return json(res, 400, { error: '統合する顧客を選択してください。' })
    if (body.confirmed !== true) return json(res, 400, { error: '統合内容の確認が必要です。' })

    const result = await prisma.$transaction(async tx => {
      const locked = await tx.$queryRawUnsafe('SELECT * FROM "Customer" WHERE "id"=ANY($1::text[]) AND "organizationId"=$2 FOR UPDATE', [sourceCustomerId, targetCustomerId], session.organizationId)
      const source = locked.find(row => row.id === sourceCustomerId)
      const target = locked.find(row => row.id === targetCustomerId)
      if (!source || !target || source.deletedAt || target.deletedAt || source.storeHiddenAt || target.storeHiddenAt) throw Object.assign(new Error('対象の顧客カルテを確認できません。'), { statusCode: 404 })
      if (confirmationName !== clean(source.name, 120)) throw Object.assign(new Error('確認用の顧客名が一致しません。'), { statusCode: 400 })
      const previous = await tx.$queryRawUnsafe('SELECT "targetCustomerId" FROM "CustomerMergeHistory" WHERE "sourceCustomerId"=$1 LIMIT 1', source.id)
      if (previous[0]) throw Object.assign(new Error('この顧客カルテはすでに統合されています。'), { statusCode: 409 })

      const sourceSnapshot = await customerSummary(tx, source.id, session.organizationId)
      const targetSnapshot = await customerSummary(tx, target.id, session.organizationId)
      const counts = {}

      await tx.$executeRawUnsafe(`UPDATE "Customer" t SET
        "gender"=COALESCE(t."gender",s."gender"),"birthYear"=COALESCE(t."birthYear",s."birthYear"),"birthDate"=COALESCE(t."birthDate",s."birthDate"),
        "phone"=COALESCE(NULLIF(t."phone",''),s."phone"),"profileImageUrl"=COALESCE(t."profileImageUrl",s."profileImageUrl"),
        "aiFrontImageUrl"=COALESCE(t."aiFrontImageUrl",s."aiFrontImageUrl"),"aiSideImageUrl"=COALESCE(t."aiSideImageUrl",s."aiSideImageUrl"),"aiBackImageUrl"=COALESCE(t."aiBackImageUrl",s."aiBackImageUrl"),
        "aiFrontImageUrlsJson"=COALESCE(t."aiFrontImageUrlsJson",s."aiFrontImageUrlsJson"),"aiSideImageUrlsJson"=COALESCE(t."aiSideImageUrlsJson",s."aiSideImageUrlsJson"),"aiBackImageUrlsJson"=COALESCE(t."aiBackImageUrlsJson",s."aiBackImageUrlsJson"),
        "aiPhotoConsent"=(t."aiPhotoConsent" OR s."aiPhotoConsent"),"servicePreference"=COALESCE(t."servicePreference",s."servicePreference"),
        "staffAssignmentType"=COALESCE(t."staffAssignmentType",s."staffAssignmentType"),"assignedStaffName"=COALESCE(t."assignedStaffName",s."assignedStaffName"),"updatedAt"=NOW()
        FROM "Customer" s WHERE t."id"=$1 AND s."id"=$2`, target.id, source.id)

      await mergeAccounts(tx, source, target, counts)
      counts.HairProfile = await mergeOneToOneProfile(tx, 'HairProfile', source.id, target.id, ['hairThickness','hairVolume','hairTexture','scalpCondition','faceShape','forehead','lifestyle','stylingTimeMinutes','hairCurl'])
      counts.Preference = await mergeOneToOneProfile(tx, 'Preference', source.id, target.id, ['preferredLength','preferredStyle','dislikes','colorPreference','maintenanceLevel','referenceNotes'])

      const phoneRows = await tx.$queryRawUnsafe('SELECT "customerId" FROM "CustomerPhoneIdentity" WHERE "customerId"=ANY($1::text[]) FOR UPDATE', [source.id, target.id])
      if (phoneRows.some(row => row.customerId === source.id)) {
        if (phoneRows.some(row => row.customerId === target.id)) await tx.$executeRawUnsafe('DELETE FROM "CustomerPhoneIdentity" WHERE "customerId"=$1', source.id)
        else await tx.$executeRawUnsafe('UPDATE "CustomerPhoneIdentity" SET "customerId"=$1,"updatedAt"=NOW() WHERE "customerId"=$2', target.id, source.id)
        counts.CustomerPhoneIdentity = 1
      }
      await tx.$executeRawUnsafe('DELETE FROM "CustomerRegistrationInvite" WHERE "customerId"=$1', source.id)

      const realNames = await tx.$queryRawUnsafe('SELECT "customerId" FROM "CustomerRealName" WHERE "customerId"=ANY($1::text[]) FOR UPDATE', [source.id, target.id])
      if (realNames.some(row => row.customerId === source.id)) {
        if (realNames.some(row => row.customerId === target.id)) await tx.$executeRawUnsafe('DELETE FROM "CustomerRealName" WHERE "customerId"=$1', source.id)
        else await tx.$executeRawUnsafe('UPDATE "CustomerRealName" SET "customerId"=$1,"updatedAt"=NOW() WHERE "customerId"=$2', target.id, source.id)
        counts.CustomerRealName = 1
      }

      await movePointLedger(tx, source.id, target.id, counts)
      await moveChatThreads(tx, source.id, target.id, counts)
      await moveUniqueRecipientRows(tx, source.id, target.id, counts)

      const simpleTables = ['Visit','VisitPhoto','StyleSuggestion','CourseRecommendation','ContactLog','Appointment','ServiceSale','CustomerOffer','ProductSuggestion','ProductProposal','Consent','PendingPointReward','PartnerCoupon','Coupon','CouponIssue','ProposalResponse','SmsSendLog','VisitCommunityPost']
      for (const table of simpleTables) counts[table] = toNumber(await tx.$executeRawUnsafe(`UPDATE "${table}" SET "customerId"=$1 WHERE "customerId"=$2`, target.id, source.id))

      counts.referralsReceived = toNumber(await tx.$executeRawUnsafe('UPDATE "Referral" SET "referredCustomerId"=$1 WHERE "referredCustomerId"=$2', target.id, source.id))
      counts.referralsMade = toNumber(await tx.$executeRawUnsafe('UPDATE "Referral" SET "referrerCustomerId"=$1 WHERE "referrerCustomerId"=$2', target.id, source.id))
      await tx.$executeRawUnsafe('UPDATE "Referral" SET "referredCustomerId"=NULL WHERE "referredCustomerId"="referrerCustomerId"')
      await tx.$executeRawUnsafe('UPDATE "Customer" SET "referredByCustomerId"=$1 WHERE "referredByCustomerId"=$2', target.id, source.id)
      await tx.$executeRawUnsafe('UPDATE "Customer" SET "referredByCustomerId"=NULL WHERE "id"=$1 AND "referredByCustomerId"=$1', target.id)

      await tx.$executeRawUnsafe('UPDATE "Customer" SET "storeHiddenAt"=COALESCE("storeHiddenAt",NOW()),"smsTransactionalOptIn"=FALSE,"smsTransactionalOptOutAt"=COALESCE("smsTransactionalOptOutAt",NOW()),"updatedAt"=NOW() WHERE "id"=$1', source.id)
      const actorName = clean(session.displayName || session.subject || '店舗スタッフ', 160)
      await tx.$executeRawUnsafe(`INSERT INTO "CustomerMergeHistory" ("id","organizationId","sourceCustomerId","targetCustomerId","actorUserId","actorDisplayName","actorRole","sourceSnapshotJson","targetSnapshotJson","resultJson","createdAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,NOW())`,
      `cmh_${crypto.randomUUID()}`, session.organizationId, source.id, target.id, session.userId || null, actorName, session.role,
      JSON.stringify(publicSummary(sourceSnapshot)), JSON.stringify(publicSummary(targetSnapshot)), JSON.stringify(counts))
      return { target: publicSummary(await customerSummary(tx, target.id, session.organizationId)), source: publicSummary(sourceSnapshot), counts }
    }, { timeout: 30000 })

    console.info('[customer-merge] merged', { organizationId: session.organizationId, sourceCustomerId, targetCustomerId, actorUserId: session.userId || null })
    json(res, 200, { ok: true, ...result })
  }

  async function handle(req, res, url) {
    if (url.pathname === '/customer-merge-v385.js' && req.method === 'GET') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.end(fs.readFileSync(path.join(__dirname, 'customer-merge-client-v385.js')))
      return true
    }
    const match = url.pathname.match(/^\/api\/admin\/customers\/([^/]+)\/(merge-candidates|merge)$/)
    if (!match) return false
    const session = await requireStaff(req, res)
    if (!session) return true
    try {
      await ensureSchema()
      const targetCustomerId = decodeURIComponent(match[1]).slice(0, 160)
      if (match[2] === 'merge-candidates' && req.method === 'GET') { await listCandidates(res, url, session, targetCustomerId); return true }
      if (match[2] === 'merge' && req.method === 'POST') { await mergeCustomers(req, res, session, targetCustomerId); return true }
      res.statusCode = 405
      res.setHeader('Allow', match[2] === 'merge' ? 'POST' : 'GET')
      res.end()
      return true
    } catch (error) {
      const status = Number(error && error.statusCode) || 500
      console.error('[customer-merge] request failed', { status, code: clean(error && error.code || 'unknown', 80), message: status < 500 ? clean(error && error.message, 200) : undefined })
      json(res, status, { error: status < 500 ? error.message : '顧客カルテの統合処理を完了できませんでした。データは変更されていません。' })
      return true
    }
  }

  return { ensureSchema, handle }
}

module.exports = { createCustomerMergeService }
