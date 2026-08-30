import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const clientPath = `${root}/public/content-edit-delete-client-v477.js`
const pageFiles = [
  `${root}/.next/server/app/admin/community/page.js`,
  `${root}/.next/server/app/admin/community/[postId]/page.js`,
  `${root}/.next/server/app/u/(account)/community/[postId]/page.js`,
  `${root}/.next/server/app/admin/customers/messages/page.js`,
]

const client = fs.readFileSync(clientPath, 'utf8')
const assertions = [
  [client.includes('__lienStyleCommunityControlsV477'), 'v477 guard is present'],
  [client.includes('new MutationObserver'), 'route DOM observer is present'],
  [client.includes('/^\\/(?:admin|u)\\/community(?:\\/|$)/'), 'observer is limited to community routes'],
  [client.includes("communityRouteObserver.observe(document.documentElement, { childList: true, subtree: true })"), 'observer watches routed DOM replacement'],
  [client.includes('void enhanceCommunityList()'), 'staff list enhancement is preserved'],
  [client.includes('data-lien-style-grid-managed-v471'), 'managed-card idempotency is preserved'],
  [client.includes("payload = await requestJson('/api/lien-content-management?audience=staff&scope=posts')"), 'management data request is preserved'],
  [client.includes("confirmationText: '削除する'"), 'delete confirmation behavior is preserved'],
]

for (const [condition, message] of assertions) {
  if (!condition) throw new Error(message)
}

for (const file of pageFiles) {
  const source = fs.readFileSync(file, 'utf8')
  if (!source.includes('/content-edit-delete-client-v477.js')) throw new Error(`v477 client is missing from ${file}`)
  if (source.includes('/content-edit-delete-client-v471.js')) throw new Error(`stale v471 client remains in ${file}`)
}

console.log(`style community route runtime verified (${assertions.length + pageFiles.length * 2} assertions)`)
