import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const releaseRoot = path.dirname(fileURLToPath(import.meta.url))
const changes = []

function target(file) { return path.join(root, file) }
function read(file) { return fs.readFileSync(target(file), 'utf8') }
function fragment(file) { return fs.readFileSync(path.join(releaseRoot, file), 'utf8') }

function write(file, source) {
  fs.writeFileSync(target(file), source)
  changes.push(file)
}

function replaceExact(file, before, after) {
  const source = read(file)
  if (source.split(before).length !== 2) throw new Error(`Unexpected v669 parent anchor: ${file} / ${before.slice(0, 180)}`)
  write(file, source.replace(before, after))
}

function replaceCount(file, before, after, expected) {
  const source = read(file)
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`Unexpected match count: ${file} / expected ${expected}, found ${count} / ${before.slice(0, 150)}`)
  write(file, source.replaceAll(before, after))
}

function replaceRange(file, start, end, replacement, maxSpan) {
  const source = read(file)
  const startIndex = source.indexOf(start)
  if (startIndex < 0 || source.indexOf(start, startIndex + start.length) >= 0) throw new Error(`Unexpected start anchor: ${file} / ${start}`)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (endIndex < 0) throw new Error(`Missing end anchor: ${file} / ${end}`)
  if (endIndex - startIndex > maxSpan) throw new Error(`Replacement span too large: ${file} / ${endIndex - startIndex}`)
  write(file, source.slice(0, startIndex) + replacement + source.slice(endIndex))
}

write('orimia-store-directory-v670.js', fragment('orimia-store-directory-v670.js'))

const links = 'customer-links-v293.js'
replaceExact(
  links,
  "const customerStoreMembershipV668 = require('./customer-store-frequency-v668.js') /* customer-store-frequency-v668 */",
  "const customerStoreDirectoryV670 = require('./orimia-store-directory-v670.js') /* orimia-store-directory-v670 */",
)
replaceCount(links, 'customerStoreMembershipV668', 'customerStoreDirectoryV670', 6)
replaceRange(
  links,
  '  async function availableStores(session) {',
  '  async function storeQr(req, res) {',
  fragment('stores-handler-v670.fragment.js'),
  10000,
)
replaceRange(
  links,
  '  async function storesPage(req, res, url) {',
  '  function storeCodeFromQuery(value) {',
  fragment('stores-page-v670.fragment.js'),
  20000,
)

for (const client of ['customer-link-ui-v293.js', 'customer-link-ui-v424.js']) {
  replaceRange(
    client,
    '  function initStorePage() {',
    '  function run() {',
    fragment('store-client-v670.fragment.js'),
    14000,
  )
}

replaceRange(
  'admin-staff-experience-v276.js',
  '  let storeCodePending = false',
  'function fileAsDataUrl(file) {',
  `  async function ensureStoreCode() {\n    document.querySelectorAll('[data-sm-store-code],.lien-store-qr-card').forEach(card => card.remove())\n  }\n\n`,
  6000,
)

const profile = 'store-profile.js'
replaceExact(
  profile,
  String.raw`        await prisma.$executeRawUnsafe('ALTER TABLE "OrganizationStoreProfile" ADD COLUMN IF NOT EXISTS "closedWeekdays" TEXT NOT NULL DEFAULT \'1\'')`,
  String.raw`        await prisma.$executeRawUnsafe('ALTER TABLE "OrganizationStoreProfile" ADD COLUMN IF NOT EXISTS "closedWeekdays" TEXT NOT NULL DEFAULT \'1\'')
        await prisma.$executeRawUnsafe('ALTER TABLE "OrganizationStoreProfile" ADD COLUMN IF NOT EXISTS "orimiaPublished" BOOLEAN NOT NULL DEFAULT TRUE')
        await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "OrganizationStoreProfile_orimiaPublished_idx" ON "OrganizationStoreProfile"("orimiaPublished","organizationId")')`,
)
replaceExact(
  profile,
  `prisma.$queryRawUnsafe('SELECT "ownerName","phone","postalCode","prefecture","city","addressLine1","addressLine2","businessHours","closedDays","websiteUrl","businessOpenMinutes","businessCloseMinutes","closedWeekdays" FROM "OrganizationStoreProfile" WHERE "organizationId"=$1 LIMIT 1', session.organizationId),`,
  `prisma.$queryRawUnsafe('SELECT "ownerName","phone","postalCode","prefecture","city","addressLine1","addressLine2","businessHours","closedDays","websiteUrl","businessOpenMinutes","businessCloseMinutes","closedWeekdays","orimiaPublished" FROM "OrganizationStoreProfile" WHERE "organizationId"=$1 LIMIT 1', session.organizationId),`,
)
replaceExact(
  profile,
  `      websiteUrl: store.websiteUrl || '',\n      role: user.role,`,
  `      websiteUrl: store.websiteUrl || '',\n      orimiaPublished: store.orimiaPublished !== false,\n      role: user.role,`,
)
replaceExact(
  profile,
  '  async function updateOwnerEmail(session, data) {',
  `  async function updatePublication(session, data) {\n    if (session.role !== 'ADMIN') throw new StoreProfileError('ORIMIA上の公開設定はオーナーのみ変更できます。', 403)\n    await ensureSchema()\n    const published = data.published === true\n    await prisma.$executeRawUnsafe(\`INSERT INTO "OrganizationStoreProfile" ("organizationId","orimiaPublished","updatedAt")\n      VALUES ($1,$2,NOW())\n      ON CONFLICT ("organizationId") DO UPDATE SET "orimiaPublished"=EXCLUDED."orimiaPublished","updatedAt"=NOW()\`, session.organizationId, published)\n    return { organizationId: session.organizationId, orimiaPublished: published }\n  }\n\n  async function updateOwnerEmail(session, data) {`,
)
replaceExact(
  profile,
  `      const result = data.action === 'update-store'\n        ? await updateStore(session, data)\n        : data.action === 'update-owner-email'\n          ? await updateOwnerEmail(session, data)\n          : (() => { throw new StoreProfileError('更新内容を確認してください。') })()`,
  `      const result = data.action === 'update-store'\n        ? await updateStore(session, data)\n        : data.action === 'update-owner-email'\n          ? await updateOwnerEmail(session, data)\n          : data.action === 'update-orimia-publication'\n            ? await updatePublication(session, data)\n            : (() => { throw new StoreProfileError('更新内容を確認してください。') })()`,
)
replaceExact(
  profile,
  '  return { ensureSchema, handle, profile, updateStore, updateOwnerEmail, sessionFromRequest: req => sessionFromRequest(req, crypto, secret()) }',
  '  return { ensureSchema, handle, profile, updateStore, updatePublication, updateOwnerEmail, sessionFromRequest: req => sessionFromRequest(req, crypto, secret()) }',
)

