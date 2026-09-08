import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || path.dirname(fileURLToPath(import.meta.url))
const client = fs.readFileSync(path.join(root, 'wholesale-ordering-client-v543.js'), 'utf8')
const css = fs.readFileSync(path.join(root, 'wholesale-ordering-v543.css'), 'utf8')

for (const invariant of [
  'dealer-order-product-ui-v585',
  '<span>商品情報</span><span>取引ディーラー</span><span>契約価格（税抜）</span><span>発注単位</span><span>発注数</span>',
  'wo-contract-product-mark',
  'wo-contract-dealer',
  'wo-contract-price',
  'wo-line-subtotal',
  'title="数量を減らす"',
  'title="数量を増やす"',
  "row.classList.toggle('is-selected', value > 0)",
]) assert.ok(client.includes(invariant), `client invariant missing: ${invariant}`)

assert.ok(!client.includes('<span>商品</span><span>ディーラー</span><span>定価（税抜）</span><span>割引率</span><span>契約単価（税抜）</span><span>発注単位</span><span>発注数</span>'))
for (const pattern of [
  /dealer-order-product-ui-v585/,
  /grid-template-columns: minmax\(260px, 1\.55fr\) minmax\(150px, \.8fr\) minmax\(150px, \.8fr\) 82px 132px/,
  /\.wo-contract-product-row\.is-selected/,
  /\.wo-contract-product-row \.wo-stepper button svg/,
  /@media \(max-width: 720px\)/,
  /\.wo-contract-product-row \.wo-order-quantity \{ grid-row: auto; grid-column: 1 \/ -1; \}/,
]) assert.match(css, pattern)

console.log(JSON.stringify({
  release:'dealer-order-product-ui-v585',
  fiveColumnLayout:true,
  priceHierarchy:true,
  visibleStepper:true,
  selectedSubtotal:true,
  responsiveCards:true,
}))
