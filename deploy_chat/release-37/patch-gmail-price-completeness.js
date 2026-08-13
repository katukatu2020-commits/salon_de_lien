const fs = require('fs')
const path = require('path')

const nextRoot = process.env.NEXT_ROOT || '/app/.next'

function replaceOnce(source, from, to, label) {
  const first = source.indexOf(from)
  if (first < 0) throw new Error(`${label}: anchor not found`)
  if (source.indexOf(from, first + from.length) >= 0) {
    throw new Error(`${label}: anchor is not unique`)
  }
  return source.slice(0, first) + to + source.slice(first + from.length)
}

const parserHelpers = String.raw`
      function extractReservationSection(e, t) {
        let a = (e ?? "").split("\n");
        for (let n = 0; n < a.length; n += 1) {
          let l = a[n].trim().replace(/^[■●]\s*/, "").trim();
          for (let e of t) {
            if (l !== e && !l.startsWith(e + ":") && !l.startsWith(e + "："))
              continue;
            let t = l.slice(e.length).replace(/^\s*[:：]\s*/, "").trim(),
              r = t ? [t] : [];
            for (let e = n + 1; e < a.length; e += 1) {
              let t = a[e].trim();
              if (/^[■◇◆●]/.test(t)) break;
              t && r.push(t);
            }
            return r.join("\n").trim() || null;
          }
        }
        return null;
      }
      function extractCouponTitle(e) {
        let t = extractReservationSection(e, [
          "予約時クーポン",
          "ご利用クーポン",
          "利用クーポン",
        ]);
        if (!t || /利用クーポンなし|クーポン利用なし/.test(t)) return null;
        let a = t
          .split("\n")
          .map((e) => e.trim())
          .filter(Boolean)
          .find((e) => !/^(?:\[[^\]]+\]\s*)+$/.test(e));
        return a ?? null;
      }
      function parseYenAmount(e) {
        if (!e) return null;
        let t = e.match(/(?:[¥￥]\s*)?([\d,]+)\s*円?/);
        if (!t) return null;
        let a = Number(t[1].replace(/,/g, ""));
        return Number.isSafeInteger(a) && a >= 0 ? a : null;
      }
      function extractReservationPrice(e) {
        let t = e ?? "",
          a = [
            /予約時合計金額\s*[:：]?\s*(?:\n\s*)?(?:[¥￥]\s*)?([\d,]+)\s*円?/i,
            /メニュー金額\s*[:：]?\s*(?:\n\s*)?(?:[¥￥]\s*)?([\d,]+)\s*円?/i,
            /お支払い予定金額\s*[:：]?\s*(?:\n\s*)?(?:[¥￥]\s*)?([\d,]+)\s*円?/i,
            /支払い予定金額\s*[:：]?\s*(?:\n\s*)?(?:[¥￥]\s*)?([\d,]+)\s*円?/i,
            /今回のお支払い金額\s*[:：]?\s*(?:\n\s*)?(?:[¥￥]\s*)?([\d,]+)\s*円?/i,
          ];
        for (let e of a) {
          let a = t.match(e),
            n = parseYenAmount(a?.[1]);
          if (null !== n) return n;
        }
        for (let e of [
          extractCouponTitle(t),
          extractReservationSection(t, [
            "予約時メニュー",
            "予約メニュー",
            "ご予約メニュー",
            "施術メニュー",
            "メニュー",
          ]),
        ]) {
          let t = Array.from(
            (e ?? "").matchAll(/(?:[¥￥]\s*([\d,]+)|([\d,]+)\s*円)/g),
            (e) => Number((e[1] ?? e[2]).replace(/,/g, "")),
          ).filter((e) => Number.isSafeInteger(e) && e >= 0);
          if (t.length > 0) return t.at(-1);
        }
        return null;
      }
      function normalizeReservationMenu(e) {
        return (e ?? "")
          .normalize("NFKC")
          .split(/\s*\/\s*クーポン\s*:/)[0]
          .replace(/^\s*\d+\s*[.．]\s*/, "")
          .replace(/[+＋]/g, "+")
          .replace(/[（]/g, "(")
          .replace(/[）]/g, ")")
          .replace(/\s+/g, "")
          .toLowerCase();
      }
`

const chunkDir = path.join(nextRoot, 'server/chunks')
const parserFiles = fs.readdirSync(chunkDir)
  .filter((name) => name.endsWith('.js'))
  .map((name) => path.join(chunkDir, name))
  .filter((file) => {
    const source = fs.readFileSync(file, 'utf8')
    return source.includes('Gmail予約メールから抽出。元メール本文は保存していません。') &&
      source.includes('予約時合計金額') && source.includes('bookingReference')
  })