replaceExact(
  'customer-store-staff-v276.js',
  `    if (audience === 'customer' && organizationId !== session.organizationId) {\n      const allowed = await prisma.$queryRawUnsafe('SELECT 1 FROM "CustomerStoreLink" WHERE "appUserId"=$1 AND "organizationId"=$2 LIMIT 1', session.userId, organizationId)\n      if (!allowed[0]) throw new CustomerStoreStaffError('登録済みの店舗ではありません。', 403)\n    }`,
  `    if (audience === 'customer' && organizationId !== session.organizationId) {\n      const allowed = await prisma.$queryRawUnsafe(\`SELECT 1 FROM "Organization" o\n        LEFT JOIN "OrganizationStoreProfile" p ON p."organizationId"=o."id"\n        WHERE o."id"=$2 AND (COALESCE(p."orimiaPublished",TRUE)=TRUE OR EXISTS (\n          SELECT 1 FROM "CustomerStoreLink" l WHERE l."appUserId"=$1 AND l."organizationId"=o."id"\n        )) LIMIT 1\`, session.userId, organizationId)\n      if (!allowed[0]) throw new CustomerStoreStaffError('この店舗は現在ORIMIAで公開されていません。', 403)\n    }`,
)

replaceExact(
  'server.js',
  '  await appointmentOperations.ensureSchema()\n  await customerStoreStaff.ensureSchema()',
  '  await appointmentOperations.ensureSchema()\n  await storeProfile.ensureSchema() /* orimia-store-directory-v670-schema */\n  await customerStoreStaff.ensureSchema()',
)

const publicationClient = fragment('orimia-publication-client-v670.js')
{
  const source = read('commercial-admin-v101.js')
  if (source.includes('__orimiaPublicationSettingsV670')) throw new Error('ORIMIA publication client is already installed')
  write('commercial-admin-v101.js', source + publicationClient)
}

replaceCount('server.js', '/customer-link-ui-v424.js?v=545-auto-profile1', '/customer-link-ui-v424.js?v=670-orimia-directory1', 2)
replaceExact('customer-experience-v503.js', '/customer-link-ui-v424.js?v=545-auto-profile1', '/customer-link-ui-v424.js?v=670-orimia-directory1')
replaceCount('server.js', '/customer-experience-v503.js?v=636-profile-name-fields1', '/customer-experience-v503.js?v=670-orimia-directory1', 2)
replaceExact('server.js', '/customer-experience-v508.js?v=644-menu-scroll1', '/customer-experience-v508.js?v=670-orimia-directory1')
replaceExact('customer-runtime-v267.js', '/customer-link-ui-v293.js?v=668-store-frequency1', '/customer-link-ui-v293.js?v=670-orimia-directory1')
replaceExact('commercial-admin-v101.js', '/customer-link-ui-v293.js?v=668-store-frequency1', '/customer-link-ui-v293.js?v=670-orimia-directory1')

for (const file of ['customer-experience-v503.js', 'customer-experience-v508.js']) {
  replaceCount(file, '登録済みの店舗', 'サロンを探す', 2)
  replaceExact(file, 'MY SALONS', 'ORIMIA SALONS')
  replaceExact(file, 'ご利用店舗の確認と追加', '都道府県からサロンを選択')
}
replaceExact('server.js', "['salons','登録済みの店舗','MY SALONS','/u/stores','sage'],", "['salons','サロンを探す','ORIMIA SALONS','/u/stores','sage'],")
replaceExact('server.js', "['store','登録済みの店舗','/u/stores']", "['store','サロンを探す','/u/stores']")

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Admin-Chat-Reply', 'v669') /* admin-chat-reply-v669-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  readinessAnchor + "\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Orimia-Store-Directory', 'v670') /* orimia-store-directory-v670-ready */",
)

fs.writeFileSync('/tmp/orimia-store-directory-v670-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: 'orimia-store-directory-v670', changedFiles: [...new Set(changes)], changes: changes.length }))
