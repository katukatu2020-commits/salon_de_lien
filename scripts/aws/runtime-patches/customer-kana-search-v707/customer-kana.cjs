'use strict'

const CUSTOMER_KANA_QUERY = `SELECT "id", "lastNameKana", "firstNameKana"
  FROM "Customer"
  WHERE "organizationId" = $1 AND "deletedAt" IS NULL AND "storeHiddenAt" IS NULL
    AND ("lastNameKana" IS NOT NULL OR "firstNameKana" IS NOT NULL)`

function normalizeCustomerKana(value) {
  return String(value ?? '').normalize('NFKC').replace(/\s+/g, '')
    .replace(/[ぁ-ゖ]/g, character => String.fromCharCode(character.charCodeAt(0) + 0x60))
}
function customerKana(row) {
  return normalizeCustomerKana(row.lastNameKana) + normalizeCustomerKana(row.firstNameKana)
}
function matchingCustomerKanaIds(rows, keyword) {
  const normalized = normalizeCustomerKana(keyword)
  return normalized ? rows.filter(row => customerKana(row).includes(normalized)).map(row => row.id) : []
}
function formatCustomerNameWithKana(name, kana) {
  if (!kana || name.endsWith(`（${kana}）`)) return name
  return `${name}（${kana}）`
}
async function loadCustomerKanaRows(db, organizationId) {
  if (!organizationId) return []
  return db.$queryRawUnsafe(CUSTOMER_KANA_QUERY, organizationId)
}
module.exports = { CUSTOMER_KANA_QUERY, normalizeCustomerKana, customerKana, matchingCustomerKanaIds, formatCustomerNameWithKana, loadCustomerKanaRows }
