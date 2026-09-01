import fs from 'node:fs'
import path from 'node:path'

const root = process.env.APP_ROOT || '/app'
const serverPath = path.join(root, 'server.js')
const pagePath = path.join(root, '.next', 'server', 'app', 'admin', 'customers', 'messages', 'page.js')
const chunksPath = path.join(root, '.next', 'server', 'chunks')
const marker = 'coupon-broadcast-delivery-v525'

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

function findActionChunk() {
  const candidates = fs.readdirSync(chunksPath)
    .filter((name) => name.endsWith('.js'))
    .map((name) => path.join(chunksPath, name))
    .filter((filePath) => fs.readFileSync(filePath, 'utf8').includes('SMS一斉配信は利用できません。'))

  if (candidates.length !== 1) {
    throw new Error(`customer broadcast action chunk: expected 1 match, found ${candidates.length}`)
  }
  return candidates[0]
}

let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes(marker)) throw new Error(`${marker}: patch already applied`)
server = replaceExact(
  server,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Booking-Transition', 'v524')`,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Booking-Transition', 'v524')
      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Coupon-Broadcast-Delivery', 'v525') /* ${marker} */`,
  1,
  'coupon broadcast delivery readiness marker',
)
fs.writeFileSync(serverPath, server)

let page = fs.readFileSync(pagePath, 'utf8')
page = replaceExact(
  page,
  '対象顧客と配信方法を選び、アプリ内・登録メール・SMSへお知らせを届けます。クーポンを付けると対象者ごとに個別コードを発行します。',
  '対象顧客と配信方法を選び、アプリ内または登録メールへお知らせを届けます。クーポンを付けると対象者ごとに個別コードを発行します。',
  1,
  'broadcast page description',
)
page = replaceExact(
  page,
  'className: "grid grid-cols-3 gap-2",',
  'className: "grid grid-cols-2 gap-2",',
  1,
  'delivery method columns',
)
page = replaceExact(
  page,
  '                                  ["sms", "SMS", "本人確認済み携帯番号へ配信（通信料が発生）"],\n',
  '',
  1,
  'unsupported SMS broadcast option',
)
fs.writeFileSync(pagePath, page)

const actionPath = findActionChunk()
let action = fs.readFileSync(actionPath, 'utf8')
action = replaceExact(
  action,
  `        if (!["app", "email", "sms"].includes(deliveryMethod))
          throw Error("配信方法を確認してください。");
        if ("sms" === deliveryMethod)
          throw Error("SMS一斉配信は利用できません。SMSは、本人が要求した認証コードと、同意済み顧客への予約通知にのみ使用できます。");`,
  `        if ("sms" === deliveryMethod)
          deliveryMethod = "app"; /* ${marker}: stale-form compatibility */
        if (!["app", "email"].includes(deliveryMethod))
          throw Error("配信方法を確認してください。");`,
  1,
  'customer broadcast delivery validation',
)
fs.writeFileSync(actionPath, action)

console.log(JSON.stringify({ release: marker, actionChunk: path.basename(actionPath), patched: true }))
