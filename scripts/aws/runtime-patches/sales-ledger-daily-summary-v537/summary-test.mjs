import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = path.dirname(fileURLToPath(import.meta.url))
const { describeSale, paymentBucket, summarizeSales, tokyoDateKey } = require(path.join(root, 'sales-ledger-summary-v537.js'))

assert.equal(tokyoDateKey('2026-08-31T14:59:59.000Z'), '2026-08-31')
assert.equal(tokyoDateKey('2026-08-31T15:00:00.000Z'), '2026-09-01')
assert.equal(paymentBucket('現金'), 'cash')
assert.equal(paymentBucket('クレジットカード'), 'card')
assert.equal(paymentBucket('Suica'), 'electronic')
assert.equal(paymentBucket('PayPay'), 'qr')
assert.equal(paymentBucket('銀行振込'), 'other')

const standard = describeSale({
  paidAt: '2026-08-03T03:00:00.000Z',
  amount: 17380,
  productTotal: 4180,
  pointDiscount: 0,
  taxRate: 10,
  paymentMethod: '現金',
  staffName: '真鍋 蓮',
  note: '基本施術料金 13,200円 / 商品 4,180円 / クーポン なし / ポイント割引 0円 / お支払い 17,380円 / うち消費税（10%） 1,580円',
})
assert.equal(standard.serviceTotal, 13200)
assert.equal(standard.productTotal, 4180)
assert.equal(standard.netTotal, 15800)
assert.equal(standard.includedTax, 1580)
assert.equal(standard.grossTotal, 17380)

const discounted = describeSale({
  paidAt: '2026-08-03T05:00:00.000Z',
  amount: 15980,
  productTotal: 4180,
  pointDiscount: 400,
  taxRate: 10,
  paymentMethod: 'PayPay',
  staffName: '高瀬 美月',
  note: '基本施術料金 13,200円 / 商品 4,180円 / クーポン ご優待 -1,000円 / ポイント割引 400円 / お支払い 15,980円 / うち消費税（10%） 1,452円',
})
assert.equal(discounted.serviceTotal, 13200)
assert.equal(discounted.couponDiscount, 1000)
assert.equal(discounted.pointDiscount, 400)
assert.equal(discounted.paymentBucket, 'qr')

const legacy = describeSale({
  paidAt: '2026-08-04T05:00:00.000Z',
  amount: 11000,
  productTotal: 2200,
  taxRate: 10,
  paymentMethod: null,
  note: '施術と店販を会計済み',
})
assert.equal(legacy.serviceTotal, 8800)
assert.equal(legacy.includedTax, 1000)
assert.equal(legacy.staffKey, 'フリー')

const aggregate = summarizeSales([
  { ...standard, paidAt: '2026-08-03T03:00:00.000Z', amount: 17380, paymentMethod: '現金', staffName: '真鍋 蓮', note: '基本施術料金 13,200円 / 商品 4,180円 / ポイント割引 0円 / うち消費税（10%） 1,580円' },
  { ...discounted, paidAt: '2026-08-03T05:00:00.000Z', amount: 15980, paymentMethod: 'PayPay', staffName: '高瀬 美月', note: '基本施術料金 13,200円 / 商品 4,180円 / クーポン ご優待 -1,000円 / ポイント割引 400円 / うち消費税（10%） 1,452円' },
]).summary
assert.equal(aggregate.days.length, 1)
assert.equal(aggregate.days[0].transactions, 2)
assert.equal(aggregate.totals.grossTotal, 33360)
assert.equal(aggregate.totals.payments.cash, 17380)
assert.equal(aggregate.totals.payments.qr, 15980)
assert.deepEqual(aggregate.staff, ['真鍋 蓮', '高瀬 美月'])

console.log(JSON.stringify({ release: 'sales-ledger-daily-summary-v537', summaryCalculationsVerified: true }))
