import fs from 'node:fs'

const parser = fs.readFileSync('/app/.next/server/chunks/3447.js', 'utf8')
const detail = fs.readFileSync('/app/.next/server/app/admin/appointments/[appointmentId]/page.js', 'utf8')
const tenant = fs.readFileSync('/app/tenant-setup.js', 'utf8')
const inbound = fs.readFileSync('/app/inbound-email.js', 'utf8')

for (const marker of [
  'usedGiftAmount: extractReservationUsageAmount(t, u.usedGiftAmount)',
  'otherDiscountAmount: extractReservationUsageAmount(t, u.otherDiscountAmount)',
  'prepaidAmount: extractReservationUsageAmount(t, u.prepaidAmount)',
  '`利用ギフト券: ${externalUsedGiftAmount}円`',
]) {
  if (!parser.includes(marker)) throw new Error(`compiled parser marker missing: ${marker}`)
}

for (const marker of [
  'if (!clean.startsWith(label)) continue',
  'const suffix = clean.slice(label.length)',
  'const usedPointsText = extractSection',
  'const usedGiftText = extractSection',
  'const paymentDueText = extractSection',
  '`利用ギフト券: ${usedGiftAmount}円`',
]) {
  if (!tenant.includes(marker)) throw new Error(`tenant parser marker missing: ${marker}`)
}

for (const marker of [
  "const usedGiftAmount = parsed.usedGiftAmount ?? preservedAmount('利用ギフト券')",
  '`支払予定額: ${paymentDue}円`',
]) {
  if (!inbound.includes(marker)) throw new Error(`inbound parser marker missing: ${marker}`)
}

for (const marker of [
  'externalPayableAmount = importedPaymentDue',
  'children: "予約サイト利用ポイント"',
  'children: "利用ギフト券"',
  'children: "お支払い予定額"',
  'initialSubtotal: externalPayableAmount',
]) {
  if (!detail.includes(marker)) throw new Error(`appointment detail marker missing: ${marker}`)
}

new Function(parser)
new Function(tenant)
new Function(inbound)
console.log('reservation financial breakdown v392 verified')
