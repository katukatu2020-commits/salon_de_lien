'use strict'

const IDENTITY_FIELDS = [
  'name',
  'phone',
  'gender',
  'birthDate',
  'birthYear',
  'servicePreference',
  'profileImageUrl',
]

const HAIR_FIELDS = [
  'hairThickness',
  'hairVolume',
  'hairTexture',
  'scalpCondition',
  'faceShape',
  'forehead',
  'lifestyle',
  'stylingTimeMinutes',
  'hairCurl',
]

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value || {}, key)
}

function present(value) {
  return value !== null && value !== undefined && (typeof value !== 'string' || value.trim() !== '')
}

function comparable(value) {
  if (value instanceof Date) return value.getTime()
  return value ?? null
}

function same(left, right) {
  return comparable(left) === comparable(right)
}

function changedFields(current, desired, fields) {
  return fields.filter(field => !same(current[field], desired[field]))
}

function canonicalIdentity(rows, overrides = {}) {
  if (!rows.length) return null
  const direct = rows[0]
  const identity = {}
  for (const field of IDENTITY_FIELDS) {
    if (hasOwn(overrides, field)) {
      identity[field] = overrides[field]
      continue
    }
    if (field === 'name') {
      identity[field] = direct.name
      continue
    }
    identity[field] = rows.find(row => present(row[field]))?.[field] ?? null
  }
  if (!present(identity.name)) throw new Error('Canonical customer name is missing')
  identity.name = String(identity.name).trim()
  return identity
}

function canonicalHair(rows, overrides) {
  if (overrides) {
    return Object.fromEntries(HAIR_FIELDS.map(field => [field, hasOwn(overrides, field) ? overrides[field] : null]))
  }
  const source = rows.find(row => row.hairProfileId)
  if (!source) return null
  return Object.fromEntries(HAIR_FIELDS.map(field => [field, source[field] ?? null]))
}

async function accountForCustomer(db, customerId) {
  const rows = await db.$queryRawUnsafe(
    `SELECT u."id" AS "appUserId",u."customerId" AS "canonicalCustomerId",u."customerPublicCode"
       FROM "AppUser" u
      WHERE u."role"='CUSTOMER' AND u."active"=TRUE
        AND (u."customerId"=$1 OR EXISTS (
          SELECT 1 FROM "CustomerStoreLink" l
           WHERE l."appUserId"=u."id" AND l."customerId"=$1
        ))
      ORDER BY CASE WHEN u."customerId"=$1 THEN 0 ELSE 1 END,u."createdAt" ASC
      LIMIT 1`,
    customerId,
  )
  return rows[0] || null
}

async function identityRowsForAppUser(db, appUserId) {
  return db.$queryRawUnsafe(
    `SELECT c."id",c."organizationId",c."name",c."phone",c."gender",c."birthDate",c."birthYear",
            c."servicePreference",c."profileImageUrl",c."createdAt",
            u."customerId" AS "canonicalCustomerId",u."displayName",u."customerPublicCode"
       FROM "AppUser" u
       JOIN "Customer" c ON c."deletedAt" IS NULL AND (
         c."id"=u."customerId" OR EXISTS (
           SELECT 1 FROM "CustomerStoreLink" l
            WHERE l."appUserId"=u."id" AND l."customerId"=c."id"
         )
       )
      WHERE u."id"=$1 AND u."role"='CUSTOMER' AND u."active"=TRUE
      ORDER BY CASE WHEN c."id"=u."customerId" THEN 0 ELSE 1 END,c."createdAt" ASC,c."id" ASC`,
    appUserId,
  )
}

async function hairRowsForAppUser(db, appUserId) {
  return db.$queryRawUnsafe(
    `SELECT c."id" AS "customerId",c."createdAt",h."id" AS "hairProfileId",
            h."hairThickness",h."hairVolume",h."hairTexture",h."scalpCondition",h."faceShape",
            h."forehead",h."lifestyle",h."stylingTimeMinutes",h."hairCurl",
            u."customerId" AS "canonicalCustomerId"
       FROM "AppUser" u
       JOIN "Customer" c ON c."deletedAt" IS NULL AND (
         c."id"=u."customerId" OR EXISTS (
           SELECT 1 FROM "CustomerStoreLink" l
            WHERE l."appUserId"=u."id" AND l."customerId"=c."id"
         )
       )
       LEFT JOIN "HairProfile" h ON h."customerId"=c."id"
      WHERE u."id"=$1 AND u."role"='CUSTOMER' AND u."active"=TRUE
      ORDER BY CASE WHEN c."id"=u."customerId" THEN 0 ELSE 1 END,c."createdAt" ASC,c."id" ASC`,
    appUserId,
  )
}

async function syncHairForAppUser(db, appUserId, overrides = null) {
  const rows = await hairRowsForAppUser(db, appUserId)
  const desired = canonicalHair(rows, overrides)
  if (!desired) return { targetIds: rows.map(row => row.customerId), changed: 0 }

  let changed = 0
  for (const row of rows) {
    if (!row.hairProfileId) {
      await db.hairProfile.create({ data: { customerId: row.customerId, ...desired } })
      changed += 1
      continue
    }
    if (!changedFields(row, desired, HAIR_FIELDS).length) continue
    await db.hairProfile.update({ where: { customerId: row.customerId }, data: desired })
    changed += 1
  }
  return { targetIds: rows.map(row => row.customerId), changed }
}

