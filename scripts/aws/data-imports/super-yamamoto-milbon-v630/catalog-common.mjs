import crypto from 'node:crypto'

export const RELEASE = 'super-yamamoto-milbon-v630'
export const DEALER_CODE = 'DLR-60EA86D040'
export const DEALER_NAME = 'スーパーヤマモト'
export const MANUFACTURER_NAME = 'ミルボン'
export const SOURCE_FILE = 'ミルボン全商品価格表※税抜き表示_20260912105328.xlsx'
export const SOURCE_SHA256 = 'af903769b796426596abdac67573fec69e51c6a49b5c910dce301e6cc8f9f769'
export const EXPECTED_PRODUCT_COUNT = 2644
export const EXPECTED_CATALOG_DIGEST = '6565533c46700690230b99f437fb19b57e3aa4a38f53eb383e9fd5e234b3b707'

export function cleanText(value) {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/\u3000/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, ' / ')
    .trim()
}

export function cleanCode(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : String(value).replace(/\.0+$/, '')
  }
  return cleanText(value).replace(/\s+/g, '').toUpperCase()
}

export function money(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value)
  const text = cleanText(value)
  if (!text || /^(?:-|―|ー|#REF!|なし)$/i.test(text)) return null
  const normalized = text.replace(/[￥¥円,\s]/g, '')
  if (!/^\d+(?:\.0+)?$/.test(normalized)) return null
  return Math.round(Number(normalized))
}

export function janCode(value) {
  const text = cleanCode(value)
  if (!text || /^(?:-|―|ー|#REF!)$/i.test(text)) return null
  const digits = text.replace(/[^0-9]/g, '')
  return /^(?:\d{8}|\d{13})$/.test(digits) ? digits : null
}

export function excelDate(value) {
  if (typeof value === 'number' && value >= 20_000 && value <= 80_000) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86_400_000)
    return date.toISOString().slice(0, 10)
  }
  return cleanText(value)
}

export function canonicalProduct(product) {
  return {
    manufacturerName: cleanText(product.manufacturerName),
    name: cleanText(product.name),
    category: cleanText(product.category) || null,
    productCode: cleanCode(product.productCode),
    janCode: product.janCode ? cleanCode(product.janCode) : null,
    wholesalePrice: Number(product.wholesalePrice),
    suggestedRetailPrice: product.suggestedRetailPrice === null || product.suggestedRetailPrice === undefined
      ? null
      : Number(product.suggestedRetailPrice),
    orderUnit: Number(product.orderUnit || 1),
    description: cleanText(product.description) || null,
  }
}

export function catalogDigest(products) {
  const canonical = products
    .map(canonicalProduct)
    .sort((left, right) => left.productCode.localeCompare(right.productCode, 'ja'))
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex')
}

export function validateCatalog(catalog, { enforceManifest = true } = {}) {
  if (!catalog || catalog.release !== RELEASE) throw new Error('Unexpected catalog release.')
  if (catalog.dealerCode !== DEALER_CODE || catalog.dealerName !== DEALER_NAME) throw new Error('Unexpected target dealer.')
  if (catalog.manufacturerName !== MANUFACTURER_NAME) throw new Error('Unexpected manufacturer.')
  if (!Array.isArray(catalog.products) || catalog.products.length === 0) throw new Error('Catalog is empty.')

  const codes = new Set()
  for (const raw of catalog.products) {
    const product = canonicalProduct(raw)
    if (!product.productCode || product.productCode.length > 100) throw new Error('Invalid product code.')
    if (codes.has(product.productCode)) throw new Error(`Duplicate product code: ${product.productCode}`)
    codes.add(product.productCode)
    if (!product.name || product.name.length > 180) throw new Error(`Invalid product name: ${product.productCode}`)
    if (product.manufacturerName !== MANUFACTURER_NAME) throw new Error(`Invalid manufacturer: ${product.productCode}`)
    if (product.category && product.category.length > 100) throw new Error(`Category is too long: ${product.productCode}`)
    if (product.janCode && !/^(?:\d{8}|\d{13})$/.test(product.janCode)) throw new Error(`Invalid JAN: ${product.productCode}`)
    if (!Number.isInteger(product.wholesalePrice) || product.wholesalePrice < 0 || product.wholesalePrice > 10_000_000) throw new Error(`Invalid salon price: ${product.productCode}`)
    if (product.suggestedRetailPrice !== null && (!Number.isInteger(product.suggestedRetailPrice) || product.suggestedRetailPrice < 0 || product.suggestedRetailPrice > 10_000_000)) throw new Error(`Invalid retail price: ${product.productCode}`)
    if (!Number.isInteger(product.orderUnit) || product.orderUnit < 1 || product.orderUnit > 999) throw new Error(`Invalid order unit: ${product.productCode}`)
    if (product.description && product.description.length > 1000) throw new Error(`Description is too long: ${product.productCode}`)
  }

  const digest = catalogDigest(catalog.products)
  if (catalog.catalogDigest !== digest) throw new Error(`Catalog digest mismatch: expected ${catalog.catalogDigest}, calculated ${digest}`)
  if (enforceManifest && (catalog.sourceFile !== SOURCE_FILE || catalog.sourceSha256 !== SOURCE_SHA256)) throw new Error('Catalog source fingerprint mismatch.')
  if (enforceManifest && (catalog.products.length !== EXPECTED_PRODUCT_COUNT || digest !== EXPECTED_CATALOG_DIGEST)) throw new Error('Catalog release manifest mismatch.')
  return { productCount: catalog.products.length, digest }
}
