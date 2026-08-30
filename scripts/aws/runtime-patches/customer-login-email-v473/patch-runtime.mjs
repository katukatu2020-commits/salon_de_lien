import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const loginRoutePath = `${root}/.next/server/app/api/customer-auth/login/route.js`
const loginPagePath = `${root}/.next/server/app/u/login/page.js`

function replaceExact(source, before, after, expectedCount, label) {
  const count = source.split(before).length - 1
  if (count !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} matches, found ${count}`)
  }
  return source.split(before).join(after)
}

let loginRoute = fs.readFileSync(loginRoutePath, 'utf8')
loginRoute = replaceExact(
  loginRoute,
  'n&&o.searchParams.set("loginId",n)',
  'n&&!n.includes("@")&&o.searchParams.set("loginId",n)',
  1,
  'email redirect privacy guard',
)
loginRoute = replaceExact(
  loginRoute,
  'where:{loginId:n,role:"CUSTOMER"},select:{id:!0,loginId:!0,passwordHash:!0',
  'where:{role:"CUSTOMER",OR:[{loginId:{equals:n,mode:"insensitive"}},{email:{equals:n,mode:"insensitive"}}]},select:{id:!0,loginId:!0,email:!0,passwordHash:!0',
  1,
  'login identifier lookup',
)
loginRoute = replaceExact(
  loginRoute,
  '&&m.loginId&&m.passwordHash',
  '&&(m.loginId||m.email)&&m.passwordHash',
  1,
  'canonical session subject validation',
)
loginRoute = replaceExact(
  loginRoute,
  'loginId:m.loginId,customerId:m.customerId',
  'loginId:m.loginId||m.email,customerId:m.customerId',
  1,
  'canonical session subject',
)
fs.writeFileSync(loginRoutePath, loginRoute)

let loginPage = fs.readFileSync(loginPagePath, 'utf8')
const pageReplacements = [
  ['ログインIDまたはパスワードが正しくありません。', 'ログインID・メールアドレスまたはパスワードが正しくありません。', 'credential error'],
  ['登録したログインIDとパスワードを入力してください。', '登録したログインIDまたはメールアドレスとパスワードを入力してください。', 'login guidance'],
  ['登録が完了しました。設定したIDとパスワードでログインできます。', '登録が完了しました。設定したIDまたは登録メールアドレスとパスワードでログインできます。', 'registration success'],
  ['children:["ログインID",(0,s.jsxs)("span"', 'children:["ログインIDまたはメールアドレス",(0,s.jsxs)("span"', 'identifier label'],
]
for (const [before, after, label] of pageReplacements) {
  loginPage = replaceExact(loginPage, before, after, 1, label)
}
fs.writeFileSync(loginPagePath, loginPage)

console.log('customer login email v473 patched')
