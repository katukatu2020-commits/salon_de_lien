function dealerPasswordIconV653(name) {
  const paths = {
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 9h6M9 13h6M9 17h4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    package: '<path d="m7.5 4.3 9 5.1M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
    percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    building: '<path d="M3 21h18M6 21V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17M9 6h1M14 6h1M9 10h1M14 10h1M9 14h1M14 14h1M10 21v-3h4v3"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15 8l3 3M18 5l3 3"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3Z"/><path d="m9 12 2 2 4-4"/>',
    logout: '<path d="M10 17l5-5-5-5M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>',
    eye: '<path d="M2.1 12.3a1 1 0 0 1 0-.6 10.7 10.7 0 0 1 19.8 0 1 1 0 0 1 0 .6 10.7 10.7 0 0 1-19.8 0"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M10.7 5.1a10.7 10.7 0 0 1 11.2 6.6 1 1 0 0 1 0 .6 10.7 10.7 0 0 1-1.4 2.5M14.1 14.2a3 3 0 0 1-4.3-4.3M17.5 17.5a10.8 10.8 0 0 1-15.4-5.2 1 1 0 0 1 0-.6 10.7 10.7 0 0 1 4.4-5.2M2 2l20 20"/>',
    check: '<path d="m20 6-11 11-5-5"/>',
  }
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.key) + '</svg>'
}

