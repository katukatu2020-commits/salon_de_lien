import fs from 'node:fs'
import path from 'node:path'

const marker = 'store-hidden-customer-consistency-v360'

function walkJavaScript(directory, files = []) {
  if (!fs.existsSync(directory)) return files
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) walkJavaScript(file, files)
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(file)
  }
  return files
}

function writeChanged(file, source, original) {
  if (source !== original) fs.writeFileSync(file, source)
}

function replaceExact(file, before, after, expected = 1) {
  const original = fs.readFileSync(file, 'utf8')
  const matches = original.split(before).length - 1
  if (matches !== expected) {
    throw new Error(`${file}: expected ${expected} matches, found ${matches}: ${before.slice(0, 120)}`)
  }
  fs.writeFileSync(file, original.split(before).join(after))
}

function patchDirectStoreCustomerQueries(directory, expected) {
  const queryPattern = /(customer\.find(?:First|Many)\(\{\s*where:\s*\{[\s\S]{0,220}?organizationId:\s*[^,{}\n]+,\s*deletedAt:\s*null)(?!\s*,\s*storeHiddenAt:\s*null)/g
  let replacements = 0

  for (const file of walkJavaScript(directory)) {
    const original = fs.readFileSync(file, 'utf8')
    const source = original.replace(queryPattern, (match) => {
      replacements += 1
      return `${match}, storeHiddenAt: null /* ${marker} */`
    })
    writeChanged(file, source, original)
  }

  if (replacements !== expected) {
    throw new Error(`${directory}: expected ${expected} direct customer-query patches, found ${replacements}`)
  }
}

function patchDirectStoreCustomerFile(file, expected = 1) {
  const queryPattern = /(customer\.find(?:First|Many)\(\{\s*where:\s*\{[\s\S]{0,220}?organizationId:\s*[^,{}\n]+,\s*deletedAt:\s*null)(?!\s*,\s*storeHiddenAt:\s*null)/g
  const original = fs.readFileSync(file, 'utf8')
  let replacements = 0
  const source = original.replace(queryPattern, (match) => {
    replacements += 1
    return `${match}, storeHiddenAt: null /* ${marker} */`
  })
  if (replacements !== expected) {
    throw new Error(`${file}: expected ${expected} direct customer-query patches, found ${replacements}`)
  }
  writeChanged(file, source, original)
}

// Every direct Customer lookup in store-rendered pages and store-only APIs must
// honor the same soft-hide flag as the customer registry.
patchDirectStoreCustomerQueries('/app/.next/server/app/admin', 4)
patchDirectStoreCustomerQueries('/app/.next/server/app/api/admin', 13)

const messagesPage = '/app/.next/server/app/admin/customers/messages/page.js'
replaceExact(
  messagesPage,
  'AND c."deletedAt" IS NULL ORDER BY',
  `AND c."deletedAt" IS NULL AND c."storeHiddenAt" IS NULL ORDER BY /* ${marker} */`,
)
replaceExact(
  messagesPage,
  'organizationId: e.organizationId,\n                deletedAt: null,',
  `organizationId: e.organizationId,\n                deletedAt: null,\n                storeHiddenAt: null, /* ${marker} */`,
)

// Broadcast execution is server-authoritative. Hidden customers are excluded
// again here, even if a stale browser submits an old recipient id.
for (const file of [
  '/app/.next/server/chunks/3244.js',
  '/app/.next/server/chunks/4441.js',
  '/app/.next/server/chunks/6006.js',
  '/app/.next/server/chunks/9845.js',
]) {
  patchDirectStoreCustomerFile(file)
}

// Customer-based reports and proposal lists place deletedAt before their
// optional organization filter, so patch those relation filters explicitly.
replaceExact(
  '/app/.next/server/chunks/4441.js',
  'customer:{organizationId:t.organizationId,deletedAt:null}',
  `customer:{organizationId:t.organizationId,deletedAt:null,storeHiddenAt:null/* ${marker} */}`,
)
replaceExact(
  '/app/.next/server/chunks/4441.js',
  'customer.findMany({where:{deletedAt:null,...t?{organizationId:t}:{}}',
  `customer.findMany({where:{deletedAt:null,storeHiddenAt:null/* ${marker} */,...t?{organizationId:t}:{}}`,
)
replaceExact(
  '/app/.next/server/chunks/4441.js',
  'customer:{deletedAt:null,...t?{organizationId:t}:{}}',
  `customer:{deletedAt:null,storeHiddenAt:null/* ${marker} */,...t?{organizationId:t}:{}}`,
)

replaceExact(
  '/app/.next/server/chunks/6006.js',
  'customer: { organizationId: t, deletedAt: null }',
  `customer: { organizationId: t, deletedAt: null, storeHiddenAt: null /* ${marker} */ }`,
)
replaceExact(
  '/app/.next/server/chunks/6006.js',
  'customer.findMany({\n            where: { deletedAt: null, ...(t ? { organizationId: t } : {}) }',
  `customer.findMany({\n            where: { deletedAt: null, storeHiddenAt: null, /* ${marker} */ ...(t ? { organizationId: t } : {}) }`,
)
replaceExact(
  '/app/.next/server/chunks/6006.js',
  'customer: {\n                    deletedAt: null,\n                    ...(t ? { organizationId: t } : {}),',
  `customer: {\n                    deletedAt: null,\n                    storeHiddenAt: null, /* ${marker} */\n                    ...(t ? { organizationId: t } : {}),`,
)
