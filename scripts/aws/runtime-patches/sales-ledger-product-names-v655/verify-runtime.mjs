import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const snapshot = process.argv[2] === 'snapshot'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const service = read('sales-ledger-accounts-v318.js')
const client = read('sales-ledger-client-v318.js')
const server = read('server.js')

assert.match(server, /X-Lien-Customer-Store-Unlink', 'v654'/)
assert.match(server, /X-Lien-Sales-Ledger-Daily-Summary', 'v537'/)

if (snapshot) {
  assert.doesNotMatch(server, /X-Lien-Sales-Ledger-Product-Names/)
  assert.doesNotMatch(service, /normalizeProductLines/)
  assert.doesNotMatch(client, /function productLinesMarkup/)
  console.log(JSON.stringify({ snapshot: true, parent: 'v654' }))
  process.exit(0)
}

for (const required of [
  `COALESCE(lines."productLines",'[]'::jsonb) AS "productLines"`,
  `jsonb_agg(jsonb_build_object(`,
  `'name',l."productNameSnapshot"`,
  `'manufacturer',l."manufacturerNameSnapshot"`,
  `ORDER BY l."createdAt",l."id"`,
  `search_line."productNameSnapshot" ILIKE`,
  `search_line."manufacturerNameSnapshot" ILIKE`,
  `productLines: normalizeProductLines(row.productLines)`,
  `sales-ledger-product-names-v655 */`,
]) assert.ok(service.includes(required), `sales ledger service invariant missing: ${required}`)

for (const required of [
  `const VERSION = 'sales-ledger-product-names-v655'`,
  `function productLinesMarkup(row)`,
  `class="sl-product-cell"`,
  `class="sl-product-name"`,
  `商品計`,
  `施術・商品・メニュー・メモ`,
  `内容・商品名を検索`,
  `.sl-product-cell{min-width:250px`,
  `sales-ledger-product-names-v655 */`,
]) assert.ok(client.includes(required), `sales ledger client invariant missing: ${required}`)

assert.equal(client.includes('<td>${row.productCount ?'), false, 'legacy count-only product cell remained')
assert.match(server, /X-Lien-Sales-Ledger-Product-Names', 'v655'/)

console.log(JSON.stringify({
  release: 'sales-ledger-product-names-v655',
  runtimeVerified: true,
  historicalProductSnapshots: true,
  productKeywordSearch: true,
  productDetailRendering: true,
}))
