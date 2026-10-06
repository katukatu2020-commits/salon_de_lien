'use strict'
const fs = require('node:fs'), path = require('node:path')
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const write = (file, value) => fs.writeFileSync(path.join(root, file), value)
function replace(source, before, after) {
  if (source.split(before).length !== 2) throw Error('Non-unique anchor: ' + before.slice(0, 140))
  return source.replace(before, () => after)
}

for (const clientPath of ['staff-breaks-checkout-menu-client-v442.js', 'public/appointment-datetime-v684.js']) {
let client = read(clientPath)
const start = client.indexOf('  function checkoutInputs()'), end = client.indexOf('  function enhance() {', start)
if (start < 0 || end < start) throw Error('Checkout editor boundary missing')
client = client.slice(0, start) + fs.readFileSync(path.join(__dirname, 'checkout-editor.js'), 'utf8') + '\n\n' + client.slice(end)
client = 'window.CheckoutMenuIconsV701=' + fs.readFileSync(path.join(__dirname, 'icons.json'), 'utf8').trim() + ';\n' + client
write(clientPath, client)
}
write('public/checkout-menu-v701.css', fs.readFileSync(path.join(__dirname, 'checkout-menu.css'), 'utf8'))

const pagePath = '.next/server/app/admin/appointments/[appointmentId]/page.js'
let page = read(pagePath)
page = replace(page, '                              taxRate: k.customer.organization.taxRate,\n                            }),', '                              taxRate: k.customer.organization.taxRate,\n                            }, k.id),')
page = replace(page, '            k = "";\n          try {', '            k = "";\n          const importReviewedV701 = g(t, "reservationImportReviewed");\n          try {')
page = replace(page, '            if (!r) throw Error("本日のメニューを入力してください。");\n            if (!Number.isInteger(o) || o <= 0)', '            if (!r && y.length === 0) throw Error("会計項目を追加してください。");\n            if (!r && x) throw Error("ロング料金の対象メニューを追加してください。");\n            if (r.length > 2000 || !Number.isSafeInteger(o) || o < 0 || o > 10000000 || (!r && o !== 0))')
page = replace(page, '                    source: !0,\n                    customer: {', '                    source: !0,\n                    note: !0,\n                    customer: {')
page = replace(page, '                  throw Error("この予約はすでに会計済みです。");', '                  throw Error("この予約はすでに会計済みです。");\n                if (i.note?.includes("取込内容要確認:") && importReviewedV701 !== "1") throw Error("メール取込のメニュー・料金を確認してください。");')
page = replace(page, '                      title: r,', '                      title: r || "商品購入",')
page = replace(page, 'data: { menu: r, estimatedPrice: N, status: "来店済み" }', 'data: { menu: r || null, estimatedPrice: N, status: "来店済み" }')
write(pagePath, page)

let tenant = read('tenant-setup.js')
tenant = replace(tenant, "const fs = require('fs')", "const { parseReservationMenu, mergeImportedMenu } = require('./reservation-menu-v701.cjs')\nconst fs = require('fs')")
tenant = replace(tenant, "  const menu = extractSection(text, ['予約時メニュー', 'メニュー', '施術メニュー'], { multiline: true })", "  const menuDetailsV701 = parseReservationMenu(text)\n  const menu = menuDetailsV701.menu")
tenant = replace(tenant, "      menu: [menu?.split('\\n')[0] || null, coupon ? `クーポン: ${coupon}` : null].filter(Boolean).join(' / ') || null,\n      estimatedPrice: parseYen(priceText) ?? parseYen(couponRaw) ?? parseYen(menu),", '      ...menuDetailsV701,')
tenant = replace(tenant, 'select: { id: true, estimatedPrice: true, staffName: true, note: true }', 'select: { id: true, menu: true, bookingProvider: true, estimatedPrice: true, staffName: true, note: true, serviceSales: { select: { id: true }, take: 1 } }')
tenant = replace(tenant, "    const estimatedPrice = parsed.status === 'キャンセル' && existing?.estimatedPrice != null ? existing.estimatedPrice : (parsed.estimatedPrice ?? existing?.estimatedPrice ?? null)", `    if (existing?.bookingProvider && existing.bookingProvider !== parsed.provider) throw Error('予約番号の予約元が一致しません。')
    if (existing?.serviceSales.length) return { imported: false, ignored: true }
    const mergedMenuV701 = mergeImportedMenu(parsed, existing)
    const estimatedPrice = mergedMenuV701.estimatedPrice
    const previousFinancialNoteV701 = parsed.menuFieldPresent && parsed.menu !== existing?.menu ? null : existing?.note`)
