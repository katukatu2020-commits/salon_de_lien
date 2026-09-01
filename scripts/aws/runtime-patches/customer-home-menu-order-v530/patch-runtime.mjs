import fs from 'node:fs'

const serverPath = '/app/server.js'
const marker = 'customer-home-menu-order-v530'
let server = fs.readFileSync(serverPath, 'utf8')

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${label}: target was not found`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: target was not unique`)
  return source.slice(0, first) + after + source.slice(first + before.length)
}

const previousOrder = `  const quick = [
    ['booking','予約する','RESERVE','/u/appointments','rose'],
    ['campaign','キャンペーン','CAMPAIGN','/u/campaigns','amber'],
    ['profile','マイページ','MY PAGE','/u/profile','blue'],
    ['coupon','クーポン','COUPON','/u/coupons','plum'],
    ['salons','登録済みの店舗','MY SALONS','/u/stores','sage'],
    ['loyalty','スタンプカード','STAMP CARD','/u/stamps','amber'],
    ['styles','ヘアスタイル','STYLE','/u/community','blue'],
    ['recommendations','私に合うアイテム','ITEM RANKING','/u/catalog','sage'],
    ['reviews','お客様の声','IMPRESSION','/u/reviews','rose'],
  ]`

const requestedOrder = `  const quick = [ /* ${marker} */
    ['booking','予約する','RESERVE','/u/appointments','rose'],
    ['styles','ヘアスタイル','STYLE','/u/community','blue'],
    ['recommendations','私に合うアイテム','ITEM RANKING','/u/catalog','sage'],
    ['coupon','クーポン','COUPON','/u/coupons','plum'],
    ['profile','マイページ','MY PAGE','/u/profile','blue'],
    ['loyalty','スタンプカード','STAMP CARD','/u/stamps','amber'],
    ['campaign','キャンペーン','CAMPAIGN','/u/campaigns','amber'],
    ['reviews','お客様の声','IMPRESSION','/u/reviews','rose'],
    ['salons','登録済みの店舗','MY SALONS','/u/stores','sage'],
  ]`

server = replaceOnce(server, previousOrder, requestedOrder, 'customer home shortcut order')

const desktopReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Desktop-Frontend', 'v529') /* customer-desktop-frontend-v529 */`
server = replaceOnce(
  server,
  desktopReady,
  `${desktopReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Home-Menu-Order', 'v530') /* ${marker} */`,
  'customer home menu order readiness marker',
)

fs.writeFileSync(serverPath, server)
console.log(JSON.stringify({ release: marker, patched: true }))
