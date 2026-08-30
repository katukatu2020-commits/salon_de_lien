import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const chunkDirectory = `${root}/.next/server/chunks`
const scriptMarker = '"data-lien-community-bootstrap": "v478"'
const scriptSource = 'src: "/content-edit-delete-client-v477.js"'
const bootstrapChunks = []

for (const entry of fs.readdirSync(chunkDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.js')) continue
  const source = fs.readFileSync(`${chunkDirectory}/${entry.name}`, 'utf8')
  if (source.includes(scriptMarker)) bootstrapChunks.push({ name: entry.name, source })
}

if (bootstrapChunks.length !== 1) throw new Error(`expected one bootstrap chunk, found ${bootstrapChunks.length}`)
const shell = bootstrapChunks[0].source
const client = fs.readFileSync(`${root}/public/content-edit-delete-client-v477.js`, 'utf8')

const assertions = [
  [shell.includes(scriptSource), 'authenticated AppShell loads the management client'],
  [shell.includes('defer: !0'), 'bootstrap client does not block document parsing'],
  [shell.indexOf(scriptSource) < shell.indexOf('.jsx("aside", {', shell.indexOf(scriptSource)), 'bootstrap is rendered before the sidebar'],
  [client.includes('__lienStyleCommunityControlsV477'), 'v477 client guard exists'],
  [client.includes('new MutationObserver'), 'community route observer exists'],
  [client.includes('void enhanceCommunityList()'), 'managed list enhancement exists'],
  [client.includes('data-lien-style-grid-managed-v471'), 'duplicate control prevention exists'],
  [client.includes("confirmationText: '削除する'"), 'delete confirmation is preserved'],
]

for (const [condition, message] of assertions) {
  if (!condition) throw new Error(message)
}

console.log(`style community bootstrap verified (${assertions.length} assertions)`)
