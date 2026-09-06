import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const commercial = fs.readFileSync(path.join(root, 'commercial-admin-v101.js'), 'utf8')

const cssStart = commercial.indexOf('/* customer-chart-ui-v562 */')
assert.ok(cssStart >= 0)
const css = commercial.slice(cssStart)

assert.match(css, /\.lien-chart-card-header\{display:flex/)
assert.match(css, /\.lien-chart-image-shell\{display:grid/)
assert.match(css, /\.lien-chart-media img/)
assert.match(css, /@media\(max-width:900px\)/)
assert.match(css, /@media\(max-width:640px\)/)
assert.match(css, /\.lien-chart-grid\{grid-template-columns:repeat\(auto-fill,minmax\(260px,1fr\)\)/)
assert.match(css, /\.lien-chart-history \.lien-chart-status:empty\{display:none\}/)
assert.equal((commercial.match(/window\.__lienCustomerChartUiV562 = true/g) || []).length, 1)
assert.equal((commercial.match(/function imageMarkup\(item, count\)/g) || []).length, 1)
assert.equal((commercial.match(/class="lien-chart-card-header"/g) || []).length, 1)

console.log(JSON.stringify({ release:'customer-chart-ui-v562', desktopLayout:true, mobileLayout:true, historyLayout:true }))
