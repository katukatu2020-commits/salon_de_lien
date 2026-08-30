import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const linksPath = `${root}/customer-links-v293.js`
const uiPath = `${root}/customer-link-ui-v424.js`

function replaceExact(source, before, after, expectedCount, label) {
  const count = source.split(before).length - 1
  if (count !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} matches, found ${count}`)
  }
  return source.split(before).join(after)
}

function replacePatternOnce(source, pattern, replacement, label) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
  const matches = source.match(new RegExp(pattern.source, flags)) || []
  if (matches.length !== 1) {
    throw new Error(`${label}: expected 1 match, found ${matches.length}`)
  }
  return source.replace(pattern, replacement)
}

let links = fs.readFileSync(linksPath, 'utf8')

links = replacePatternOnce(
  links,
  /  async function ensureSchema\(\) \{[\s\S]*?\n  \}\n\n  async function currentStaff/,
  `  async function ensureSchema() {
    // customer-code-link-v474: schema changes are deployment work. Running DDL in
    // a customer lookup can wait on a table lock and leave the dialog pending.
    if (!schemaPromise) {
      schemaPromise = prisma.$queryRawUnsafe('SELECT 1 FROM "CustomerStoreLink" LIMIT 0')
        .catch(error => { schemaPromise = null; throw error })
    }
    return schemaPromise
  }

  async function currentStaff`,
  'remove request-time customer-link DDL',
)

links = replacePatternOnce(
  links,
  /  async function memberForCode\(db, rawCode\) \{[\s\S]*?\n    return rows\[0\]\n  \}/,
  `  async function memberForCode(db, rawCode) {
    const code = customerCode(rawCode)
    const rows = await db.$queryRawUnsafe(\`SELECT u."id" AS "appUserId",u."customerId",u."customerPublicCode",u."nickname",c."organizationId",c."name",c."gender",c."birthYear",c."birthDate",c."phone",c."servicePreference",c."profileImageUrl",c."staffAssignmentType",c."assignedStaffName"
      FROM "AppUser" u
      JOIN LATERAL (
        SELECT candidate.*
        FROM "Customer" candidate
        WHERE candidate."deletedAt" IS NULL
          AND (candidate."id"=u."customerId" OR EXISTS (
            SELECT 1 FROM "CustomerStoreLink" link
            WHERE link."appUserId"=u."id" AND link."customerId"=candidate."id"
          ))
        ORDER BY CASE WHEN candidate."id"=u."customerId" THEN 0 ELSE 1 END,candidate."createdAt" ASC
        LIMIT 1
      ) c ON TRUE
      WHERE u."customerPublicCode"=$1 AND u."role"='CUSTOMER' AND u."active"=TRUE LIMIT 1\`, code)
    if (!rows[0]) throw new CustomerLinkError('この会員コードは見つかりませんでした。', 404)
    return rows[0]
  }`,
  'resolve membership through canonical or linked customer records',
)

links = replaceExact(
  links,
  `      await tx.$executeRawUnsafe('INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId","createdAt") VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT ("appUserId","organizationId") DO NOTHING', crypto.randomUUID(), appUserId, organizationId, targetCustomerId)
      return { customerId: targetCustomerId, alreadyLinked: false, name: source.name }`,
  `      await tx.$executeRawUnsafe('INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId","createdAt") VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT ("appUserId","organizationId") DO NOTHING', crypto.randomUUID(), appUserId, organizationId, targetCustomerId)
      const persisted = await tx.$queryRawUnsafe('SELECT "customerId" FROM "CustomerStoreLink" WHERE "appUserId"=$1 AND "organizationId"=$2 LIMIT 1', appUserId, organizationId)
      if (!persisted[0]?.customerId) throw new CustomerLinkError('店舗への顧客登録を確認できませんでした。もう一度お試しください。', 503)
      return { customerId: persisted[0].customerId, alreadyLinked: false, name: source.name }`,
  1,
  'verify persisted customer-store link',
)

fs.writeFileSync(linksPath, links)

let ui = fs.readFileSync(uiPath, 'utf8')
ui = replacePatternOnce(
  ui,
  /  async function requestJson\(url, options\) \{[\s\S]*?\n  \}\n\n  function initAdminCustomerDialog/,
  `  async function requestJson(url, options = {}) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000)
    try {
      const response = await fetch(url, { credentials: 'same-origin', ...options, signal: controller.signal })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || '処理を完了できませんでした。')
      return result
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('確認に時間がかかっています。通信状態を確認して、もう一度お試しください。')
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  function initAdminCustomerDialog`,
  'bound customer-link requests',
)

ui = replaceExact(
  ui,
  `    const status = dialog.body.querySelector('[data-member-status]')
    const preview = dialog.body.querySelector('[data-member-preview]')`,
  `    const status = dialog.body.querySelector('[data-member-status]')
    const preview = dialog.body.querySelector('[data-member-preview]')
    const lookupButton = lookupForm.querySelector('button[type="submit"]')`,
  1,
  'capture lookup submit button',
)

ui = replaceExact(
  ui,
  `    lookupForm.addEventListener('submit', async event => {
      event.preventDefault()
      const code = codeInput.value.trim().toUpperCase()`,
  `    lookupForm.addEventListener('submit', async event => {
      event.preventDefault()
      if (lookupButton.disabled) return
      lookupButton.disabled = true
      const code = codeInput.value.trim().toUpperCase()`,
  1,
  'prevent duplicate customer-code lookups',
)

ui = replaceExact(
  ui,
  `      } catch (error) { member = null; status.textContent = error.message }
    })`,
  `      } catch (error) { member = null; status.textContent = error.message }
      finally { lookupButton.disabled = false }
    })`,
  1,
  'restore lookup button after completion',
)

fs.writeFileSync(uiPath, ui)

console.log('customer code link v474 patched')
