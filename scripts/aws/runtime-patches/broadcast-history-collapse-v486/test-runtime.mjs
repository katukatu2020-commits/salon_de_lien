import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const source = fs.readFileSync(`${root}/.next/server/app/admin/customers/messages/page.js`, 'utf8')

const marker = source.indexOf('"data-lien-broadcast-history": "v486"')
const detailsStart = source.lastIndexOf('(0, r.jsxs)("details", {', marker)
const summaryStart = source.indexOf('(0, r.jsxs)("summary", {', marker)
const contentStart = source.indexOf('id: "broadcast-history-content-v486"', summaryStart)
const articleStart = source.indexOf('b.map((e) => {', contentStart)

assert.ok(detailsStart >= 0)
assert.ok(marker > detailsStart)
assert.ok(summaryStart > marker)
assert.ok(contentStart > summaryStart)
assert.ok(articleStart > contentStart)
assert.match(source, /:not\(\[open\]\) > \[data-lien-broadcast-history-content\] \{ display: none !important; \}/)
assert.match(source, /\[open\] > \[data-lien-broadcast-history-content\] \{ display: block !important; \}/)
assert.doesNotMatch(source.slice(detailsStart, summaryStart), /\bopen\s*:/)
assert.match(source, /children: \["履歴を表示（", b\.length, "件）"\]/)
assert.match(source, /children: "履歴を閉じる"/)
assert.match(source, /children: e\.title/)
assert.match(source, /children: e\.body/)
assert.match(source, /children: e\.audienceMatchedCount/)

console.log('broadcast history explicit visibility runtime tests passed')