if (parserFiles.length !== 1) {
  throw new Error(`expected one Gmail parser bundle, found ${parserFiles.length}`)
}

for (const file of parserFiles) {
  let source = fs.readFileSync(file, 'utf8')
  if (source.includes('function extractReservationPrice(e)')) {
    throw new Error('Gmail price-completeness patch already exists')
  }

  source = replaceOnce(
    source,
    '      var m = a(44860);',
    `${parserHelpers}      var m = a(44860);`,
    'parser helper insertion',
  )

  source = replaceOnce(
    source,
    `        price: [
          "予約時合計金額",
          "メニュー金額",
          "合計金額",
          "予定金額",
          "料金",
          "金額",
        ],`,
    `        price: [
          "予約時合計金額",
          "メニュー金額",
          "お支払い予定金額",
          "支払い予定金額",
          "今回のお支払い金額",
          "合計金額",
          "予定金額",
          "料金",
          "金額",
        ],`,
    'price labels',
  )

  source = replaceOnce(
    source,
    '                  menu: (() => { let e = c(s(t, u.menu)), a = c(s(t, u.coupon)); return [e, a ? `クーポン: ${a}` : null].filter(Boolean).join(" / ") || null; })(),',
    '                  menu: (() => { let e = c(s(t, u.menu)), a = extractCouponTitle(t) ?? c(s(t, u.coupon)); return [e, a ? `クーポン: ${a}` : null].filter(Boolean).join(" / ") || null; })(),',
    'coupon title parsing',
  )

  const oldPrice = `                  estimatedPrice: (function (e) {
                    let t = (e ?? "").match(/(?:¥|￥)?\\s*([\\d,]+)\\s*円?/);
                    if (!t) return null;
                    let a = Number(t[1].replace(/,/g, ""));
                    return Number.isSafeInteger(a) && a >= 0 ? a : null;
                  })(s(t, u.price)),`
  source = replaceOnce(
    source,
    oldPrice,
    '                  estimatedPrice: extractReservationPrice(t),',
    'price extraction',
  )

  source = replaceOnce(
    source,
    `        if (!n.ok) return n;
        let f = e.content.normalize("NFKC").replace(/\\r/g, "").trim(),`,
    `        if (!n.ok) return n;
        if ((null === n.value.estimatedPrice || 0 === n.value.estimatedPrice) && n.value.menu) {
          let e = normalizeReservationMenu(n.value.menu),
            menuRows = await l._.$queryRawUnsafe(
              'SELECT "name","priceYen" FROM "SalonMenu" WHERE "organizationId"=$1 AND "active"=true AND "priceYen">0',
              t,
            ),
            a = menuRows.find((t) => normalizeReservationMenu(t.name) === e);
          a && (n.value.estimatedPrice = a.priceYen);
        }
        let f = e.content.normalize("NFKC").replace(/\\r/g, "").trim(),`,
    'menu-catalog price fallback',
  )

  source = replaceOnce(
    source,
    `          y = await l._.appointment.findUnique({
            where: { id: k },
            select: { id: !0 },
          }),`,
    `          y = await l._.appointment.findUnique({
            where: { id: k },
            select: { id: !0, estimatedPrice: !0 },
          }),`,
    'existing appointment price read',
  )

  const updateStart = source.indexOf('          I = await l._.appointment.upsert({')
  const createStart = source.indexOf('            create: {', updateStart)
  if (updateStart < 0 || createStart < 0) throw new Error('appointment upsert block not found')
  const updateBlock = source.slice(updateStart, createStart)
  const updatePrice = '              estimatedPrice: n.value.estimatedPrice,'
  if (!updateBlock.includes(updatePrice)) throw new Error('appointment update price anchor not found')
  const updatedBlock = updateBlock.replace(
    updatePrice,
    '              estimatedPrice: "キャンセル" === n.value.status && null != y?.estimatedPrice ? y.estimatedPrice : (n.value.estimatedPrice ?? y?.estimatedPrice ?? null),',
  )
  source = source.slice(0, updateStart) + updatedBlock + source.slice(createStart)

  fs.writeFileSync(file, source)
  console.log(`patched Gmail parser: ${path.basename(file)}`)
}

