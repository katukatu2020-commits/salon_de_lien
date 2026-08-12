const fs = require('fs')
const path = require('path')
const root = process.env.NEXT_ROOT || '/app/.next'

function edit(file, fn) {
  const before = fs.readFileSync(file, 'utf8')
  const after = fn(before)
  if (after === before) throw new Error(`no patch applied: ${file}`)
  fs.writeFileSync(file, after)
}

const tableSql = 'CREATE TABLE IF NOT EXISTS "BookingCapacityOverride" ("id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "date" TEXT NOT NULL, "slotStart" INTEGER NOT NULL, "remaining" INTEGER NOT NULL, "updatedByUserId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE("organizationId", "date", "slotStart"))'

// Customer booking POST: a zero override blocks the complete requested duration.
edit(path.join(root, 'server/app/api/customer/appointments/route.js'), s => {
  const anchor = 'if(!n)throw Error("お客様情報が見つかりません。");'
  const addition = `${anchor}await e.$executeRawUnsafe('${tableSql}');let capacityBlocks=await e.$queryRawUnsafe('SELECT "slotStart" FROM "BookingCapacityOverride" WHERE "organizationId"=$1 AND "date"=$2 AND "remaining"=0 AND "slotStart">=$3 AND "slotStart"<$4',t.organizationId,s,o,o+a.durationMinutes);if(capacityBlocks.length)throw Error("この時間は受付を終了しました。別の時間を選んでください。");`
  if (!s.includes(anchor)) throw new Error('customer booking capacity anchor missing')
  return s.replace(anchor, addition)
})

// Customer availability: remove every slot covered by a zero override.
edit(path.join(root, 'server/app/api/customer/appointments/availability/route.js'), s => {
  const monthAnchor = 'x.setUTCMonth(x.getUTCMonth()+1);let[y,h]=await Promise.all(['
  if (!s.includes(monthAnchor)) throw new Error('availability month anchor missing')
  s = s.replace(monthAnchor, `x.setUTCMonth(x.getUTCMonth()+1);await m._.$executeRawUnsafe('${tableSql}');let[y,h]=await Promise.all([`)
  const afterPromise = ']),M=new Map(y.map(e=>[e.staffKey,e]))'
  if (!s.includes(afterPromise)) throw new Error('availability promise anchor missing')
  s = s.replace(afterPromise, `]),capacityOverrides=await m._.$queryRawUnsafe('SELECT "date","slotStart","remaining" FROM "BookingCapacityOverride" WHERE "organizationId"=$1 AND "date">=$2 AND "date"<$3',t.organizationId,\`${'${a}'}-01\`,(0,l.Y$)(x)),M=new Map(y.map(e=>[e.staffKey,e]))`)
  s = s.replace(')).sort((e,t)=>e-t);return{date:e,available:a.length>0,slots:a}', ')).sort((e,t)=>e-t).filter(slot=>!capacityOverrides.some(o=>o.date===e&&Number(o.remaining)===0&&Number(o.slotStart)>=slot&&Number(o.slotStart)<slot+r.durationMinutes));return{date:e,available:a.length>0,slots:a}')
  return s
})

// Shift UI: persist the manual remaining count to the server in addition to local optimistic state.
const appointmentPage = path.join(root, 'server/app/admin/appointments/page.js')
edit(appointmentPage, s => {
  const anchor = '              return a;\n            });\n          }\n          function G(e, t) {'
  const replacement = '              void fetch("/api/lien-capacity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: e, slotStart: t, remaining: g(Number(r) || 0, 0, 99) }) }).catch(() => {});\n              return a;\n            });\n          }\n          function G(e, t) {'
  if (!s.includes(anchor)) throw new Error('shift capacity save anchor missing')
  return s.replace(anchor, replacement)
})

