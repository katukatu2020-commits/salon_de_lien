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

function requireText(file, text, label) {
  const source = fs.readFileSync(file, 'utf8')
  if (!source.includes(text)) throw new Error(`${label} is missing from ${file}`)
}

function rejectUnfilteredDirectQueries(directory) {
  const queryPattern = /customer\.find(?:First|Many)\(\{\s*where:\s*\{[\s\S]{0,220}?organizationId:\s*[^,{}\n]+,\s*deletedAt:\s*null(?!\s*,\s*storeHiddenAt:\s*null)/g
  const failures = []
  for (const file of walkJavaScript(directory)) {
    const source = fs.readFileSync(file, 'utf8')
    const matches = source.match(queryPattern)
    if (matches?.length) failures.push(`${file}: ${matches.length}`)
  }
  if (failures.length) throw new Error(`store-hidden customer filters are missing:\n${failures.join('\n')}`)
}

requireText('/app/prisma/schema.prisma', 'storeHiddenAt          DateTime?', 'Customer.storeHiddenAt field')
requireText(
  '/app/.next/server/app/admin/customers/messages/page.js',
  'c."storeHiddenAt" IS NULL',
  'store chat-thread visibility filter',
)
requireText(
  '/app/.next/server/app/admin/customers/messages/page.js',
  `storeHiddenAt: null, /* ${marker} */`,
  'store broadcast recipient-list visibility filter',
)
requireText(
  '/app/.next/server/chunks/9845.js',
  `storeHiddenAt: null /* ${marker} */`,
  'server-authoritative broadcast visibility filter',
)
requireText('/app/.next/server/chunks/4441.js', marker, 'minified report visibility filters')
requireText('/app/.next/server/chunks/6006.js', marker, 'formatted report visibility filters')

rejectUnfilteredDirectQueries('/app/.next/server/app/admin')
rejectUnfilteredDirectQueries('/app/.next/server/app/api/admin')

