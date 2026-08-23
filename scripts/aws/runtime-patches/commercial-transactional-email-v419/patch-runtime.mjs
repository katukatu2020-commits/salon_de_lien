import fs from 'node:fs'

const registrationPath = '/app/.next/server/app/api/customer-auth/registration-link/request/route.js'
const passwordResetPath = '/app/.next/server/app/api/auth/password-reset/request/route.js'
const withdrawalPath = '/app/customer-withdrawal-v309.js'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function replaceRange(source, startMarker, endMarker, replacement, label) {
  const startCount = source.split(startMarker).length - 1
  if (startCount !== 1) throw new Error(`${label} start: expected one match, found ${startCount}`)
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start)
  if (end < 0) throw new Error(`${label} end marker was not found`)
  return source.slice(0, start) + replacement + source.slice(end)
}

function lienEscapeEmailHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character])
}

function lienCommercialEmailHtml(input) {
  const safe = lienEscapeEmailHtml
  const actionUrl = safe(input.actionUrl)
  const details = (input.details || []).map(detail => `<tr><td style="padding:7px 0;color:#7c7168;font-size:13px;line-height:1.6;vertical-align:top;width:120px">${safe(detail.label)}</td><td style="padding:7px 0;color:#2f2a25;font-size:14px;font-weight:600;line-height:1.6;vertical-align:top;word-break:break-word">${safe(detail.value)}</td></tr>`).join('')
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safe(input.title)}</title></head><body style="margin:0;padding:0;background:#f7f3ef;color:#2f2a25;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans JP','Hiragino Kaku Gothic ProN',Meiryo,sans-serif;-webkit-font-smoothing:antialiased"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${safe(input.preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f7f3ef"><tr><td align="center" style="padding:28px 14px 36px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px"><tr><td style="padding:0 4px 16px;color:#5b332c;font-size:18px;font-weight:700">Salon de Lien</td></tr><tr><td style="overflow:hidden;border:1px solid #e8ded2;border-radius:20px;background:#fff;box-shadow:0 12px 32px rgba(47,42,37,.06)"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="height:6px;background:#8f4f42;font-size:0;line-height:0">&nbsp;</td></tr><tr><td style="padding:34px 34px 30px"><p style="margin:0 0 10px;color:#8f4f42;font-size:12px;font-weight:700;line-height:1.5">${safe(input.eyebrow)}</p><h1 style="margin:0;color:#2f2a25;font-size:25px;font-weight:700;line-height:1.45">${safe(input.title)}</h1>${input.greeting ? `<p style="margin:24px 0 0;color:#2f2a25;font-size:15px;line-height:1.8">${safe(input.greeting)}</p>` : ''}<p style="margin:18px 0 0;color:#5f554e;font-size:15px;line-height:1.9">${safe(input.lead)}</p>${details ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:22px;padding:12px 18px;border:1px solid #eadfd5;border-radius:12px;background:#fbf7f0">${details}</table>` : ''}<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px"><tr><td align="center" style="border-radius:999px;background:#8f4f42"><a href="${actionUrl}" style="display:inline-block;padding:14px 26px;color:#fff;font-size:15px;font-weight:700;line-height:1.4;text-decoration:none">${safe(input.actionLabel)}</a></td></tr></table><p style="margin:20px 0 0;color:#7c7168;font-size:12px;line-height:1.8;word-break:break-all">ボタンを押せない場合は、次のURLをブラウザへ貼り付けてください。<br><a href="${actionUrl}" style="color:#8f4f42;text-decoration:underline">${actionUrl}</a></p><div style="margin-top:24px;padding:16px 18px;border-left:4px solid #d8b56d;border-radius:8px;background:#fffaf0"><p style="margin:0;color:#5b5149;font-size:13px;font-weight:600;line-height:1.8">${safe(input.notice)}</p></div></td></tr><tr><td style="border-top:1px solid #eee5dc;background:#fbf8f5;padding:22px 34px"><p style="margin:0;color:#7c7168;font-size:12px;line-height:1.8">${safe(input.securityMessage)}</p></td></tr></table></td></tr><tr><td style="padding:18px 8px 0;text-align:center;color:#8b8178;font-size:11px;line-height:1.7">このメールはSalon de Lienの手続きに伴い自動送信されています。<br>このメールへの返信ではお手続きを承れません。</td></tr></table></td></tr></table></body></html>`
}

const helperSource = `${lienEscapeEmailHtml.toString()}\n        ${lienCommercialEmailHtml.toString()}\n        `

let registration = fs.readFileSync(registrationPath, 'utf8')
let passwordReset = fs.readFileSync(passwordResetPath, 'utf8')
let withdrawal = fs.readFileSync(withdrawalPath, 'utf8')

const registrationFunction = `${helperSource}async function f(e) {
          let r = [
            "Salon de Lien お客様アプリ",
            "━━━━━━━━━━━━━━━━━━━━",
            "登録手続きを完了してください",
            "",
            "お客様アプリの登録手続きを受け付けました。",
            \`以下のURLを開き、\${e.expiresInMinutes}分以内にプロフィールとログイン情報を設定してください。\`,
            "",
            e.registrationUrl,
            "",
            \`有効期限: このメールの送信から\${e.expiresInMinutes}分\`,
            "登録画面では、ご本人確認のため携帯電話番号のSMS認証を行います。",
            "",
            "このメールに心当たりがない場合は、URLを開かずにこのメールを削除してください。",
            "URLは登録完了後、または有効期限を過ぎると利用できなくなります。",
            "",
            "Salon de Lien",
          ].join("\\r\\n");
          let htmlBody = lienCommercialEmailHtml({
            preheader: \`お客様アプリの登録手続きを\${e.expiresInMinutes}分以内に完了してください。\`,
            eyebrow: "お客様アプリ",
            title: "登録手続きを完了してください",
            lead: "お客様アプリの登録手続きを受け付けました。プロフィールとログイン情報を設定すると、予約やポイントなどをご利用いただけます。",
            details: [
              { label: "有効期限", value: \`このメールの送信から\${e.expiresInMinutes}分\` },
              { label: "ご本人確認", value: "登録画面で携帯電話番号のSMS認証を行います" },
            ],
            actionLabel: "登録手続きを続ける",
            actionUrl: e.registrationUrl,
            notice: "URLは登録完了後、または有効期限を過ぎると利用できなくなります。",
            securityMessage: "このメールに心当たりがない場合は、ボタンやURLを開かずにこのメールを削除してください。",
          });
          await (0, d.c)({
            to: e.to,
            subject: "【Salon de Lien】お客様アプリの登録手続きをお願いします",
            body: r,
            htmlBody,
          });
        }
        `

registration = replaceRange(
  registration,
  '        async function f(e) {',
  '        var m = t(13538);',
  registrationFunction,
  'registration email function',
)

const payloadBefore = 'let payload={From:fromName+" <"+from+">",To:String(e.to||"").trim(),Subject:String(e.subject||""),TextBody:String(e.body||""),MessageStream:stream,TrackOpens:false,TrackLinks:"None"};'
const payloadAfter = 'let payload={From:fromName+" <"+from+">",To:String(e.to||"").trim(),Subject:String(e.subject||""),TextBody:String(e.body||""),MessageStream:stream,TrackOpens:false,TrackLinks:"None"};if(e.htmlBody)payload.HtmlBody=String(e.htmlBody);'
registration = replaceOnce(registration, payloadBefore, payloadAfter, 'registration Postmark HTML body')

passwordReset = replaceOnce(
  passwordReset,
  '6183:(e,t,r)=>{\n  async function s(e){',
  `6183:(e,t,r)=>{\n  ${lienEscapeEmailHtml.toString()}\n  ${lienCommercialEmailHtml.toString()}\n  async function s(e){`,
  'password reset email helpers',
)
passwordReset = replaceOnce(passwordReset, payloadBefore, payloadAfter, 'password reset Postmark HTML body')

const oldPasswordReset = 'async function a(e){\n    let t=e.loginId?"ログインID: "+e.loginId+"\\r\\n\\r\\n":"",r=[e.audienceLabel+"のログイン情報再設定を受け付けました。","",t.trimEnd(),"次のURLを開き、"+e.expiresInMinutes+"分以内に新しいパスワードを設定してください。",e.resetUrl,"","このメールに心当たりがない場合は、何もせず破棄してください。","このURLは一度使用すると無効になります。","","Salon de Lien"].filter(Boolean).join("\\r\\n");\n    await s({to:e.to,subject:"Salon de Lien ログイン情報の再設定",body:r})\n  }'
const newPasswordReset = `async function a(e){
    let r=["Salon de Lien","━━━━━━━━━━━━━━━━━━━━","ログイン情報を再設定してください","",e.audienceLabel+"のログイン情報再設定を受け付けました。","",...(e.loginId?["ログインID: "+e.loginId,""]:[]),"以下のURLを開き、"+e.expiresInMinutes+"分以内に新しいパスワードを設定してください。","",e.resetUrl,"","有効期限: このメールの送信から"+e.expiresInMinutes+"分","このURLは一度使用すると無効になります。パスワードが変更されるまで、現在のログイン情報はそのまま利用できます。","","このメールに心当たりがない場合は、URLを開かずにこのメールを削除してください。","","Salon de Lien"].join("\\r\\n");
    let htmlBody=lienCommercialEmailHtml({preheader:e.audienceLabel+"のログイン情報を"+e.expiresInMinutes+"分以内に再設定してください。",eyebrow:e.audienceLabel,title:"ログイン情報を再設定してください",lead:"ログイン情報の再設定を受け付けました。下のボタンから、新しいパスワードを設定してください。",details:[...(e.loginId?[{label:"ログインID",value:e.loginId}]:[]),{label:"有効期限",value:"このメールの送信から"+e.expiresInMinutes+"分"}],actionLabel:"パスワードを再設定する",actionUrl:e.resetUrl,notice:"URLは一度使用すると無効になります。パスワードが変更されるまで、現在のログイン情報はそのまま利用できます。",securityMessage:"このメールに心当たりがない場合は、ボタンやURLを開かずにこのメールを削除してください。"});
    await s({to:e.to,subject:"【Salon de Lien】ログイン情報の再設定",body:r,htmlBody})
  }`
passwordReset = replaceOnce(passwordReset, oldPasswordReset, newPasswordReset, 'password reset email content')

withdrawal = replaceOnce(
  withdrawal,
  '  function hashToken(token) {',
  `  ${lienCommercialEmailHtml.toString()}\n  function hashToken(token) {`,
  'withdrawal commercial email helper',
)

const withdrawalMailFunction = `  async function sendMail({ email, customerName, confirmationUrl, customerId }) {
    const token = String(process.env.POSTMARK_SERVER_TOKEN || '').trim()
    const from = String(process.env.POSTMARK_FROM_EMAIL || '').trim()
    if (!token || !from) throw new Error('Postmark is not configured')
    const subject = '【Salon de Lien】退会手続きの確認'
    const textBody = [
      'Salon de Lien お客様アプリ',
      '━━━━━━━━━━━━━━━━━━━━',
      '退会手続きの確認',
      '',
      customerName + ' 様',
      '',
      '退会申請を受け付けました。この時点では、まだ退会は完了していません。',
      '以下のURLから確認画面を開き、内容をご確認のうえ「退会を確定する」を押してください。',
      '',
      confirmationUrl,
      '',
      '有効期限: このメールの送信から' + TOKEN_MINUTES + '分',
      '確認画面を開いただけでは退会は完了しません。',
      '',
      'このメールに心当たりがない場合は、URLを開かずにこのメールを削除してください。お客様のアカウントはそのままご利用いただけます。',
      '',
      'Salon de Lien'
    ].join('\\r\\n')
    const htmlBody = lienCommercialEmailHtml({
      preheader: '退会申請を受け付けました。内容をご確認ください。',
      eyebrow: 'お客様アプリ',
      title: '退会手続きの確認',
      greeting: customerName + ' 様',
      lead: '退会申請を受け付けました。この時点では、まだ退会は完了していません。確認画面で内容をご確認のうえ、退会を確定してください。',
      details: [{ label: '有効期限', value: 'このメールの送信から' + TOKEN_MINUTES + '分' }],
      actionLabel: '退会手続きを確認する',
      actionUrl: confirmationUrl,
      notice: '確認画面を開いただけでは退会は完了しません。画面内の「退会を確定する」を押した時点で手続きが完了します。',
      securityMessage: 'このメールに心当たりがない場合は、ボタンやURLを開かずにこのメールを削除してください。お客様のアカウントはそのままご利用いただけます。'
    })
    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Postmark-Server-Token': token },
      body: JSON.stringify({
        From: \`\${String(process.env.POSTMARK_FROM_NAME || 'Salon de Lien').trim()} <\${from}>\`,
        To: email,
        ReplyTo: String(process.env.POSTMARK_REPLY_TO || '').trim() || undefined,
        Subject: subject,
        TextBody: textBody,
        HtmlBody: htmlBody,
        MessageStream: String(process.env.POSTMARK_TRANSACTIONAL_STREAM || 'outbound').trim(),
        Tag: 'customer-withdrawal',
        Metadata: { customerId }
      })
    })
    const result = await response.json().catch(() => null)
    if (!response.ok || result?.ErrorCode) throw new Error(\`Postmark rejected the message (\${response.status}): \${result?.Message || 'unknown error'}\`)
    return result?.MessageID || null
  }

`
withdrawal = replaceRange(
  withdrawal,
  '  async function sendMail({ email, customerName, confirmationUrl, customerId }) {',
  '  async function ensureSchema() {',
  withdrawalMailFunction,
  'withdrawal email content',
)

fs.writeFileSync(registrationPath, registration)
fs.writeFileSync(passwordResetPath, passwordReset)
fs.writeFileSync(withdrawalPath, withdrawal)

console.log('commercial transactional email v419 runtime patched')
