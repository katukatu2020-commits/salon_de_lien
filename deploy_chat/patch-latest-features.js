const fs = require('fs')
const path = require('path')
const root = process.env.NEXT_ROOT || '/app/.next'

function edit(file, fn) {
  const before = fs.readFileSync(file, 'utf8')
  const after = fn(before)
  if (after === before) throw new Error(`no patch applied: ${file}`)
  fs.writeFileSync(file, after)
}

// Shared admin header: an actual client component using the existing React and Link modules.
const chunks = path.join(root, 'server/chunks')
for (const name of fs.readdirSync(chunks)) {
  const file = path.join(chunks, name)
  if (!name.endsWith('.js')) continue
  const src = fs.readFileSync(file, 'utf8')
  if (!src.includes('アカウント設定を開く') || !src.includes('Ctrl K')) continue
  edit(file, s => {
    const anchor = 'function _({ displayName: e, compact: t = !1 }) {'
    if (!s.includes(anchor)) throw new Error('header component anchor missing')
    const widget = `function B(){let[e,t]=(0,b.useState)(0);return((0,b.useEffect)(()=>{let e=!1;async function n(){try{let n=await fetch("/api/lien-staff-notifications",{cache:"no-store"}),r=await n.json();e||t(Number(r.count)||0)}catch{}}n();let r=setInterval(n,3e4);return()=>{e=!0,clearInterval(r)}},[])),(0,r.jsxs)(a.default,{href:"/admin/notifications",className:"relative lien-button-secondary h-10 shrink-0 px-3 text-xs",title:"お知らせ",children:[r.jsx("span",{children:"お知らせ"}),e>0?r.jsx("span",{className:"absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white",children:e>99?"99+":e}):null]}))} `
    s = s.replace(anchor, widget + anchor)
    s = s.replace('r.jsx(_, { displayName: i }),\n                        r.jsx(a.default, {', 'r.jsx(B, {}),\n                        r.jsx(_, { displayName: i }),\n                        r.jsx(a.default, {')
    return s
  })
  break
}

// Account page: load and edit the logged-in staff member's public one-line introduction.
const account = path.join(root, 'server/app/admin/account/page.js')
edit(account, s => {
  s = s.replace('r || (0, d.redirect)("/admin/login");\n          let u =', 'r || (0, d.redirect)("/admin/login");\n          await c._.$executeRawUnsafe(\'CREATE TABLE IF NOT EXISTS "StaffProfileSetting" ("id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "userId" TEXT NOT NULL, "introduction" TEXT NOT NULL DEFAULT \\\'\\\', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE("organizationId", "userId"))\');\n          let introRows = await c._.$queryRawUnsafe(\'SELECT "introduction" FROM "StaffProfileSetting" WHERE "organizationId"=$1 AND "userId"=$2 LIMIT 1\', t.organizationId, t.userId), introduction = introRows[0]?.introduction || "";\n          let u =')
  const end = '                  }),\n                ],\n              }),\n            ],\n          });'
  const form = `                  }),\n+                  (0, s.jsxs)("form", { action: "/api/lien-staff-introduction", method: "post", className: "lg:col-span-2 rounded-[24px] border border-lien bg-white p-5 shadow-lien-sm sm:p-6", children: [(0,s.jsxs)("div",{children:[s.jsx("h2",{className:"text-lg font-semibold",children:"お客様に表示する紹介文"}),s.jsx("p",{className:"mt-1 text-sm text-lien-muted",children:"予約画面のスタッフ欄に表示される、ご自身の一文紹介です。"})]}),s.jsx("textarea",{name:"introduction",defaultValue:introduction,maxLength:160,rows:3,className:"mt-4 w-full rounded-xl border border-lien bg-white px-4 py-3 text-sm outline-none focus:border-[color:var(--lien-primary)]",placeholder:"例：髪質やライフスタイルに合わせた扱いやすいスタイルをご提案します。"}),s.jsx("button",{type:"submit",className:"lien-button-primary mt-4",children:"紹介文を保存"}),e?.introduction==="saved"?s.jsx("span",{className:"ml-3 text-sm font-semibold text-[#405d41]",children:"保存しました"}):null]})\n+                ],\n+              }),\n+            ],\n+          });`
  if (!s.includes(end)) throw new Error('account render anchor missing')
  return s.replace(end, form)
})

