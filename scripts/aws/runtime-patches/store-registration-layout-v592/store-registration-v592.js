'use strict'

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]))
}

function renderPage({ icon, content, setup = false }) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light"><meta name="referrer" content="same-origin"><title>新規店舗登録 | ORIMIA</title><link rel="icon" href="/brand/orimia-icon-32.png"><link rel="stylesheet" href="/wholesale-ordering-v543.css?v=585-product-ui1"><link rel="stylesheet" href="/store-registration-v592.css"><link rel="preload" as="image" href="/brand/salon-interior.jpg"></head>
<body class="wo-auth-body orimia-store-register" data-store-registration="v592"><main class="wo-auth-layout"><section class="wo-auth-visual"><a class="store-register-brand" href="/business/salon" aria-label="ORIMIA 美容室向けサービス"><img src="/brand/orimia-icon-192.png" alt="ORIMIA" width="74" height="74"></a><p>SALON ONBOARDING</p><h1>サロン運営を、<br>もっと美しく。</h1><span>メール確認後、店舗情報とログイン情報を設定します。</span></section><section class="wo-auth-panel" aria-labelledby="store-register-title"><div class="wo-auth-card${setup ? ' wo-auth-card-wide store-register-setup' : ''}"><span class="wo-auth-symbol">${icon(setup ? 'check' : 'store')}</span><p class="wo-eyebrow">${setup ? 'SALON ACCOUNT SETUP' : 'NEW SALON ACCOUNT'}</p><h2 id="store-register-title">${setup ? '美容室の初期設定' : '美容室の新規登録'}</h2><p>${setup ? '店舗情報とご利用プランをご確認ください。' : '登録するメールアドレスへ、確認用URLを送信します。'}</p>${content}<a class="wo-auth-back" href="/admin/login">ログイン画面に戻る</a></div></section></main></body></html>`
}

function renderEntry({ icon, ready, errorText, sent, registered, tokenMinutes }) {
  let content = ready ? '' : '<div class="wo-auth-notice error" role="alert">新規店舗の課金受付は現在準備中です。既存店舗の管理画面には影響ありません。</div>'
  if (errorText) content += `<div class="wo-auth-notice error" role="alert">${escapeHtml(errorText)}</div>`
  if (sent) {
    content += '<div class="wo-auth-notice success" role="status">確認メールを送信しました。</div><p class="store-register-message">メール内の「店舗登録を続ける」リンクを開いてください。メールが届かない場合は、迷惑メールフォルダもご確認ください。</p><a class="wo-button wo-button-secondary store-register-action" href="/admin/register">別のメールアドレスでやり直す</a>'
  } else if (registered) {
    content += '<div class="wo-auth-notice success" role="status">このメールアドレスは登録済みです。</div><div class="store-register-actions"><a class="wo-button wo-button-primary" href="/admin/login">店舗ログインへ</a><a class="wo-button wo-button-secondary" href="/admin/password-reset">ログイン情報を再設定</a></div>'
  } else {
    content += `<form method="post" action="/admin/register"><label for="email"><span>登録メールアドレス</span><span class="wo-auth-input-icon">${icon('mail')}<input id="email" name="email" type="email" autocomplete="email" inputmode="email" required maxlength="254" placeholder="owner@example.com" aria-describedby="store-register-security"></span></label><button class="wo-button wo-button-primary wo-auth-submit" type="submit"${ready ? '' : ' disabled'}>確認メールを送る${icon('mail')}</button></form>`
  }
  content += `<div class="wo-auth-security" id="store-register-security">${icon('shield')}<span>確認用URLは${escapeHtml(tokenMinutes)}分間、一度だけ有効です。メール内のリンクを開くまでは、店舗アカウントは作成されません。</span></div>`
  return renderPage({ icon, content })
}

module.exports = { renderEntry, renderPage }
