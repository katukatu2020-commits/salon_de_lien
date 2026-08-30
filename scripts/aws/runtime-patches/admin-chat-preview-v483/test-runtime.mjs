import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const source = fs.readFileSync(`${root}/.next/server/app/admin/customers/messages/page.js`, 'utf8')

const previewStart = source.indexOf('className: "admin-chat-preview-v483')
const previewEnd = source.indexOf('] })', previewStart)
assert.ok(previewStart >= 0, 'v483 conversation preview row must exist')
assert.ok(previewEnd > previewStart, 'conversation preview boundary must exist')

const preview = source.slice(previewStart, previewEnd)
assert.match(preview, /minWidth: 0/)
assert.match(preview, /overflow: "hidden"/)
assert.match(preview, /textOverflow: "ellipsis"/)
assert.match(preview, /whiteSpace: "nowrap"/)
assert.match(preview, /flexShrink: 0/)
assert.match(preview, /title: e\.latestBody \|\| e\.staffName/)
assert.equal((source.match(/data-lien-chat-thread-preview/g) || []).length, 1)
assert.equal((source.match(/data-lien-chat-body/g) || []).length, 1)

console.log('admin chat one-line preview runtime tests passed')
