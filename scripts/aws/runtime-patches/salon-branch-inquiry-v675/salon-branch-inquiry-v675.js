'use strict'

const schemas = new WeakMap()
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode })

async function ensureSchema(prisma) {
  if (!schemas.has(prisma)) schemas.set(prisma, prisma.$transaction(async tx => {
    await tx.$queryRawUnsafe("SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext('salon_branch_inquiry_schema_v675'))) guard")
    await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "SalonBranchInquiry" (
      "inquiryId" TEXT PRIMARY KEY,
      "groupId" TEXT NOT NULL,
      "requesterId" TEXT NOT NULL,
      "sourceOrganizationId" TEXT NOT NULL,
      "requestKey" TEXT NOT NULL,
      "payloadHash" TEXT NOT NULL,
      "prefecture" TEXT NOT NULL,
      "city" TEXT NOT NULL,
      "address" TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE ("requesterId", "requestKey")
    )`)
  }).catch(error => { schemas.delete(prisma); throw error }))
  return schemas.get(prisma)
}

async function submitInquiry({ prisma, crypto, session, input, clean, prefectures, ensureGroup }) {
  const name = clean(input.name, 100), ownerName = clean(input.ownerName, 80)
  const email = clean(input.email, 254).toLowerCase(), phone = clean(input.phone, 24)
  const prefecture = clean(input.prefecture, 10), city = clean(input.city, 80), address = clean(input.address, 200)
  const requestKey = clean(input.requestKey, 80)
  const message = String(input.message || '').trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[0-9+() -]+$/.test(phone) || phone.replace(/\D/g, '').length < 10 || !prefectures.includes(prefecture) || input.confirmed !== true || !/^[a-zA-Z0-9-]{16,80}$/.test(requestKey) || message.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(message)) throw fail('所在地・連絡先・申請内容を確認してください。')
  const payloadHash = crypto.createHash('sha256').update(JSON.stringify({ name, ownerName, email, phone, prefecture, city, address, message })).digest('hex')
  return prisma.$transaction(async tx => {
    // Group ownership and duplicate requests share the existing membership lock.
    const viewer = await ensureGroup(tx, session)
    const previous = (await tx.$queryRawUnsafe('SELECT "inquiryId","payloadHash" FROM "SalonBranchInquiry" WHERE "requesterId"=$1 AND "requestKey"=$2', viewer.id, requestKey))[0]
    if (previous) {
      if (previous.payloadHash !== payloadHash) throw fail('送信済みの申請内容は変更できません。新しい申請は画面を再読み込みしてください。', 409)
      return { inquiryId: previous.inquiryId, alreadySubmitted: true }
    }
    const pending = (await tx.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM "SalonBranchInquiry" s JOIN "BusinessInquiry" i ON i."id"=s."inquiryId" WHERE s."groupId"=$1 AND i."status" IN ('new','in_progress')`, viewer.groupId))[0].n
    if (pending >= 20) throw fail('確認中の申請が多数あります。運営からの回答をお待ちください。', 429)
    const inquiryId = 'branch_' + crypto.randomUUID()
    const details = [
      '【系列店の新店舗登録申請】', '系列店: ' + viewer.groupName,
      '申請元店舗: ' + viewer.name, '申請者: ' + (viewer.displayName || viewer.email),
      '申請者メール: ' + viewer.email, '新店舗所在地: ' + prefecture + city + address,
      ...(message ? ['', 'ご相談内容:', message] : [])
    ].join('\n')
    await tx.$executeRawUnsafe(`INSERT INTO "BusinessInquiry" ("id","requestKey","audience","organizationName","contactName","email","phone","preferredContact","message","sourcePath","status") VALUES ($1,$1,'salon',$2,$3,$4,$5,'email',$6,'/admin/salon-master','new')`, inquiryId, name, ownerName, email, phone, details)
    await tx.$executeRawUnsafe('INSERT INTO "SalonBranchInquiry" ("inquiryId","groupId","requesterId","sourceOrganizationId","requestKey","payloadHash","prefecture","city","address") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', inquiryId, viewer.groupId, viewer.id, viewer.organizationId, requestKey, payloadHash, prefecture, city, address)
    await tx.$executeRawUnsafe(`INSERT INTO "SalonGroupAction" ("id","groupId","actorId","organizationId","action","requestKey") VALUES ($1,$2,$3,$4,'REQUEST_STORE',$5)`, crypto.randomUUID(), viewer.groupId, viewer.id, viewer.organizationId, requestKey)
    return { inquiryId, alreadySubmitted: false }
  }, { timeout: 20000 })
}

async function attachApprovedStore({ tx, crypto, inquiry, organizationId, contactName, type, BusinessAccessError }) {
  const branch = (await tx.$queryRawUnsafe('SELECT * FROM "SalonBranchInquiry" WHERE "inquiryId"=$1', inquiry.id))[0]
  if (!branch) return
  if (type !== 'SALON') throw new BusinessAccessError('branch', 409)
  await tx.$queryRawUnsafe("SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext('salon_group_membership_v672'))) guard")
  const owners = await tx.$queryRawUnsafe(`SELECT g."id" FROM "SalonGroup" g
    JOIN "AppUser" u ON u."id"=g."ownerUserId" AND u."id"=$2 AND u."organizationId"=$3 AND u."active"=TRUE AND u."role"::text='ADMIN'
    JOIN "SalonGroupStore" s ON s."groupId"=g."id" AND s."organizationId"=$3
    LEFT JOIN "OrganizationBilling" b ON b."organizationId"=$3
    WHERE g."id"=$1 AND COALESCE(b."subscriptionStatus",'active')<>'paused'
    AND NOT EXISTS (SELECT 1 FROM "BusinessAccountControl" c WHERE c."accountType"='SALON' AND c."targetId"=$3 AND c."status"='SUSPENDED')
    AND NOT EXISTS (SELECT 1 FROM "ManagedBusinessAccess" a WHERE a."principalId"=$2 AND (a."accessStatus"='SUSPENDED' OR a."mustChangePassword"=TRUE))`, branch.groupId, branch.requesterId, branch.sourceOrganizationId)
  if (!owners.length) throw new BusinessAccessError('branch', 409)
  await tx.$executeRawUnsafe('INSERT INTO "SalonGroupStore" ("organizationId","groupId","createdBy") VALUES ($1,$2,$3)', organizationId, branch.groupId, branch.requesterId)
  await tx.$executeRawUnsafe(`INSERT INTO "OrganizationStoreProfile" ("organizationId","ownerName","phone","prefecture","city","addressLine1","orimiaPublished") VALUES ($1,$2,$3,$4,$5,$6,FALSE)`, organizationId, contactName, inquiry.phone, branch.prefecture, branch.city, branch.address)
  await tx.$executeRawUnsafe(`INSERT INTO "SalonGroupAction" ("id","groupId","actorId","organizationId","action","requestKey") VALUES ($1,$2,$3,$4,'APPROVE_STORE',$5)`, crypto.randomUUID(), branch.groupId, branch.requesterId, organizationId, 'approved-' + inquiry.id)
}

module.exports = { ensureSchema, submitInquiry, attachApprovedStore }
