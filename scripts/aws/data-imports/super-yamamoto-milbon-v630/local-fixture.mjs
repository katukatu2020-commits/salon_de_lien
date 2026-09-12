import assert from 'node:assert/strict'
import {
  RELEASE,
  DEALER_CODE,
  DEALER_NAME,
  MANUFACTURER_NAME,
  catalogDigest,
  cleanCode,
  cleanText,
  excelDate,
  janCode,
  money,
  validateCatalog,
} from './catalog-common.mjs'

assert.equal(cleanText('  商品\n 名  '), '商品 / 名')
assert.equal(cleanCode(1234), '1234')
assert.equal(cleanCode(' ab-01 '), 'AB-01')
assert.equal(money('1,980円'), 1980)
assert.equal(money('―'), null)
assert.equal(janCode(4954835137614), '4954835137614')
assert.equal(janCode('invalid'), null)
assert.equal(excelDate(43040), '2017-11-01')

const products = [{
  manufacturerName: MANUFACTURER_NAME,
  name: 'テスト商品',
  category: 'ヘアケア',
  productCode: 'TEST-001',
  janCode: '4954835137614',
  wholesalePrice: 1000,
  suggestedRetailPrice: 1500,
  orderUnit: 1,
  description: '容量: 100mL',
}]
const catalog = {
  release: RELEASE,
  dealerCode: DEALER_CODE,
  dealerName: DEALER_NAME,
  manufacturerName: MANUFACTURER_NAME,
  products,
  catalogDigest: catalogDigest(products),
}
assert.deepEqual(validateCatalog(catalog, { enforceManifest: false }), { productCount: 1, digest: catalog.catalogDigest })
assert.throws(() => validateCatalog({ ...catalog, products: [...products, ...products] }, { enforceManifest: false }), /Duplicate product code/)
console.log(JSON.stringify({ release: RELEASE, localFixtureVerified: true }))
