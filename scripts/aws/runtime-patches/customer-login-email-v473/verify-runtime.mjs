import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const files = {
  loginRoute: `${root}/.next/server/app/api/customer-auth/login/route.js`,
  loginPage: `${root}/.next/server/app/u/login/page.js`,
}

const sources = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, 'utf8')]),
)

const assertions = [
  [sources.loginRoute.includes('OR:[{loginId:{equals:n,mode:"insensitive"}},{email:{equals:n,mode:"insensitive"}}]'), 'route accepts login ID or registered email'],
  [sources.loginRoute.includes('select:{id:!0,loginId:!0,email:!0,passwordHash:!0'), 'route selects the registered email'],
  [sources.loginRoute.includes('&&(m.loginId||m.email)&&m.passwordHash'), 'route accepts canonical ID or legacy email subject'],
  [sources.loginRoute.includes('loginId:m.loginId||m.email,customerId:m.customerId'), 'session stores a canonical subject'],
  [sources.loginRoute.includes('n&&!n.includes("@")&&o.searchParams.set("loginId",n)'), 'failed email is not exposed in redirect query'],
  [sources.loginPage.includes('登録したログインIDまたはメールアドレスとパスワードを入力してください。'), 'page explains both identifiers'],
  [sources.loginPage.includes('ログインIDまたはメールアドレス'), 'page labels the identifier field'],
]

for (const [condition, label] of assertions) {
  if (!condition) throw new Error(`runtime verification failed: ${label}`)
}

if (sources.loginRoute.includes('where:{loginId:n,role:"CUSTOMER"}')) {
  throw new Error('stale login-ID-only lookup remains')
}

for (const file of Object.values(files)) {
  const syntax = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  if (syntax.status !== 0) throw new Error(`${file}: ${syntax.stderr || syntax.stdout}`)
}

console.log(`customer login email v473 verified (${assertions.length} assertions)`)
