import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'style-community-route-v477'
const clientSource = '/tmp/lien-v477/content-edit-delete-client-v477.js'
const clientTarget = `${root}/public/content-edit-delete-client-v477.js`
const pageFiles = [
  `${root}/.next/server/app/admin/community/page.js`,
  `${root}/.next/server/app/admin/community/[postId]/page.js`,
  `${root}/.next/server/app/u/(account)/community/[postId]/page.js`,
  `${root}/.next/server/app/admin/customers/messages/page.js`,
]

fs.copyFileSync(clientSource, clientTarget)

let patched = 0
for (const file of pageFiles) {
  let source = fs.readFileSync(file, 'utf8')
  const before = '/content-edit-delete-client-v471.js'
  const matches = source.split(before).length - 1
  if (matches !== 1) throw new Error(`${marker}: expected one v471 client reference in ${file}, found ${matches}`)
  source = source.replace(before, '/content-edit-delete-client-v477.js')
  fs.writeFileSync(file, source)
  patched += 1
}

if (patched !== pageFiles.length) throw new Error(`${marker}: page patch count mismatch`)
console.log(`${marker} runtime patched`)
