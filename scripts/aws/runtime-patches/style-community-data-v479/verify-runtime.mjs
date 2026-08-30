import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const clientPath = `${root}/public/content-edit-delete-client-v479.js`
const client = fs.readFileSync(clientPath, 'utf8')
const appShellChunks = fs.readdirSync(`${root}/.next/server/chunks`)
  .filter(name => name.endsWith('.js'))
  .map(name => fs.readFileSync(`${root}/.next/server/chunks/${name}`, 'utf8'))
  .filter(source => source.includes('"data-lien-community-bootstrap": "v479"'))
const pageFiles = [
  `${root}/.next/server/app/admin/community/page.js`,
  `${root}/.next/server/app/admin/community/[postId]/page.js`,
  `${root}/.next/server/app/u/(account)/community/[postId]/page.js`,
  `${root}/.next/server/app/admin/customers/messages/page.js`,
]

const assertions = [
  [appShellChunks.length === 1, 'one authenticated AppShell loads v479'],
  [appShellChunks[0]?.includes('/content-edit-delete-client-v479.js'), 'AppShell uses the cache-busted client'],
  [client.includes('__lienStyleCommunityControlsV479'), 'v479 client guard exists'],
  [client.includes("requestJson('/api/lien-content-management?audience=staff&scope=posts')"), 'management API is the list source'],
  [client.includes('grid.replaceChildren(...posts.map(post => buildManagedCard(post, hiddenMedia(post))))'), 'all API posts are rendered directly'],
  [client.includes("node.textContent?.includes('条件に合うスタイルはありません')"), 'empty SSR state is replaced'],
  [client.includes('data-lien-style-grid-managed-v479'), 'v479 list idempotency exists'],
  [client.includes("confirmationText: '削除する'"), 'delete confirmation remains protected'],
]

for (const [condition, message] of assertions) {
  if (!condition) throw new Error(message)
}

for (const file of pageFiles) {
  const source = fs.readFileSync(file, 'utf8')
  if (!source.includes('/content-edit-delete-client-v479.js')) throw new Error(`v479 client is missing from ${file}`)
}

console.log(`style community data rendering verified (${assertions.length + pageFiles.length} assertions)`)