// Calendar UI: show confirmed daily sales next to each day's appointment count.
edit(appointmentPage, s => {
  const promiseAnchor = '[q, Z, _, z, V] = await Promise.all(['
  if (!s.includes(promiseAnchor)) throw new Error('calendar query anchor missing')
  s = s.replace(promiseAnchor, '[q, Z, _, z, V, dailySalesRows] = await Promise.all([')
  const queryAnchor = `              v._.contactLog.findMany({
                where: {
                  customer: {
                    organizationId: x.organizationId,
                    deletedAt: null,
                  },
                },
                include: {
                  customer: { select: { id: !0, name: !0 } },
                },
                orderBy: { createdAt: "desc" },
                take: 200,
              }),
            ]),`
  const queryReplacement = `              v._.contactLog.findMany({
                where: {
                  customer: {
                    organizationId: x.organizationId,
                    deletedAt: null,
                  },
                },
                include: {
                  customer: { select: { id: !0, name: !0 } },
                },
                orderBy: { createdAt: "desc" },
                take: 200,
              }),
              v._.serviceSale.findMany({
                where: {
                  paidAt: { gte: D, lt: I },
                  customer: { organizationId: x.organizationId, deletedAt: null },
                },
                select: { paidAt: !0, amount: !0 },
              }),
            ]),`
  if (!s.includes(queryAnchor)) throw new Error('calendar sales query insertion anchor missing')
  s = s.replace(queryAnchor, queryReplacement)
  const mapAnchor = `          for (let e of q) {
            let t = $(e.scheduledAt);
            F.set(t, [...(F.get(t) ?? []), e]);
          }
          let L =`
  const mapReplacement = `          for (let e of q) {
            let t = $(e.scheduledAt);
            F.set(t, [...(F.get(t) ?? []), e]);
          }
          let dailySales = new Map();
          for (let sale of dailySalesRows) {
            let dateKey = $(sale.paidAt);
            dailySales.set(dateKey, (dailySales.get(dateKey) ?? 0) + sale.amount);
          }
          let L =`
  if (!s.includes(mapAnchor)) throw new Error('calendar sales map anchor missing')
  s = s.replace(mapAnchor, mapReplacement)
  const countAnchor = `                                    r
                                      ? n.jsx("span", {
                                          className:
                                            "rounded-full bg-[color:var(--lien-primary-soft)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--lien-primary-dark)]",
                                          children: "今日",
                                        })
                                      : t.length > 0
                                        ? (0, n.jsxs)("span", {
                                            className:
                                              "text-[10px] font-semibold text-[color:var(--lien-muted)]",
                                            children: [t.length, "件"],
                                          })
                                        : null,`
  const countReplacement = `                                    (0, n.jsxs)("div", {
                                      className: "flex flex-col items-end gap-0.5 text-right",
                                      children: [
                                        r ? n.jsx("span", { className: "rounded-full bg-[color:var(--lien-primary-soft)] px-2 py-0.5 text-[9px] font-bold text-[color:var(--lien-primary-dark)]", children: "今日" }) : null,
                                        t.length > 0 || (dailySales.get(e.key) ?? 0) > 0 ? (0, n.jsxs)("span", { className: "text-[10px] font-semibold tabular-nums text-[color:var(--lien-muted)]", children: [t.length, "件 ・ ¥", (dailySales.get(e.key) ?? 0).toLocaleString("ja-JP")] }) : null,
                                      ],
                                    }),`
  if (!s.includes(countAnchor)) throw new Error('calendar desktop count anchor missing')
  s = s.replace(countAnchor, countReplacement)
  const mobileAnchor = `                                t.length > 0
                                  ? n.jsx("span", {
                                      className: \`absolute bottom-1 h-1 w-1 rounded-full \${r ? "bg-white" : "bg-[#8f4f42]"}\`,
                                    })
                                  : null,`
  const mobileReplacement = `                                t.length > 0 || (dailySales.get(e.key) ?? 0) > 0
                                  ? (0, n.jsxs)("span", { className: \`absolute bottom-0.5 whitespace-nowrap text-[7px] font-bold tabular-nums \${r ? "text-white" : "text-[#8f4f42]"}\`, children: [t.length, "件 ¥", Math.round((dailySales.get(e.key) ?? 0) / 1000), "k"] })
                                  : null,`
  if (!s.includes(mobileAnchor)) throw new Error('calendar mobile count anchor missing')
  return s.replace(mobileAnchor, mobileReplacement)
})

