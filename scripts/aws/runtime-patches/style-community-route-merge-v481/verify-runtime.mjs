import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const clientPath = `${root}/public/content-edit-delete-client-v481.js`
const client = fs.readFileSync(clientPath, 'utf8')
const staffRuntime = fs.readFileSync(`${root}/admin-staff-experience-v276.js`, 'utf8')
const appShellChunks = fs.readdirSync(`${root}/.next/server/chunks`)
  .filter(name => name.endsWith('.js'))
  .map(name => fs.readFileSync(`${root}/.next/server/chunks/${name}`, 'utf8'))
  .filter(source => source.includes('"data-lien-community-bootstrap": "v481"'))
const pageFiles = [
  `${root}/.next/server/app/admin/community/page.js`,
  `${root}/.next/server/app/admin/community/[postId]/page.js`,
  `${root}/.next/server/app/u/(account)/community/[postId]/page.js`,
  `${root}/.next/server/app/admin/customers/messages/page.js`,
]

const assertions = [
  [appShellChunks.length === 1, 'one authenticated AppShell loads v481'],
  [appShellChunks[0]?.includes('/content-edit-delete-client-v481.js'), 'AppShell uses the cache-busted client'],
  [staffRuntime.includes('__lienStyleCommunityLoaderV481'), 'all admin pages load the community enhancer'],
  [staffRuntime.includes('/content-edit-delete-client-v481.js'), 'shared admin loader uses v481'],
  [client.includes('__lienStyleCommunityControlsV481'), 'v481 client guard exists'],
  [client.includes("requestJson('/api/lien-content-management?audience=staff&scope=posts')"), 'management API remains a list source'],
  [client.includes('const publicCards = []'), 'server-rendered public cards are preserved'],
  [client.includes('const supplementalPosts = posts.filter'), 'management posts are merged without duplicates'],
  [client.includes('grid.replaceChildren(...publicCards, ...supplementalCards)'), 'public and management cards share one grid'],
  [client.includes('const renderedCount = publicCards.length + supplementalCards.length'), 'summary uses the merged count'],
  [client.includes("document.addEventListener('click', useStableCommunityNavigation, true)"), 'cross-page navigation is stabilized'],
  [client.includes('emptyState?.isConnected && !resultSection.contains(emptyState)'), 'stale empty SSR state is removed'],
  [client.includes('data-lien-style-grid-managed-v481'), 'v481 list idempotency exists'],
  [client.includes("confirmationText: '") && client.includes("input: false"), 'delete confirmation remains protected'],
]

for (const [condition, message] of assertions) {
  if (!condition) throw new Error(message)
}

for (const file of pageFiles) {
  const source = fs.readFileSync(file, 'utf8')
  if (!source.includes('/content-edit-delete-client-v481.js')) throw new Error(`v481 client is missing from ${file}`)
}

console.log(`style community route and merge verified (${assertions.length + pageFiles.length} assertions)`)
