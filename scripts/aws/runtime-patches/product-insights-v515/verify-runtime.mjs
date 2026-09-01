import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const server = read('server.js')
const asset = read('public/product-insights-v515.js')
const report = read('.next/server/chunks/6006.js')
const layout = read('.next/static/chunks/app/layout-runtime-v515.js')
const appManifest = read('.next/app-build-manifest.json')

assert.match(server, /X-Lien-Product-Insights', 'v515'/)
assert.match(server, /product-insights-v515\.js\?v=515/)
assert.match(server, /p\."imageUrl"/)
assert.match(server, /COUNT\(r\."id"\)::int AS "reviewCount"/)
assert.match(server, /AVG\(r\."rating"\)::float8 AS "averageRating"/)
assert.match(server, /Cache-Control', 'private, no-store'/)

assert.match(asset, /商品別 販売インサイト/)
assert.match(asset, /averageRating/)
assert.match(asset, /reviewCount/)
assert.match(asset, /data-sp-product-image/)
assert.match(asset, /insightProduct/)
assert.match(asset, /商品別 販売インサイトへ戻る/)
assert.match(asset, /popstate/)
assert.match(asset, /pageshow/)

assert.match(report, /products: report\.products\.filter/)
assert.match(report, /product\.productId === e\.insightProduct/)
assert.match(report, /i && s\.set\("insightProduct", i\)/)
assert.match(report, /product-insights-v515/)

assert.match(layout, /product-insights-v515-inline/)
assert.match(layout, /商品別 販売インサイト/)
assert.match(appManifest, /layout-runtime-v515\.js/)
assert.doesNotMatch(appManifest, /layout-runtime-v510\.js/)

console.log(JSON.stringify({ release: 'product-insights-v515', verified: true }))
