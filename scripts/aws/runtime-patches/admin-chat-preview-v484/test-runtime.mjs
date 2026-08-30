import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const source = fs.readFileSync(`${root}/.next/server/app/admin/customers/messages/page.js`, 'utf8')

const cardStart = source.indexOf('className: "min-w-0 overflow-hidden rounded-[16px]')
const previewStart = source.indexOf('className: "admin-chat-preview-v484')
const previewEnd = source.indexOf('] })', previewStart)
assert.ok(cardStart >= 0, 'contained sidebar card must exist')
assert.ok(previewStart > cardStart, 'v484 conversation preview row must exist inside the card')
assert.ok(previewEnd > previewStart, 'conversation preview boundary must exist')

const preview = source.slice(previewStart, previewEnd)
assert.match(preview, /width: "100%"/)
assert.match(preview, /flex: "1 1 0%"/)
assert.match(preview, /width: 0/)
assert.match(preview, /overflow: "hidden"/)
assert.match(preview, /textOverflow: "ellipsis"/)
assert.match(preview, /whiteSpace: "nowrap"/)
assert.match(preview, /flexShrink: 0/)
assert.match(preview, /title: e\.latestBody \|\| e\.staffName/)
assert.equal((source.match(/data-lien-chat-thread-preview/g) || []).length, 1)
assert.equal((source.match(/data-lien-chat-body/g) || []).length, 1)

console.log('admin chat constrained one-line preview runtime tests passed')
