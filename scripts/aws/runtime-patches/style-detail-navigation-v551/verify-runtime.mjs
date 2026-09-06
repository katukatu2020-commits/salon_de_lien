import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const server = read('server.js')
const shell = read('public/shell-consistency-v518.js')
const customerDetail = read('.next/server/app/u/(account)/community/[postId]/page.js')
const adminDetail = read('.next/server/app/admin/community/[postId]/page.js')

assert.match(server, /X-Lien-Style-Detail-Navigation', 'v551'/)
assert.match(server, /shell-consistency-v518\.js\?v=551-release1/)
assert.doesNotMatch(server, /shell-consistency-v518\.js\?v=546-navigation-privacy1/)
assert.match(shell, /let existingIndex = -1/)
assert.match(shell, /routes\.splice\(existingIndex \+ 1\)/)
assert.match(shell, /\/\* style-detail-navigation-v551 \*\//)
assert.doesNotMatch(customerDetail, /スタイル一覧へ/)
assert.match(customerDetail, /\/\* style-detail-navigation-v551 \*\//)
assert.match(adminDetail, /スタイル一覧へ/)

console.log(JSON.stringify({
  release: 'style-detail-navigation-v551',
  verified: true,
}))
