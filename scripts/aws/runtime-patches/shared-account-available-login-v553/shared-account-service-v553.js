'use strict'

const RELEASE = 'shared-account-available-login-v553'

function conflict(message = 'このログインIDは別の有効な店舗側アカウントで使用されています。別のIDを入力してください。') {
  return Object.assign(new Error(message), {
    statusCode: 409,
    code: 'SHARED_ACCOUNT_CONFLICT',
  })
}

function isUniqueConstraint(error) {
  const code = String(error && error.code || '')
  const databaseCode = String(error && error.meta && error.meta.code || '')
  return ['23505', 'P2002'].includes(code) || databaseCode === '23505'
}

async function saveSharedStoreAccount({ prisma, crypto, organizationId, loginId, password }) {
  const normalizedLoginId = String(loginId || '').trim().toLowerCase()
  const salt = crypto.randomBytes(16).toString('hex')
  const passwordHash = `scrypt$${salt}$${crypto.scryptSync(password, salt, 64).toString('hex')}`

  try {
    return await prisma.$transaction(async tx => {
      const organizations = await tx.$queryRawUnsafe(
        'SELECT "name" FROM "Organization" WHERE "id"=$1 FOR UPDATE',
        organizationId,
      )
      if (!organizations[0]) {
        throw Object.assign(new Error('店舗情報が見つかりません。再ログインしてお試しください。'), { statusCode: 404 })
      }

      const currentRows = await tx.$queryRawUnsafe(
        'SELECT "id","loginId" FROM "AppUser" WHERE "organizationId"=$1 AND "isSharedStoreAccount"=TRUE LIMIT 1 FOR UPDATE',
        organizationId,
      )
      const current = currentRows[0] || null
      const currentId = String(current && current.id || '')
      const currentLoginId = String(current && current.loginId || '').trim().toLowerCase()
      const loginIdChanged = !currentId || currentLoginId !== normalizedLoginId

      if (loginIdChanged) {
        const duplicates = await tx.$queryRawUnsafe(
          'SELECT "id" FROM "AppUser" WHERE "id"<>$2 AND "active"=TRUE AND "role"::text IN (\'ADMIN\',\'STAFF\',\'MANUFACTURER\') AND (LOWER(COALESCE("loginId",\'\'))=$1 OR LOWER(COALESCE("email",\'\'))=$1) LIMIT 1',
          normalizedLoginId,
          currentId,
        )
        if (duplicates[0]) throw conflict()

        await tx.$queryRawUnsafe(
          'UPDATE "AppUser" SET "loginId"=NULL,"updatedAt"=NOW() WHERE "id"<>$2 AND "active"=FALSE AND "role"::text IN (\'ADMIN\',\'STAFF\',\'MANUFACTURER\') AND LOWER(COALESCE("loginId",\'\'))=$1 RETURNING "id"',
          normalizedLoginId,
          currentId,
        )
      }

      if (currentId) {
        const updated = await tx.$queryRawUnsafe(
          'UPDATE "AppUser" SET "loginId"=$1,"passwordHash"=$2,"role"=\'STAFF\',"active"=TRUE,"updatedAt"=NOW() WHERE "id"=$3 AND "organizationId"=$4 AND "isSharedStoreAccount"=TRUE RETURNING "id","loginId","active"',
          normalizedLoginId,
          passwordHash,
          currentId,
          organizationId,
        )
        if (!updated[0]) {
          throw conflict('保存対象が更新されました。画面を再読み込みしてもう一度お試しください。')
        }
        return { ok: true, created: false, loginId: updated[0].loginId, account: updated[0] }
      }

      const sharedId = `shared_${crypto.randomUUID().replace(/-/g, '')}`
      const sharedEmail = `store-${crypto.createHash('sha256').update(`${organizationId}:${sharedId}`).digest('hex').slice(0, 24)}@accounts.invalid`
      const displayName = `${String(organizations[0].name || '店舗').trim().slice(0, 68)} 店舗共通`
      const inserted = await tx.$queryRawUnsafe(
        'INSERT INTO "AppUser" ("id","organizationId","email","loginId","displayName","passwordHash","role","active","createdAt","updatedAt","isSharedStoreAccount") VALUES ($1,$2,$3,$4,$5,$6,\'STAFF\',TRUE,NOW(),NOW(),TRUE) RETURNING "id","loginId","active"',
        sharedId,
        organizationId,
        sharedEmail,
        normalizedLoginId,
        displayName,
        passwordHash,
      )
      if (!inserted[0]) throw new Error('Shared store account insert returned no row')
      return { ok: true, created: true, loginId: inserted[0].loginId, account: inserted[0] }
    })
  } catch (error) {
    if (isUniqueConstraint(error)) throw conflict()
    throw error
  }
}

module.exports = { RELEASE, saveSharedStoreAccount }
