import fs from 'node:fs'

const files = {
  registration: fs.readFileSync('/app/.next/server/app/api/customer-auth/registration-link/request/route.js', 'utf8'),
  passwordReset: fs.readFileSync('/app/.next/server/app/api/auth/password-reset/request/route.js', 'utf8'),
  withdrawal: fs.readFileSync('/app/customer-withdrawal-v309.js', 'utf8'),
}

const expected = {
  registration: [
    '【Salon de Lien】お客様アプリの登録手続きをお願いします',
    '登録手続きを完了してください',
    '登録手続きを続ける',
    'ご本人確認',
    'HtmlBody',
  ],
  passwordReset: [
    '【Salon de Lien】ログイン情報の再設定',
    'ログイン情報を再設定してください',
    'パスワードを再設定する',
    'HtmlBody',
  ],
  withdrawal: [
    '退会申請を受け付けました。この時点では、まだ退会は完了していません。',
    '退会手続きを確認する',
    '確認画面を開いただけでは退会は完了しません。',
    'HtmlBody: htmlBody',
  ],
}

for (const [name, markers] of Object.entries(expected)) {
  for (const marker of markers) {
    if (!files[name].includes(marker)) throw new Error(`${name}: missing marker ${marker}`)
  }
}

for (const [name, source] of Object.entries(files)) {
  for (const marker of [
    'max-width:600px',
    'background:#f7f3ef',
    'ボタンを押せない場合は、次のURLをブラウザへ貼り付けてください。',
    'このメールに心当たりがない場合は',
  ]) {
    if (!source.includes(marker)) throw new Error(`${name}: missing commercial template marker ${marker}`)
  }
  new Function(source)
}

const staleByRoute = {
  registration: ['Salon de Lien お客様アプリの初回登録を受け付けました。'],
  passwordReset: ['subject:"Salon de Lien ログイン情報の再設定"'],
  withdrawal: ['Salon de Lienの退会申請を受け付けました。'],
}
for (const [name, markers] of Object.entries(staleByRoute)) {
  for (const marker of markers) {
    if (files[name].includes(marker)) throw new Error(`${name}: stale transactional email copy remains: ${marker}`)
  }
}

console.log('commercial transactional email v419 runtime verified')
