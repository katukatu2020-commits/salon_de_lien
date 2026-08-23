import fs from 'node:fs'

const customerHomePath = '/app/.next/server/app/u/(account)/home/page.js'
const adminMessagesPath = '/app/.next/server/app/admin/customers/messages/page.js'
const commercialPath = '/app/commercial-admin-v101.js'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function replaceRange(source, startMarker, endMarker, replacement, label) {
  const startCount = source.split(startMarker).length - 1
  if (startCount !== 1) throw new Error(`${label} start: expected one match, found ${startCount}`)
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start)
  if (end < 0) throw new Error(`${label} end: marker was not found`)
  return source.slice(0, start) + replacement + source.slice(end)
}

let customerHome = fs.readFileSync(customerHomePath, 'utf8')
let adminMessages = fs.readFileSync(adminMessagesPath, 'utf8')
let commercial = fs.readFileSync(commercialPath, 'utf8')

const campaignCard = `s.jsx(a.default,{href:"/u/messages",className:"lien-action-card block rounded-[20px] border border-[#dfc9bf] bg-[#fff8f5] p-5 pr-12 transition",children:(0,s.jsxs)("div",{className:"flex items-start gap-3",children:[s.jsx(c.Z,{className:"mt-0.5 h-5 w-5 shrink-0 text-[#8f4f42]"}),(0,s.jsxs)("div",{className:"min-w-0 flex-1",children:[(0,s.jsxs)("div",{className:"flex items-center gap-2",children:[s.jsx("p",{className:"text-sm font-semibold text-[#5b332c]",children:"お店からのイベント・キャンペーン"}),v>0?(0,s.jsxs)("span",{className:"rounded-full bg-[#8f4f42] px-2 py-0.5 text-[10px] font-semibold text-white",children:["新着 ",v]}):null]}),s.jsx("p",{className:"mt-2 truncate text-sm text-[#755f56]",children:r.broadcastRecipients.length>0?r.broadcastRecipients[0].broadcast.title:"現在開催中のイベント・キャンペーンはありません"}),s.jsx("p",{className:"mt-1 text-xs text-[#8b8178]",children:r.broadcastRecipients.length>0?r.broadcastRecipients[0].broadcast.couponEnabled?"クーポン付きのご案内です":"内容を確認する":"新しいご案内が届くとここに表示されます"})]}),s.jsx(l.Z,{className:"h-5 w-5 shrink-0 text-[#a47d70]"})]})}),`

customerHome = replaceRange(
  customerHome,
  'r.broadcastRecipients.length>0?s.jsx(a.default,{href:"/u/messages"',
  '(0,s.jsxs)("section",{className:"lg:col-span-2"',
  campaignCard,
  'customer home campaign card',
)

adminMessages = replaceOnce(
  adminMessages,
  'title: "顧客へのお知らせ・クーポン配信",',
  'title: "イベント・キャンペーン配信",',
  'admin campaign page title',
)
adminMessages = replaceOnce(
  adminMessages,
  '"Customer message",',
  '"Event & campaign",',
  'admin campaign eyebrow',
)
adminMessages = replaceOnce(
  adminMessages,
  '"\u5bfe\u8c61\u9867\u5ba2\u3068\u914d\u4fe1\u65b9\u6cd5\u3092\u9078\u3073\u3001\u30a2\u30d7\u30ea\u5185\u30fb\u767b\u9332\u30e1\u30fc\u30eb\u30fbSMS\u3078\u304a\u77e5\u3089\u305b\u3092\u5c4a\u3051\u307e\u3059\u3002\u30af\u30fc\u30dd\u30f3\u3092\u4ed8\u3051\u308b\u3068\u5bfe\u8c61\u8005\u3054\u3068\u306b\u500b\u5225\u30b3\u30fc\u30c9\u3092\u767a\u884c\u3057\u307e\u3059\u3002",',
  '"\u5e97\u8217\u306e\u30a4\u30d9\u30f3\u30c8\u3084\u30ad\u30e3\u30f3\u30da\u30fc\u30f3\u3092\u3001\u304a\u5ba2\u69d8\u30a2\u30d7\u30ea\u306e\u30db\u30fc\u30e0\u3068\u53d7\u4fe1\u30dc\u30c3\u30af\u30b9\u3078\u914d\u4fe1\u3057\u307e\u3059\u3002\u5e74\u9f62\u30fb\u6027\u5225\u3067\u5bfe\u8c61\u3092\u7d5e\u308a\u3001\u30af\u30fc\u30dd\u30f3\u3082\u4e00\u7dd2\u306b\u5c4a\u3051\u3089\u308c\u307e\u3059\u3002",',
  'admin campaign description',
)
adminMessages = replaceOnce(
  adminMessages,
  '"お客様アプリ内に表示する件名と本文です。",',
  '"お客様アプリのホームと受信ボックスに表示する内容です。",',
  'admin campaign form helper',
)
adminMessages = replaceOnce(
  adminMessages,
  '                              "件名",',
  '                              "イベント・キャンペーン名",',
  'admin campaign title label',
)
adminMessages = replaceOnce(
  adminMessages,
  'placeholder: "例: 秋のヘアケアのお知らせ",',
  'placeholder: "例: 秋のヘアケアキャンペーン",',
  'admin campaign title placeholder',
)

