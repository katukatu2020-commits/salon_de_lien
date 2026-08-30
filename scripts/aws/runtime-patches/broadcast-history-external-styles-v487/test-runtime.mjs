import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const source = fs.readFileSync(`${root}/.next/server/app/admin/customers/messages/page.js`, 'utf8')
const css = fs.readFileSync(`${root}/public/runtime-patches/broadcast-history-v487.css`, 'utf8')

const marker = source.indexOf('"data-lien-broadcast-history": "v487"')
const detailsStart = source.lastIndexOf('(0, r.jsxs)("details", {', marker)
const summaryStart = source.indexOf('(0, r.jsxs)("summary", {', marker)
const contentStart = source.indexOf('id: "broadcast-history-content-v487"', summaryStart)
const articleStart = source.indexOf('b.map((e) => {', contentStart)
const stylesheetStart = source.lastIndexOf('r.jsx("link", {', detailsStart)

assert.ok(stylesheetStart >= 0)
assert.ok(detailsStart > stylesheetStart)
assert.ok(marker > detailsStart)
assert.ok(summaryStart > marker)
assert.ok(contentStart > summaryStart)
assert.ok(articleStart > contentStart)
assert.doesNotMatch(source.slice(detailsStart, summaryStart), /\bopen\s*:/)
assert.match(source, /children: \["[^"\]]+", b\.length, "[^"\]]+"\]/)
assert.match(source, /children: e\.title/)
assert.match(source, /children: e\.body/)
assert.match(source, /children: e\.audienceMatchedCount/)
assert.match(css, /:not\(\[open\]\) > \[data-lien-broadcast-history-content\] \{ display: none !important; \}/)
assert.match(css, /\[open\] > \[data-lien-broadcast-history-content\] \{ display: block !important; \}/)

console.log('broadcast history external stylesheet runtime tests passed')
