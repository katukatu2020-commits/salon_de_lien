import fs from 'node:fs'

const parserPath = '/app/.next/server/chunks/3447.js'
const detailPath = '/app/.next/server/app/admin/appointments/[appointmentId]/page.js'
const tenantSetupPath = '/app/tenant-setup.js'
const inboundPath = '/app/inbound-email.js'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function replaceCount(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

let parser = fs.readFileSync(parserPath, 'utf8')
parser = replaceOnce(
  parser,
  '        usedPoints: ["今回の利用ポイント", "予約時利用ポイント", "ご利用ポイント", "利用ポイント", "ポイント利用"],',
  `        usedPoints: ["今回の利用ポイント", "予約時利用ポイント", "ご利用ポイント", "利用ポイント", "ポイント利用"],
        usedGiftAmount: ["今回の利用ギフト券", "予約時利用ギフト券", "ご利用ギフト券", "利用ギフト券", "ギフト券利用", "今回の利用ギフトカード", "利用ギフトカード"],
        otherDiscountAmount: ["今回のその他割引", "その他割引", "割引額", "値引額", "キャンペーン割引"],
        prepaidAmount: ["事前決済額", "オンライン決済額", "事前支払い金額", "事前支払額"],`,
  'compiled financial labels',
)
parser = replaceOnce(
  parser,
  '      function extractReservationPaymentDue(e) {',
  `      function extractReservationUsageAmount(e, t) {
        let a = s(e ?? "", t);
        if (!a) return null;
        if (/利用なし|未利用|なし|使用なし|適用なし/.test(a)) return 0;
        let n = a.normalize("NFKC").match(/(?:¥\\s*)?([\\d,]+)\\s*(?:円|円分)?/i);
        if (!n) return null;
        let l = Number(n[1].replace(/,/g, ""));
        return Number.isSafeInteger(l) && l >= 0 ? l : null;
      }
      function extractReservationPaymentDue(e) {`,
  'compiled usage parser',
)
parser = replaceOnce(
  parser,
  '                  usedPoints: extractReservationPoints(t),\n                  paymentDue: extractReservationPaymentDue(t),',
  `                  usedPoints: extractReservationPoints(t),
                  usedGiftAmount: extractReservationUsageAmount(t, u.usedGiftAmount),
                  otherDiscountAmount: extractReservationUsageAmount(t, u.otherDiscountAmount),
                  prepaidAmount: extractReservationUsageAmount(t, u.prepaidAmount),
                  paymentDue: extractReservationPaymentDue(t),`,
  'compiled parsed financial values',
)
parser = replaceOnce(
  parser,
  '          externalUsedPoints = n.value.usedPoints ?? storedReservationAmount(y?.note, "利用ポイント"),\n          externalPaymentDue = n.value.paymentDue ?? storedReservationAmount(y?.note, "支払予定額"),',
  `          externalUsedPoints = n.value.usedPoints ?? storedReservationAmount(y?.note, "利用ポイント"),
          externalUsedGiftAmount = n.value.usedGiftAmount ?? storedReservationAmount(y?.note, "利用ギフト券"),
          externalOtherDiscountAmount = n.value.otherDiscountAmount ?? storedReservationAmount(y?.note, "その他割引"),
          externalPrepaidAmount = n.value.prepaidAmount ?? storedReservationAmount(y?.note, "事前決済額"),
          externalPaymentDue = n.value.paymentDue ?? storedReservationAmount(y?.note, "支払予定額"),`,
  'compiled preserve financial values',
)
parser = replaceCount(
  parser,
  '            externalUsedPoints !== null ? `利用ポイント: ${externalUsedPoints}pt` : null,\n            externalPaymentDue !== null ? `支払予定額: ${externalPaymentDue}円` : null,',
  `            externalUsedPoints !== null ? \`利用ポイント: \${externalUsedPoints}pt\` : null,
            externalUsedGiftAmount !== null ? \`利用ギフト券: \${externalUsedGiftAmount}円\` : null,
            externalOtherDiscountAmount !== null ? \`その他割引: \${externalOtherDiscountAmount}円\` : null,
            externalPrepaidAmount !== null ? \`事前決済額: \${externalPrepaidAmount}円\` : null,
            externalPaymentDue !== null ? \`支払予定額: \${externalPaymentDue}円\` : null,`,
  1,
  'compiled appointment note financial values',
)
parser = replaceCount(
  parser,
  '                externalUsedPoints !== null ? `利用ポイント: ${externalUsedPoints}pt` : null,\n                externalPaymentDue !== null ? `支払予定額: ${externalPaymentDue}円` : null,',
  `                externalUsedPoints !== null ? \`利用ポイント: \${externalUsedPoints}pt\` : null,
                externalUsedGiftAmount !== null ? \`利用ギフト券: \${externalUsedGiftAmount}円\` : null,
                externalOtherDiscountAmount !== null ? \`その他割引: \${externalOtherDiscountAmount}円\` : null,
                externalPrepaidAmount !== null ? \`事前決済額: \${externalPrepaidAmount}円\` : null,
                externalPaymentDue !== null ? \`支払予定額: \${externalPaymentDue}円\` : null,`,
  2,
  'compiled contact log financial values',
)
fs.writeFileSync(parserPath, parser)

let tenant = fs.readFileSync(tenantSetupPath, 'utf8')
tenant = replaceOnce(
  tenant,
  "      if (clean !== label && !clean.startsWith(`${label}:`) && !clean.startsWith(`${label}：`)) continue\n      const inline = clean.slice(label.length).replace(/^\\s*[:：]\\s*/, '').trim()",
  "      if (!clean.startsWith(label)) continue\n      const suffix = clean.slice(label.length)\n      const hasColonValue = /^\\s*[:：]\\s*\\S/.test(suffix)\n      const hasSpacedValue = /^\\s+\\S/.test(suffix)\n      if (clean !== label && !hasColonValue && !hasSpacedValue) continue\n      const inline = suffix.replace(/^\\s*[:：]?\\s*/, '').trim()\n      if (inline && !options.multiline) return inline",
  'tenant inline whitespace labels',
)
tenant = replaceOnce(
  tenant,
  'function parseReservationMail({ subject = \'\', body = \'\', sender = \'\', messageId = \'\' }) {',
  `function parseImportedPointAmount(value) {
  const normalized = String(value || '').normalize('NFKC').trim()
  if (!normalized) return null
  if (/利用なし|未利用|なし|使用なし|適用なし/.test(normalized)) return 0
  const match = normalized.match(/([\\d,]+)\\s*(?:ポイント|point|pt|p)?/i)
  if (!match) return null
  const amount = Number(match[1].replace(/,/g, ''))
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null
}

function parseImportedUsageAmount(value) {
  const normalized = String(value || '').normalize('NFKC').trim()
  if (!normalized) return null
  if (/利用なし|未利用|なし|使用なし|適用なし/.test(normalized)) return 0
  const match = normalized.match(/(?:¥\\s*)?([\\d,]+)\\s*(?:円|円分)?/i)
  if (!match) return null
  const amount = Number(match[1].replace(/,/g, ''))
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null
}

function storedImportedAmount(note, label) {
  const match = String(note || '').match(new RegExp('(?:^|\\\\n)' + label + ':\\\\s*([\\\\d,]+)', 'i'))
  if (!match) return null
  const amount = Number(match[1].replace(/,/g, ''))
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null
}

function parseReservationMail({ subject = '', body = '', sender = '', messageId = '' }) {`,
  'tenant financial helpers',
)
tenant = replaceOnce(
  tenant,
  "  const priceText = extractSection(text, ['お支払い予定金額', '予約時合計金額', '合計金額', 'メニュー金額', '料金'])",
  `  const priceText = extractSection(text, ['予約時合計金額', '合計金額', 'メニュー金額', '料金'])
  const usedPointsText = extractSection(text, ['今回の利用ポイント', '予約時利用ポイント', 'ご利用ポイント', '利用ポイント', 'ポイント利用'])
  const usedGiftText = extractSection(text, ['今回の利用ギフト券', '予約時利用ギフト券', 'ご利用ギフト券', '利用ギフト券', 'ギフト券利用', '今回の利用ギフトカード', '利用ギフトカード'])
  const otherDiscountText = extractSection(text, ['今回のその他割引', 'その他割引', '割引額', '値引額', 'キャンペーン割引'])
  const prepaidText = extractSection(text, ['事前決済額', 'オンライン決済額', '事前支払い金額', '事前支払額'])
  const paymentDueText = extractSection(text, ['お支払い予定金額', '支払い予定金額', '今回のお支払い金額'])`,
  'tenant financial extraction',
)
tenant = replaceOnce(
  tenant,
  '      estimatedPrice: parseYen(priceText) ?? parseYen(couponRaw) ?? parseYen(menu),\n      staffName:',
  `      estimatedPrice: parseYen(priceText) ?? parseYen(couponRaw) ?? parseYen(menu),
      usedPoints: parseImportedPointAmount(usedPointsText),
      usedGiftAmount: parseImportedUsageAmount(usedGiftText),
      otherDiscountAmount: parseImportedUsageAmount(otherDiscountText),
      prepaidAmount: parseImportedUsageAmount(prepaidText),
      paymentDue: parseYen(paymentDueText),
      staffName:`,
  'tenant parsed financial values',
)
tenant = replaceOnce(
  tenant,
  '    const existing = await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { id: true, estimatedPrice: true, staffName: true } })',
  '    const existing = await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { id: true, estimatedPrice: true, staffName: true, note: true } })',
  'tenant existing note selection',
)
tenant = replaceOnce(
  tenant,
  "    const mergedStaffName = parsed.staffName ?? existing?.staffName ?? null\n    const note = [parsed.bookingReference ? `予約番号: ${parsed.bookingReference}` : null, mergedStaffName ? `担当: ${mergedStaffName}` : null, parsed.durationMinutes ? `所要時間: ${parsed.durationMinutes}分` : null, parsed.subject ? `メール件名: ${parsed.subject}` : null, `予約元: ${parsed.provider}`, 'Gmail予約メールから抽出。元メール本文は保存していません。'].filter(Boolean).join('\\n')",
  `    const mergedStaffName = parsed.staffName ?? existing?.staffName ?? null
    const usedPoints = parsed.usedPoints ?? storedImportedAmount(existing?.note, '利用ポイント')
    const usedGiftAmount = parsed.usedGiftAmount ?? storedImportedAmount(existing?.note, '利用ギフト券')
    const otherDiscountAmount = parsed.otherDiscountAmount ?? storedImportedAmount(existing?.note, 'その他割引')
    const prepaidAmount = parsed.prepaidAmount ?? storedImportedAmount(existing?.note, '事前決済額')
    const paymentDue = parsed.paymentDue ?? storedImportedAmount(existing?.note, '支払予定額')
    const note = [parsed.bookingReference ? \`予約番号: \${parsed.bookingReference}\` : null, mergedStaffName ? \`担当: \${mergedStaffName}\` : null, parsed.durationMinutes ? \`所要時間: \${parsed.durationMinutes}分\` : null, parsed.subject ? \`メール件名: \${parsed.subject}\` : null, usedPoints !== null ? \`利用ポイント: \${usedPoints}pt\` : null, usedGiftAmount !== null ? \`利用ギフト券: \${usedGiftAmount}円\` : null, otherDiscountAmount !== null ? \`その他割引: \${otherDiscountAmount}円\` : null, prepaidAmount !== null ? \`事前決済額: \${prepaidAmount}円\` : null, paymentDue !== null ? \`支払予定額: \${paymentDue}円\` : null, \`予約元: \${parsed.provider}\`, 'Gmail予約メールから抽出。元メール本文は保存していません。'].filter(Boolean).join('\\n')`,
  'tenant note financial values',
)
fs.writeFileSync(tenantSetupPath, tenant)

let inbound = fs.readFileSync(inboundPath, 'utf8')
inbound = replaceOnce(
  inbound,
  '      select: { id: true, estimatedPrice: true },\n    })\n  }\n\n  async function importParsedReservation',
  '      select: { id: true, estimatedPrice: true, staffName: true, note: true },\n    })\n  }\n\n  async function importParsedReservation',
  'inbound booking reference financial preservation selection',
)
inbound = replaceOnce(
  inbound,
  '    const existing = byReference || await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { id: true, estimatedPrice: true, staffName: true } })',
  '    const existing = byReference || await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { id: true, estimatedPrice: true, staffName: true, note: true } })',
  'inbound existing note selection',
)
inbound = replaceOnce(
  inbound,
  "    const mergedStaffName = parsed.staffName ?? existing?.staffName ?? null\n    const note = [",
  `    const mergedStaffName = parsed.staffName ?? existing?.staffName ?? null
    const preservedAmount = (label) => {
      const match = String(existing?.note || '').match(new RegExp('(?:^|\\\\n)' + label + ':\\\\s*([\\\\d,]+)', 'i'))
      return match ? Number(match[1].replace(/,/g, '')) : null
    }
    const usedPoints = parsed.usedPoints ?? preservedAmount('利用ポイント')
    const usedGiftAmount = parsed.usedGiftAmount ?? preservedAmount('利用ギフト券')
    const otherDiscountAmount = parsed.otherDiscountAmount ?? preservedAmount('その他割引')
    const prepaidAmount = parsed.prepaidAmount ?? preservedAmount('事前決済額')
    const paymentDue = parsed.paymentDue ?? preservedAmount('支払予定額')
    const note = [`,
  'inbound preserved financial values',
)
inbound = replaceOnce(
  inbound,
  '      parsed.subject ? `メール件名: ${parsed.subject}` : null,\n      `予約元: ${parsed.provider}`,',
  `      parsed.subject ? \`メール件名: \${parsed.subject}\` : null,
      usedPoints !== null ? \`利用ポイント: \${usedPoints}pt\` : null,
      usedGiftAmount !== null ? \`利用ギフト券: \${usedGiftAmount}円\` : null,
      otherDiscountAmount !== null ? \`その他割引: \${otherDiscountAmount}円\` : null,
      prepaidAmount !== null ? \`事前決済額: \${prepaidAmount}円\` : null,
      paymentDue !== null ? \`支払予定額: \${paymentDue}円\` : null,
      \`予約元: \${parsed.provider}\`,`,
  'inbound note financial values',
)
fs.writeFileSync(inboundPath, inbound)

let detail = fs.readFileSync(detailPath, 'utf8')
detail = replaceOnce(
  detail,
  '                F = E + _,\n                z = $?.amount ?? Math.max(0, F - J - A),',
  `                externalAmount = (e, t) => { let a = e?.split("\\n").find((e) => e.startsWith(\`\${t}: \`))?.slice(t.length + 2)?.match(/[\\d,]+/); if (!a) return null; let n = Number(a[0].replace(/,/g, "")); return Number.isSafeInteger(n) && n >= 0 ? n : null; },
                externalUsedPoints = externalAmount(k.note, "利用ポイント"),
                externalGiftAmount = externalAmount(k.note, "利用ギフト券"),
                externalOtherDiscount = externalAmount(k.note, "その他割引"),
                externalPrepaidAmount = externalAmount(k.note, "事前決済額"),
                importedPaymentDue = externalAmount(k.note, "支払予定額"),
                hasExternalBreakdown = [externalUsedPoints, externalGiftAmount, externalOtherDiscount, externalPrepaidAmount, importedPaymentDue].some((e) => null !== e),
                externalPayableAmount = importedPaymentDue ?? (hasExternalBreakdown ? Math.max(0, E - (externalUsedPoints ?? 0) - (externalGiftAmount ?? 0) - (externalOtherDiscount ?? 0) - (externalPrepaidAmount ?? 0)) : E),
                F = E + _,
                z = $?.amount ?? Math.max(0, externalPayableAmount + _ - J - A),`,
  'detail external payable calculation',
)
const staffRowMarker = '                              R\n                                ? (0, a.jsxs)("div", {'
const financialRows = `                              null !== externalUsedPoints
                                ? (0, a.jsxs)("div", { className: "flex justify-between gap-4", children: [a.jsx("dt", { className: "text-[color:var(--lien-muted)]", children: "予約サイト利用ポイント" }), (0, a.jsxs)("dd", { className: "font-semibold tabular-nums text-[color:var(--lien-primary-dark)]", children: ["-", externalUsedPoints.toLocaleString("ja-JP"), "pt"] })] })
                                : null,
                              null !== externalGiftAmount
                                ? (0, a.jsxs)("div", { className: "flex justify-between gap-4", children: [a.jsx("dt", { className: "text-[color:var(--lien-muted)]", children: "利用ギフト券" }), a.jsx("dd", { className: "font-semibold tabular-nums text-[color:var(--lien-primary-dark)]", children: externalGiftAmount > 0 ? \`-\${externalGiftAmount.toLocaleString("ja-JP")}円\` : "利用なし" })] })
                                : null,
                              null !== externalOtherDiscount
                                ? (0, a.jsxs)("div", { className: "flex justify-between gap-4", children: [a.jsx("dt", { className: "text-[color:var(--lien-muted)]", children: "その他割引" }), (0, a.jsxs)("dd", { className: "font-semibold tabular-nums text-[color:var(--lien-primary-dark)]", children: ["-", externalOtherDiscount.toLocaleString("ja-JP"), "円"] })] })
                                : null,
                              null !== externalPrepaidAmount
                                ? (0, a.jsxs)("div", { className: "flex justify-between gap-4", children: [a.jsx("dt", { className: "text-[color:var(--lien-muted)]", children: "事前決済額" }), (0, a.jsxs)("dd", { className: "font-semibold tabular-nums text-[color:var(--lien-primary-dark)]", children: ["-", externalPrepaidAmount.toLocaleString("ja-JP"), "円"] })] })
                                : null,
                              hasExternalBreakdown
                                ? (0, a.jsxs)("div", { className: "flex justify-between gap-4 border-t border-[color:var(--lien-border)] pt-3", children: [a.jsx("dt", { className: "font-semibold", children: "お支払い予定額" }), (0, a.jsxs)("dd", { className: "font-semibold tabular-nums", children: [externalPayableAmount.toLocaleString("ja-JP"), "円"] })] })
                                : null,
${staffRowMarker}`
detail = replaceOnce(detail, staffRowMarker, financialRows, 'detail financial rows')
detail = replaceOnce(
  detail,
  '                              initialSubtotal: k.estimatedPrice ?? 0,',
  '                              initialSubtotal: externalPayableAmount,',
  'checkout uses imported payment due',
)
fs.writeFileSync(detailPath, detail)

console.log('reservation financial breakdown v392 patched')
