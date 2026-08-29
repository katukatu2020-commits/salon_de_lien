import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const routePath = `${root}/.next/server/app/api/auth/password-reset/request/route.js`
const pagePath = `${root}/.next/server/app/u/password-reset/page.js`
const route = fs.readFileSync(routePath, 'utf8')
const page = fs.readFileSync(pagePath, 'utf8')

const assertions = [
  [route.includes('customer-password-reset-not-found-v464'), 'route marker is present'],
  [route.includes('customer:{is:{deletedAt:null}}'), 'withdrawn customers are excluded'],
  [route.includes('searchParams.set("error","account-not-found")'), 'missing accounts use an explicit error redirect'],
  [route.indexOf('appUser.findFirst') < route.indexOf('m.get(s)'), 'account state is checked before send throttling'],
  [page.includes('customer-password-reset-not-found-v464'), 'customer page marker is present'],
  [page.includes('accountNotFound:e?.error==="account-not-found"'), 'customer page reads the error state'],
  [page.includes('このメールアドレスに一致する登録情報はありません。入力内容をご確認ください。'), 'customer page shows the missing-account error'],
  [!page.includes('該当するアカウントがある場合、再設定メールを送信しました。'), 'customer page no longer shows the generic success message'],
]

for (const [condition, label] of assertions) {
  if (!condition) throw new Error(`runtime verification failed: ${label}`)
}

for (const file of [routePath, pagePath]) {
  const syntax = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  if (syntax.status !== 0) throw new Error(syntax.stderr || syntax.stdout)
}

console.log(`customer password-reset v464 verified (${assertions.length} assertions)`)
