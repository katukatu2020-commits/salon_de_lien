import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const releaseDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, value => value.slice(1)))
const changes = []

function target(file) {
  return path.join(root, file)
}

function read(file) {
  return fs.readFileSync(target(file), 'utf8')
}

function replaceExact(file, before, after) {
  const source = read(file)
  if (source.split(before).length !== 2) throw new Error(`Unexpected v641 parent anchor: ${file} / ${before.slice(0, 100)}`)
  fs.writeFileSync(target(file), source.replace(before, after))
  changes.push({ file, before, after })
}

function replaceRange(file, startToken, endToken, after, maxLength = 20000) {
  const source = read(file)
  const start = source.indexOf(startToken)
  const end = source.indexOf(endToken, start + startToken.length)
  if (start < 0 || end < 0 || end - start > maxLength) throw new Error(`Unexpected v641 parent boundary: ${file} / ${startToken}`)
  const before = source.slice(start, end)
  fs.writeFileSync(target(file), source.slice(0, start) + after + source.slice(end))
  changes.push({ file, before, after })
}

function fragment(name) {
  return fs.readFileSync(path.join(releaseDir, name), 'utf8').replace(/\r\n/g, '\n')
}

const links = 'customer-links-v293.js'
replaceExact(
  links,
  "const customerGlobalProfile = require('./customer-global-profile-v513')\n",
  "const customerGlobalProfile = require('./customer-global-profile-v513')\nconst customerStoreMembershipV642 = require('./customer-store-membership-v642.js') /* customer-store-limit-v642 */\n",
)
replaceExact(
  links,
  `      schemaPromise = prisma.$queryRawUnsafe('SELECT 1 FROM "CustomerStoreLink" LIMIT 0')
        .catch(error => { schemaPromise = null; throw error })`,
  `      schemaPromise = Promise.all([
        prisma.$queryRawUnsafe('SELECT 1 FROM "CustomerStoreLink" LIMIT 0'),
        customerStoreMembershipV642.ensureSchema(prisma),
      ]).catch(error => { schemaPromise = null; throw error })`,
)
replaceRange(
  links,
  `      await tx.$executeRawUnsafe('INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId","createdAt") VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT DO NOTHING', crypto.randomUUID(), appUserId, source.organizationId, source.customerId)`,
  '      let targetCustomerId',
  `      const membership = await customerStoreMembershipV642.prepareLink(tx, {
        appUserId,
        targetOrganizationId: organizationId,
        canonicalOrganizationId: source.organizationId,
        canonicalCustomerId: source.customerId,
      })
      if (membership.alreadyLinked) return { customerId: membership.customerId, alreadyLinked: true, name: source.name }

`,
  1800,
)
replaceRange(
  links,
  '      await customerGlobalProfile.synchronizeAppUser(tx, appUserId)\n      return { customerId: persisted[0].customerId, alreadyLinked: false, name: source.name }',
  '  async function notifyLinkedCustomer(organizationId, customerId, name) {',
  `      await customerGlobalProfile.synchronizeAppUser(tx, appUserId)
      return { customerId: persisted[0].customerId, alreadyLinked: false, name: source.name }
    }, { isolationLevel: 'ReadCommitted' }) /* customer-store-limit-v642: AppUser row lock serializes the five-store limit */
  }

`,
  500,
)
replaceRange(
  links,
  '  async function availableStores(session) {',
  '  async function stores(req, res, url) {',
  `  async function availableStores(session) {
    await ensureSchema()
    return customerStoreMembershipV642.availableStores(
      prisma,
      session,
      require('./customer-session-v591.js').resolveCustomerSession,
    )
  }

`,
  900,
)
replaceRange(links, '  async function stores(req, res, url) {', '  async function storeQr(req, res) {', fragment('stores-v642.fragment.js'), 8500)
replaceRange(links, '  async function storesPage(req, res, url) {', '  function storeCodeFromQuery(value) {', fragment('stores-page-v642.fragment.js'), 14000)
replaceExact(
  links,
  "      const status = error instanceof CustomerLinkError ? error.status : error && error.code === 'P2002' ? 409 : 500",
  "      const status = error instanceof CustomerLinkError ? error.status : Number.isInteger(error?.status) ? error.status : error && error.code === 'P2002' ? 409 : 500",
)
replaceRange(
  links,
  '      if (!res.headersSent) json(res, status, { error:',
  '    }\n    return true',
  `      if (!res.headersSent) {
        const message = status === 500
          ? '処理を完了できませんでした。時間をおいて再度お試しください。'
          : (error?.message || '処理を完了できませんでした。')
        json(res, status, { error: message, code: error?.code, maxStores: customerStoreMembershipV642.MAX_STORES })
      }
`,
  1500,
)

replaceRange(
  'customer-link-ui-v293.js',
  '  function initStorePage() {',
  '  function initStoreSettingsQr() {',
  fragment('store-client-v642.fragment.js'),
  8500,
)
replaceExact('customer-runtime-v267.js', '/customer-link-ui-v293.js?v=545-auto-profile1', '/customer-link-ui-v293.js?v=642-store-limit1')
replaceExact('commercial-admin-v101.js', '/customer-link-ui-v293.js?v=417', '/customer-link-ui-v293.js?v=642-store-limit1')

const ready = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Search-Input-Stability', 'v641') /* search-input-stability-v641-ready */"
replaceExact('server.js', ready, `${ready}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Store-Limit', 'v642') /* customer-store-limit-v642-ready */`)

fs.writeFileSync('/tmp/customer-store-limit-v642-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: 'customer-store-limit-v642', changedFiles: [...new Set(changes.map(change => change.file))], changes: changes.length }))
