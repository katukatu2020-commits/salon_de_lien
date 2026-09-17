import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const runtimeRoot = process.env.LIEN_RUNTIME_ROOT || '/app'
const output = process.env.FIXTURE_OUTPUT || '/tmp/dealer-order-documents-v656'
const require = createRequire(path.join(runtimeRoot, 'package.json'))
const { deliveryNotePage, invoicePage } = require(path.join(runtimeRoot, 'wholesale-ordering-v543.js'))
const css = fs.readFileSync(path.join(runtimeRoot, 'wholesale-ordering-v543.css'), 'utf8')
const brandIconPath = [
  process.env.BRAND_ICON_PATH,
  path.join(runtimeRoot, 'public', 'brand', 'orimia-icon-192.png'),
  '/app/public/brand/orimia-icon-192.png',
].find(candidate => candidate && fs.existsSync(candidate))
const brandIcon = brandIconPath
  ? `data:image/png;base64,${fs.readFileSync(brandIconPath).toString('base64')}`
  : 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='

const order = {
  orderNo: 'PO-20260917-V656',
  deliveryNo: 'DN-20260917-V656',
  status: 'SHIPPED',
  taxRate: 10,
  subtotalYen: 10250,
  taxYen: 1025,
  totalYen: 11275,
  requestedDeliveryDate: '2026-09-20',
  orderedAt: '2026-09-17T01:00:00.000Z',
  shippedAt: '2026-09-17T03:00:00.000Z',
  organizationName: 'Salon de Lien',
  salonPhone: '086-333-3333',
  salonPostalCode: '700-0901',
  salonPrefecture: '岡山県',
  salonCity: '岡山市',
  salonAddressLine1: '本町3-3',
  dealerName: 'スーパーヤマモト株式会社',
  dealerPhone: '086-111-1111',
  dealerPostalCode: '700-0001',
  dealerPrefecture: '岡山県',
  dealerCity: '岡山市',
  dealerAddressLine1: '表町1-1',
  dealerInvoiceRegistrationNumber: 'T1234567890123',
  salonNote: '午前中の納品を希望します。',
  dealerNote: 'メーカー直送分を含みます。',
}
const lines = [
  { manufacturerName: 'ミルボン', productName: 'オージュア スムース トリートメント', productCode: 'MIL-001', janCode: '4900000000001', category: 'ヘアケア', quantity: 2, deliveredQuantity: 2, listPrice: 5000, unitPrice: 4000, lineTotal: 8000, discountRate: 20 },
  { manufacturerName: 'サンコール', productName: 'キートスブラン ヘアクリームバーム 190g', productCode: 'SUN-002', janCode: '4900000000002', category: 'スタイリング', quantity: 1, deliveredQuantity: 1, listPrice: 3000, unitPrice: 2250, lineTotal: 2250, discountRate: 25 },
]

function inlineStyles(html) {
  return html
    .replace(/<link rel="stylesheet" href="[^"]+">/, `<style>${css}</style>`)
    .replaceAll('/brand/orimia-icon-192.png', brandIcon)
}

fs.mkdirSync(output, { recursive: true })
fs.writeFileSync(path.join(output, 'delivery-note.html'), inlineStyles(deliveryNotePage(order, lines)))
fs.writeFileSync(path.join(output, 'invoice.html'), inlineStyles(invoicePage(order, lines)))
console.log(JSON.stringify({ output, deliveryNote: true, invoice: true }))