function dealerPasswordPortalPageV653(access, options = {}) {
  const initial = Boolean(access.mustChangePassword)
  const errors = {
    current: '現在のパスワードが正しくありません。',
    password: '新しいパスワードは10〜72文字で入力してください。',
    mismatch: '確認用パスワードが一致しません。',
    unchanged: '現在とは異なるパスワードを設定してください。',
    failed: '変更できませんでした。時間をおいて再度お試しください。',
  }
  const error = errors[String(options.error || '')] || ''
  const dealerName = escapeHtml(access.accountName || access.loginId || 'ディーラー')
  const loginId = escapeHtml(access.loginId || '')
  const nav = [
    ['orders', '/dealer/orders', 'clipboard', '受注管理'],
    ['salons', '/dealer/salons', 'users', '契約美容室'],
    ['products', '/dealer/products', 'package', '商品管理'],
    ['pricing', '/dealer/pricing', 'percent', '契約価格'],
    ['company', '/dealer/company', 'building', '会社・店舗情報'],
    ['password', '/dealer/password-change', 'key', 'パスワード変更'],
  ]
  const navMarkup = nav.map(function (item) {
    const active = item[0] === 'password'
    return '<a class="' + (active ? 'active' : '') + '" href="' + item[1] + '"' + (active ? ' aria-current="page"' : '') + '>' + dealerPasswordIconV653(item[2]) + '<span>' + item[3] + '</span></a>'
  }).join('')
  const status = initial
    ? '<div class="wo-password-status-v653" role="status">' + dealerPasswordIconV653('shield') + '<span><strong>初回パスワード変更が必要です</strong><small>運営から届いた初期パスワードを、本人だけが分かるパスワードへ変更してください。</small></span></div>'
    : ''
  const errorHtml = error
    ? '<div class="wo-password-status-v653 error" role="alert">' + dealerPasswordIconV653('shield') + '<span><strong>入力内容を確認してください</strong><small>' + escapeHtml(error) + '</small></span></div>'
    : ''
  const passwordField = function (name, label, autocomplete) {
    return '<label class="wo-password-field-v653"><span>' + label + '</span><span class="wo-password-control-v653"><input name="' + name + '" type="password" autocomplete="' + autocomplete + '" required ' + (name === 'currentPassword' ? 'maxlength="128"' : 'minlength="10" maxlength="72"') + '><button class="wo-password-toggle-v653" type="button" data-password-toggle-v653 aria-label="パスワードを表示" title="パスワードを表示" aria-pressed="false">' + dealerPasswordIconV653('eye') + '</button></span></label>'
  }

  return '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light"><meta name="robots" content="noindex,nofollow"><title>パスワード変更 | ORIMIA</title><link rel="icon" href="/brand/orimia-icon-32.png"><link rel="stylesheet" href="/wholesale-ordering-v543.css?v=653-password-layout1"></head>' +
    '<body class="wo-body wo-dealer-body" data-wholesale-page="dealer" data-dealer-view="password"><div class="wo-dealer-layout"><aside class="wo-dealer-sidebar"><a class="wo-brand" href="/dealer/orders"><img src="/brand/orimia-icon-192.png" alt=""><span><strong>ORIMIA Partner</strong><small>Dealer operations</small></span></a><nav aria-label="ディーラー管理">' + navMarkup + '</nav><form method="post" action="/api/dealer/auth/logout"><button type="submit">' + dealerPasswordIconV653('logout') + '<span>ログアウト</span></button></form></aside>' +
    '<div class="wo-dealer-stage"><header class="wo-dealer-topbar"><div><small>DEALER PORTAL</small><strong>パスワード変更</strong></div><span>' + dealerName + '</span></header><main class="wo-main"><section class="wo-page-head"><div><p class="wo-eyebrow">ACCOUNT SECURITY</p><h1>パスワード変更</h1><p>ログインに使用するパスワードを安全に更新します。運営発行IDは変更できません。</p></div></section>' +
    '<section class="wo-workspace wo-password-workspace-v653"><header class="wo-workspace-head"><div><p class="wo-section-label">SECURE ACCOUNT</p><h2>ログイン情報</h2><p>現在のパスワードを確認後、新しいパスワードへ更新します。</p></div><span class="wo-private-chip">' + dealerPasswordIconV653('shield') + '本人確認済み</span></header>' + status + errorHtml +
    '<div class="wo-password-content-v653"><aside class="wo-password-summary-v653">' + dealerPasswordIconV653('key') + '<h2>アカウント情報</h2><p>ログインIDはORIMIA運営が発行したものです。</p><dl><div><dt>運営発行ID</dt><dd>' + loginId + '</dd></div><div><dt>アカウント</dt><dd>' + dealerName + '</dd></div></dl></aside>' +
    '<form class="wo-password-form-v653" method="post" action="/api/dealer/managed-password-change"><div class="wo-password-fields-v653">' + passwordField('currentPassword', '現在のパスワード', 'current-password') + passwordField('newPassword', '新しいパスワード', 'new-password') + passwordField('newPasswordConfirm', '新しいパスワード（確認）', 'new-password') + '</div><div class="wo-password-policy-v653">' + dealerPasswordIconV653('shield') + '<span>新しいパスワードは10〜72文字で設定してください。現在のパスワードと同じものは使用できません。</span></div><footer class="wo-password-actions-v653"><p>変更後はすべての端末からログアウトします。新しいパスワードで再度ログインしてください。</p><button class="wo-button wo-button-primary" type="submit">' + dealerPasswordIconV653('check') + 'パスワードを変更</button></footer></form></div></section></main></div></div>' +
    '<nav class="wo-dealer-mobile-nav" aria-label="ディーラー管理">' + navMarkup + '</nav><script>(function(){var eye=' + JSON.stringify(dealerPasswordIconV653('eye')) + ';var eyeOff=' + JSON.stringify(dealerPasswordIconV653('eyeOff')) + ';document.querySelectorAll("[data-password-toggle-v653]").forEach(function(button){button.addEventListener("click",function(){var input=button.parentElement.querySelector("input");var visible=input.type==="password";input.type=visible?"text":"password";var label=visible?"パスワードを隠す":"パスワードを表示";button.setAttribute("aria-label",label);button.setAttribute("title",label);button.setAttribute("aria-pressed",visible?"true":"false");button.innerHTML=visible?eyeOff:eye;input.focus({preventScroll:true})})})})()</script></body></html>'
}
