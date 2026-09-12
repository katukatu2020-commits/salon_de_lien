import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const manifestPath = '/tmp/password-visibility-v627-changes.json'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const count = (source, value) => source.split(value).length - 1

assert.ok(fs.existsSync(manifestPath), 'v627 change manifest is missing')
const changes = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
assert.deepEqual(
  [...new Set(changes.map(change => change.file))].sort(),
  ['server.js', 'wholesale-ordering-v543.js'],
  'v627 modified an unexpected runtime file',
)

const server = read('server.js')
const dealer = read('wholesale-ordering-v543.js')
const client = read('public/password-visibility-v627.js')
const css = read('public/password-visibility-v627.css')
const customerLogin = read('.next/server/app/u/login/page.js')
const storeLogin = read('.next/server/app/admin/login/page.js')

assert.equal(count(server, 'passwordLoginRouteV627 ='), 1)
assert.match(server, /pathname === '\/u\/login' \|\| pathname === '\/admin\/login'/)
assert.equal(count(server, 'id="orimia-password-visibility-v627"'), 1)
assert.equal(count(server, 'X-Lien-Password-Visibility'), 1)
assert.match(server, /X-Lien-Password-Visibility', 'v627'/)
assert.match(server, /X-Lien-Style-Detail-Cleanup', 'v626'/)

assert.equal(count(dealer, `sharedHead('ディーラーログイン').replace('</head>'`), 1)
assert.equal(count(dealer, 'id=\\"orimia-password-visibility-v627\\"'), 1)
assert.match(dealer, /form method="post" action="\/api\/dealer\/auth\/login"/)
assert.match(dealer, /input name="password" type="password" autocomplete="current-password"/)

assert.match(customerLogin, /action:"\/api\/customer-auth\/login"/)
assert.match(customerLogin, /name:"password",type:"password",minLength:8,maxLength:256,autoComplete:"current-password"/)
assert.match(storeLogin, /action:"\/api\/auth\/login"/)
assert.match(storeLogin, /name:"password",type:"password",autoComplete:"current-password"/)

for (const route of ['/u/login', '/admin/login', '/dealer/login']) assert.ok(client.includes(`'${route}'`), `${route} guard is missing`)
assert.match(client, /button\.type = 'button'/)
assert.match(client, /input\.type = visible \? 'text' : 'password'/)
assert.match(client, /button\.setAttribute\('aria-label', label\)/)
assert.match(client, /button\.setAttribute\('aria-pressed'/)
assert.match(client, /input\.focus\(\{ preventScroll: true \}\)/)
assert.doesNotMatch(client, /fetch\(|XMLHttpRequest|\.submit\(/)

assert.match(css, /width: 44px !important/)
assert.match(css, /height: 44px !important/)
assert.match(css, /padding-right: 52px !important/)

console.log(JSON.stringify({
  release: 'password-visibility-v627',
  runtimeVerified: true,
  changedRuntimeFiles: 2,
  loginRoutes: 3,
}))
