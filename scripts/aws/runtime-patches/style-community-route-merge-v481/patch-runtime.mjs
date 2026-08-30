import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const chunkDirectory = `${root}/.next/server/chunks`
const clientSource = '/tmp/lien-v481/content-edit-delete-client-v481.js'
const clientTarget = `${root}/public/content-edit-delete-client-v481.js`
const oldClientPath = '/content-edit-delete-client-v480.js'
const newClientPath = '/content-edit-delete-client-v481.js'
const oldBootstrap = '"data-lien-community-bootstrap": "v480"'
const newBootstrap = '"data-lien-community-bootstrap": "v481"'
const staffRuntimePath = `${root}/admin-staff-experience-v276.js`
const pageFiles = [
  `${root}/.next/server/app/admin/community/page.js`,
  `${root}/.next/server/app/admin/community/[postId]/page.js`,
  `${root}/.next/server/app/u/(account)/community/[postId]/page.js`,
  `${root}/.next/server/app/admin/customers/messages/page.js`,
]

fs.copyFileSync(clientSource, clientTarget)

let shellPatches = 0
for (const entry of fs.readdirSync(chunkDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.js')) continue
  const file = `${chunkDirectory}/${entry.name}`
  let source = fs.readFileSync(file, 'utf8')
  if (!source.includes(oldBootstrap)) continue
  if ((source.split(oldClientPath).length - 1) !== 1) {
    throw new Error(`style-community-route-merge-v481: unexpected shell client reference count in ${entry.name}`)
  }
  source = source
    .replace(oldClientPath, newClientPath)
    .replace(oldBootstrap, newBootstrap)
  fs.writeFileSync(file, source)
  shellPatches += 1
}

if (shellPatches !== 1) throw new Error(`style-community-route-merge-v481: expected one AppShell chunk, patched ${shellPatches}`)

for (const file of pageFiles) {
  let source = fs.readFileSync(file, 'utf8')
  const matches = source.split(oldClientPath).length - 1
  if (matches !== 1) throw new Error(`style-community-route-merge-v481: expected one page client reference in ${file}, found ${matches}`)
  source = source.replace(oldClientPath, newClientPath)
  fs.writeFileSync(file, source)
}

let staffRuntime = fs.readFileSync(staffRuntimePath, 'utf8')
if (staffRuntime.includes('__lienStyleCommunityLoaderV481')) {
  throw new Error('style-community-route-merge-v481: shared admin loader already exists')
}
staffRuntime += `
;(() => {
  if (window.__lienStyleCommunityLoaderV481) return
  window.__lienStyleCommunityLoaderV481 = true
  if (document.querySelector('script[src*="/content-edit-delete-client-v481.js"]')) return
  const script = document.createElement('script')
  script.src = '/content-edit-delete-client-v481.js'
  script.defer = true
  script.dataset.lienStyleCommunityLoaderV481 = '1'
  document.head.appendChild(script)
})()
`
fs.writeFileSync(staffRuntimePath, staffRuntime)

console.log('style-community-route-merge-v481 runtime patched')
