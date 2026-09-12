import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
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

const sourcePath = path.resolve(process.argv[2] || '')
const outputPath = path.resolve(process.argv[3] || 'catalog.json')
if (!sourcePath) throw new Error('Usage: node extract-catalog.mjs <source.xlsx> <catalog.json>')

const artifactTool = process.env.ARTIFACT_TOOL_MODULE || '@oai/artifact-tool'
const artifactSpecifier = artifactTool.includes('/') || artifactTool.includes('\\')
  ? pathToFileURL(path.resolve(artifactTool)).href
  : artifactTool
const { FileBlob, SpreadsheetFile } = await import(artifactSpecifier)

const configs = [
  standard('AJ', 1, { category: 0, code: 1, name: 2, capacity: 3, pack: 4, packTotal: 5, salon: 6, retail: 7, note: 8, release: 9, jan: 10, ended: 11 }),
  standard('GM', 1, { category: 0, code: 1, name: 2, capacity: 3, pack: 4, packTotal: 5, salon: 6, retail: 7, note: 8, release: 9, jan: 10, ended: 11 }),
  standard('IMP', 1, { category: 0, code: 1, name: 2, capacity: 3, pack: 4, packTotal: 5, salon: 6, retail: 7, note: 8, release: 9, jan: 10, ended: 11 }),
  standard('LAS', 1, { category: 0, code: 1, name: 2, capacity: 3, pack: 4, packTotal: 5, salon: 6, retail: 7, note: 8, release: 9, jan: 10, ended: 11 }),
  standard('im', 1, { category: 0, code: 1, name: 2, capacity: 3, pack: 4, packTotal: 5, salon: 6, retail: 7, note: 8, release: 9, jan: 10, ended: 11 }),
  standard('ALA', 1, { category: 0, code: 1, name: 2, capacity: 3, pack: 4, packTotal: 5, salon: 6, retail: 7, note: 8, release: 9, jan: 10, ended: 11 }),
  standard('ﾊﾟｰﾏ', 1, { category: 0, code: 1, name: 2, capacity: 3, pack: 4, packTotal: 5, salon: 6, retail: 7, note: 8, release: 9, jan: 10, ended: 11 }),
  standard('ｶﾗｰ', 1, { category: 0, code: 1, name: 2, capacity: 3, pack: 4, packTotal: 5, salon: 6, retail: 7, note: 8, release: 9, jan: 10, ended: 11 }),
  standard('その他ﾂｰﾙ・ﾐﾆ・ｻｯｼｪ', 1, { category: 0, code: 1, name: 2, capacity: 3, pack: 4, packTotal: 5, salon: 6, retail: 7, note: 8, release: 9, jan: 10, ended: 11 }),
  standard('ﾍｱｹｱ・処理剤', 2, { category: 0, code: 1, name: 2, capacity: 3, pack: 4, packTotal: 5, salon: 7, retail: 9, note: 10, release: 11, jan: 12, ended: 13 }),
  standard('ｽﾀｲﾘﾝｸﾞ', 2, { category: 0, code: 1, name: 2, capacity: 3, pack: 4, packTotal: 5, salon: 7, retail: 9, note: 10, release: 11, jan: 12, ended: 13 }),
  standard('VL', 5, { code: 7, name: 1, capacity: 3, pack: 4, packTotal: 5, salon: 10, retail: 11, note: 9, jan: 8, ended: 13 }, 'ヴィラロドラ'),
  standard('PJO', 5, { code: 7, name: 1, capacity: 3, pack: 4, packTotal: 5, salon: 9, retail: 10, jan: 8 }, 'PJOLI'),
  standard('DM価格', 1, { code: 0, name: 1, pack: 2, orderUnit: 3, salon: 5, note: 7, release: 6, jan: 8 }, '販促物・DM'),
  standard('商品価格（ﾛｯﾄﾞ・ﾛｰﾗｰ）', 1, { code: 0, name: 1, capacity: 2, pack: 3, packTotal: 4, salon: 7, retail: 8, note: 9, release: 10, jan: 11 }, 'ロッド・ローラー'),
]

const lastRows = {
  AJ: 440,
  GM: 670,
  IMP: 208,
  LAS: 25,
  VL: 276,
  PJO: 65,
  im: 60,
  ALA: 7,
  'ﾊﾟｰﾏ': 233,
  'ﾍｱｹｱ・処理剤': 688,
  'ｶﾗｰ': 1626,
  'ｽﾀｲﾘﾝｸﾞ': 153,
  'その他ﾂｰﾙ・ﾐﾆ・ｻｯｼｪ': 165,
  'DM価格': 127,
  '商品価格（ﾛｯﾄﾞ・ﾛｰﾗｰ）': 57,
}

function standard(sheet, headerRow, columns, fallbackCategory = '') {
  return { sheet, headerRow, columns, fallbackCategory }
}