// Appointment detail reached from calendar: add cancellation action and confirmation.
const detail = path.join(root, 'server/app/admin/appointments/[appointmentId]/page.js')
edit(detail, s => {
  const anchor = '                  t?.error\n                    ? a.jsx("div", {'
  if (!s.includes(anchor)) throw new Error('appointment render anchor missing')
  const block = `                  t?.cancelled === "1" ? a.jsx("div",{role:"status",className:"rounded-[18px] border border-[#cbdcc8] bg-[#eef5ed] px-4 py-3 text-sm font-semibold text-[#405d41]",children:"予約をキャンセルし、お客様アプリへお知らせを送信しました。"}):null,\n+                  !["キャンセル","無断キャンセル"].includes(k.status) && !D ? (0,a.jsxs)("form",{action:"/api/lien-appointment-cancel",method:"post",className:"flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#edc2bd] bg-[#fff7f5] px-4 py-3",children:[a.jsx("input",{type:"hidden",name:"appointmentId",value:k.id}),a.jsx("p",{className:"text-sm text-lien-muted",children:"この予約をキャンセルし、お客様へ通知します。"}),a.jsx("button",{type:"submit",className:"rounded-xl bg-[#a33f38] px-4 py-2 text-sm font-semibold text-white",children:"予約をキャンセル"})]}):null,\n+`
  return s.replace(anchor, block + anchor)
})

// Customer booking UI: pass saved introductions from server data and prefer them over defaults.
const customerPage = path.join(root, 'server/app/u/(account)/appointments/page.js')
edit(customerPage, s => {
  const old = 'let r="assigned"===t.staffAssignmentType?(0,l.Cp)(t.assignedStaffName):null,c=(0,o.Y$)(new Date);'
  const replacement = 'await d._.$executeRawUnsafe(\'CREATE TABLE IF NOT EXISTS "StaffProfileSetting" ("id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "userId" TEXT NOT NULL, "introduction" TEXT NOT NULL DEFAULT \\\'\\\', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE("organizationId", "userId"))\');let profileRows=await d._.$queryRawUnsafe(\'SELECT u."displayName",p."introduction" FROM "StaffProfileSetting" p JOIN "AppUser" u ON u."id"=p."userId" WHERE p."organizationId"=$1\',e.organizationId),introByName=new Map(profileRows.map(e=>[String(e.displayName||"").replace(/\\s/g,""),e.introduction]));let r="assigned"===t.staffAssignmentType?(0,l.Cp)(t.assignedStaffName):null,c=(0,o.Y$)(new Date);'
  if (!s.includes(old)) throw new Error('customer page data anchor missing')
  s = s.replace(old, replacement)
  s = s.replace('staff:l.zj.map(({key:e,name:t,role:r})=>({key:e,name:t,role:r}))', 'staff:l.zj.map(({key:e,name:t,role:r})=>({key:e,name:t,role:r,introduction:introByName.get(t.replace(/\\s/g,""))||""}))')
  return s
})

const staticRoot = path.join(root, 'static/chunks/app/u/(account)/appointments')
for (const name of fs.readdirSync(staticRoot)) {
  if (!name.endsWith('.js')) continue
  const file = path.join(staticRoot, name)
  const s = fs.readFileSync(file, 'utf8')
  if (!s.includes('X.message') || !s.includes('CustomerBookingCalendar')) continue
  edit(file, x => x.replace('children:X.message', 'children:K.introduction||X.message'))
}
