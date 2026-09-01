'use strict'

let base
try {
  base = require('./customer-global-profile-v512')
} catch (error) {
  if (error?.code !== 'MODULE_NOT_FOUND') throw error
  base = require('../customer-global-profile-v512/customer-global-profile-v512')
}

const PREFERENCE_FIELDS = [
  'preferredLength',
  'preferredStyle',
  'dislikes',
  'colorPreference',
  'maintenanceLevel',
  'referenceNotes',
]

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value || {}, key)
}

function present(value) {
  return value !== null && value !== undefined && (typeof value !== 'string' || value.trim() !== '')
}

function same(left, right) {
  if (left instanceof Date || right instanceof Date) {
    return new Date(left).getTime() === new Date(right).getTime()
  }
  return (left ?? null) === (right ?? null)
}

async function extendedRowsForAppUser(db, appUserId) {
  return db.$queryRawUnsafe(
    `SELECT c."id",c."organizationId",c."createdAt",
            r."realName",r."updatedByUserId" AS "realNameUpdatedByUserId",
            p."id" AS "preferenceId",p."preferredLength",p."preferredStyle",p."dislikes",
            p."colorPreference",p."maintenanceLevel",p."referenceNotes",
            u."customerId" AS "canonicalCustomerId",u."customerPublicCode"
       FROM "AppUser" u
       JOIN "Customer" c ON c."deletedAt" IS NULL AND (
         c."id"=u."customerId" OR EXISTS (
           SELECT 1 FROM "CustomerStoreLink" l
            WHERE l."appUserId"=u."id" AND l."customerId"=c."id"
         )
       )
       LEFT JOIN "CustomerRealName" r ON r."customerId"=c."id" AND r."organizationId"=c."organizationId"
       LEFT JOIN "Preference" p ON p."customerId"=c."id"
      WHERE u."id"=$1 AND u."role"='CUSTOMER' AND u."active"=TRUE
      ORDER BY CASE WHEN c."id"=u."customerId" THEN 0 ELSE 1 END,c."createdAt" ASC,c."id" ASC`,
    appUserId,
  )
}

function canonicalRealName(rows, override) {
  if (override !== undefined) {
    const value = String(override || '').trim()
    if (!value) throw new Error('Real customer name is missing')
    return value
  }
  const source = rows.find(row => present(row.realName))
  return source ? String(source.realName).trim() : null
}

function canonicalPreference(rows, overrides) {
  const hasPreference = rows.some(row => row.preferenceId) || overrides !== undefined
  if (!hasPreference) return null
  const input = overrides || {}
  return Object.fromEntries(PREFERENCE_FIELDS.map(field => {
    if (hasOwn(input, field)) return [field, input[field]]
    return [field, rows.find(row => present(row[field]))?.[field] ?? null]
  }))
}

function preferenceChanged(row, desired) {
  return !row.preferenceId || PREFERENCE_FIELDS.some(field => !same(row[field], desired[field]))
}

async function syncExtendedForAppUser(db, appUserId, options = {}) {
  const rows = await extendedRowsForAppUser(db, appUserId)
  if (!rows.length) {
    return { appUserId, targetIds: [], changedRealNames: 0, changedPreferences: 0 }
  }

  const desiredRealName = canonicalRealName(rows, options.realName)
  const desiredPreference = canonicalPreference(rows, options.preference)
  const realNameUpdatedByUserId = options.realNameUpdatedByUserId ||
    rows.find(row => row.realName === desiredRealName)?.realNameUpdatedByUserId || null
  let changedRealNames = 0
  let changedPreferences = 0

  if (desiredRealName) {
    for (const row of rows) {
      if (row.realName === desiredRealName) continue
      await db.$executeRawUnsafe(
        `INSERT INTO "CustomerRealName" ("customerId","organizationId","realName","updatedByUserId","updatedAt")
         VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP)
         ON CONFLICT ("customerId") DO UPDATE SET
           "organizationId"=EXCLUDED."organizationId",
           "realName"=EXCLUDED."realName",
           "updatedByUserId"=EXCLUDED."updatedByUserId",
           "updatedAt"=CURRENT_TIMESTAMP`,
        row.id,
        row.organizationId,
        desiredRealName,
        realNameUpdatedByUserId,
      )
      changedRealNames += 1
    }
  }

  if (desiredPreference) {
    for (const row of rows) {
      if (!preferenceChanged(row, desiredPreference)) continue
      await db.preference.upsert({
        where: { customerId: row.id },
        create: { customerId: row.id, ...desiredPreference },
        update: desiredPreference,
      })
      changedPreferences += 1
    }
  }

  return {
    appUserId,
    publicCode: rows[0].customerPublicCode || null,
    canonicalCustomerId: rows[0].canonicalCustomerId,
    targetIds: rows.map(row => row.id),
    changedRealNames,
    changedPreferences,
    realName: desiredRealName,
    preference: desiredPreference,
  }
}