async function synchronizeAppUser(db, appUserId, options = {}) {
  const rows = await identityRowsForAppUser(db, appUserId)
  if (!rows.length) return { appUserId, targetIds: [], changedCustomers: 0, changedHairProfiles: 0 }

  const desired = canonicalIdentity(rows, options.identity || {})
  let changedCustomers = 0
  for (const row of rows) {
    if (!changedFields(row, desired, IDENTITY_FIELDS).length) continue
    await db.customer.update({ where: { id: row.id }, data: desired })
    changedCustomers += 1
  }

  if (!same(rows[0].displayName, desired.name)) {
    await db.appUser.updateMany({
      where: { id: appUserId, role: 'CUSTOMER', active: true },
      data: { displayName: desired.name },
    })
  }

  const hair = options.skipHair
    ? { targetIds: rows.map(row => row.id), changed: 0 }
    : await syncHairForAppUser(db, appUserId, options.hairProfile || null)

  return {
    appUserId,
    publicCode: rows[0].customerPublicCode || null,
    canonicalCustomerId: rows[0].canonicalCustomerId,
    targetIds: rows.map(row => row.id),
    changedCustomers,
    changedHairProfiles: hair.changed,
    identity: desired,
  }
}

async function syncIdentityFromCustomer(db, customerId, identity) {
  const account = await accountForCustomer(db, customerId)
  if (!account) {
    await db.customer.update({ where: { id: customerId }, data: identity })
    return { appUserId: null, targetIds: [customerId], changedCustomers: 1, identity }
  }
  return synchronizeAppUser(db, account.appUserId, { identity, skipHair: true })
}

async function syncHairProfileFromCustomer(db, customerId, hairProfile) {
  const account = await accountForCustomer(db, customerId)
  if (!account) {
    await db.hairProfile.upsert({
      where: { customerId },
      create: { customerId, ...hairProfile },
      update: hairProfile,
    })
    return { appUserId: null, targetIds: [customerId], changed: 1 }
  }
  const result = await syncHairForAppUser(db, account.appUserId, hairProfile)
  return { appUserId: account.appUserId, ...result }
}

async function profileImageTargets(db, customerId) {
  const account = await accountForCustomer(db, customerId)
  if (!account) {
    const rows = await db.$queryRawUnsafe(
      'SELECT "id","organizationId","profileImageUrl" FROM "Customer" WHERE "id"=$1 AND "deletedAt" IS NULL LIMIT 1',
      customerId,
    )
    return { appUserId: null, rows }
  }
  const rows = await identityRowsForAppUser(db, account.appUserId)
  return {
    appUserId: account.appUserId,
    rows: rows.map(row => ({ id: row.id, organizationId: row.organizationId, profileImageUrl: row.profileImageUrl })),
  }
}

async function syncProfileImageFromCustomer(db, customerId, profileImageUrl) {
  const targets = await profileImageTargets(db, customerId)
  for (const row of targets.rows) {
    if (row.profileImageUrl === profileImageUrl) continue
    await db.customer.update({ where: { id: row.id }, data: { profileImageUrl } })
  }
  return { appUserId: targets.appUserId, targetIds: targets.rows.map(row => row.id) }
}

async function reconcileAll(prisma) {
  const accounts = await prisma.$queryRawUnsafe(
    `SELECT u."id",u."customerPublicCode"
       FROM "AppUser" u
      WHERE u."role"='CUSTOMER' AND u."active"=TRUE
        AND EXISTS (
          SELECT 1 FROM "Customer" c
           WHERE c."deletedAt" IS NULL AND (
             c."id"=u."customerId" OR EXISTS (
               SELECT 1 FROM "CustomerStoreLink" l
                WHERE l."appUserId"=u."id" AND l."customerId"=c."id"
             )
           )
        )
      ORDER BY u."createdAt" ASC,u."id" ASC`,
  )

  let changedCustomers = 0
  let changedHairProfiles = 0
  for (const account of accounts) {
    const result = await prisma.$transaction(
      tx => synchronizeAppUser(tx, account.id),
      { isolationLevel: 'Serializable', timeout: 30000 },
    )
    changedCustomers += result.changedCustomers
    changedHairProfiles += result.changedHairProfiles
  }
  return { checkedAccounts: accounts.length, changedCustomers, changedHairProfiles }
}

async function auditConsistency(prisma, options = {}) {
  const code = String(options.publicCode || '').trim().toUpperCase()
  const accounts = await prisma.$queryRawUnsafe(
    `SELECT u."id",u."customerPublicCode"
       FROM "AppUser" u
      WHERE u."role"='CUSTOMER' AND u."active"=TRUE
        AND ($1='' OR u."customerPublicCode"=$1)
      ORDER BY u."createdAt" ASC,u."id" ASC`,
    code,
  )

  let driftAccounts = 0
  let targetCount = 0
  for (const account of accounts) {
    const rows = await identityRowsForAppUser(prisma, account.id)
    if (!rows.length) continue
    const desired = canonicalIdentity(rows)
    const identityDrift = rows.some(row => changedFields(row, desired, IDENTITY_FIELDS).length > 0) ||
      !same(rows[0].displayName, desired.name)
    const hairRows = await hairRowsForAppUser(prisma, account.id)
    const desiredHair = canonicalHair(hairRows, null)
    const hairDrift = desiredHair
      ? hairRows.some(row => !row.hairProfileId || changedFields(row, desiredHair, HAIR_FIELDS).length > 0)
      : false
    if (identityDrift || hairDrift) driftAccounts += 1
    if (code && account.customerPublicCode === code) targetCount = rows.length
  }

  return {
    checkedAccounts: accounts.length,
    driftAccounts,
    publicCode: code || null,
    targetCount: code ? targetCount : null,
  }
}

module.exports = {
  IDENTITY_FIELDS,
  HAIR_FIELDS,
  accountForCustomer,
  identityRowsForAppUser,
  profileImageTargets,
  synchronizeAppUser,
  syncIdentityFromCustomer,
  syncHairProfileFromCustomer,
  syncProfileImageFromCustomer,
  reconcileAll,
  auditConsistency,
}