const appointmentPage = path.join(nextRoot, 'server/app/admin/appointments/page.js')
let page = fs.readFileSync(appointmentPage, 'utf8')
page = replaceOnce(
  page,
  '                select: { paidAt: !0, amount: !0 },',
  '                select: { paidAt: !0, amount: !0, appointmentId: !0 },',
  'daily sales appointment link',
)
page = replaceOnce(
  page,
  `          let dailySales = new Map();
          for (let sale of dailySalesRows) {
            let dateKey = $(sale.paidAt);
            dailySales.set(dateKey, (dailySales.get(dateKey) ?? 0) + sale.amount);
          }
          let L =`,
  `          let cancelledAppointmentIds = new Set(q.filter((e) => ["キャンセル", "無断キャンセル"].includes(e.status)).map((e) => e.id)),
            linkedSaleAppointmentIds = new Set(dailySalesRows.map((e) => e.appointmentId).filter(Boolean)),
            dailySales = new Map(),
            dailyForecast = new Map(),
            dailyRevenue = new Map();
          for (let sale of dailySalesRows) {
            if (sale.appointmentId && cancelledAppointmentIds.has(sale.appointmentId)) continue;
            let dateKey = $(sale.paidAt);
            dailySales.set(dateKey, (dailySales.get(dateKey) ?? 0) + sale.amount);
          }
          for (let appointment of q) {
            if (["キャンセル", "無断キャンセル"].includes(appointment.status) || linkedSaleAppointmentIds.has(appointment.id)) continue;
            let amount = Number(appointment.estimatedPrice ?? 0);
            if (!Number.isSafeInteger(amount) || amount <= 0) continue;
            let dateKey = $(appointment.scheduledAt);
            dailyForecast.set(dateKey, (dailyForecast.get(dateKey) ?? 0) + amount);
          }
          for (let dateKey of new Set([...dailySales.keys(), ...dailyForecast.keys()])) {
            dailyRevenue.set(dateKey, (dailySales.get(dateKey) ?? 0) + (dailyForecast.get(dateKey) ?? 0));
          }
          let L =`,
  'calendar forecast aggregation',
)

const dayVariable = '                          let t = F.get(e.key) ?? [],'
const dayVariableWithCount = `                          let t = F.get(e.key) ?? [],
                            activeDayCount = t.filter((e) => !["キャンセル", "無断キャンセル"].includes(e.status)).length,`
const dayVariableOccurrences = page.split(dayVariable).length - 1
if (dayVariableOccurrences !== 2) {
  throw new Error(`calendar day variable anchor count was ${dayVariableOccurrences}, expected 2`)
}
page = page.replaceAll(dayVariable, dayVariableWithCount)

page = replaceOnce(
  page,
  '                                        t.length > 0 || (dailySales.get(e.key) ?? 0) > 0 ? (0, n.jsxs)("span", { className: "text-[10px] font-semibold tabular-nums text-[color:var(--lien-muted)]", children: [t.length, "件 ・ ¥", (dailySales.get(e.key) ?? 0).toLocaleString("ja-JP")] }) : null,',
  '                                        activeDayCount > 0 || (dailyRevenue.get(e.key) ?? 0) > 0 ? (0, n.jsxs)("span", { className: "text-[10px] font-semibold tabular-nums text-[color:var(--lien-muted)]", children: [activeDayCount, "件 ・ ", (dailyForecast.get(e.key) ?? 0) > 0 ? "見込 " : "売上 ", "¥", (dailyRevenue.get(e.key) ?? 0).toLocaleString("ja-JP")] }) : null,',
  'desktop calendar amount',
)
page = replaceOnce(
  page,
  `                                t.length > 0 || (dailySales.get(e.key) ?? 0) > 0
                                  ? (0, n.jsxs)("span", { className: \`absolute bottom-0.5 whitespace-nowrap text-[7px] font-bold tabular-nums \${r ? "text-white" : "text-[#8f4f42]"}\`, children: [t.length, "件 ¥", Math.round((dailySales.get(e.key) ?? 0) / 1000), "k"] })
                                  : null,`,
  `                                activeDayCount > 0 || (dailyRevenue.get(e.key) ?? 0) > 0
                                  ? (0, n.jsxs)("span", { className: \`absolute bottom-0.5 whitespace-nowrap text-[7px] font-bold tabular-nums \${r ? "text-white" : "text-[#8f4f42]"}\`, children: [activeDayCount, "件 ¥", Math.round((dailyRevenue.get(e.key) ?? 0) / 1000), "k"] })
                                  : null,`,
  'mobile calendar amount',
)

fs.writeFileSync(appointmentPage, page)
console.log('patched appointment calendar forecast totals')
