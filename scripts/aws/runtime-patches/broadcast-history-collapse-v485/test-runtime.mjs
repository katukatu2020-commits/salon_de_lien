import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const source = fs.readFileSync(`${root}/.next/server/app/admin/customers/messages/page.js`, 'utf8')

const detailsMarker = source.indexOf('"data-lien-broadcast-history": "v485"')
const detailsStart = source.lastIndexOf('(0, r.jsxs)("details", {', detailsMarker)
const summaryStart = source.indexOf('(0, r.jsxs)("summary", {', detailsMarker)
const contentStart = source.indexOf('id: "broadcast-history-content-v485"', summaryStart)
const firstArticle = source.indexOf('b.map((e) => {', contentStart)

assert.ok(detailsStart >= 0)
assert.ok(detailsMarker > detailsStart)
assert.ok(summaryStart > detailsMarker)
assert.ok(contentStart > summaryStart)
assert.ok(firstArticle > contentStart)
assert.equal((source.match(/broadcast-history-content-v485/g) || []).length, 1)
assert.equal((source.match(/data-lien-history-open-label/g) || []).length >= 2, true)
assert.equal((source.match(/data-lien-history-close-label/g) || []).length >= 3, true)
assert.doesNotMatch(source.slice(detailsStart, summaryStart), /\bopen\s*:/)
assert.match(source, /summary::-webkit-details-marker \{ display: none; \}/)
assert.match(source, /focus-visible:ring-2/)
assert.match(source, /children: e\.title/)
assert.match(source, /children: e\.body/)
assert.match(source, /children: e\.audienceMatchedCount/)

console.log('broadcast history disclosure runtime tests passed')