async function synchronizeAppUser(db, appUserId, options = {}) {
  const identity = await base.synchronizeAppUser(db, appUserId, options)
  const extended = await syncExtendedForAppUser(db, appUserId, options)
  return { ...identity, ...extended, targetIds: identity.targetIds.length ? identity.targetIds : extended.targetIds }
}

async function syncRealNameFromCustomer(db, customerId, realName, updatedByUserId = null) {
  const account = await base.accountForCustomer(db, customerId)
  if (account) {
    return syncExtendedForAppUser(db, account.appUserId, { realName, realNameUpdatedByUserId: updatedByUserId })
  }
  const rows = await db.$queryRawUnsafe(
    'SELECT "id","organizationId" FROM "Customer" WHERE "id"=$1 AND "deletedAt" IS NULL LIMIT 1',
    customerId,
  )
  const row = rows[0]
  if (!row) throw new Error('Customer not found')
  const normalized = canonicalRealName([row], realName)
  await db.$executeRawUnsafe(
    `INSERT INTO "CustomerRealName" ("customerId","organizationId","realName","updatedByUserId","updatedAt")
     VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP)
     ON CONFLICT ("customerId") DO UPDATE SET
       "organizationId"=EXCLUDED."organizationId",
       "realName"=EXCLUDED."realName",
       "updatedByUserId"=EXCLUDED."updatedByUserId",
       "updatedAt"=CURRENT_TIMESTAMP`,
    row.id,
    row.organizationId,
    normalized,
    updatedByUserId,
  )
  return { appUserId: null, targetIds: [row.id], changedRealNames: 1, changedPreferences: 0, realName: normalized }
}

async function syncPreferenceFromCustomer(db, customerId, preference) {
  const account = await base.accountForCustomer(db, customerId)
  if (account) return syncExtendedForAppUser(db, account.appUserId, { preference })
  await db.preference.upsert({
    where: { customerId },
    create: { customerId, ...preference },
    update: preference,
  })
  return { appUserId: null, targetIds: [customerId], changedRealNames: 0, changedPreferences: 1, preference }
}

async function reconcileAll(prisma) {
  const accounts = await prisma.$queryRawUnsafe(
    `SELECT u."id"
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
  let changedRealNames = 0
  let changedPreferences = 0
  for (const account of accounts) {
    const result = await prisma.$transaction(
      tx => synchronizeAppUser(tx, account.id),
      { isolationLevel: 'Serializable', timeout: 30000 },
    )
    changedCustomers += result.changedCustomers || 0
    changedHairProfiles += result.changedHairProfiles || 0
    changedRealNames += result.changedRealNames || 0
    changedPreferences += result.changedPreferences || 0
  }
  return { checkedAccounts: accounts.length, changedCustomers, changedHairProfiles, changedRealNames, changedPreferences }
}

async function auditConsistency(prisma, options = {}) {
  const code = String(options.publicCode || '').trim().toUpperCase()
  const baseAudit = await base.auditConsistency(prisma, { publicCode: code })
  const accounts = await prisma.$queryRawUnsafe(
    `SELECT u."id",u."customerPublicCode"
       FROM "AppUser" u
      WHERE u."role"='CUSTOMER' AND u."active"=TRUE
        AND ($1='' OR u."customerPublicCode"=$1)
      ORDER BY u."createdAt" ASC,u."id" ASC`,
    code,
  )
  let extendedDriftAccounts = 0
  for (const account of accounts) {
    const rows = await extendedRowsForAppUser(prisma, account.id)
    if (!rows.length) continue
    const desiredRealName = canonicalRealName(rows, undefined)
    const desiredPreference = canonicalPreference(rows, undefined)
    const realNameDrift = desiredRealName ? rows.some(row => row.realName !== desiredRealName) : false
    const preferenceDrift = desiredPreference ? rows.some(row => preferenceChanged(row, desiredPreference)) : false
    if (realNameDrift || preferenceDrift) extendedDriftAccounts += 1
  }
  return {
    ...baseAudit,
    driftAccounts: baseAudit.driftAccounts + extendedDriftAccounts,
    extendedDriftAccounts,
  }
}

module.exports = {
  ...base,
  PREFERENCE_FIELDS,
  extendedRowsForAppUser,
  syncExtendedForAppUser,
  synchronizeAppUser,
  syncRealNameFromCustomer,
  syncPreferenceFromCustomer,
  reconcileAll,
  auditConsistency,
}
