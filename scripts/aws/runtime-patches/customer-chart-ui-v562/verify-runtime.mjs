import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const commercial = fs.readFileSync(path.join(root, 'commercial-admin-v101.js'), 'utf8')

assert.match(server, /X-Lien-Customer-Chart-UI', 'v562'/)
assert.match(server, /X-Lien-Salon-Records-Controls', 'v561'/)
assert.match(commercial, /__lienCustomerChartUiV562 = true/)
assert.match(commercial, /customer-chart-ui-v562/)
assert.match(commercial, /lien-chart-card-header/)
assert.match(commercial, /grid-template-columns:minmax\(0,1fr\) 310px/)
assert.match(commercial, /LATEST CHART/)
assert.match(commercial, /保存済みカルテ/)
assert.match(commercial, /カルテ写真履歴/)
assert.match(commercial, /data-chart-preview-image aria-label="最新のカルテ写真を拡大表示"/)
assert.match(commercial, /window\.scrollTo\(\{ top:0, behavior:'auto' \}\)/)
assert.doesNotMatch(commercial, /<h1>過去のカルテ<\/h1><p>最新を含むカルテ写真/)

console.log(JSON.stringify({ release:'customer-chart-ui-v562', commercialChartUi:true, verified:true }))
