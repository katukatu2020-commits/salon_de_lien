(() => {
  'use strict'

  if (window.__orimiaCustomerDesktopV529) return
  window.__orimiaCustomerDesktopV529 = true

  const RELEASE = 'customer-desktop-frontend-v529'
  const MEDIA_QUERY = '(min-width: 1024px)'
  const media = window.matchMedia(MEDIA_QUERY)
  let scheduled = false

  const paths = {
    arrow: '<path d="M19 12H5"></path><path d="m12 19-7-7 7-7"></path>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18"></path>',
    campaign: '<path d="m3 11 15-5v12L3 14v-3Z"></path><path d="M7 15.3 8.5 21h4l-1.8-7"></path><path d="M21 8V5M20 11h3M21 14v3"></path>',
    chat: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"></path>',
    clock: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
    coupon: '<path d="M3 6h18v4a2.5 2.5 0 0 0 0 5v3H3v-3a2.5 2.5 0 0 0 0-5V6Z"></path><path d="m9 15 6-6"></path><circle cx="9.5" cy="9.5" r=".7" fill="currentColor" stroke="none"></circle><circle cx="14.5" cy="14.5" r=".7" fill="currentColor" stroke="none"></circle>',
    home: '<path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"></path>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"></path>',
    points: '<rect x="3" y="5" width="18" height="14" rx="3"></rect><path d="M8 10h8M8 14h5"></path>',
    profile: '<circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path>',
    reviews: '<path d="M20 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4v8Z"></path><path d="M12 14.5 8.8 11.4a2.1 2.1 0 0 1 3-3l.2.2.2-.2a2.1 2.1 0 0 1 3 3L12 14.5Z"></path>',
    scissors: '<circle cx="6" cy="7" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="m8.5 9 10.5 10M8.5 16 19 5"></path>',
    shopping: '<path d="M5 8h14l-1 13H6L5 8Z"></path><path d="M9 9V6a3 3 0 0 1 6 0v3"></path>',
    stamp: '<path d="M7 14h10l2 5H5l2-5Z"></path><path d="M9 14V9a3 3 0 0 1 6 0v5"></path><path d="M5 22h14"></path>',
    store: '<path d="M4 10v10h16V10"></path><path d="M3 10 5 4h14l2 6"></path><path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"></path>',
  }

  const groups = [
    {
      label: 'メイン',
      items: [
        ['/u/home', 'ホーム', 'home'],
        ['/u/appointments', '予約する', 'calendar'],
        ['/u/history', '来店履歴', 'clock'],
        ['/u/chat', 'チャット相談', 'chat'],
      ],
    },
    {
      label: '見つける',
      items: [
        ['/u/campaigns', 'キャンペーン', 'campaign'],
        ['/u/coupons', 'クーポン', 'coupon'],
        ['/u/stamps', 'スタンプカード', 'stamp'],
        ['/u/community', 'ヘアスタイル', 'scissors'],
        ['/u/catalog', 'おすすめ商品', 'shopping'],
        ['/u/reviews', 'お客様の声', 'reviews'],
      ],
    },
    {
      label: '会員情報',
      items: [
        ['/u/profile', 'マイページ', 'profile'],
        ['/u/stores', '登録済みの店舗', 'store'],
        ['/u/points', 'ポイント', 'points'],
        ['/u/news', 'お知らせ', 'bell'],
      ],
    },
  ]

  const routeMeta = [
    ['/u/appointments', '予約する', 'ONLINE BOOKING', 'ご希望のメニューと日時を選択'],
    ['/u/campaigns', 'キャンペーン', 'SALON CAMPAIGN', '店舗から届いた最新のご案内'],
    ['/u/profile', 'マイページ', 'MY PAGE', 'お客様情報と髪のプロフィール'],
    ['/u/coupons', 'クーポン', 'MEMBER COUPON', 'ご利用可能な特典を確認'],
    ['/u/stores', '登録済みの店舗', 'MY SALONS', 'ご利用店舗の確認と追加'],
    ['/u/stamps', 'スタンプカード', 'STAMP CARD', 'ご来店スタンプと特典'],
    ['/u/community', 'ヘアスタイル', 'STYLE COMMUNITY', 'サロンのスタイルを探す'],
    ['/u/catalog', 'おすすめ商品', 'ITEM SELECTION', '髪のお悩みに合う商品を探す'],
    ['/u/reviews', 'お客様の声', 'CUSTOMER VOICE', '商品アンケートとレビュー'],
    ['/u/history', '来店履歴', 'VISIT HISTORY', 'これまでの施術と購入履歴'],
    ['/u/chat', 'チャット相談', 'SALON TALK', '店舗スタッフへ相談'],
    ['/u/points', 'ポイント', 'MEMBERSHIP POINTS', 'ポイント残高と獲得履歴'],
    ['/u/news', 'お知らせ', 'NOTIFICATIONS', '店舗から届いたメッセージ'],
    ['/u/sms-settings', '予約通知設定', 'NOTIFICATION SETTINGS', 'SMSで受け取る予約のお知らせ'],
    ['/u/menu', 'メニュー', 'ACCOUNT MENU', '会員機能と各種設定'],
    ['/u/home', 'ホーム', 'CUSTOMER HOME', 'いつものサロンを、もっと身近に'],
  ]

  function icon(name, className = '') {
    return `<svg class="ocd-icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.home}</svg>`
  }

  function currentPath() {
    const path = location.pathname.replace(/\/+$/, '')
    return path || '/u/home'
  }

  function isCustomerPage(path) {
    if (!(path === '/u' || path.startsWith('/u/'))) return false
    return !/^\/u\/(?:login|register|forgot-password|reset-password|verify)(?:\/|$)/.test(path)
  }

  function routeDetails(path) {
    if (/^\/u\/catalog\/.+/.test(path)) return { path: '/u/catalog', title: 'アイテム詳細', eyebrow: 'ITEM DETAIL', subtitle: '商品の特徴と使い方', back: '/u/catalog' }
    if (/^\/u\/community\/.+/.test(path)) return { path: '/u/community', title: 'スタイル詳細', eyebrow: 'STYLE DETAIL', subtitle: 'スタイルの詳細とコメント', back: '/u/community' }
    const item = routeMeta.find(([base]) => path === base || path.startsWith(`${base}/`)) || routeMeta.at(-1)
    return { path: item[0], title: item[1], eyebrow: item[2], subtitle: item[3], back: '/u/home' }
  }

  function navLink([href, label, iconName]) {
    return `<a class="ocd-nav-link" href="${href}" data-ocd-route="${href}">${icon(iconName)}<span>${label}</span></a>`
  }

  function shellMarkup() {
    const navigation = groups.map(group => `<section class="ocd-nav-group"><h2>${group.label}</h2>${group.items.map(navLink).join('')}</section>`).join('')
    return `<aside id="orimia-customer-desktop-nav-v529" class="ocd-sidebar" aria-label="PC版顧客メニュー"><a class="ocd-brand" href="/u/home" aria-label="ORIMIA for Salon ホーム"><img src="/brand/orimia-icon-192.png?v=500" alt=""><span><strong>ORIMIA for Salon</strong><small>Beauty Membership</small></span></a><nav class="ocd-navigation">${navigation}</nav><a class="ocd-more" href="/u/menu" data-ocd-route="/u/menu">${icon('menu')}<span>設定・その他</span></a></aside><header id="orimia-customer-desktop-header-v529" class="ocd-header"><button class="ocd-back" type="button" data-ocd-back aria-label="前の画面へ戻る">${icon('arrow')}<span>戻る</span></button><div class="ocd-page-heading"><span data-ocd-eyebrow>CUSTOMER HOME</span><strong data-ocd-title>ホーム</strong><small data-ocd-subtitle>いつものサロンを、もっと身近に</small></div><div class="ocd-header-actions"><a class="ocd-action ocd-notifications" href="/u/news" aria-label="お知らせ">${icon('bell')}<span class="ocd-unread" data-ocd-unread hidden></span></a><a class="ocd-profile-link" href="/u/profile">${icon('profile')}<span><small>会員情報</small><strong>マイページ</strong></span></a></div></header>`
  }

  const css = `
    @media (min-width:1024px) {
      html[data-orimia-customer-desktop="v529"] { --ocd-sidebar:280px; --ocd-header:82px; --ocd-ink:#342d29; --ocd-muted:#81756f; --ocd-line:#e6dcd7; --ocd-paper:#fffdfb; --ocd-bg:#f5f2f0; --ocd-rose:#c4516b; --ocd-rose-soft:#fae9ee; background:var(--ocd-bg)!important; }
      html[data-orimia-customer-desktop="v529"] body { box-sizing:border-box!important; min-width:0!important; min-height:100vh!important; margin:0!important; background:var(--ocd-bg)!important; padding:0 0 0 var(--ocd-sidebar)!important; color:var(--ocd-ink)!important; letter-spacing:0!important; }
      html[data-orimia-customer-desktop="v529"] body>* { letter-spacing:0; }
      html[data-orimia-customer-desktop="v529"] body>.app { box-sizing:border-box!important; width:100%!important; min-width:0!important; max-width:none!important; min-height:100vh!important; margin:0!important; border-radius:0!important; background:transparent!important; padding-left:0!important; box-shadow:none!important; overflow:visible!important; }
      html[data-orimia-customer-desktop="v529"] body>div[class*="min-h-screen"] { box-sizing:border-box!important; width:calc(100% - var(--ocd-sidebar))!important; min-width:0!important; max-width:none!important; min-height:100vh!important; margin:0 0 0 var(--ocd-sidebar)!important; border-radius:0!important; background:transparent!important; padding-left:0!important; box-shadow:none!important; overflow:visible!important; }
      html[data-orimia-customer-desktop="v529"] .customer-native-route-shell>div[class*="md:grid"] { display:block!important; box-sizing:border-box!important; width:100%!important; max-width:none!important; margin:0!important; padding:0!important; }
      html[data-orimia-customer-desktop="v529"] .customer-native-route-shell>div[class*="md:grid"]>aside { display:none!important; }
      html[data-orimia-customer-desktop="v529"] body:not(#ocd-root-v529):not(#ocd-page-v529) .customer-native-route-shell>div[class*="md:grid"] { display:block!important; grid-template-columns:minmax(0,1fr)!important; gap:0!important; }
      html[data-orimia-customer-desktop="v529"] body:not(#ocd-root-v529):not(#ocd-page-v529) .customer-native-route-shell>div[class*="md:grid"]>aside { display:none!important; }
      html[data-orimia-customer-desktop="v529"] body:not(#ocd-root-v529):not(#ocd-page-v529) .customer-native-route-shell>div[class*="md:grid"]>div.min-w-0 { box-sizing:border-box!important; width:100%!important; min-width:0!important; max-width:none!important; margin:0!important; padding:0!important; }
      html[data-orimia-customer-desktop="v529"] :is(.topbar,.customer-premium-topbar,#customer-mobile-bottom-nav,[data-customer-bottom-nav]) { display:none!important; }
      html[data-orimia-customer-desktop="v529"] body nav#customer-mobile-bottom-nav#customer-mobile-bottom-nav#customer-mobile-bottom-nav#customer-mobile-bottom-nav { display:none!important; }
      html[data-orimia-customer-desktop="v529"] body:not(#ocd-root-v529):not(#ocd-page-v529) .customer-native-route-shell .customer-premium-topbar.customer-premium-topbar { display:none!important; }
      html[data-orimia-customer-desktop="v529"] .lien-chat-v294-portal.lien-chat-v294-portal { display:block!important; position:fixed!important; z-index:90!important; inset:var(--ocd-header) 0 0 var(--ocd-sidebar)!important; width:auto!important; height:auto!important; background:var(--ocd-bg)!important; overflow:auto!important; }
      html[data-orimia-customer-desktop="v529"] .lien-chat-v294 { width:100%!important; max-width:none!important; min-height:100%!important; padding:30px 40px 44px!important; }
      html[data-orimia-customer-desktop="v529"] .lien-chat-v294__hero { padding:0 2px 22px!important; }
      html[data-orimia-customer-desktop="v529"] .lien-chat-v294__hero h1 { font-size:30px!important; line-height:1.35!important; }
      html[data-orimia-customer-desktop="v529"] .customer-page-back { display:none!important; }
      .ocd-sidebar { position:fixed; z-index:120; inset:0 auto 0 0; display:flex; box-sizing:border-box; width:var(--ocd-sidebar); min-width:var(--ocd-sidebar); flex-direction:column; overflow:auto; border-right:1px solid var(--ocd-line); background:#fffaf7; padding:0 16px 18px; box-shadow:8px 0 28px rgba(70,50,42,.035); }
      aside#orimia-customer-desktop-nav-v529#orimia-customer-desktop-nav-v529 { position:fixed!important; z-index:120!important; top:0!important; right:auto!important; bottom:0!important; left:0!important; display:flex!important; box-sizing:border-box!important; width:var(--ocd-sidebar)!important; min-width:var(--ocd-sidebar)!important; height:auto!important; flex-direction:column!important; overflow:auto!important; }
      .ocd-sidebar a,.ocd-header a { text-decoration:none!important; }
      .ocd-brand { display:flex; height:96px; flex:0 0 96px; align-items:center; gap:12px; border-bottom:1px solid var(--ocd-line); padding:0 8px; }
      aside#orimia-customer-desktop-nav-v529#orimia-customer-desktop-nav-v529 .ocd-brand.ocd-brand { display:flex!important; visibility:visible!important; opacity:1!important; }
      .ocd-brand img { display:block; width:46px; height:46px; flex:0 0 46px; object-fit:contain; }
      .ocd-brand span { min-width:0; }
      .ocd-brand strong { display:block; overflow:hidden; color:#4b3d37; font-family:Georgia,"Yu Mincho",serif; font-size:16px; line-height:1.2; text-overflow:ellipsis; white-space:nowrap; }
      .ocd-brand small { display:block; margin-top:5px; color:#a08d84; font-size:8px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; }
      .ocd-navigation { display:grid; gap:17px; padding:18px 0 14px; }
      .ocd-nav-group { display:grid; gap:3px; }
      .ocd-nav-group h2 { margin:0 0 5px; padding:0 12px; color:#a18e85; font-size:9px; font-weight:800; letter-spacing:.1em; }
      .ocd-nav-link,.ocd-more { position:relative; display:flex; min-width:0; min-height:41px; align-items:center; gap:11px; border-radius:8px; padding:0 12px; color:#655750; font-size:11px; font-weight:700; transition:background-color .16s,color .16s,transform .16s; }
      .ocd-nav-link .ocd-icon,.ocd-more .ocd-icon { width:19px; height:19px; flex:0 0 19px; color:#8d7c74; }
      .ocd-nav-link span,.ocd-more span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .ocd-nav-link:hover,.ocd-more:hover { background:#f5ede8; color:#483a34; transform:translateX(2px); }
      .ocd-nav-link[aria-current="page"],.ocd-more[aria-current="page"] { background:var(--ocd-rose-soft); color:#a8435b; box-shadow:inset 3px 0 0 var(--ocd-rose); }
      .ocd-nav-link[aria-current="page"] .ocd-icon,.ocd-more[aria-current="page"] .ocd-icon { color:var(--ocd-rose); }
      .ocd-more { flex:0 0 44px; margin-top:auto; border-top:1px solid var(--ocd-line); border-radius:0; padding-top:3px; }
      .ocd-header { position:fixed; z-index:110; top:0; right:0; left:var(--ocd-sidebar); display:grid; box-sizing:border-box; height:var(--ocd-header); grid-template-columns:100px minmax(0,1fr) auto; align-items:center; gap:18px; border-bottom:1px solid var(--ocd-line); background:rgba(255,253,251,.96); padding:0 34px; box-shadow:0 5px 20px rgba(66,47,39,.035); backdrop-filter:blur(14px); }
      header#orimia-customer-desktop-header-v529#orimia-customer-desktop-header-v529 { position:fixed!important; z-index:110!important; top:0!important; right:0!important; bottom:auto!important; left:var(--ocd-sidebar)!important; display:grid!important; box-sizing:border-box!important; height:var(--ocd-header)!important; }
      .ocd-back { display:inline-flex; width:max-content; min-height:40px; align-items:center; gap:7px; border:0; border-radius:8px; background:transparent; padding:0 9px; color:#6f5f57; font-size:11px; font-weight:800; cursor:pointer; }
      .ocd-back:hover { background:#f5eeea; color:#433630; }
      .ocd-back .ocd-icon { width:18px; height:18px; }
      .ocd-back[hidden] { visibility:hidden; pointer-events:none; }
      .ocd-page-heading { min-width:0; }
      .ocd-page-heading>span { display:block; color:#b15067; font-size:8px; font-weight:900; letter-spacing:.12em; }
      .ocd-page-heading>strong { display:inline-block; margin-top:3px; color:#342d29; font-family:"Yu Mincho","Hiragino Mincho ProN",serif; font-size:19px; line-height:1.25; }
      .ocd-page-heading>small { display:inline-block; overflow:hidden; max-width:42vw; margin-left:12px; color:#94857e; font-size:9px; text-overflow:ellipsis; vertical-align:2px; white-space:nowrap; }
      .ocd-header-actions { display:flex; align-items:center; gap:9px; }
      .ocd-action { position:relative; display:grid; width:40px; height:40px; flex:0 0 40px; place-items:center; border:1px solid var(--ocd-line); border-radius:8px; background:#fff; color:#75635b; }
      .ocd-action:hover { border-color:#d9c6bd; background:#fff9f7; color:#a8435b; }
      .ocd-action .ocd-icon { width:19px; height:19px; }
      .ocd-unread { position:absolute; top:-5px; right:-5px; display:grid; min-width:18px; height:18px; place-items:center; border:2px solid #fff; border-radius:99px; background:#ca4e69; padding:0 4px; color:#fff; font-size:8px; font-weight:900; }
      .ocd-unread[hidden] { display:none; }
      .ocd-profile-link { display:flex; min-width:134px; height:44px; align-items:center; gap:9px; border:1px solid var(--ocd-line); border-radius:8px; background:#fff; padding:0 12px; color:#4f413b; }
      .ocd-profile-link:hover { border-color:#d7c3ba; background:#fffaf7; }
      .ocd-profile-link>.ocd-icon { width:20px; height:20px; color:#a95a69; }
      .ocd-profile-link span { display:grid; gap:1px; }
      .ocd-profile-link small { color:#9a8981; font-size:8px; }
      .ocd-profile-link strong { font-size:10px; }
      html[data-orimia-customer-desktop="v529"] body>.app>.content { box-sizing:border-box!important; width:100%!important; min-width:0!important; max-width:none!important; margin:0!important; padding:calc(var(--ocd-header) + 30px) 40px 68px!important; }
      html[data-orimia-customer-desktop="v529"] .customer-native-main { box-sizing:border-box!important; width:100%!important; min-width:0!important; max-width:1360px!important; margin:0 auto!important; padding:calc(var(--ocd-header) + 30px) 40px 68px!important; }
      html[data-orimia-customer-desktop="v529"] .customer-native-route-shell .customer-native-main.customer-native-main { box-sizing:border-box!important; width:100%!important; min-width:0!important; max-width:none!important; margin:0!important; padding:calc(var(--ocd-header) + 30px) 40px 68px!important; }
      html[data-orimia-customer-desktop="v529"] body:not(#ocd-root-v529):not(#ocd-page-v529) .customer-native-route-shell .customer-native-main.customer-native-main { box-sizing:border-box!important; width:100%!important; min-width:0!important; max-width:none!important; margin:0!important; padding:calc(var(--ocd-header) + 30px) 40px 68px!important; }
      html[data-orimia-customer-desktop="v529"] .content>:is(.welcome,.hero,.quick-grid,.section,.page-title,.tabs,.ranking-intro,.product-list,.coupon-list,.stamp-card,.menu-list,.detail-card,.cn-toolbar,.cn-list) { width:100%; max-width:1240px; margin-right:auto; margin-left:auto; }
      html[data-orimia-customer-desktop="v529"] .content>.welcome { padding:0 0 22px; }
      html[data-orimia-customer-desktop="v529"] .content>.welcome strong { font-size:22px; }
      html[data-orimia-customer-desktop="v529"] .content>.hero { height:360px; border-radius:8px; }
      html[data-orimia-customer-desktop="v529"] .content>.quick-grid { gap:14px; padding:20px 0 28px; }
      html[data-orimia-customer-desktop="v529"] .quick-card { min-height:142px; border-radius:8px; }
      html[data-orimia-customer-desktop="v529"] .content>.section { border-top:1px solid var(--ocd-line); padding:32px 0; }
      html[data-orimia-customer-desktop="v529"] .content>.section+.section { margin-top:0; border-top:1px solid var(--ocd-line); }
      html[data-orimia-customer-desktop="v529"] .content>.page-title { border-bottom:1px solid var(--ocd-line); padding:8px 0 24px; text-align:left; }
      html[data-orimia-customer-desktop="v529"] .content>.page-title h1 { font-size:26px; }
      html[data-orimia-customer-desktop="v529"] .content>.tabs { overflow:hidden; margin-top:18px; border:1px solid var(--ocd-line); border-radius:8px; }
      html[data-orimia-customer-desktop="v529"] :is(.coupon,.stamp-card,.status-card,.metric,.cn-list,.cn-toolbar,.product-row,.menu-row,.detail-visual img) { border-radius:8px; }
      html[data-orimia-customer-desktop="v529"] .coupon-list { gap:16px; padding:22px 0 30px; }
      html[data-orimia-customer-desktop="v529"] .product-list { padding-right:0; padding-left:0; }
      html[data-orimia-customer-desktop="v529"] .menu-list { padding-right:0; padding-left:0; }
      html[data-orimia-customer-desktop="v529"] .customer-native-main :is(header,section,article,aside,figure,div)[class*="rounded-[24px]"],
      html[data-orimia-customer-desktop="v529"] .customer-native-main :is(header,section,article,aside,figure,div)[class*="rounded-[22px]"],
      html[data-orimia-customer-desktop="v529"] .customer-native-main :is(header,section,article,aside,figure,div)[class*="rounded-[20px]"] { border-radius:8px!important; }
      html[data-orimia-customer-desktop="v529"] .customer-native-main :is(input,select,textarea,button,a)[class*="rounded-[16px]"],
      html[data-orimia-customer-desktop="v529"] .customer-native-main :is(input,select,textarea,button,a)[class*="rounded-[14px]"] { border-radius:8px!important; }
      html[data-orimia-customer-desktop="v529"] :is(.ocd-nav-link,.ocd-more,.ocd-action,.ocd-profile-link,.ocd-back):focus-visible { outline:3px solid rgba(196,81,107,.25); outline-offset:2px; }
    }
    @media (min-width:1024px) and (max-width:1199px) {
      html[data-orimia-customer-desktop="v529"] { --ocd-sidebar:248px; }
      .ocd-sidebar { padding-right:12px; padding-left:12px; }
      .ocd-brand { gap:8px; padding-right:4px; padding-left:4px; }
      .ocd-brand img { width:42px; height:42px; flex-basis:42px; }
      .ocd-brand strong { font-size:14px; }
      .ocd-brand small { font-size:8px; }
      .ocd-header { padding-right:24px; padding-left:24px; }
      html[data-orimia-customer-desktop="v529"] body>.app>.content,
      html[data-orimia-customer-desktop="v529"] .customer-native-main,
      html[data-orimia-customer-desktop="v529"] .customer-native-route-shell .customer-native-main.customer-native-main { padding-right:24px!important; padding-left:24px!important; }
      html[data-orimia-customer-desktop="v529"] body:not(#ocd-root-v529):not(#ocd-page-v529) .customer-native-route-shell .customer-native-main.customer-native-main { padding-right:24px!important; padding-left:24px!important; }
      html[data-orimia-customer-desktop="v529"] .lien-chat-v294 { padding-right:24px!important; padding-left:24px!important; }
      .ocd-page-heading>small { display:none; }
    }
  `

  function addStyles() {
    let style = document.getElementById('orimia-customer-desktop-style-v529')
    if (!style) {
      style = document.createElement('style')
      style.id = 'orimia-customer-desktop-style-v529'
      style.textContent = css
    }
    const target = document.body || document.head
    if (target.lastElementChild !== style) target.appendChild(style)
  }

  function removeDesktopShell() {
    document.getElementById('orimia-customer-desktop-nav-v529')?.remove()
    document.getElementById('orimia-customer-desktop-header-v529')?.remove()
    document.getElementById('orimia-customer-desktop-style-v529')?.remove()
    delete document.documentElement.dataset.orimiaCustomerDesktop
  }

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value
  }

  function updateUnread(shell) {
    const source = document.querySelector('.customer-notification-badge,.topbar .badge')
    const value = String(source?.textContent || '').trim()
    const badge = shell.querySelector('[data-ocd-unread]')
    setText(badge, value)
    badge.hidden = !value || value === '0'
  }

  function syncShell() {
    const path = currentPath()
    if (!media.matches || !isCustomerPage(path)) {
      removeDesktopShell()
      return
    }

    addStyles()
    document.documentElement.dataset.orimiaCustomerDesktop = 'v529'
    let sidebar = document.getElementById('orimia-customer-desktop-nav-v529')
    let header = document.getElementById('orimia-customer-desktop-header-v529')
    if (!sidebar || !header) {
      sidebar?.remove()
      header?.remove()
      document.body.insertAdjacentHTML('beforeend', shellMarkup())
      sidebar = document.getElementById('orimia-customer-desktop-nav-v529')
      header = document.getElementById('orimia-customer-desktop-header-v529')
      header.querySelector('[data-ocd-back]').addEventListener('click', () => {
        const fallback = header.dataset.back || '/u/home'
        if (history.length > 1) history.back()
        else location.assign(fallback)
      })
    }

    const details = routeDetails(path)
    header.dataset.back = details.back
    setText(header.querySelector('[data-ocd-title]'), details.title)
    setText(header.querySelector('[data-ocd-eyebrow]'), details.eyebrow)
    setText(header.querySelector('[data-ocd-subtitle]'), details.subtitle)
    header.querySelector('[data-ocd-back]').hidden = path === '/u/home' || path === '/u'
    document.querySelectorAll('[data-ocd-route]').forEach(link => {
      const href = link.dataset.ocdRoute
      const active = href === details.path || (href === '/u/menu' && details.path === '/u/sms-settings')
      if (active) link.setAttribute('aria-current', 'page')
      else link.removeAttribute('aria-current')
    })
    updateUnread(header)
  }

  function schedule() {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      syncShell()
    })
  }

  const observer = new MutationObserver(schedule)
  const start = () => {
    observer.observe(document.documentElement, { childList: true, subtree: true })
    for (const method of ['pushState', 'replaceState']) {
      const original = history[method]
      if (original.__orimiaDesktopV529) continue
      const wrapped = function (...args) {
        const result = original.apply(this, args)
        schedule()
        return result
      }
      wrapped.__orimiaDesktopV529 = true
      history[method] = wrapped
    }
    window.addEventListener('popstate', schedule)
    media.addEventListener?.('change', schedule)
    schedule()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
})()
