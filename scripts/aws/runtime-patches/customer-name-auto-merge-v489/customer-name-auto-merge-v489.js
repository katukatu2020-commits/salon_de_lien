'use strict'

const DASHES = /[-\u00ad\u058a\u2010-\u2015\u2212\u2e3a\u2e3b\u301c\u30a0\ufe58\ufe63\uff0d]/gu

function normalizeCustomerName(value) {
  return String(value == null ? '' : value)
    .normalize('NFKC')
    .toLocaleLowerCase('ja-JP')
    .replace(/\s/gu, '')
    .replace(DASHES, '')
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.startsWith('81') && digits.length >= 11 ? `0${digits.slice(2)}` : digits
}

function toNumber(value) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number : 0
}

function oldestFirst(left, right) {
  const activity = toNumber(right.activityCount) - toNumber(left.activityCount)
  if (activity) return activity
  const created = new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime()
  return created || String(left.id).localeCompare(String(right.id))
}

function chooseCanonicalCustomer(candidates, options = {}) {
  const rows = Array.from(candidates || [])
  if (!rows.length) return null
  const preferred = rows.find(row => row.id === options.preferredCustomerId)
  if (preferred) return preferred

  const appCustomers = rows.filter(row => Boolean(row.hasAppAccess))
  if (appCustomers.length) {
    const mappedAppCustomer = appCustomers.find(row => row.id === options.mappedCustomerId)
    return mappedAppCustomer || appCustomers.sort(oldestFirst)[0]
  }

  const mapped = rows.find(row => row.id === options.mappedCustomerId)
  return mapped || rows.sort(oldestFirst)[0]
}

function mergeMemo(targetMemo, sourceMemo) {
  const target = String(targetMemo || '').trim()
  const source = String(sourceMemo || '').trim()
  if (!source || source === target || target.includes(source)) return target || source || null
  if (!target) return source
  return `${target}\n\n[自動統合元のメモ]\n${source}`.slice(0, 20000)
}

function serviceError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode })
}

