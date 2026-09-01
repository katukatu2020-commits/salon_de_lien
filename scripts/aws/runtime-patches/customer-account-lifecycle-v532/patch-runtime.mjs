import fs from 'node:fs'

const storeServicePath = '/app/customer-store-staff-v276.js'
const withdrawalPath = '/app/customer-withdrawal-v309.js'
const serverPath = '/app/server.js'
const marker = 'customer-account-lifecycle-v532'

let storeService = fs.readFileSync(storeServicePath, 'utf8')
let withdrawal = fs.readFileSync(withdrawalPath, 'utf8')
let server = fs.readFileSync(serverPath, 'utf8')

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${label}: target was not found`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: target was not unique`)
  return source.slice(0, first) + after + source.slice(first + before.length)
}

function replaceRange(source, start, end, replacement, label) {
  const from = source.indexOf(start)
  const to = source.indexOf(end, from + start.length)
  if (from < 0 || to <= from) throw new Error(`${label}: boundaries were not found`)
  return source.slice(0, from) + replacement + source.slice(to)
}

const nicknameImplementation = `  async function customerAccountForSession(session) { /* ${marker} */
    const rows = await prisma.$queryRawUnsafe(
      \`SELECT u."id",u."nickname"
         FROM "AppUser" u
         JOIN "Customer" c ON c."id"=$2 AND c."organizationId"=$3 AND c."deletedAt" IS NULL
        WHERE u."id"=$1 AND u."role"='CUSTOMER' AND u."active"=TRUE
          AND (
            (u."customerId"=c."id" AND u."organizationId"=c."organizationId")
            OR EXISTS (
              SELECT 1 FROM "CustomerStoreLink" l
               WHERE l."appUserId"=u."id" AND l."customerId"=c."id" AND l."organizationId"=c."organizationId"
            )
          )
        LIMIT 1\`,
      session.userId,
      session.customerId,
      session.organizationId,
    )
    return rows[0] || null
  }

  async function nickname(req, res) {
    const session = await currentCustomer(req)
    await ensureSchema()
    const account = await customerAccountForSession(session)
    if (!account) throw new CustomerStoreStaffError('会員情報が見つかりません。', 404)
    if (req.method === 'GET') return json(res, 200, { nickname: account.nickname || '' })
    if (req.method !== 'POST') throw new CustomerStoreStaffError('この操作には対応していません。', 405)
    if (!sameOrigin(req)) throw new CustomerStoreStaffError('安全性を確認できませんでした。', 403)
    const data = await readJson(req)
    const value = text(data.nickname, 30, 'ニックネーム')
    const updated = await prisma.$executeRawUnsafe(
      'UPDATE "AppUser" SET "nickname"=$1,"updatedAt"=NOW() WHERE "id"=$2 AND "role"=\\'CUSTOMER\\' AND "active"=TRUE',
      value || null,
      session.userId,
    )
    if (Number(updated) !== 1) throw new CustomerStoreStaffError('会員情報を更新できませんでした。', 409)
    return json(res, 200, { ok: true, nickname: value })
  }`

storeService = replaceRange(
  storeService,
  '  async function nickname(req, res) {',
  '\n\n  async function communityNickname',
  nicknameImplementation,
  'global nickname endpoint',
)

storeService = replaceOnce(
  storeService,
  `       LEFT JOIN "AppUser" u ON u."customerId"=p."customerId" AND u."organizationId"=p."organizationId" AND u."role"='CUSTOMER' AND u."active"=TRUE`,
  `       LEFT JOIN "AppUser" u ON u."role"='CUSTOMER' AND u."active"=TRUE AND (
         (u."customerId"=p."customerId" AND u."organizationId"=p."organizationId")
         OR EXISTS (
           SELECT 1 FROM "CustomerStoreLink" l
            WHERE l."appUserId"=u."id" AND l."customerId"=p."customerId" AND l."organizationId"=p."organizationId"
         )
       ) /* ${marker} */`,
  'linked-store community nickname lookup',
)

withdrawal = replaceOnce(
  withdrawal,
  `    const rows = await prisma.$queryRawUnsafe(\`SELECT u."id" AS "appUserId", u."email", c."id" AS "customerId", c."name"
      FROM "AppUser" u JOIN "Customer" c ON c."id"=u."customerId"
      WHERE u."id"=$1 AND u."customerId"=$2 AND u."organizationId"=$3 AND u."role"='CUSTOMER'
        AND u."active"=TRUE AND c."deletedAt" IS NULL LIMIT 1\`, session.userId, session.customerId, session.organizationId)`,
  `    const rows = await prisma.$queryRawUnsafe(\`SELECT u."id" AS "appUserId",u."email",c."id" AS "customerId",c."name"
      FROM "AppUser" u
      JOIN "Customer" c ON c."id"=$2 AND c."organizationId"=$3 AND c."deletedAt" IS NULL
      WHERE u."id"=$1 AND u."role"='CUSTOMER' AND u."active"=TRUE
        AND (
          (u."customerId"=c."id" AND u."organizationId"=c."organizationId")
          OR EXISTS (
            SELECT 1 FROM "CustomerStoreLink" l
             WHERE l."appUserId"=u."id" AND l."customerId"=c."id" AND l."organizationId"=c."organizationId"
          )
        )
      LIMIT 1\`, session.userId, session.customerId, session.organizationId) /* ${marker} */`,
  'linked-store withdrawal account lookup',
)

