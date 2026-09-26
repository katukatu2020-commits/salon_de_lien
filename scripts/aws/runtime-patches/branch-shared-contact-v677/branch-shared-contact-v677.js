'use strict'

async function resolvePrincipalEmail({ tx, branch, contactEmail, loginId, BusinessAccessError }) {
  if (!branch) {
    const existing = await tx.$queryRawUnsafe('SELECT "id" FROM "ManagedBusinessAccess" WHERE LOWER("contactEmail")=LOWER($1) LIMIT 1', contactEmail)
    if (existing.length) throw new BusinessAccessError('duplicate', 409)
    return contactEmail
  }
  const contacts = await tx.$queryRawUnsafe(`
    SELECT s."groupId" FROM "AppUser" u
      LEFT JOIN "SalonGroupStore" s ON s."organizationId"=u."organizationId"
      WHERE u."role"::text IN ('ADMIN','STAFF','MANUFACTURER') AND LOWER(u."email")=LOWER($1)
    UNION ALL
    SELECT NULL::text AS "groupId" FROM "WholesaleDealer" d WHERE LOWER(COALESCE(d."email",''))=LOWER($1)
    UNION ALL
    SELECT CASE WHEN a."accountType"='SALON' THEN s."groupId" ELSE NULL END AS "groupId"
      FROM "ManagedBusinessAccess" a
      LEFT JOIN "SalonGroupStore" s ON s."organizationId"=a."targetId"
      WHERE LOWER(a."contactEmail")=LOWER($1)`, contactEmail)
  if (contacts.some(contact => contact.groupId !== branch.groupId)) {
    throw new BusinessAccessError('duplicate', 409)
  }
  // Contact addresses may be shared; authentication identities must stay unique.
  // Approval/reissue mail continues to use ManagedBusinessAccess.contactEmail.
  return loginId.toLowerCase() + '@branch.orimia.invalid'
}

module.exports = { resolvePrincipalEmail }
