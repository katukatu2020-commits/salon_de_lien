'use strict'

const TOKYO_TIME_ZONE = 'Asia/Tokyo'
const PAYMENT_BUCKETS = ['cash', 'card', 'electronic', 'qr', 'other']

function amount(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0
}

function noteAmount(note, pattern) {
  const match = String(note || '').match(pattern)
  if (!match) return null
  const parsed = Number(String(match[1] || '').replaceAll(',', ''))
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : null
}

function tokyoDateKey(value) {
  const parsed = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(parsed.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TOKYO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(parsed)
  const part = type => parts.find(item => item.type === type)?.value || ''
  const year = part('year')
  const month = part('month')
  const day = part('day')
  return year && month && day ? `${year}-${month}-${day}` : ''
}

function paymentBucket(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return 'other'
  if (/現金|cash/.test(normalized)) return 'cash'
  if (/クレジット|credit|visa|master|amex|diners|discover|jcb/.test(normalized)) return 'card'
  if (/paypay|line\s*pay|楽天ペイ|d払い|au\s*pay|メルペイ|ゆうちょpay|qr|コード決済/.test(normalized)) return 'qr'
  if (/電子マネー|交通系|suica|pasmo|icoca|nanaco|waon|quicpay|quickpay|i[dｄ]/.test(normalized)) return 'electronic'
  return 'other'
}

function describeSale(row) {
  const note = String(row.note || '')
  const grossTotal = amount(row.amount)
  const productTotal = amount(row.productTotal)
  const fallbackPointDiscount = amount(row.pointDiscount)
  const baseService = noteAmount(note, /基本施術料金\s*([\d,]+)円/)
  const longHairCharge = noteAmount(note, /ロング料金(?:\s*[ML]{1,2})?\s*\+?\s*([\d,]+)円/)
  const couponDiscount = noteAmount(note, /クーポン\s+[^/]*?-\s*([\d,]+)円/) || 0
  const pointFromNote = noteAmount(note, /ポイント(?:割引|利用)\s*([\d,]+)円/)
  const pointDiscount = pointFromNote == null ? fallbackPointDiscount : pointFromNote
  const nominationFee = noteAmount(note, /指名(?:料|料金)\s*\+?\s*([\d,]+)円/) || 0
  const shippingFee = noteAmount(note, /送料\s*\+?\s*([\d,]+)円/) || 0
  const noteTax = String(note).match(/うち消費税[（(](\d+)%[）)]\s*([\d,]+)円/)
  const configuredTaxRate = Number(row.taxRate)
  const taxRate = noteTax
    ? Math.max(0, Number(noteTax[1]) || 0)
    : Number.isFinite(configuredTaxRate) ? Math.max(0, configuredTaxRate) : 10
  const parsedTax = noteTax ? amount(String(noteTax[2]).replaceAll(',', '')) : null
  const includedTax = parsedTax == null
    ? (taxRate > 0 ? Math.floor(grossTotal * taxRate / (100 + taxRate)) : 0)
    : Math.min(grossTotal, parsedTax)
  const beforeDiscount = grossTotal + couponDiscount + pointDiscount
  const fallbackService = Math.max(0, beforeDiscount - productTotal - nominationFee - shippingFee)
  const explicitService = baseService == null ? null : baseService + (longHairCharge || 0)
  const explicitSubtotal = explicitService == null
    ? null
    : explicitService + productTotal + nominationFee + shippingFee
  const serviceTotal = explicitSubtotal != null && Math.abs(explicitSubtotal - beforeDiscount) <= 2
    ? explicitService
    : fallbackService

  return {
    saleDate: tokyoDateKey(row.paidAt),
    grossTotal,
    netTotal: Math.max(0, grossTotal - includedTax),
    includedTax,
    taxRate,
    serviceTotal,
    productTotal,
    couponDiscount,
    pointDiscount,
    nominationFee,
    shippingFee,
    paymentBucket: paymentBucket(row.paymentMethod),
    staffKey: String(row.staffName || '').trim() || 'フリー',
  }
}

function emptySummaryRow(date = '') {
  return {
    date,
    transactions: 0,
    serviceTotal: 0,
    productTotal: 0,
    couponDiscount: 0,
    netTotal: 0,
    includedTax: 0,
    grossTotal: 0,
    nominationFee: 0,
    shippingFee: 0,
    pointDiscount: 0,
    payments: Object.fromEntries(PAYMENT_BUCKETS.map(key => [key, 0])),
    staffSales: {},
  }
}

function addSale(target, sale) {
  target.transactions += 1
  for (const key of [
    'serviceTotal',
    'productTotal',
    'couponDiscount',
    'netTotal',
    'includedTax',
    'grossTotal',
    'nominationFee',
    'shippingFee',
    'pointDiscount',
  ]) target[key] += amount(sale[key])
  const bucket = PAYMENT_BUCKETS.includes(sale.paymentBucket) ? sale.paymentBucket : 'other'
  target.payments[bucket] += amount(sale.grossTotal)
  const staff = String(sale.staffKey || '').trim() || 'フリー'
  target.staffSales[staff] = amount(target.staffSales[staff]) + amount(sale.grossTotal)
}

function summarizeSales(rows) {
  const days = new Map()
  const totals = emptySummaryRow('total')
  const normalizedRows = []

  for (const row of Array.isArray(rows) ? rows : []) {
    const breakdown = describeSale(row)
    const normalized = { ...row, ...breakdown }
    normalizedRows.push(normalized)
    if (!breakdown.saleDate) continue
    if (!days.has(breakdown.saleDate)) days.set(breakdown.saleDate, emptySummaryRow(breakdown.saleDate))
    addSale(days.get(breakdown.saleDate), breakdown)
    addSale(totals, breakdown)
  }

  const staff = Object.entries(totals.staffSales)
    .filter(([, value]) => value > 0)
    .sort(([leftName, leftValue], [rightName, rightValue]) => {
      if (leftName === 'フリー') return 1
      if (rightName === 'フリー') return -1
      return rightValue - leftValue || leftName.localeCompare(rightName, 'ja')
    })
    .map(([name]) => name)

  return {
    rows: normalizedRows,
    summary: {
      days: [...days.values()].sort((left, right) => left.date.localeCompare(right.date)),
      totals,
      staff,
    },
  }
}

module.exports = {
  PAYMENT_BUCKETS,
  amount,
  describeSale,
  paymentBucket,
  summarizeSales,
  tokyoDateKey,
}