for (const label of ['利用ポイント', '利用ギフト券', 'その他割引', '事前決済額', '支払予定額']) tenant = replace(tenant, `storedImportedAmount(existing?.note, '${label}')`, `storedImportedAmount(previousFinancialNoteV701, '${label}')`)
tenant = replace(tenant, "    const note = [parsed.bookingReference ?", "    const note = [parsed.reviewReason ? `取込内容要確認: ${parsed.reviewReason}` : null, parsed.bookingReference ?")
tenant = replace(tenant, '      where: { id: appointmentId },\n      update: { customerId: customer.id, scheduledAt: parsed.scheduledAt, durationMinutes: parsed.durationMinutes, menu: parsed.menu,', '      where: { id: appointmentId, serviceSales: { none: {} } },\n      update: { customerId: customer.id, scheduledAt: parsed.scheduledAt, durationMinutes: parsed.durationMinutes, menu: mergedMenuV701.menu,')
write('tenant-setup.js', tenant)

let inbound = read('inbound-email.js')
inbound = replace(inbound, "'use strict'", "'use strict'\nconst { mergeImportedMenu } = require('./reservation-menu-v701.cjs')")
const oldReference = `  async function existingAppointmentForBooking(organizationId, bookingReference) {
    if (!bookingReference) return null
    return prisma.appointment.findFirst({
      where: { customer: { organizationId }, note: { contains: \`予約番号: \${bookingReference}\` } },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, estimatedPrice: true, staffName: true, note: true },
    })
  }`
inbound = replace(inbound, oldReference, `  async function existingAppointmentForBooking(organizationId, bookingReference, provider) {
    if (!bookingReference) return null
    const candidates = await prisma.appointment.findMany({
      where: { customer: { organizationId }, note: { contains: \`予約番号: \${bookingReference}\` } },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, menu: true, estimatedPrice: true, staffName: true, note: true, bookingProvider: true, serviceSales: { select: { id: true }, take: 1 } },
    })
    const matches = candidates.filter(item => (!item.bookingProvider || item.bookingProvider === provider) && String(item.note || '').split(/\\r?\\n/).some(line => line.trim() === '予約番号: ' + bookingReference))
    if (matches.length > 1) throw Error('同じ予約番号が複数あります。予約を確認してください。')
    return matches[0] || null
  }`)
inbound = replace(inbound, 'existingAppointmentForBooking(organizationId, parsed.bookingReference)', 'existingAppointmentForBooking(organizationId, parsed.bookingReference, parsed.provider)')
inbound = replace(inbound, 'select: { id: true, estimatedPrice: true, staffName: true, note: true }', 'select: { id: true, menu: true, bookingProvider: true, estimatedPrice: true, staffName: true, note: true, serviceSales: { select: { id: true }, take: 1 } }')
inbound = replace(inbound, `    const estimatedPrice = parsed.status === 'キャンセル' && existing?.estimatedPrice != null
      ? existing.estimatedPrice
      : (parsed.estimatedPrice ?? existing?.estimatedPrice ?? null)`, `    if (existing?.bookingProvider && existing.bookingProvider !== parsed.provider) throw Error('予約番号の予約元が一致しません。')
    if (existing?.serviceSales.length) return existing.id
    const mergedMenuV701 = mergeImportedMenu(parsed, existing)
    const estimatedPrice = mergedMenuV701.estimatedPrice
    const previousFinancialNoteV701 = parsed.menuFieldPresent && parsed.menu !== existing?.menu ? null : existing?.note`)
