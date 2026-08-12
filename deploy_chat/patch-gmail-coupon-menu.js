const fs = require('fs')
const path = require('path')

const root = process.env.NEXT_ROOT || '/app/.next'
const chunks = path.join(root, 'server/chunks')
let patched = 0

for (const name of fs.readdirSync(chunks)) {
  if (!name.endsWith('.js')) continue
  const file = path.join(chunks, name)
  let source = fs.readFileSync(file, 'utf8')
  if (!source.includes('予約時クーポン') || !source.includes('予約時メニュー') || !source.includes('合計施術時間')) continue
  const before = source
  source = source.replace(
    '        menu: [\n          "予約時クーポン",\n          "予約時メニュー",',
    '        coupon: ["予約時クーポン", "ご利用クーポン", "利用クーポン"],\n        menu: [\n          "予約時メニュー",',
  )
  source = source.replace(
    '                  menu: c(s(t, u.menu)),',
    '                  menu: (() => { let e = c(s(t, u.menu)), a = c(s(t, u.coupon)); return [e, a ? `クーポン: ${a}` : null].filter(Boolean).join(" / ") || null; })(),',
  )
  if (source !== before) {
    fs.writeFileSync(file, source)
    patched++
  }
}

if (!patched) throw new Error('Gmail reservation parser bundle was not found')
console.log(`patched Gmail coupon/menu parsing in ${patched} bundle(s)`)

