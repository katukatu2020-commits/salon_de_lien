import assert from 'node:assert/strict'
import fs from 'node:fs'

const server = fs.readFileSync('/app/server.js', 'utf8')
const marker = 'customer-home-menu-order-v530'
const homeStart = server.indexOf('async function customerHomePage(res, session) {')
const quickStart = server.indexOf('const quick = [', homeStart)
const quickEnd = server.indexOf('const announcementSection', quickStart)

assert.ok(homeStart >= 0 && quickStart > homeStart && quickEnd > quickStart)
const quickSource = server.slice(quickStart, quickEnd)
assert.match(quickSource, new RegExp(marker))

const entries = [...quickSource.matchAll(/\['([^']+)','([^']+)','([^']+)','([^']+)','([^']+)'\]/g)]
  .map(match => ({ icon: match[1], label: match[2], english: match[3], href: match[4], tone: match[5] }))

assert.deepEqual(entries, [
  { icon: 'booking', label: '予約する', english: 'RESERVE', href: '/u/appointments', tone: 'rose' },
  { icon: 'styles', label: 'ヘアスタイル', english: 'STYLE', href: '/u/community', tone: 'blue' },
  { icon: 'recommendations', label: '私に合うアイテム', english: 'ITEM RANKING', href: '/u/catalog', tone: 'sage' },
  { icon: 'coupon', label: 'クーポン', english: 'COUPON', href: '/u/coupons', tone: 'plum' },
  { icon: 'profile', label: 'マイページ', english: 'MY PAGE', href: '/u/profile', tone: 'blue' },
  { icon: 'loyalty', label: 'スタンプカード', english: 'STAMP CARD', href: '/u/stamps', tone: 'amber' },
  { icon: 'campaign', label: 'キャンペーン', english: 'CAMPAIGN', href: '/u/campaigns', tone: 'amber' },
  { icon: 'reviews', label: 'お客様の声', english: 'IMPRESSION', href: '/u/reviews', tone: 'rose' },
  { icon: 'salons', label: '登録済みの店舗', english: 'MY SALONS', href: '/u/stores', tone: 'sage' },
])

assert.match(server, /X-Lien-Customer-Home-Menu-Order', 'v530'/)
assert.match(server, /X-Lien-Customer-Desktop-Frontend', 'v529'/)
assert.match(server, /X-Lien-Customer-Home-Branding', 'v528'/)
assert.match(server, /X-Lien-Line-Booking-UI-Parity', 'v527'/)

console.log(JSON.stringify({ release: marker, runtimeVerified: true, shortcuts: entries.length }))
