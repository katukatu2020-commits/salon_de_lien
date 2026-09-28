'use strict'

const groups = [
  {id:'home', label:'ホーム', icon:'building', pages:[['operations','業務ダッシュボード']]},
  {id:'orders', label:'受注・在庫', icon:'clipboard', pages:[['orders','受注管理'],['fulfillment','出荷・納品'],['inventory','倉庫・在庫']]},
  {id:'partners', label:'取引先・商品', icon:'package', pages:[['salons','契約美容室'],['products','商品管理'],['pricing','契約価格']]},
  {id:'sales', label:'売上・請求', icon:'chart', pages:[['sales','月次売上'],['calendar','売上カレンダー'],['receivables','請求・入金']]},
  {id:'activity', label:'営業・チャット', icon:'users', pages:[['activities','営業予定・活動'],['messages','サロンチャット'],['targets','目標・進捗']]},
  {id:'settings', label:'設定', icon:'settings', pages:[['company','会社・店舗情報'],['team','スタッフ・営業所'],['password-change','パスワード変更']]},
]
function navigation(role) {
  return groups.map(group => ({...group,pages:group.pages.filter(([key])=>key!=='team'||role!=='STAFF')}))
}
function render({dealer,view,head,icon,escapeHtml:esc,content,scripts}) {
  const key = ['password','staff-password'].includes(view) ? 'password-change' : view
  const menu = navigation(dealer.role)
  const active = menu.find(group=>group.pages.some(([id])=>id===key)) || menu[0]
  const title = key==='messages' ? '契約サロンとのチャット' : active.pages.find(([id])=>id===key)?.[1] || '業務ダッシュボード'
  const badge = '<span class="dw-unread" data-dw-unread hidden></span>'
  const link = (id,label,extra='') => `<a href="/dealer/${id}"${id===key?' aria-current="page"':''} ${extra}>${esc(label)}${id==='messages'?badge:''}</a>`
  const groupLink = (group,short) => `<a href="/dealer/${group.pages[0][0]}"${group.id===active.id?' class="is-active" aria-current="true"':''}>${icon(group.icon)}<span>${esc(short||group.label)}</span>${group.id==='activity'?badge:''}</a>`
  const menuButton = `<button type="button" data-dw-open aria-haspopup="dialog" aria-controls="dw-menu" aria-expanded="false">${icon('boxes')}<span>メニュー</span>${badge}</button>`
  // Native disclosure controls replace the old mobile-only product observer.
  head = head.replace(/<script src="\/dealer-(?:sales-team-v671-nav|erp-v678-nav\.partner-chat-v682)\.js[^\"]*" defer><\/script>/g,'')
  head = head.replace(/<script id="orimia-mobile-workspaces-v657-script" src="[^\"]+" defer><\/script>/g,'')
  head = head.replace(/<title>[^<]*<\/title>/,`<title>${esc(title)} | ORIMIA</title>`)
  head = head.replace('</head>','<link rel="stylesheet" href="/dealer-workspace-v688.css?v=688-1"><script src="/dealer-workspace-v688.js?v=688-1" defer></script></head>')
  const tabs = active.pages.length>1 ? `<nav class="dw-tabs" aria-label="${esc(active.label)}">${active.pages.map(([id,label])=>link(id,label)).join('')}</nav>` : ''
  const shortcuts = key==='operations' ? `<nav class="dw-shortcuts" aria-label="よく使う業務">${[['orders','受注を確認','clipboard'],['fulfillment','出荷・納品','truck'],['receivables','請求・入金','card'],['messages','サロンチャット','mail']].map(([id,label,symbol])=>`<a href="/dealer/${id}">${icon(symbol)}<span>${label}</span>${id==='messages'?badge:''}</a>`).join('')}</nav>` : ''
  const main = content ?? '<div id="wholesale-app" class="wo-app-root"><div class="wo-loading"><span></span><p>管理情報を読み込んでいます</p></div></div>'
  const client = view==='orders' ? '/dealer-orders-v688.js?v=688-1' : ['salons','products','pricing','company','calendar'].includes(view) ? '/dealer-catalog-v688.js?v=688-1' : '/wholesale-ordering-client-v543.js?v=678-erp1'
  const boot = scripts ?? `<link rel="stylesheet" href="/order-amendments-v687.css?v=687-1"><script src="/order-amendments-v687.js?v=687-1" defer></script><script src="${client}" defer></script>`
  return `${head}<body class="wo-body wo-dealer-body dw-body" data-wholesale-page="dealer" data-dealer-view="${esc(view)}" data-workspace-group="${active.id}">
    <a class="dw-skip" href="#dw-main">本文へ</a><div class="dw-layout">
    <aside class="dw-sidebar"><a class="dw-brand" href="/dealer/operations"><img src="/brand/orimia-icon-192.png" alt=""><span><strong>ORIMIA</strong><small>ディーラー管理</small></span></a>
      <nav aria-label="メインメニュー">${menu.map(group=>groupLink(group)).join('')}</nav>
      <div class="dw-sidebar-bottom"><span class="dw-role">${dealer.role==='STAFF'?'スタッフ':'管理者'}</span><form method="post" action="/api/dealer/auth/logout"><button type="submit">${icon('logout')}ログアウト</button></form></div>
    </aside><div class="dw-stage"><header class="dw-topbar"><span class="dw-context">${esc(active.label)}</span><a class="dw-account" href="/dealer/company"><strong>${esc(dealer.name||'ディーラー')}</strong><small>${esc(dealer.memberName&&dealer.memberName!==dealer.name?dealer.memberName:dealer.role==='STAFF'?'スタッフ':'管理者')}</small></a>${menuButton}</header>
    <main id="dw-main" class="wo-main dw-main" tabindex="-1"><section class="wo-page-head dw-page-head"><h1>${title}</h1></section>${tabs}${shortcuts}${main}</main></div></div>
    <nav class="dw-bottom" aria-label="モバイルメニュー">${menu.slice(0,4).map((group,i)=>groupLink(group,['ホーム','受注','取引先','売上'][i])).join('')}${menuButton}</nav>
    <dialog id="dw-menu" class="dw-menu" aria-labelledby="dw-menu-title"><header><h2 id="dw-menu-title">メニュー</h2><button type="button" class="dw-close" data-dw-close aria-label="メニューを閉じる" title="閉じる">${icon('arrowLeft')}</button></header>
      <label class="dw-menu-search"><span>メニューを検索</span><input type="search" data-dw-search placeholder="商品、請求、チャットなど" autocomplete="off"></label>
      <div class="dw-menu-groups">${menu.map(group=>`<section data-dw-group><h3>${icon(group.icon)}${group.label}</h3>${group.pages.map(([id,label])=>link(id,label,'data-dw-link')).join('')}</section>`).join('')}</div>
      <p data-dw-empty role="status" hidden>該当するメニューがありません</p><form class="dw-menu-logout" method="post" action="/api/dealer/auth/logout"><button type="submit">${icon('logout')}ログアウト</button></form>
    </dialog>${boot}</body></html>`
}
module.exports={navigation,render}
