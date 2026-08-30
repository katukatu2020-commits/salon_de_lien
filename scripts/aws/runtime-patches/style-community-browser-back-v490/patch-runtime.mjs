import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const chunkDirectory = `${root}/.next/server/chunks`
const clientSource = '/tmp/lien-v490/content-edit-delete-client-v490.js'
const clientTarget = `${root}/public/content-edit-delete-client-v490.js`
const oldClientPath = '/content-edit-delete-client-v482.js'
const newClientPath = '/content-edit-delete-client-v490.js'
const oldBootstrap = '"data-lien-community-bootstrap": "v482"'
const newBootstrap = '"data-lien-community-bootstrap": "v490"'
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
    throw new Error(`style-community-browser-back-v490: unexpected shell client reference count in ${entry.name}`)
  }
  source = source
    .replace(oldClientPath, newClientPath)
    .replace(oldBootstrap, newBootstrap)
  fs.writeFileSync(file, source)
  shellPatches += 1
}

if (shellPatches !== 1) throw new Error(`style-community-browser-back-v490: expected one AppShell chunk, patched ${shellPatches}`)

for (const file of pageFiles) {
  let source = fs.readFileSync(file, 'utf8')
  const matches = source.split(oldClientPath).length - 1
  if (matches !== 1) throw new Error(`style-community-browser-back-v490: expected one page client reference in ${file}, found ${matches}`)
  source = source.replace(oldClientPath, newClientPath)
  fs.writeFileSync(file, source)
}

let staffRuntime = fs.readFileSync(staffRuntimePath, 'utf8')
const staffReplacements = [
  ['__lienStyleCommunityLoaderV482', '__lienStyleCommunityLoaderV490', 2],
  ['/content-edit-delete-client-v482.js', '/content-edit-delete-client-v490.js', 2],
  ['lienStyleCommunityLoaderV482', 'lienStyleCommunityLoaderV490', 1],
]
for (const [before, after, expected] of staffReplacements) {
  const matches = staffRuntime.split(before).length - 1
  if (matches !== expected) {
    throw new Error(`style-community-browser-back-v490: expected ${expected} shared loader matches for ${before}, found ${matches}`)
  }
  staffRuntime = staffRuntime.replaceAll(before, after)
}
fs.writeFileSync(staffRuntimePath, staffRuntime)

console.log('style-community-browser-back-v490 runtime patched')
