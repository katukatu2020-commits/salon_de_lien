import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const clientPath = `${root}/public/content-edit-delete-client-v482.js`
const client = fs.readFileSync(clientPath, 'utf8')
const service = fs.readFileSync(`${root}/content-management-v465.js`, 'utf8')
const staffRuntime = fs.readFileSync(`${root}/admin-staff-experience-v276.js`, 'utf8')
const appShellChunks = fs.readdirSync(`${root}/.next/server/chunks`)
  .filter(name => name.endsWith('.js'))
  .map(name => fs.readFileSync(`${root}/.next/server/chunks/${name}`, 'utf8'))
  .filter(source => source.includes('"data-lien-community-bootstrap": "v482"'))
const pageFiles = [
  `${root}/.next/server/app/admin/community/page.js`,
  `${root}/.next/server/app/admin/community/[postId]/page.js`,
  `${root}/.next/server/app/u/(account)/community/[postId]/page.js`,
  `${root}/.next/server/app/admin/customers/messages/page.js`,
]

const assertions = [
  [appShellChunks.length === 1, 'one authenticated AppShell loads v482'],
  [appShellChunks[0]?.includes('/content-edit-delete-client-v482.js'), 'AppShell uses the cache-busted client'],
  [staffRuntime.includes('__lienStyleCommunityLoaderV482'), 'all admin pages load the community enhancer'],
  [staffRuntime.includes('/content-edit-delete-client-v482.js'), 'shared admin loader uses v482'],
  [client.includes('__lienStyleCommunityControlsV482'), 'v482 client guard exists'],
  [client.includes("requestJson('/api/lien-content-management?audience=staff&scope=posts')"), 'management API remains a list source'],
  [client.includes('const publicCards = []'), 'server-rendered public cards are preserved'],
  [client.includes('const supplementalPosts = posts.filter'), 'management posts are merged without duplicates'],
  [client.includes('grid.replaceChildren(...publicCards, ...supplementalCards)'), 'public and management cards share one grid'],
  [client.includes('const renderedCount = publicCards.length + supplementalCards.length'), 'summary uses the merged count'],
  [client.includes("document.addEventListener('click', useStableCommunityNavigation, true)"), 'cross-page navigation is stabilized'],
  [client.includes('emptyState?.isConnected && !resultSection.contains(emptyState)'), 'stale empty SSR state is removed'],
  [client.includes('data-lien-style-grid-managed-v482'), 'v482 list idempotency exists'],
  [client.includes("confirmationText: '") && client.includes("input: false"), 'delete confirmation remains protected'],
  [service.includes('ADD COLUMN IF NOT EXISTS "deletedAt"'), 'recoverable deletion schema is installed'],
  [service.includes('ADD COLUMN IF NOT EXISTS "deletedByUserId"'), 'post deletion records its operator'],
  [service.includes('p."deletedAt" IS NULL'), 'archived posts are excluded from management lists'],
  [service.includes('SET "published"=FALSE,"deletedAt"=CURRENT_TIMESTAMP,"deletedByUserId"=$1'), 'post deletion is recoverable and audited'],
  [!service.includes('DELETE FROM "VisitCommunityPost"'), 'posts are never hard deleted'],
]

for (const [condition, message] of assertions) {
  if (!condition) throw new Error(message)
}

for (const file of pageFiles) {
  const source = fs.readFileSync(file, 'utf8')
  if (!source.includes('/content-edit-delete-client-v482.js')) throw new Error(`v482 client is missing from ${file}`)
}

console.log(`style community recovery verified (${assertions.length + pageFiles.length} assertions)`)