const desktopShellStyles = `
      html.ca-admin-pc-shell,html.ca-admin-pc-shell body{min-width:1100px!important;overflow-x:auto!important}
      html.ca-admin-pc-shell body .admin-app-shell{min-width:1100px!important;overflow-x:visible!important}
      html.ca-admin-pc-shell body .admin-app-shell>aside.admin-desktop-sidebar{display:block!important}
      html.ca-admin-pc-shell body .admin-app-shell>aside.admin-desktop-sidebar.translate-x-0{transform:translateX(0)!important}
      html.ca-admin-pc-shell body .admin-app-shell>aside.admin-desktop-sidebar.-translate-x-full{transform:translateX(-100%)!important}
      html.ca-admin-pc-shell body .admin-app-shell>aside.admin-desktop-sidebar.translate-x-0~div.min-w-0{padding-left:16rem!important}
      html.ca-admin-pc-shell body .admin-app-shell>aside.admin-desktop-sidebar.-translate-x-full~div.min-w-0{padding-left:0!important}
      html.ca-admin-pc-shell body .admin-app-shell .admin-mobile-header,html.ca-admin-pc-shell body .admin-app-shell .admin-mobile-sidebar{display:none!important}
      html.ca-admin-pc-shell body .admin-app-shell .admin-desktop-header{display:flex!important}
      html.ca-admin-pc-shell body button[aria-label="サイドバーを閉じる"],html.ca-admin-pc-shell body button[aria-label="サイドバーを開く"]{display:grid!important;width:38px!important;height:38px!important;min-width:38px!important;min-height:38px!important;place-items:center!important;overflow:hidden!important;border:1px solid #dfcec6!important;border-radius:13px!important;background:linear-gradient(145deg,#fff,#fff8f5)!important;padding:0!important;color:#865044!important;font-size:0!important;line-height:0!important;box-shadow:0 8px 22px rgba(77,42,33,.13),inset 0 1px 0 #fff!important}
      html.ca-admin-pc-shell body button[aria-label="サイドバーを閉じる"]::before,html.ca-admin-pc-shell body button[aria-label="サイドバーを開く"]::before{display:block!important;width:18px!important;height:18px!important;background:currentColor!important;content:""!important;mask-position:center!important;mask-repeat:no-repeat!important;mask-size:18px 18px!important}
      html.ca-admin-pc-shell body button[aria-label="サイドバーを閉じる"]::before{mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='m15 18-6-6 6-6' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")!important}
      html.ca-admin-pc-shell body button[aria-label="サイドバーを開く"]::before{mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='m9 18 6-6-6-6' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")!important}
      html.ca-admin-pc-shell body button.ca-sidebar-control::before,html.ca-admin-pc-shell body button.ca-sidebar-control::after{display:none!important;content:none!important}
      html.ca-admin-pc-shell body button.ca-sidebar-control>svg{display:block!important;width:18px!important;height:18px!important;flex:0 0 18px!important;pointer-events:none!important}
    `

commercial = replaceOnce(
  commercial,
  `    document.head.appendChild(style)\n    const isolatedStart = style.textContent.indexOf('.ca-settings-embedded header.admin-shell-header')`,
  `    style.textContent += ${JSON.stringify(desktopShellStyles)}\n    document.head.appendChild(style)\n    const isolatedStart = style.textContent.indexOf('.ca-settings-embedded header.admin-shell-header')`,
  'admin desktop shell styles',
)

commercial = replaceOnce(
  commercial,
  `  function enhance() {\n    enforceAdminSquareImageInputs();`,
  `  function enforceAdminDesktopShell() {\n    if (!location.pathname.startsWith('/admin') || !document.querySelector('.admin-app-shell')) return\n    document.documentElement.classList.add('ca-admin-pc-shell')\n  }\n\n  function enhance() {\n    enforceAdminDesktopShell(); enforceAdminSquareImageInputs();`,
  'admin desktop shell activation',
)

fs.writeFileSync(customerHomePath, customerHome)
fs.writeFileSync(adminMessagesPath, adminMessages)
fs.writeFileSync(commercialPath, commercial)

console.log('customer campaign and admin desktop v418 runtime patched')
