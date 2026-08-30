import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const chunkDirectory = `${root}/.next/server/chunks`
const clientSource = '/tmp/lien-v479/content-edit-delete-client-v479.js'
const clientTarget = `${root}/public/content-edit-delete-client-v479.js`
const oldClientPath = '/content-edit-delete-client-v477.js'
const newClientPath = '/content-edit-delete-client-v479.js'
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
  if (!source.includes('"data-lien-community-bootstrap": "v478"')) continue
  if ((source.split(oldClientPath).length - 1) !== 1) {
    throw new Error(`style-community-data-v479: unexpected shell client reference count in ${entry.name}`)
  }
  source = source
    .replace(oldClientPath, newClientPath)
    .replace('"data-lien-community-bootstrap": "v478"', '"data-lien-community-bootstrap": "v479"')
  fs.writeFileSync(file, source)
  shellPatches += 1
}

if (shellPatches !== 1) throw new Error(`style-community-data-v479: expected one AppShell chunk, patched ${shellPatches}`)

for (const file of pageFiles) {
  let source = fs.readFileSync(file, 'utf8')
  const matches = source.split(oldClientPath).length - 1
  if (matches !== 1) throw new Error(`style-community-data-v479: expected one page client reference in ${file}, found ${matches}`)
  source = source.replace(oldClientPath, newClientPath)
  fs.writeFileSync(file, source)
}

console.log('style-community-data-v479 runtime patched')
