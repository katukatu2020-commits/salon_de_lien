import fs from 'node:fs'

const customerHome = fs.readFileSync('/app/.next/server/app/u/(account)/home/page.js', 'utf8')
const adminMessages = fs.readFileSync('/app/.next/server/app/admin/customers/messages/page.js', 'utf8')
const commercial = fs.readFileSync('/app/commercial-admin-v101.js', 'utf8')

for (const marker of [
  'お店からのイベント・キャンペーン',
  '現在開催中のイベント・キャンペーンはありません',
  'r.broadcastRecipients.length>0?r.broadcastRecipients[0].broadcast.title',
  'href:"/u/messages"',
]) {
  if (!customerHome.includes(marker)) throw new Error(`missing customer campaign marker: ${marker}`)
}

for (const marker of [
  'イベント・キャンペーン配信',
  'Event & campaign',
  'お客様アプリのホームと受信ボックス',
  'イベント・キャンペーン名',
]) {
  if (!adminMessages.includes(marker)) throw new Error(`missing admin campaign marker: ${marker}`)
}

for (const marker of [
  'ca-admin-pc-shell',
  'function enforceAdminDesktopShell()',
  'document.documentElement.classList.add(\'ca-admin-pc-shell\')',
  'min-width:1100px!important',
  '.admin-desktop-header{display:flex!important}',
  '.admin-mobile-header,html.ca-admin-pc-shell body .admin-app-shell .admin-mobile-sidebar{display:none!important}',
]) {
  if (!commercial.includes(marker)) throw new Error(`missing admin desktop marker: ${marker}`)
}

for (const stale of [
  'r.broadcastRecipients.length>0?s.jsx(a.default,{href:"/u/messages"',
  'children:"サロンからのお知らせ"',
  'title: "顧客へのお知らせ・クーポン配信"',
]) {
  if (customerHome.includes(stale) || adminMessages.includes(stale)) {
    throw new Error(`stale customer campaign behavior remains: ${stale}`)
  }
}

new Function(customerHome)
new Function(adminMessages)
new Function(commercial)

console.log('customer campaign and admin desktop v418 runtime verified')