inbound = replace(inbound, "String(existing?.note || '')", "String(previousFinancialNoteV701 || '')")
inbound = replace(inbound, '    const note = [', '    const note = [\n      parsed.reviewReason ? `取込内容要確認: ${parsed.reviewReason}` : null,')
inbound = replace(inbound, '      where: { id: appointmentId },\n      update: { customerId: customer.id, scheduledAt: parsed.scheduledAt, durationMinutes: parsed.durationMinutes, menu: parsed.menu,', '      where: { id: appointmentId, serviceSales: { none: {} } },\n      update: { customerId: customer.id, scheduledAt: parsed.scheduledAt, durationMinutes: parsed.durationMinutes, menu: mergedMenuV701.menu,')
write('inbound-email.js', inbound)

let manual = read('.next/server/chunks/3447.js')
manual = "const { parseReservationMenu, mergeImportedMenu } = require('../../../reservation-menu-v701.cjs');\n" + manual
manual = replace(manual, '                  menu: (() => { let e = c(s(t, u.menu)), a = extractCouponTitle(t) ?? c(s(t, u.coupon)); return [e, a ? `クーポン: ${a}` : null].filter(Boolean).join(" / ") || null; })(),\n                  estimatedPrice: extractReservationPrice(t),', '                  ...parseReservationMenu(t),')
const fallbackStart = manual.indexOf('        if ((null === n.value.estimatedPrice || 0 === n.value.estimatedPrice) && n.value.menu) {')
const fallbackEnd = manual.indexOf('        let f = e.content.normalize', fallbackStart)
if (fallbackStart < 0 || fallbackEnd < 0) throw Error('Manual menu fallback boundary missing')
manual = manual.slice(0, fallbackStart) + manual.slice(fallbackEnd)
manual = replace(manual, 'select: { id: !0, estimatedPrice: !0, staffName: !0, note: !0 }', 'select: { id: !0, menu: !0, bookingProvider: !0, estimatedPrice: !0, staffName: !0, note: !0, serviceSales: { select: { id: !0 }, take: 1 } }')
manual = replace(manual, '          externalUsedPoints = n.value.usedPoints', `          mergedMenuV701 = (() => {
            if (y?.serviceSales.length) throw Error('会計済みの予約はメールで上書きできません。');
            if (y?.bookingProvider && y.bookingProvider !== v) throw Error('予約番号の予約元が一致しません。');
            return mergeImportedMenu(n.value, y);
          })(),
          previousFinancialNoteV701 = n.value.menuFieldPresent && n.value.menu !== y?.menu ? null : y?.note,
          externalUsedPoints = n.value.usedPoints`)
manual = manual.replaceAll('storedReservationAmount(y?.note,', 'storedReservationAmount(previousFinancialNoteV701,')
manual = replace(manual, '          x = [', '          x = [\n            n.value.reviewReason ? `取込内容要確認: ${n.value.reviewReason}` : null,')
manual = replace(manual, '            where: { id: k },\n            update: {', '            where: { id: k, serviceSales: { none: {} } },\n            update: {')
manual = replace(manual, '              menu: n.value.menu,\n              staffName: n.value.staffName ??', '              menu: mergedMenuV701.menu,\n              staffName: n.value.staffName ??')
manual = replace(manual, 'estimatedPrice: "キャンセル" === n.value.status && null != y?.estimatedPrice ? y.estimatedPrice : (n.value.estimatedPrice ?? y?.estimatedPrice ?? null)', 'estimatedPrice: mergedMenuV701.estimatedPrice')
write('.next/server/chunks/3447.js', manual)

let server = read('server.js')
server = replace(server, "  if (pathname === '/admin/appointments' || pathname.startsWith('/admin/appointments/')) {", `  if (pathname === '/admin/appointments' || pathname.startsWith('/admin/appointments/')) {
    if (!output.includes('checkout-menu-v701.css')) output=output.replace('</head>','<link rel="stylesheet" href="/checkout-menu-v701.css"></head>')`)
server = replace(server, "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Checkout-Shift', 'v700')", "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Checkout-Menu', 'v701')\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Checkout-Shift', 'v700')")
write('server.js', server)
console.log('v701: editable service rows, no retained base menu, strict mail fields, paid import guard')