function makeDescription(config, row) {
  const columns = config.columns
  const details = [
    ['容量', columns.capacity === undefined ? '' : cleanText(row[columns.capacity])],
    ['入数', columns.pack === undefined ? '' : cleanText(row[columns.pack])],
    ['入数計', columns.packTotal === undefined ? '' : cleanText(row[columns.packTotal])],
    ['発売日', columns.release === undefined ? '' : excelDate(row[columns.release])],
    ['備考', columns.note === undefined ? '' : cleanText(row[columns.note])],
    ['価格表', config.sheet],
  ]
  return details.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`).join(' / ').slice(0, 1000)
}

function inheritedName(baseName, capacity, inherited) {
  if (!inherited) return baseName
  const suffix = cleanText(capacity)
  return suffix ? `${baseName} ${suffix}`.slice(0, 180) : baseName
}

const sourceBytes = await fs.readFile(sourcePath)
const sourceSha256 = crypto.createHash('sha256').update(sourceBytes).digest('hex')
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(sourcePath))
const products = []
const sheets = []
const skipped = { ended: 0, missingCodeOrName: 0, missingSalonPrice: 0, invalidJan: 0, duplicateIdentical: 0 }

for (const config of configs) {
  const sheet = workbook.worksheets.getItem(config.sheet)
  const rows = sheet.getRange(`A1:N${lastRows[config.sheet]}`).values
  let lastName = ''
  let imported = 0
  for (let index = config.headerRow; index < rows.length; index += 1) {
    const row = rows[index] || []
    const columns = config.columns
    const code = cleanCode(row[columns.code])
    const explicitName = cleanText(row[columns.name])
    if (explicitName) lastName = explicitName
    if (!code || !lastName) {
      skipped.missingCodeOrName += 1
      continue
    }
    const ended = columns.ended === undefined ? '' : cleanText(row[columns.ended])
    if (ended) {
      skipped.ended += 1
      continue
    }
    const wholesalePrice = money(row[columns.salon])
    if (wholesalePrice === null) {
      skipped.missingSalonPrice += 1
      continue
    }
    const rawJan = columns.jan === undefined ? '' : cleanText(row[columns.jan])
    const normalizedJan = columns.jan === undefined ? null : janCode(row[columns.jan])
    if (rawJan && !normalizedJan && !/^(?:-|―|ー|#REF!)$/i.test(rawJan)) skipped.invalidJan += 1
    const orderUnitCandidate = columns.orderUnit === undefined ? 1 : money(row[columns.orderUnit])
    const orderUnit = Number.isInteger(orderUnitCandidate) && orderUnitCandidate >= 1 && orderUnitCandidate <= 999 ? orderUnitCandidate : 1
    const product = {
      manufacturerName: MANUFACTURER_NAME,
      name: inheritedName(lastName, columns.capacity === undefined ? '' : row[columns.capacity], !explicitName),
      category: cleanText(columns.category === undefined ? config.fallbackCategory : row[columns.category]) || config.fallbackCategory || null,
      productCode: code,
      janCode: normalizedJan,
      wholesalePrice,
      suggestedRetailPrice: columns.retail === undefined ? null : money(row[columns.retail]),
      orderUnit,
      description: makeDescription(config, row),
      source: { sheet: config.sheet, row: index + 1 },
    }
    products.push(product)
    imported += 1
  }
  sheets.push({ name: config.sheet, imported })
}

const byCode = new Map()
for (const product of products) {
  const previous = byCode.get(product.productCode)
  if (!previous) {
    byCode.set(product.productCode, product)
    continue
  }
  const left = JSON.stringify({ ...previous, source: undefined })
  const right = JSON.stringify({ ...product, source: undefined })
  if (left !== right) throw new Error(`Conflicting duplicate product code ${product.productCode}: ${previous.source.sheet}:${previous.source.row} and ${product.source.sheet}:${product.source.row}`)
  skipped.duplicateIdentical += 1
}

const uniqueProducts = [...byCode.values()].sort((left, right) => left.productCode.localeCompare(right.productCode, 'ja'))
const catalog = {
  release: RELEASE,
  dealerCode: DEALER_CODE,
  dealerName: DEALER_NAME,
  manufacturerName: MANUFACTURER_NAME,
  sourceFile: path.basename(sourcePath),
  sourceSha256,
  includedSheets: sheets,
  excludedSheets: ['AJ(2018731終了)', '＜修理費用早見表＞'],
  skipped,
  products: uniqueProducts,
}
catalog.catalogDigest = catalogDigest(catalog.products)
validateCatalog(catalog)
await fs.mkdir(path.dirname(outputPath), { recursive: true })
await fs.writeFile(outputPath, `${JSON.stringify(catalog)}\n`, 'utf8')
console.log(JSON.stringify({ release: RELEASE, productCount: catalog.products.length, catalogDigest: catalog.catalogDigest, sourceSha256, sheets, skipped }))
