import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const chunkDirectory = `${root}/.next/server/chunks`
const marker = 'customer-linked-app-detection-v475'
const files = fs.readdirSync(chunkDirectory).filter(name => name.endsWith('.js'))
const source = files
  .map(name => fs.readFileSync(`${chunkDirectory}/${name}`, 'utf8'))
  .find(candidate => candidate.includes(marker))

assert.ok(source, 'patched customer detail chunk must exist')

const linkedBlockStart = source.indexOf('if (el.appUsers.length === 0)')
const linkedBlockEnd = source.indexOf(`/* ${marker} */`, linkedBlockStart)
assert.ok(linkedBlockStart >= 0 && linkedBlockEnd > linkedBlockStart)

const linkedBlock = source.slice(linkedBlockStart, linkedBlockEnd)
assert.match(linkedBlock, /SELECT u\."id",u\."email"/)
assert.match(linkedBlock, /link\."customerId"=\$1/)
assert.match(linkedBlock, /link\."organizationId"=\$2/)
assert.match(linkedBlock, /u\."role"=\\'CUSTOMER\\'/)
assert.match(linkedBlock, /u\."active"=TRUE/)
assert.ok(!linkedBlock.includes('OR '), 'linked account lookup must not broaden tenant ownership')

assert.equal((source.match(/customer-linked-app-detection-v475/g) || []).length, 1)
assert.equal((source.match(/children: "お客様アプリ未登録"/g) || []).length, 1)
assert.equal((source.match(/children: "このQRコードから新規登録できます"/g) || []).length, 1)

console.log('customer linked app runtime tests passed')
