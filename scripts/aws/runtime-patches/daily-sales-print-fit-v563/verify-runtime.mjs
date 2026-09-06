import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const script = fs.readFileSync(path.join(root, 'public', 'daily-sales-print-fit-v563.js'), 'utf8')
const style = fs.readFileSync(path.join(root, 'public', 'daily-sales-print-fit-v563.css'), 'utf8')

assert.match(server, /X-Lien-Daily-Sales-Print-Fit', 'v563'/)
assert.match(server, /daily-sales-print-fit-v563\.css\?v=563-release1/)
assert.match(server, /daily-sales-print-fit-v563\.js\?v=563-release1/)
assert.doesNotMatch(server, /daily-sales-complete-print-v541\.css\?v=541-release1/)
assert.match(script, /__orimiaDailySalesPrintV563/)
assert.match(script, /buildTable\(sourceTable, columnCount\)/)
assert.match(script, /document\.createElement\('colgroup'\)/)
assert.match(style, /size: A4 landscape/)
assert.match(style, /table-layout: fixed !important/)
assert.match(style, /max-width: 100% !important/)
assert.doesNotMatch(style, /overflow-x:\s*auto/)

console.log(JSON.stringify({ release:'daily-sales-print-fit-v563', verified:true }))