function createCustomerNameAutoMergeService({ prisma, crypto }) {
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
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CustomerNormalizedNameIdentity" (
        "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
        "normalizedName" TEXT NOT NULL,
        "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("organizationId","normalizedName")
      )`)
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerNormalizedNameIdentity_customer_idx" ON "CustomerNormalizedNameIdentity"("customerId")')
    })().catch(error => { schemaPromise = null; throw error })
    return schemaPromise
  }

  async function mergeOneToOne(tx, table, sourceId, targetId, columns) {
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

  async function mergePoints(tx, sourceId, targetId, counts) {
    const accounts = await tx.$queryRawUnsafe('SELECT * FROM "CustomerPointAccount" WHERE "customerId"=ANY($1::text[]) FOR UPDATE', [sourceId, targetId])
    const source = accounts.find(row => row.customerId === sourceId)
    const target = accounts.find(row => row.customerId === targetId)
    if (source && !target) {
      await tx.$executeRawUnsafe('UPDATE "CustomerPointAccount" SET "customerId"=$1,"updatedAt"=NOW() WHERE "id"=$2', targetId, source.id)
      counts.CustomerPointAccount = 1
    } else if (source && target) {
      counts.PointTransaction = toNumber(await tx.$executeRawUnsafe('UPDATE "PointTransaction" SET "customerId"=$1,"accountId"=$2 WHERE "customerId"=$3', targetId, target.id, sourceId))
      await tx.$executeRawUnsafe(`UPDATE "CustomerPointAccount" SET
        "availablePoints"="availablePoints"+$1,"pendingPoints"="pendingPoints"+$2,
        "lifetimeEarned"="lifetimeEarned"+$3,"lifetimeRedeemed"="lifetimeRedeemed"+$4,
        "lifetimeExpired"="lifetimeExpired"+$5,"updatedAt"=NOW() WHERE "id"=$6`,
      toNumber(source.availablePoints), toNumber(source.pendingPoints), toNumber(source.lifetimeEarned), toNumber(source.lifetimeRedeemed), toNumber(source.lifetimeExpired), target.id)
      await tx.$executeRawUnsafe('DELETE FROM "CustomerPointAccount" WHERE "id"=$1', source.id)
      counts.CustomerPointAccount = 1
    }
    counts.PointLot = toNumber(await tx.$executeRawUnsafe('UPDATE "PointLot" SET "customerId"=$1,"updatedAt"=NOW() WHERE "customerId"=$2', targetId, sourceId))
    if (!source || !target) counts.PointTransaction = toNumber(await tx.$executeRawUnsafe('UPDATE "PointTransaction" SET "customerId"=$1 WHERE "customerId"=$2', targetId, sourceId))
  }

  async function mergeChat(tx, sourceId, targetId, counts) {
    const sourceThreads = await tx.$queryRawUnsafe('SELECT * FROM "ChatThread" WHERE "customerId"=$1 FOR UPDATE', sourceId)
    let movedMessages = 0
    for (const sourceThread of sourceThreads) {
      const targetThread = (await tx.$queryRawUnsafe('SELECT * FROM "ChatThread" WHERE "customerId"=$1 AND "staffKey"=$2 FOR UPDATE', targetId, sourceThread.staffKey))[0]
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

  async function mergeAccounts(tx, source, target, counts) {
    const users = await tx.$queryRawUnsafe('SELECT "id","customerId","email","loginId","active" FROM "AppUser" WHERE "customerId"=ANY($1::text[]) AND "role"=\'CUSTOMER\' FOR UPDATE', [source.id, target.id])
    const sourceUser = users.find(row => row.customerId === source.id)
    const targetUser = users.find(row => row.customerId === target.id)
    if (sourceUser && !targetUser) {
      await tx.$executeRawUnsafe('UPDATE "AppUser" SET "customerId"=$1,"organizationId"=$2,"updatedAt"=NOW() WHERE "id"=$3', target.id, target.organizationId, sourceUser.id)
      counts.loginAccount = 'transferred'
    } else if (sourceUser) {
      await tx.$executeRawUnsafe('UPDATE "AppUser" SET "active"=FALSE,"updatedAt"=NOW() WHERE "id"=$1', sourceUser.id)
      counts.loginAccount = 'duplicate-disabled'
    } else {
      counts.loginAccount = targetUser ? 'target-kept' : 'none'
    }

    const links = await tx.$queryRawUnsafe('SELECT "id","customerId","appUserId" FROM "CustomerStoreLink" WHERE "customerId"=ANY($1::text[]) FOR UPDATE', [source.id, target.id])
    const sourceLink = links.find(row => row.customerId === source.id)
    const targetLink = links.find(row => row.customerId === target.id)
    if (sourceLink && !targetLink) {
      await tx.$executeRawUnsafe('UPDATE "CustomerStoreLink" SET "customerId"=$1 WHERE "id"=$2', target.id, sourceLink.id)
      counts.CustomerStoreLink = 'transferred'
    } else if (sourceLink) {
      await tx.$executeRawUnsafe('DELETE FROM "CustomerStoreLink" WHERE "id"=$1', sourceLink.id)
      counts.CustomerStoreLink = 'duplicate-removed'
    }
    await tx.$executeRawUnsafe('UPDATE "CustomerPortalAccess" SET "revokedAt"=COALESCE("revokedAt",NOW()),"updatedAt"=NOW() WHERE "customerId"=$1', source.id)
    await tx.$executeRawUnsafe('UPDATE "CustomerWithdrawalRequest" SET "usedAt"=COALESCE("usedAt",NOW()) WHERE "customerId"=$1', source.id)
  }

  async function mergeUniqueRecipients(tx, sourceId, targetId, counts) {
    counts.CustomerBroadcastRecipientDuplicates = toNumber(await tx.$executeRawUnsafe(`DELETE FROM "CustomerBroadcastRecipient" s USING "CustomerBroadcastRecipient" t
      WHERE s."customerId"=$1 AND t."customerId"=$2 AND s."broadcastId"=t."broadcastId"`, sourceId, targetId))
    counts.CustomerBroadcastRecipient = toNumber(await tx.$executeRawUnsafe('UPDATE "CustomerBroadcastRecipient" SET "customerId"=$1 WHERE "customerId"=$2', targetId, sourceId))
    counts.CustomerCampaignRecipientDuplicates = toNumber(await tx.$executeRawUnsafe(`DELETE FROM "CustomerCampaignRecipient" s USING "CustomerCampaignRecipient" t
      WHERE s."customerId"=$1 AND t."customerId"=$2 AND s."campaignId"=t."campaignId"`, sourceId, targetId))
    counts.CustomerCampaignRecipient = toNumber(await tx.$executeRawUnsafe('UPDATE "CustomerCampaignRecipient" SET "customerId"=$1 WHERE "customerId"=$2', targetId, sourceId))
    counts.AutomatedCouponGrantDuplicates = toNumber(await tx.$executeRawUnsafe(`DELETE FROM "AutomatedCouponGrant" s USING "AutomatedCouponGrant" t
      WHERE s."customerId"=$1 AND t."customerId"=$2 AND s."ruleId"=t."ruleId" AND s."triggerKey"=t."triggerKey"`, sourceId, targetId))
    counts.AutomatedCouponGrant = toNumber(await tx.$executeRawUnsafe('UPDATE "AutomatedCouponGrant" SET "customerId"=$1 WHERE "customerId"=$2', targetId, sourceId))
  }

  async function mergeCustomerRecords(tx, { organizationId, sourceCustomerId, targetCustomerId, actorLabel = '予約時自動統合' }) {
    if (!sourceCustomerId || sourceCustomerId === targetCustomerId) return { merged: false, counts: {} }
    const locked = await tx.$queryRawUnsafe('SELECT * FROM "Customer" WHERE "id"=ANY($1::text[]) AND "organizationId"=$2 FOR UPDATE', [sourceCustomerId, targetCustomerId], organizationId)
    const source = locked.find(row => row.id === sourceCustomerId)
    const target = locked.find(row => row.id === targetCustomerId)
    if (!source || !target || source.deletedAt || target.deletedAt || source.storeHiddenAt || target.storeHiddenAt) throw serviceError('統合対象の顧客カルテを確認できません。', 409)
    const previous = await tx.$queryRawUnsafe('SELECT "targetCustomerId" FROM "CustomerMergeHistory" WHERE "sourceCustomerId"=$1 LIMIT 1', source.id)
    if (previous[0]) return { merged: false, targetCustomerId: previous[0].targetCustomerId, counts: {} }

    const counts = {}
    const targetSnapshot = { id: target.id, name: target.name, phone: target.phone, createdAt: target.createdAt }
    const sourceSnapshot = { id: source.id, name: source.name, phone: source.phone, createdAt: source.createdAt }
    const memo = mergeMemo(target.memo, source.memo)
    await tx.$executeRawUnsafe(`UPDATE "Customer" t SET
      "gender"=COALESCE(t."gender",s."gender"),"birthYear"=COALESCE(t."birthYear",s."birthYear"),"birthDate"=COALESCE(t."birthDate",s."birthDate"),
      "phone"=COALESCE(NULLIF(t."phone",''),s."phone"),"memo"=$3,"profileImageUrl"=COALESCE(t."profileImageUrl",s."profileImageUrl"),
      "aiFrontImageUrl"=COALESCE(t."aiFrontImageUrl",s."aiFrontImageUrl"),"aiSideImageUrl"=COALESCE(t."aiSideImageUrl",s."aiSideImageUrl"),"aiBackImageUrl"=COALESCE(t."aiBackImageUrl",s."aiBackImageUrl"),
      "aiFrontImageUrlsJson"=COALESCE(t."aiFrontImageUrlsJson",s."aiFrontImageUrlsJson"),"aiSideImageUrlsJson"=COALESCE(t."aiSideImageUrlsJson",s."aiSideImageUrlsJson"),"aiBackImageUrlsJson"=COALESCE(t."aiBackImageUrlsJson",s."aiBackImageUrlsJson"),
      "aiPhotoConsent"=(t."aiPhotoConsent" OR s."aiPhotoConsent"),"servicePreference"=COALESCE(t."servicePreference",s."servicePreference"),
      "staffAssignmentType"=COALESCE(t."staffAssignmentType",s."staffAssignmentType"),"assignedStaffName"=COALESCE(t."assignedStaffName",s."assignedStaffName"),
      "phoneVerifiedAt"=COALESCE(t."phoneVerifiedAt",s."phoneVerifiedAt"),"smsTransactionalOptIn"=(t."smsTransactionalOptIn" OR s."smsTransactionalOptIn"),
      "smsTransactionalOptInAt"=COALESCE(t."smsTransactionalOptInAt",s."smsTransactionalOptInAt"),"smsConsentSource"=COALESCE(t."smsConsentSource",s."smsConsentSource"),"updatedAt"=NOW()
      FROM "Customer" s WHERE t."id"=$1 AND s."id"=$2`, target.id, source.id, memo)

    await mergeAccounts(tx, source, target, counts)
    counts.HairProfile = await mergeOneToOne(tx, 'HairProfile', source.id, target.id, ['hairThickness', 'hairVolume', 'hairTexture', 'scalpCondition', 'faceShape', 'forehead', 'lifestyle', 'stylingTimeMinutes', 'hairCurl'])
    counts.Preference = await mergeOneToOne(tx, 'Preference', source.id, target.id, ['preferredLength', 'preferredStyle', 'dislikes', 'colorPreference', 'maintenanceLevel', 'referenceNotes'])

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

    await mergePoints(tx, source.id, target.id, counts)
    await mergeChat(tx, source.id, target.id, counts)
    await mergeUniqueRecipients(tx, source.id, target.id, counts)
    counts.CustomerLineIdentity = toNumber(await tx.$executeRawUnsafe('UPDATE "CustomerLineIdentity" SET "customerId"=$1,"updatedAt"=NOW() WHERE "customerId"=$2', target.id, source.id))

    const simpleTables = ['Visit', 'VisitPhoto', 'StyleSuggestion', 'CourseRecommendation', 'ContactLog', 'Appointment', 'ServiceSale', 'CustomerOffer', 'ProductSuggestion', 'ProductProposal', 'Consent', 'PendingPointReward', 'PartnerCoupon', 'Coupon', 'CouponIssue', 'ProposalResponse', 'SmsSendLog', 'VisitCommunityPost']
    for (const table of simpleTables) counts[table] = toNumber(await tx.$executeRawUnsafe(`UPDATE "${table}" SET "customerId"=$1 WHERE "customerId"=$2`, target.id, source.id))

    counts.referralsReceived = toNumber(await tx.$executeRawUnsafe('UPDATE "Referral" SET "referredCustomerId"=$1 WHERE "referredCustomerId"=$2', target.id, source.id))
    counts.referralsMade = toNumber(await tx.$executeRawUnsafe('UPDATE "Referral" SET "referrerCustomerId"=$1 WHERE "referrerCustomerId"=$2', target.id, source.id))
    await tx.$executeRawUnsafe('UPDATE "Referral" SET "referredCustomerId"=NULL WHERE "referredCustomerId"="referrerCustomerId"')
    await tx.$executeRawUnsafe('UPDATE "Customer" SET "referredByCustomerId"=$1 WHERE "referredByCustomerId"=$2', target.id, source.id)
    await tx.$executeRawUnsafe('UPDATE "Customer" SET "referredByCustomerId"=NULL WHERE "id"=$1 AND "referredByCustomerId"=$1', target.id)
    await tx.$executeRawUnsafe('UPDATE "CustomerNormalizedNameIdentity" SET "customerId"=$1,"updatedAt"=NOW() WHERE "customerId"=$2', target.id, source.id)
    await tx.$executeRawUnsafe('UPDATE "Customer" SET "storeHiddenAt"=COALESCE("storeHiddenAt",NOW()),"smsTransactionalOptIn"=FALSE,"smsTransactionalOptOutAt"=COALESCE("smsTransactionalOptOutAt",NOW()),"updatedAt"=NOW() WHERE "id"=$1', source.id)
    await tx.$executeRawUnsafe(`INSERT INTO "CustomerMergeHistory" ("id","organizationId","sourceCustomerId","targetCustomerId","actorUserId","actorDisplayName","actorRole","sourceSnapshotJson","targetSnapshotJson","resultJson","createdAt")
      VALUES ($1,$2,$3,$4,NULL,$5,'SYSTEM',$6::jsonb,$7::jsonb,$8::jsonb,NOW()) ON CONFLICT ("sourceCustomerId") DO NOTHING`,
    `cmh_${crypto.randomUUID()}`, organizationId, source.id, target.id, actorLabel, JSON.stringify(sourceSnapshot), JSON.stringify(targetSnapshot), JSON.stringify(counts))
    console.info('[customer-name-auto-merge] merged', { organizationId, sourceCustomerId: source.id, targetCustomerId: target.id })
    return { merged: true, targetCustomerId: target.id, counts }
  }

  async function ensureStoreLink(tx, appUserId, organizationId, customerId) {
    if (!appUserId) return
    const byUser = (await tx.$queryRawUnsafe('SELECT "id","customerId" FROM "CustomerStoreLink" WHERE "appUserId"=$1 AND "organizationId"=$2 FOR UPDATE', appUserId, organizationId))[0]
    if (byUser) {
      if (byUser.customerId !== customerId) throw serviceError('このお客様アカウントは別の顧客カルテに連携されています。', 409)
      return
    }
    const directUser = (await tx.$queryRawUnsafe('SELECT "id","active" FROM "AppUser" WHERE "customerId"=$1 AND "role"=\'CUSTOMER\' FOR UPDATE', customerId))[0]
    if (directUser && directUser.id !== appUserId && directUser.active) throw serviceError('同じお名前の顧客カルテが別のお客様アカウントに連携済みです。店舗で本人確認してください。', 409)
    const byCustomer = (await tx.$queryRawUnsafe('SELECT l."id",l."appUserId",u."active" FROM "CustomerStoreLink" l JOIN "AppUser" u ON u."id"=l."appUserId" WHERE l."customerId"=$1 FOR UPDATE', customerId))[0]
    if (byCustomer && byCustomer.appUserId !== appUserId) {
      if (byCustomer.active) throw serviceError('同じお名前の顧客カルテが別のお客様アカウントに連携済みです。店舗で本人確認してください。', 409)
      await tx.$executeRawUnsafe('UPDATE "CustomerStoreLink" SET "appUserId"=$1 WHERE "id"=$2', appUserId, byCustomer.id)
      return
    }
    if (!byCustomer) await tx.$executeRawUnsafe('INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId") VALUES ($1,$2,$3,$4)', crypto.randomUUID(), appUserId, organizationId, customerId)
  }

  async function resolveOrCreate(tx, options) {
    await ensureSchema()
    const organizationId = String(options.organizationId || '')
    const name = String(options.name || '').trim()
    const normalizedName = normalizeCustomerName(name)
    if (!organizationId || !normalizedName) throw serviceError('お客様名を確認してください。')

    await tx.$queryRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))::text AS "locked"', `${organizationId}:${normalizedName}`)
    const nameRows = await tx.$queryRawUnsafe(`SELECT c."id",c."name",c."phone",c."createdAt",COALESCE(r."realName",'') AS "realName"
      FROM "Customer" c LEFT JOIN "CustomerRealName" r ON r."customerId"=c."id" AND r."organizationId"=c."organizationId"
      WHERE c."organizationId"=$1 AND c."deletedAt" IS NULL AND c."storeHiddenAt" IS NULL`, organizationId)
    let effectiveExistingCustomerId = options.existingCustomerId || null
    let current = effectiveExistingCustomerId ? nameRows.find(row => row.id === effectiveExistingCustomerId) : null
    if (effectiveExistingCustomerId && !current) {
      const merged = (await tx.$queryRawUnsafe(`WITH RECURSIVE "MergedCustomer"("customerId","depth") AS (
          SELECT $1::text,0
          UNION ALL
          SELECT h."targetCustomerId",m."depth"+1 FROM "MergedCustomer" m
          JOIN "CustomerMergeHistory" h ON h."sourceCustomerId"=m."customerId" AND h."organizationId"=$2
          WHERE m."depth"<16
        ) SELECT m."customerId" AS "targetCustomerId" FROM "MergedCustomer" m
        JOIN "Customer" c ON c."id"=m."customerId" AND c."organizationId"=$2 AND c."deletedAt" IS NULL AND c."storeHiddenAt" IS NULL
        ORDER BY m."depth" DESC LIMIT 1`, effectiveExistingCustomerId, organizationId))[0]
      if (merged) {
        effectiveExistingCustomerId = merged.targetCustomerId
        current = nameRows.find(row => row.id === effectiveExistingCustomerId) || null
      }
    }
    if (options.existingCustomerId && !current) throw serviceError('お客様情報が見つかりません。', 404)

    const matchingIds = new Set(nameRows.filter(row => normalizeCustomerName(row.name) === normalizedName || normalizeCustomerName(row.realName) === normalizedName).map(row => row.id))
    if (current) matchingIds.add(current.id)

    if (!matchingIds.size) {
      if (options.rejectDifferentNamePhone && normalizePhone(options.phone)) {
        const duplicatePhone = nameRows.find(row => normalizePhone(row.phone) === normalizePhone(options.phone))
        if (duplicatePhone) throw serviceError(`同じ電話番号の「${duplicatePhone.name}」様が登録済みです。既存顧客から選択してください。`, 409)
      }
      const created = await tx.customer.create({
        data: { ...(options.createData || {}), organizationId, name, phone: options.phone || null },
        select: { id: true, name: true, phone: true },
      })
      await tx.$executeRawUnsafe(`INSERT INTO "CustomerNormalizedNameIdentity" ("organizationId","normalizedName","customerId","createdAt","updatedAt")
        VALUES ($1,$2,$3,NOW(),NOW()) ON CONFLICT ("organizationId","normalizedName") DO UPDATE SET "customerId"=EXCLUDED."customerId","updatedAt"=NOW()`, organizationId, normalizedName, created.id)
      await ensureStoreLink(tx, options.appUserIdForStoreLink, organizationId, created.id)
      return created
    }

    const ids = Array.from(matchingIds)
    await tx.$queryRawUnsafe('SELECT "id" FROM "Customer" WHERE "id"=ANY($1::text[]) AND "organizationId"=$2 FOR UPDATE', ids, organizationId)
    const candidates = await tx.$queryRawUnsafe(`SELECT c."id",c."name",c."phone",c."createdAt",
        (EXISTS(SELECT 1 FROM "AppUser" u WHERE u."customerId"=c."id" AND u."role"='CUSTOMER' AND u."active"=TRUE)
         OR EXISTS(SELECT 1 FROM "CustomerStoreLink" l JOIN "AppUser" u ON u."id"=l."appUserId" WHERE l."customerId"=c."id" AND u."active"=TRUE)) AS "hasAppAccess",
        ((SELECT COUNT(*) FROM "Appointment" a WHERE a."customerId"=c."id") +
         (SELECT COUNT(*) FROM "Visit" v WHERE v."customerId"=c."id") +
         (SELECT COUNT(*) FROM "ServiceSale" s WHERE s."customerId"=c."id"))::int AS "activityCount"
      FROM "Customer" c WHERE c."id"=ANY($1::text[]) AND c."organizationId"=$2 AND c."deletedAt" IS NULL AND c."storeHiddenAt" IS NULL`, ids, organizationId)
    const mapped = (await tx.$queryRawUnsafe('SELECT "customerId" FROM "CustomerNormalizedNameIdentity" WHERE "organizationId"=$1 AND "normalizedName"=$2 LIMIT 1', organizationId, normalizedName))[0]
    const preferredCustomerId = options.preferredCustomerId === options.existingCustomerId ? effectiveExistingCustomerId : options.preferredCustomerId
    const canonical = chooseCanonicalCustomer(candidates, { preferredCustomerId, mappedCustomerId: mapped?.customerId })
    if (!canonical) throw serviceError('お客様情報が見つかりません。', 404)

    for (const duplicate of candidates.filter(row => row.id !== canonical.id).sort(oldestFirst)) {
      await mergeCustomerRecords(tx, { organizationId, sourceCustomerId: duplicate.id, targetCustomerId: canonical.id, actorLabel: options.actorLabel })
    }

    const update = {}
    if (options.overwriteName) update.name = name
    if (options.phone && (options.overwritePhone || !canonical.phone)) update.phone = options.phone
    const customer = Object.keys(update).length
      ? await tx.customer.update({ where: { id: canonical.id }, data: update, select: { id: true, name: true, phone: true } })
      : await tx.customer.findUniqueOrThrow({ where: { id: canonical.id }, select: { id: true, name: true, phone: true } })

    const aliases = new Set([normalizedName])
    for (const row of nameRows.filter(row => matchingIds.has(row.id))) {
      const customerName = normalizeCustomerName(row.name)
      const realName = normalizeCustomerName(row.realName)
      if (customerName) aliases.add(customerName)
      if (realName) aliases.add(realName)
    }
    for (const alias of aliases) {
      await tx.$executeRawUnsafe(`INSERT INTO "CustomerNormalizedNameIdentity" ("organizationId","normalizedName","customerId","createdAt","updatedAt")
        VALUES ($1,$2,$3,NOW(),NOW()) ON CONFLICT ("organizationId","normalizedName") DO UPDATE SET "customerId"=EXCLUDED."customerId","updatedAt"=NOW()`, organizationId, alias, customer.id)
    }
    await ensureStoreLink(tx, options.appUserIdForStoreLink, organizationId, customer.id)
    return customer
  }

  return { ensureSchema, resolveOrCreate, mergeCustomerRecords }
}

module.exports = { createCustomerNameAutoMergeService, normalizeCustomerName, normalizePhone, chooseCanonicalCustomer }
