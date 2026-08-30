import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_APP_ROOT || '/app'
const source = fs.readFileSync(`${root}/commercial-admin-v101.js`, 'utf8')

const createBlock = source.slice(
  source.indexOf('function catalogCreateSubmit(form)'),
  source.indexOf('const jsonArray = value =>'),
)

assert.match(createBlock, /event\.target\?\.closest\?\.\('button\[type="submit"\],input\[type="submit"\]'\)/)
assert.match(createBlock, /data\.set\('kind', 'product'\)/)
assert.match(createBlock, /data\.set\('action', 'create'\)/)
assert.match(createBlock, /await postCatalog\(data\)/)
assert.match(createBlock, /window\.location\.assign\(target\)/)
assert.match(createBlock, /toast\(error\?\.message \|\| '商品を登録できませんでした。', 'error'\)/)

const clickBinding = source.indexOf("document.addEventListener('click', handleCatalogCreateClick, true)")
const submitBinding = source.indexOf("document.addEventListener('submit', handleCatalogCreateSubmit, true)")
assert.ok(clickBinding > 0 && submitBinding > clickBinding)

console.log('product-catalog-submit-v494 behavior contract tested')