withdrawal = replaceOnce(
  withdrawal,
  `      await tx.$executeRawUnsafe('UPDATE "Customer" SET "deletedAt"=NOW(), "smsTransactionalOptIn"=FALSE, "smsTransactionalOptOutAt"=NOW(), "updatedAt"=NOW() WHERE "id"=$1 AND "deletedAt" IS NULL', row.customerId)`,
  `      await tx.$executeRawUnsafe(\`UPDATE "Customer" c
        SET "deletedAt"=NOW(),"storeHiddenAt"=COALESCE(c."storeHiddenAt",NOW()),
            "smsTransactionalOptIn"=FALSE,"smsTransactionalOptOutAt"=NOW(),"updatedAt"=NOW()
        WHERE c."deletedAt" IS NULL AND (
          c."id"=(SELECT u."customerId" FROM "AppUser" u WHERE u."id"=$1)
          OR EXISTS (SELECT 1 FROM "CustomerStoreLink" l WHERE l."appUserId"=$1 AND l."customerId"=c."id")
        )\`, row.appUserId) /* ${marker} */`,
  'account-wide customer withdrawal',
)

withdrawal = replaceOnce(
  withdrawal,
  `      await tx.$executeRawUnsafe(\`UPDATE "AppUser"
        SET "active"=FALSE,
            "email"='withdrawn+' || "id" || '@customer.salon-de-lien.local',
            "loginId"=NULL,
            "passwordHash"=NULL,
            "updatedAt"=NOW()
        WHERE "customerId"=$1 AND "role"='CUSTOMER'\`, row.customerId)`,
  `      await tx.$executeRawUnsafe(\`UPDATE "AppUser"
        SET "active"=FALSE,
            "email"='withdrawn+' || "id" || '@customer.salon-de-lien.local',
            "loginId"=NULL,
            "passwordHash"=NULL,
            "updatedAt"=NOW()
        WHERE "id"=$1 AND "role"='CUSTOMER'\`, row.appUserId)`,
  'account-wide login withdrawal',
)

withdrawal = replaceOnce(
  withdrawal,
  `      await tx.$executeRawUnsafe('DELETE FROM "CustomerPhoneIdentity" WHERE "customerId"=$1', row.customerId)`,
  `      await tx.$executeRawUnsafe(\`DELETE FROM "CustomerPhoneIdentity" p
        WHERE EXISTS (
          SELECT 1 FROM "Customer" c
           WHERE c."id"=p."customerId" AND (
             c."id"=(SELECT u."customerId" FROM "AppUser" u WHERE u."id"=$1)
             OR EXISTS (SELECT 1 FROM "CustomerStoreLink" l WHERE l."appUserId"=$1 AND l."customerId"=c."id")
           )
        )\`, row.appUserId)`,
  'account-wide phone identity release',
)

withdrawal = replaceOnce(
  withdrawal,
  `      await tx.$executeRawUnsafe('UPDATE "CustomerPortalAccess" SET "revokedAt"=NOW(), "updatedAt"=NOW() WHERE "customerId"=$1 AND "revokedAt" IS NULL', row.customerId)`,
  `      await tx.$executeRawUnsafe(\`UPDATE "CustomerPortalAccess" p
        SET "revokedAt"=NOW(),"updatedAt"=NOW()
        WHERE p."revokedAt" IS NULL AND EXISTS (
          SELECT 1 FROM "Customer" c
           WHERE c."id"=p."customerId" AND (
             c."id"=(SELECT u."customerId" FROM "AppUser" u WHERE u."id"=$1)
             OR EXISTS (SELECT 1 FROM "CustomerStoreLink" l WHERE l."appUserId"=$1 AND l."customerId"=c."id")
           )
        )\`, row.appUserId)`,
  'account-wide portal revocation',
)

const billingReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Billing-Display-Mask', 'v531') /* billing-display-mask-v531 */`
server = replaceOnce(
  server,
  billingReady,
  `${billingReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Account-Lifecycle', 'v532') /* ${marker} */`,
  'customer account lifecycle readiness marker',
)

fs.writeFileSync(storeServicePath, storeService)
fs.writeFileSync(withdrawalPath, withdrawal)
fs.writeFileSync(serverPath, server)
console.log(JSON.stringify({ release: marker, patched: true }))
