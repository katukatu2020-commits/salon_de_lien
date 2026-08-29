import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'style-community-card-controls-v470'
const paths = {
  adminList: `${root}/.next/server/app/admin/community/page.js`,
  adminDetail: `${root}/.next/server/app/admin/community/[postId]/page.js`,
  customerDetail: `${root}/.next/server/app/u/(account)/community/[postId]/page.js`,
  adminChat: `${root}/.next/server/app/admin/customers/messages/page.js`,
}

function replaceExactly(source, oldValue, newValue, label) {
  const first = source.indexOf(oldValue)
  if (first < 0 || source.indexOf(oldValue, first + oldValue.length) >= 0) {
    throw new Error(`${marker}: expected exactly one ${label}`)
  }
  return source.replace(oldValue, newValue)
}

for (const [label, file] of Object.entries(paths)) {
  let source = fs.readFileSync(file, 'utf8')
  source = replaceExactly(
    source,
    '/content-edit-delete-client-v469.js',
    '/content-edit-delete-client-v470.js',
    `${label} client path`,
  )
  fs.writeFileSync(file, source)
}

console.log(`${marker} runtime patched`)
