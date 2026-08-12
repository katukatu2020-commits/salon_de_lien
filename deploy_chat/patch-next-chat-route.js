const fs = require('fs')
const path = require('path')

const nextRoot = process.env.NEXT_ROOT || '/app/.next'
const serverRoot = path.join(nextRoot, 'server')
const sourceDir = path.join(serverRoot, 'app/admin/customers/messages')
const sourcePage = path.join(sourceDir, 'page.js')
let source = fs.readFileSync(sourcePage, 'utf8')

const moduleStart = source.indexOf('      95239: (e, s, t) => {')
const moduleEnd = source.indexOf('      35381: (e, s, t) => {', moduleStart)
if (moduleStart < 0 || moduleEnd < 0) throw new Error('chat page module anchors were not found')

const originalModule = source.slice(moduleStart, moduleEnd).replace('      95239: (e, s, t) => {', '      995239: (e, s, t) => {')
const chatModule = `      95239: (e, s, t) => {
        "use strict";
        (t.r(s), t.d(s, { default: () => y, dynamic: () => h }));
        var r = t(19510),
          n = t(57371),
          a = t(47015),
          i = t(90878),
          l = t(59219),
          o = t(13538),
          c = t(40430),
          v = t(995239);
        let d = (0, c.Z)("message-square", [["path", { d: "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z", key: "chat" }]]),
          h = "force-dynamic";
        async function y({ searchParams: e }) {
          if (e?.chat !== "1") return await v.default({ searchParams: e });
          let s = await (0, l.Os)(["ADMIN"]);
          if (!s.organizationId) return null;
          let t = await o._.$queryRawUnsafe('SELECT t.*, c."name" AS "customerName", (SELECT COUNT(*)::int FROM "ChatMessage" m WHERE m."threadId"=t."id" AND m."senderType"=\\'customer\\' AND (t."staffLastReadAt" IS NULL OR m."createdAt">t."staffLastReadAt")) AS "unreadCount", (SELECT m."body" FROM "ChatMessage" m WHERE m."threadId"=t."id" ORDER BY m."createdAt" DESC LIMIT 1) AS "latestBody", (SELECT m."createdAt" FROM "ChatMessage" m WHERE m."threadId"=t."id" ORDER BY m."createdAt" DESC LIMIT 1) AS "latestAt" FROM "ChatThread" t JOIN "Customer" c ON c."id"=t."customerId" WHERE t."organizationId"=$1 ORDER BY t."updatedAt" DESC', s.organizationId),
            m = e?.threadId ? t.find((s) => s.id === e.threadId) : e?.customerId ? t.find((s) => s.customerId === e.customerId) : t[0],
            u = m ? await o._.$queryRawUnsafe('SELECT * FROM "ChatMessage" WHERE "threadId"=$1 ORDER BY "createdAt" ASC LIMIT 300', m.id) : [];
          let q = !m && e?.customerId ? await o._.customer.findFirst({ where: { id: e.customerId, organizationId: s.organizationId, deletedAt: null }, select: { id: true, name: true } }) : null;
          if (m) await o._.$executeRawUnsafe('UPDATE "ChatThread" SET "staffLastReadAt"=CURRENT_TIMESTAMP WHERE "id"=$1', m.id);
          return (0, r.jsxs)("div", {
            className: "mx-auto grid w-full max-w-7xl gap-6",
            children: [
              r.jsx(a.Z, { active: "points" }),
              r.jsx(i.mr, {
                eyebrow: (0, r.jsxs)("span", { className: "inline-flex items-center gap-2", children: [r.jsx(d, { className: "h-4 w-4" }), "Customer chat"] }),
                title: "お客様からの相談",
                description: "未読の相談を確認し、担当スタッフとして返信できます。",
                breadcrumb: r.jsx(n.default, { href: "/admin/customers", className: "hover:text-lien-primary", children: "顧客・チャット・配信 / チャット" })
              }),
              (0, r.jsxs)("div", {
                className: "grid min-h-[620px] gap-4 lg:grid-cols-[19rem_minmax(0,1fr)]",
                style: { gridTemplateColumns: "19rem minmax(0,1fr)" },
                children: [
                  r.jsx(i.IP, {
                    className: "p-3 sm:p-3",
                    children: t.length ? r.jsx("div", { className: "grid gap-2", children: t.map((e) => r.jsx("a", {
                      href: "/admin/customers/messages/chat?threadId=" + encodeURIComponent(e.id),
                      className: "rounded-[16px] border px-4 py-3 transition " + (m?.id === e.id ? "border-[color:var(--lien-primary)] bg-[color:var(--lien-primary)] text-white shadow-sm" : "border-[color:var(--lien-border)] bg-white text-lien-ink hover:bg-lien-soft"),
                      children: (0, r.jsxs)("div", { children: [
                        (0, r.jsxs)("div", { className: "flex items-center justify-between gap-2", children: [r.jsx("strong", { className: "text-sm", children: e.customerName }), e.unreadCount ? r.jsx("span", { className: "rounded-full bg-[#c3483f] px-2 py-0.5 text-[11px] font-semibold text-white", children: e.unreadCount }) : null] }),
                        (0, r.jsxs)("div", { className: "mt-1 flex items-center justify-between gap-2 text-xs opacity-80", children: [r.jsx("span", { children: e.latestBody || e.staffName }), e.latestAt ? r.jsx("time", { children: new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" }).format(new Date(e.latestAt)) }) : null] })
                      ] })
                    }, e.id)) }) : r.jsx(i.ub, { icon: d, title: "会話はまだありません", description: "お客様から相談が届くとここに表示されます。" })
                  }),
                  r.jsx(i.IP, {
                    className: "flex min-h-[620px] flex-col",
                    style: { minHeight: "620px" },
                    children: m ? (0, r.jsxs)(r.Fragment, { children: [
                      (0, r.jsxs)("div", { className: "border-b border-lien pb-4", children: [r.jsx("h2", { className: "text-xl font-semibold text-lien-ink", children: m.customerName + " → " + m.staffName }), r.jsx("p", { className: "mt-1 text-xs text-lien-muted", children: "お客様との相談履歴" })] }),
                      r.jsx("div", { className: "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-5", children: u.length ? u.map((e, x) => (0, r.jsxs)(r.Fragment, { children: [x === 0 || new Date(u[x-1].createdAt).toDateString() !== new Date(e.createdAt).toDateString() ? r.jsx("div", { className: "my-2 text-center", children: r.jsx("span", { className: "rounded-full bg-[#d8d1ca] px-3 py-1 text-[11px] text-white", children: new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Tokyo" }).format(new Date(e.createdAt)) }) }) : null, (0, r.jsxs)("div", { className: "flex max-w-[78%] items-end gap-2 " + (e.senderType === "staff" ? "ml-auto flex-row-reverse" : ""), children: [r.jsx("div", { className: "rounded-[16px] px-4 py-3 text-sm leading-6 " + (e.senderType === "staff" ? "bg-[#8f4f42] text-white" : "bg-white text-lien-ink shadow-sm"), children: e.body }), (0, r.jsxs)("span", { className: "whitespace-nowrap text-[10px] text-lien-muted", children: [e.senderType === "staff" && m.customerLastReadAt && new Date(e.createdAt) <= new Date(m.customerLastReadAt) ? r.jsx("span", { className: "block text-right", children: "既読" }) : null, new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" }).format(new Date(e.createdAt))] })] })] }, e.id)) : r.jsx("p", { className: "py-12 text-center text-sm text-lien-muted", children: "メッセージはまだありません" }) }),
                      (0, r.jsxs)("form", { method: "post", action: "/api/lien-chat-form", className: "flex items-end gap-2 border-t border-lien pt-4", children: [
                        r.jsx("input", { type: "hidden", name: "threadId", value: m.id }),
                        r.jsx("textarea", { className: "lien-input min-h-[58px] flex-1 resize-y py-3", name: "body", maxLength: 2000, placeholder: "メッセージを入力", required: true }),
                        r.jsx("button", { type: "submit", className: "inline-flex items-center justify-center rounded-[14px] bg-[color:var(--lien-primary)] text-sm font-semibold text-white shadow-sm hover:bg-[color:var(--lien-primary-dark)]", style: { minHeight: "58px", padding: "0 20px", flexShrink: 0 }, children: "送信" })
                      ] })
                    ] }) : q ? (0, r.jsxs)(r.Fragment, { children: [r.jsx("h2", { className: "text-xl font-semibold", children: q.name + "さんへ新しいメッセージ" }), r.jsx("p", { className: "mt-2 text-sm text-lien-muted", children: "最初のメッセージを送るとトークが作成されます。" }), (0, r.jsxs)("form", { method: "post", action: "/api/lien-chat-form", className: "mt-auto flex items-end gap-2 border-t border-lien pt-4", children: [r.jsx("input", { type: "hidden", name: "customerId", value: q.id }), r.jsx("textarea", { className: "lien-input min-h-[58px] flex-1 resize-y py-3", name: "body", maxLength: 2000, placeholder: "メッセージを入力", required: true }), r.jsx("button", { type: "submit", className: "rounded-[14px] bg-[color:var(--lien-primary)] px-5 py-4 text-sm font-semibold text-white", children: "送信" })] })] }) : r.jsx(i.ub, { icon: d, title: "会話を選択してください", description: "左側の顧客を選ぶと相談内容を確認できます。" })
                  })
                ]
              })
            ]
          });
        }
      },
`

source = source.slice(0, moduleStart) + chatModule + originalModule + source.slice(moduleEnd)
source = source.replaceAll('mx-auto grid w-full max-w-6xl gap-6', 'mx-auto grid w-full max-w-7xl gap-6')
fs.writeFileSync(sourcePage, source)
console.log(JSON.stringify({ sourcePage, bytes: source.length, mode: 'chat' }))
