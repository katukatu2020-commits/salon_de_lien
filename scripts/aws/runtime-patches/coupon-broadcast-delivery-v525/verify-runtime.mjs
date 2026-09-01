import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.APP_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const page = fs.readFileSync(path.join(root, '.next', 'server', 'app', 'admin', 'customers', 'messages', 'page.js'), 'utf8')
const chunkDir = path.join(root, '.next', 'server', 'chunks')
const actionFiles = fs.readdirSync(chunkDir)
  .filter((name) => name.endsWith('.js'))
  .map((name) => path.join(chunkDir, name))
  .filter((filePath) => fs.readFileSync(filePath, 'utf8').includes('coupon-broadcast-delivery-v525: stale-form compatibility'))

assert.match(server, /X-Lien-Coupon-Broadcast-Delivery', 'v525'/)
assert.match(server, /coupon-broadcast-delivery-v525/)
assert.match(server, /X-Lien-Customer-Booking-Transition', 'v524'/)

assert.match(page, /アプリ内または登録メールへお知らせを届けます/)
assert.match(page, /className: "grid grid-cols-2 gap-2"/)
assert.doesNotMatch(page, /\["sms", "SMS", "本人確認済み携帯番号へ配信/)
assert.doesNotMatch(page, /アプリ内・登録メール・SMSへお知らせ/)

assert.equal(actionFiles.length, 1)
const action = fs.readFileSync(actionFiles[0], 'utf8')
assert.match(action, /if \("sms" === deliveryMethod\)\s+deliveryMethod = "app"/)
assert.match(action, /if \(!\["app", "email"\]\.includes\(deliveryMethod\)\)/)
assert.doesNotMatch(action, /throw Error\("SMS一斉配信は利用できません/)

console.log(JSON.stringify({
  release: 'coupon-broadcast-delivery-v525',
  actionChunk: path.basename(actionFiles[0]),
  verified: true,
}))