// Customer chart: show and edit a distinct real name while retaining the booking name.
const customerChunk = path.join(root, 'server/chunks/3244.js')
edit(customerChunk, s => {
  const loadAnchor = '            el || (0, l.notFound)();\n            let customerRegistrationUrl ='
  const loadReplacement = `            el || (0, l.notFound)();\n            await k._.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "CustomerRealName" ("customerId" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "realName" TEXT NOT NULL, "updatedByUserId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)');\n            let realNameRow = (await k._.$queryRawUnsafe('SELECT "realName" FROM "CustomerRealName" WHERE "customerId"=$1 AND "organizationId"=$2 LIMIT 1', el.id, F.organizationId))[0] || null;\n            let customerRegistrationUrl =`
  if (!s.includes(loadAnchor)) throw new Error('customer real-name load anchor missing')
  s = s.replace(loadAnchor, loadReplacement)
  const formAnchor = '                }),\n                customerRegistrationQr'
  const realForm = `                }),\n                (0,n.jsxs)("section",{className:"lien-glass rounded-[22px] border p-5 shadow-sm",children:[n.jsx("h2",{className:"text-base font-semibold text-stone-950",children:"実際のお名前"}),n.jsx("p",{className:"mt-1 text-sm text-lien-muted",children:"予約時の名前は保持したまま、店舗で確認した実名を別に登録します。"}),(0,n.jsxs)("form",{action:"/api/lien-customer-real-name",method:"post",className:"mt-4 flex flex-col gap-3 sm:flex-row sm:items-end",children:[n.jsx("input",{type:"hidden",name:"customerId",value:el.id}),n.jsx("label",{className:"grid flex-1 gap-1.5 text-sm font-semibold",children:["実名",n.jsx("input",{name:"realName",defaultValue:realNameRow?.realName||"",required:!0,maxLength:100,className:"lien-input",placeholder:"例：予約名と異なる場合の本名"})]}),n.jsx("button",{type:"submit",className:"lien-button-primary shrink-0",children:"実名を保存"})]})]}),\n                customerRegistrationQr`
  if (!s.includes(formAnchor)) throw new Error('customer visible profile anchor missing')
  return s.replace(formAnchor, realForm)
})

// Product catalog: custom concern/effect tags already persist; improve examples and derive alternatives by shared tags.
const productsPage = path.join(root, 'server/app/admin/products/page.js')
edit(productsPage, s => {
  s = s.replaceAll('例: 細毛、熱ダメージ（読点区切り）', '例: 薄毛、べたつき、乾燥、熱ダメージ（読点区切り）')
  const mapAnchor = '              recentPurchaseCount: Z.get(e.id) ?? 0,\n            })),\n'
  const mapReplacement = '              recentPurchaseCount: Z.get(e.id) ?? 0,\n              alternativeRecommendation: e.alternativeRecommendation || (() => { let tags = A(e.concernTags); let matches = I.filter(p => p.id !== e.id && A(p.concernTags).some(tag => tags.includes(tag))).sort((a,b) => A(b.concernTags).filter(tag => tags.includes(tag)).length - A(a.concernTags).filter(tag => tags.includes(tag)).length).slice(0,3); return matches.length ? matches.map(p => p.name).join(" / ") : null; })(),\n            })),\n'
  if (!s.includes(mapAnchor)) throw new Error('product alternatives anchor missing')
  return s.replace(mapAnchor, mapReplacement)
})
