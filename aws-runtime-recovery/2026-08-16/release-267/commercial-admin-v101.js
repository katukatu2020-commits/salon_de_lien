(() => {
  'use strict'
  if (window.__lienCommercialAdminV101) return
  window.__lienCommercialAdminV101 = true

  const state = { profile: null, profilePromise: null, menus: [], frame: 0, timers: [], storeMenuEventsBound: false, commandGuardBound: false, notificationData: null, notificationPromise: null, notificationTimer: 0, notificationAppointmentsRead: false }
  const themeInlineOriginals = new WeakMap()
  const yen = new Intl.NumberFormat('ja-JP')

  const esc = value => String(value ?? '').replace(/[&<>"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character])
  const icon = (name, className = '') => {
    const paths = {
      store: '<path d="M3 10h18"/><path d="m5 10 1-5h12l1 5"/><path d="M5 10v9h14v-9"/><path d="M9 19v-5h6v5"/><path d="M4 10a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/>',
      scissors: '<circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="m8.5 9.2 11 9M8.5 14.8 20 5"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
      edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
      trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="m7 7 1 13h8l1-13"/><path d="M10 11v5M14 11v5"/>',
      chevronDown: '<path d="m7 10 5 5 5-5"/>',
      mapPin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
      phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
      external: '<path d="M15 3h6v6M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
      recommend: '<path d="M12 3 9.8 8.2 4 9l4.2 4-.9 5.8L12 16l4.7 2.8-.9-5.8L20 9l-5.8-.8Z"/><path d="M3 21h18"/>',
      mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
      spark: '<path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z"/>',
      close: '<path d="m6 6 12 12M18 6 6 18"/>',
      arrow: '<path d="m9 18 6-6-6-6"/>',
      chevronLeft: '<path d="m15 18-6-6 6-6"/>',
      chevronRight: '<path d="m9 18 6-6-6-6"/>',
      bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
      message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/>',
      card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>',
      settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
      sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
      moon: '<path d="M20.5 14.2A8.2 8.2 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/>',
      palette: '<path d="M12 3a9 9 0 0 0 0 18h1.4a1.8 1.8 0 0 0 1.2-3.1 1.8 1.8 0 0 1 1.2-3.1H18a3 3 0 0 0 3-3A9 9 0 0 0 12 3Z"/><circle cx="7.5" cy="10" r=".8" fill="currentColor"/><circle cx="10" cy="6.8" r=".8" fill="currentColor"/><circle cx="14.2" cy="7" r=".8" fill="currentColor"/>',
    }
    return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`
  }

  function styles() {
    if (document.getElementById('commercial-admin-v101-styles')) return
    const style = document.createElement('style')
    style.id = 'commercial-admin-v101-styles'
    style.textContent = `
      :root{--ca-ink:#2c211d;--ca-muted:#806f68;--ca-line:#ead8cf;--ca-paper:#fffdfb;--ca-soft:#fbf5f1;--ca-rose:#cf4f72;--ca-primary:#9d5546;--ca-success:#42765e}
      body .admin-desktop-sidebar span[role="img"][aria-label="店舗アイコン"],body .admin-mobile-sidebar span[role="img"][aria-label="店舗アイコン"]{border-radius:50%!important;background-color:#fffdf9!important;background-image:url("/brand/salon-customer-service-mark.svg")!important;background-position:center!important;background-size:cover!important}
      body .admin-desktop-sidebar a[href="/admin/customers"]>span.min-w-0>span:last-child,body .admin-mobile-sidebar a[href="/admin/customers"]>span.min-w-0>span:last-child{overflow:visible!important;font-size:9px!important;letter-spacing:0!important;line-height:1.15!important;white-space:normal!important;text-overflow:clip!important;text-wrap:balance!important}
      body .admin-brand .brand-logo{border-radius:50%!important;background:#fffdf9!important;object-fit:contain!important}
      @media(min-width:768px){body button.ca-sidebar-control,body button.ts-sidebar-toggle.ca-sidebar-control{display:grid!important;width:38px!important;height:38px!important;min-width:38px!important;min-height:38px!important;place-items:center!important;overflow:hidden!important;border:1px solid #dfcec6!important;border-radius:13px!important;background:linear-gradient(145deg,#fff,#fff8f5)!important;padding:0!important;color:#865044!important;font-size:0!important;line-height:0!important;box-shadow:0 8px 22px rgba(77,42,33,.13),inset 0 1px 0 #fff!important}body button.ca-sidebar-control::before,body button.ca-sidebar-control::after,body button.ts-sidebar-toggle::before,body button.ts-sidebar-toggle::after{display:none!important;width:0!important;height:0!important;content:none!important;mask-image:none!important}body button.ca-sidebar-control>svg.ca-sidebar-chevron,body button.ca-sidebar-control>svg.ts-sidebar-chevron{display:block!important;width:18px!important;height:18px!important;flex:0 0 18px!important;pointer-events:none!important}}

      .ca-command-hidden,.ca-header-search-hidden{display:none!important}.ca-account-store{position:relative;z-index:2}.ca-header-actions{position:relative!important;z-index:50!important;flex:0 0 auto!important;min-width:max-content}.ca-store-switcher{position:relative;z-index:60;display:inline-flex;min-height:44px;max-width:180px;flex:0 0 auto;align-items:center;gap:8px;isolation:isolate;border:1px solid #e8d8d0;border-radius:999px;background:linear-gradient(180deg,#fff,#fffaf7);padding:0 14px;color:#4b3730;box-shadow:0 6px 18px #5b34250d;cursor:pointer;touch-action:manipulation;user-select:none;-webkit-tap-highlight-color:transparent;transition:border-color .16s,box-shadow .16s,transform .16s}.ca-store-switcher>*{pointer-events:none}.ca-store-switcher:hover,.ca-store-switcher[aria-expanded="true"]{border-color:#ca9486;box-shadow:0 10px 24px #663a2f18;transform:translateY(-1px)}.ca-store-switcher:focus-visible{outline:3px solid #cf4f7230;outline-offset:2px}.ca-store-switcher>svg:first-child{width:17px;height:17px;flex:0 0 17px;color:#a95c4c}.ca-store-switcher>svg:last-child{width:14px;height:14px;flex:0 0 14px;color:#907a72;transition:.16s}.ca-store-switcher[aria-expanded="true"]>svg:last-child{transform:rotate(180deg)}.ca-store-switcher-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:900}.ca-store-menu{position:fixed;z-index:100050;width:min(320px,calc(100vw - 24px));overflow:hidden;border:1px solid #e7d4cb;border-radius:20px;background:#fffdfb;box-shadow:0 24px 70px #34221d2e;transform-origin:top right}.ca-store-menu[hidden]{display:none}.ca-store-menu-head{display:flex;gap:11px;align-items:center;padding:16px;border-bottom:1px solid #eee1da;background:linear-gradient(145deg,#fff8f5,#fffdfb)}.ca-store-menu-head .symbol{display:grid;width:42px;height:42px;flex:0 0 42px;place-items:center;border-radius:14px;background:#f8e8e3;color:#a55747}.ca-store-menu-head .symbol svg{width:20px;height:20px}.ca-store-menu-head strong{display:block;overflow:hidden;color:#33251f;font-size:13px;text-overflow:ellipsis;white-space:nowrap}.ca-store-menu-head small{display:block;margin-top:3px;color:#917d75;font-size:9px}.ca-store-menu-meta{display:grid;gap:7px;padding:12px 16px;border-bottom:1px solid #f0e5df}.ca-store-menu-meta span{display:flex;align-items:center;gap:7px;color:#75625a;font-size:10px}.ca-store-menu-meta svg{width:14px;height:14px;color:#a95c4c}.ca-store-menu-links{display:grid;padding:8px}.ca-store-menu-links a{display:flex;min-height:42px;align-items:center;gap:10px;border-radius:12px;padding:0 11px;color:#4a3831;font-size:11px;font-weight:800;text-decoration:none}.ca-store-menu-links a:hover{background:#fbefeb;color:#8a463a}.ca-store-menu-links svg{width:16px;height:16px;color:#aa5b4b}.ca-store-menu-links .arrow{margin-left:auto;width:14px;color:#9a8580}
      .ca-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.ca-metric{position:relative;min-height:112px;overflow:hidden;border:1px solid var(--ca-line);border-radius:20px;background:var(--ca-paper);padding:18px 19px;box-shadow:0 10px 28px #5a30280a}.ca-metric:nth-child(1){border-color:#e7c27c;background:#fffaf0}.ca-metric:nth-child(2){border-color:#bcdac8;background:#f2faf5}.ca-metric:nth-child(3){border-color:#ecc7d2;background:#fff7fa}.ca-metric:nth-child(4){background:#fbf7f4}.ca-metric .label{color:#75625a;font-size:11px;font-weight:800}.ca-metric strong{display:block;margin-top:8px;color:var(--ca-ink);font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:25px;line-height:1}.ca-metric strong small{margin-left:4px;font-family:inherit;font-size:12px}.ca-metric .symbol{position:absolute;top:16px;right:16px;display:grid;width:38px;height:38px;place-items:center;border-radius:50%;background:#fff;color:var(--ca-rose);box-shadow:0 4px 12px #5a30280d}.ca-metric .symbol svg{width:18px;height:18px}.ca-metric p{margin:9px 0 0;color:#8c7b74;font-size:10px}
      .ca-menu-panel{overflow:hidden;border:1px solid var(--ca-line);border-radius:24px;background:var(--ca-paper);box-shadow:0 14px 35px #57372d0a}.ca-panel-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 22px;border-bottom:1px solid #eee1da}.ca-panel-title{display:flex;align-items:center;gap:10px}.ca-panel-title .symbol{display:grid;width:36px;height:36px;place-items:center;border-radius:12px;background:#fae9ee;color:var(--ca-rose)}.ca-panel-title svg{width:18px;height:18px}.ca-panel-title h2{margin:0;color:var(--ca-ink);font-size:16px}.ca-panel-title p{margin:3px 0 0;color:var(--ca-muted);font-size:10px}.ca-count{color:#8b746c;font-size:11px;font-weight:700}
      .ca-menu-table-head,.ca-menu-row{display:grid;grid-template-columns:minmax(260px,1.5fr) minmax(120px,.65fr) 100px 120px 150px;align-items:center}.ca-menu-table-head{min-height:44px;background:#fbf7f4;color:#7d6c65;font-size:10px;font-weight:800}.ca-menu-table-head>span,.ca-menu-row>div{padding:0 18px}.ca-menu-row{min-height:86px;border-top:1px solid #f0e5df;transition:.16s}.ca-menu-table-head+.ca-menu-row{border-top:0}.ca-menu-row:hover{background:#fffaf7}.ca-menu-row.is-inactive{background:#fbfaf9;color:#897d78}.ca-menu-main{display:flex;min-width:0;align-items:center;gap:12px}.ca-menu-icon{display:grid;width:42px;height:42px;flex:0 0 42px;place-items:center;border-radius:14px;background:#faece7;color:var(--ca-primary)}.ca-menu-icon svg{width:20px;height:20px}.ca-menu-copy{min-width:0}.ca-menu-copy strong{display:block;overflow:hidden;color:var(--ca-ink);font-size:13px;text-overflow:ellipsis;white-space:nowrap}.ca-menu-copy p{display:-webkit-box;overflow:hidden;margin:4px 0 0;color:#8b7972;font-size:10px;line-height:1.45;-webkit-box-orient:vertical;-webkit-line-clamp:2}.ca-chip{display:inline-flex;min-height:27px;align-items:center;border:1px solid #ead9d0;border-radius:999px;background:white;padding:0 10px;color:#6c554d;font-size:10px;font-weight:800}.ca-status{display:inline-flex;min-height:28px;align-items:center;gap:6px;border-radius:999px;background:#eaf7ef;padding:0 10px;color:#35684f;font-size:10px;font-weight:800}.ca-status::before{width:6px;height:6px;border-radius:50%;background:#51a074;content:""}.ca-status.off{background:#f2efed;color:#796f6a}.ca-status.off::before{background:#aaa09c}.ca-number{color:#392b26;font-size:12px;font-weight:800;font-variant-numeric:tabular-nums}.ca-row-actions{display:flex;justify-content:flex-end;gap:7px}.ca-icon-button{display:inline-flex;min-height:36px;align-items:center;justify-content:center;gap:6px;border:1px solid var(--ca-line);border-radius:999px;background:white;padding:0 12px;color:#5d463e;font-size:10px;font-weight:800;cursor:pointer;transition:.16s}.ca-icon-button:hover{border-color:#c99384;background:#fff8f5;color:#7c3f33}.ca-icon-button svg{width:15px;height:15px}.ca-icon-button.primary{border-color:#b86c5c;background:#a75949;color:white}.ca-empty{display:grid;min-height:260px;place-items:center;padding:34px;text-align:center}.ca-empty .symbol{display:grid;width:62px;height:62px;place-items:center;margin:auto;border-radius:50%;background:#fff0f4;color:var(--ca-rose);box-shadow:0 10px 26px #7b3d5115}.ca-empty svg{width:27px;height:27px}.ca-empty h3{margin:16px 0 6px;font-size:15px}.ca-empty p{margin:0;color:var(--ca-muted);font-size:11px}
      .ca-setup-card{overflow:hidden;border:1px solid var(--ca-line);border-radius:25px;background:linear-gradient(145deg,#fffdfb,#fff7f3);box-shadow:0 16px 40px #5b34250c}.ca-setup-hero{display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center;padding:25px 28px;border-bottom:1px solid var(--ca-line)}.ca-eyebrow{color:#bf4566;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.ca-setup-hero h2{margin:7px 0 0;color:var(--ca-ink);font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:27px}.ca-setup-hero p{max-width:680px;margin:8px 0 0;color:var(--ca-muted);font-size:11px;line-height:1.8}.ca-guide-button,.ca-submit{display:inline-flex;min-height:43px;align-items:center;justify-content:center;gap:8px;border:0;border-radius:999px;background:linear-gradient(135deg,#9b5243,#bb6b59);padding:0 18px;color:white;font-size:11px;font-weight:900;box-shadow:0 8px 22px #6e382b25;cursor:pointer}.ca-guide-button svg,.ca-submit svg{width:16px;height:16px}.ca-setup-progress{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:18px 24px 0}.ca-setup-step{display:flex;min-height:58px;align-items:center;gap:10px;border:1px solid var(--ca-line);border-radius:16px;background:white;padding:10px 13px;color:#796861;font-size:10px;font-weight:800}.ca-setup-step .symbol{display:grid;width:31px;height:31px;place-items:center;border-radius:50%;background:#f4eeea}.ca-setup-step svg{width:15px;height:15px}.ca-setup-step.done{border-color:#bcd9c8;background:#f3faf6;color:#3c6c55}.ca-setup-step.done .symbol{background:#dff0e6}.ca-profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:20px 24px 25px}.ca-form-card{border:1px solid var(--ca-line);border-radius:19px;background:white;padding:19px}.ca-form-card h3{margin:0;color:var(--ca-ink);font-size:14px}.ca-form-card>p{margin:6px 0 15px;color:var(--ca-muted);font-size:10px;line-height:1.65}.ca-field{display:grid;gap:6px;margin-top:12px}.ca-field label{color:#493a34;font-size:10px;font-weight:900}.ca-field input{width:100%;min-height:45px;border:1px solid var(--ca-line);border-radius:12px;background:#fffdfb;padding:0 13px;color:#2f2420;font-size:12px;outline:0}.ca-field input:focus{border-color:#bf7667;box-shadow:0 0 0 4px #c37c6d1a}.ca-field small{color:#91817a;font-size:9px;line-height:1.6}.ca-form-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:15px}.ca-account-link{color:#9a5041;font-size:10px;font-weight:800;text-decoration:none}.ca-feedback{min-height:16px;margin:10px 0 0;color:#3f7659;font-size:10px;font-weight:800}.ca-feedback.error{color:#ae393d}
      .ca-overlay{position:fixed;z-index:100000;inset:0;display:grid;place-items:center;padding:18px;background:#2d201b70;backdrop-filter:blur(7px)}.ca-dialog{width:min(680px,100%);max-height:calc(100dvh - 32px);overflow:auto;border:1px solid #ecd4ca;border-radius:25px;background:#fffdfb;box-shadow:0 32px 90px #2f201b45}.ca-dialog-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:23px 24px 17px;border-bottom:1px solid var(--ca-line)}.ca-dialog-head h2{margin:0;color:var(--ca-ink);font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:22px}.ca-dialog-head p{margin:6px 0 0;color:var(--ca-muted);font-size:10px}.ca-close{display:grid;width:39px;height:39px;flex:0 0 39px;place-items:center;border:1px solid var(--ca-line);border-radius:50%;background:white;color:#79665f;cursor:pointer}.ca-close svg{width:18px;height:18px}.ca-dialog-body{padding:21px 24px 24px}.ca-form-columns{display:grid;grid-template-columns:1fr 1fr;gap:13px}.ca-field.full{grid-column:1/-1}.ca-field textarea{min-height:105px;resize:vertical;border:1px solid var(--ca-line);border-radius:12px;background:#fffdfb;padding:12px 13px;color:#2f2420;font:inherit;outline:0}.ca-field textarea:focus{border-color:#bf7667;box-shadow:0 0 0 4px #c37c6d1a}.ca-dialog-actions{display:flex;justify-content:space-between;gap:10px;margin-top:19px}.ca-secondary{display:inline-flex;min-height:43px;align-items:center;justify-content:center;border:1px solid var(--ca-line);border-radius:999px;background:white;padding:0 17px;color:#624d45;font-size:11px;font-weight:800;cursor:pointer}.ca-toggle{display:inline-flex;min-height:43px;align-items:center;justify-content:center;border:1px solid #e4c7bf;border-radius:999px;background:#fff8f5;padding:0 17px;color:#8a473a;font-size:11px;font-weight:800;cursor:pointer}.ca-toast{position:fixed;z-index:100100;top:82px;right:18px;width:min(380px,calc(100vw - 32px));border:1px solid var(--ca-line);border-radius:16px;background:#fffdfb;padding:13px 16px;color:#4b3831;font-size:11px;font-weight:800;box-shadow:0 18px 55px #34221d28;opacity:0;transform:translateY(-8px);transition:.18s}.ca-toast.show{opacity:1;transform:none}.ca-toast.error{border-color:#edbdb8;background:#fff3f2;color:#963b35}.ca-toast.success{border-color:#b8d9c5;background:#f1faf4;color:#356349}
      .ca-dialog.ca-dialog-wide{width:min(780px,100%)}.ca-field select{width:100%;min-height:45px;border:1px solid var(--ca-line);border-radius:12px;background:#fffdfb;padding:0 13px;color:#2f2420;font-size:12px;outline:0}.ca-field select:focus{border-color:#bf7667;box-shadow:0 0 0 4px #c37c6d1a}.ca-edit-section{grid-column:1/-1;margin-top:4px;border:1px solid #ead8cf;border-radius:17px;background:#fbf7f4;padding:15px}.ca-edit-section h3{margin:0;color:var(--ca-ink);font-size:12px}.ca-edit-section>p{margin:5px 0 12px;color:var(--ca-muted);font-size:10px;line-height:1.65}.ca-check-row{display:flex;min-height:48px;align-items:center;gap:10px;border:1px solid #ead8cf;border-radius:13px;background:white;padding:10px 12px;color:#4b3932;font-size:11px;font-weight:800}.ca-check-row input{width:17px;height:17px;min-height:auto;flex:0 0 17px;padding:0;accent-color:#a75949}.ca-check-row small{display:block;margin-top:2px;color:#8c7a73;font-size:9px;font-weight:500}.ca-campaign-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.ca-campaign-grid .ca-check-row{min-height:42px}.ca-dialog-actions>div{display:flex;gap:8px}.ca-submit:disabled,.ca-secondary:disabled{cursor:wait;opacity:.62}
      @media(max-width:980px){.ca-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.ca-menu-table-head{display:none}.ca-menu-panel{background:transparent;border:0;box-shadow:none}.ca-panel-head{margin-bottom:10px;border:1px solid var(--ca-line);border-radius:19px;background:white}.ca-menu-row{grid-template-columns:1fr auto;gap:10px;margin-top:10px;border:1px solid var(--ca-line);border-radius:19px;background:white;padding:15px}.ca-menu-row>div{padding:0}.ca-menu-row>div:nth-child(2),.ca-menu-row>div:nth-child(3),.ca-menu-row>div:nth-child(4){display:inline-flex;align-items:center}.ca-menu-row>div:nth-child(2)::before{margin-right:6px;color:#93827b;font-size:9px;content:"カテゴリ"}.ca-menu-row>div:nth-child(3)::before{margin-right:6px;color:#93827b;font-size:9px;content:"時間"}.ca-menu-row>div:nth-child(4)::before{margin-right:6px;color:#93827b;font-size:9px;content:"価格"}.ca-menu-row>div:nth-child(5){grid-column:2;grid-row:1/5}.ca-row-actions{flex-direction:column;align-items:stretch}.ca-setup-hero{grid-template-columns:1fr}.ca-profile-grid{grid-template-columns:1fr}}
      @media(max-width:680px){.ca-account-store::before{display:none}.ca-metrics{gap:8px}.ca-metric{min-height:100px;padding:15px}.ca-metric strong{font-size:21px}.ca-metric .symbol{top:12px;right:12px;width:33px;height:33px}.ca-panel-head{padding:16px}.ca-menu-row{grid-template-columns:1fr;padding:14px}.ca-menu-row>div:nth-child(5){grid-column:1;grid-row:auto}.ca-row-actions{margin-top:5px;flex-direction:row}.ca-setup-hero{padding:21px 18px}.ca-setup-hero h2{font-size:23px}.ca-setup-progress{grid-template-columns:1fr;padding:15px 16px 0}.ca-profile-grid{padding:15px 16px 19px}.ca-form-columns{grid-template-columns:1fr}.ca-field.full,.ca-edit-section{grid-column:auto}.ca-campaign-grid{grid-template-columns:1fr}.ca-dialog{align-self:end;max-height:92dvh;border-radius:24px 24px 0 0}.ca-overlay{align-items:end;padding:0}.ca-dialog-head{padding:19px 17px 15px}.ca-dialog-body{padding:17px 17px calc(20px + env(safe-area-inset-bottom))}.ca-dialog-actions{display:grid}.ca-dialog-actions>*{width:100%}.ca-dialog-actions>div{display:grid}.ca-toast{top:70px;left:16px;right:16px;width:auto}}
      .ca-profile-grid{grid-template-columns:1.35fr .65fr}.ca-form-card-wide{min-width:0}.ca-profile-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 12px}.ca-profile-fields .wide{grid-column:1/-1}
      .ca-catalog-action{display:inline-flex!important;min-height:40px!important;align-items:center!important;justify-content:center!important;gap:7px!important;border-radius:13px!important;background:#fff!important;padding:0 12px!important;font-size:11px!important;font-weight:850!important;line-height:1!important;box-shadow:0 3px 10px #52342b08!important;transition:border-color .16s,background .16s,color .16s,box-shadow .16s,transform .16s!important}.ca-catalog-action::before{width:16px;height:16px;flex:0 0 16px;background:currentColor;content:"";mask-position:center;mask-repeat:no-repeat;mask-size:contain}.ca-catalog-action:hover{transform:translateY(-1px)!important;box-shadow:0 7px 18px #52342b13!important}.ca-catalog-action:focus-visible{outline:3px solid #cf4f7228!important;outline-offset:2px}.ca-catalog-action-edit{border:1px solid #ddc7bd!important;color:#714b40!important}.ca-catalog-action-edit:hover{border-color:#b87565!important;background:#fff7f4!important;color:#934a3c!important}.ca-catalog-action-edit::before{mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='black' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round' d='M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z'/%3E%3C/svg%3E")}.ca-catalog-action-delete{border:1px solid #ebccc8!important;color:#9a4d46!important}.ca-catalog-action-delete:hover{border-color:#d69089!important;background:#fff3f2!important;color:#a53e38!important}.ca-catalog-action-delete::before{mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='black' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round' d='M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5'/%3E%3C/svg%3E")}.ca-catalog-state{display:inline-flex!important;min-height:32px!important;align-items:center!important;gap:7px!important;border-radius:999px!important;padding:0 11px!important;font-size:10px!important;font-weight:850!important;white-space:nowrap}.ca-catalog-state::before{width:16px;height:16px;flex:0 0 16px;border-radius:50%;background:currentColor;content:"";mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' d='m7 12 3 3 7-7'/%3E%3C/svg%3E") center/12px no-repeat}.ca-catalog-state.is-live{border:1px solid #b9ddc9!important;background:#f1faf5!important;color:#397157!important}.ca-catalog-state.is-stopped{border:1px solid #e7c2be!important;background:#fff5f3!important;color:#93483f!important}.ca-catalog-state.is-stopped::before{mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='black' stroke-width='2' stroke-linecap='round' d='M7 12h10'/%3E%3C/svg%3E")}.ca-catalog-state.is-stagnant{border:1px solid #e8d5aa!important;background:#fffaed!important;color:#846123!important}.ca-catalog-state.is-stagnant::before{mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' d='M4 18V9M10 18V5M16 18v-7M3 18h18'/%3E%3C/svg%3E")}.ca-catalog-tag{display:inline-flex!important;min-height:28px!important;align-items:center!important;border-radius:999px!important;padding:0 10px!important;font-size:10px!important;font-weight:800!important;letter-spacing:.01em}.ca-catalog-tag.is-category{border:1px solid #dfd0c8!important;background:#fff!important;color:#70594f!important}.ca-catalog-tag.is-concern{border:1px solid #f2dfe4!important;background:#fff4f7!important;color:#865666!important}.ca-catalog-tag.is-campaign{border:1px solid #ecd9ac!important;background:#fff9e9!important;color:#79581d!important}
      .ca-alternatives{grid-column:1/-1;border:1px solid #e3d3ca;border-radius:17px;background:linear-gradient(145deg,#fffaf7,#fff);padding:15px}.ca-alternatives-head{display:flex;align-items:flex-start;gap:10px}.ca-alternatives-head .symbol{display:grid;width:34px;height:34px;flex:0 0 34px;place-items:center;border-radius:12px;background:#f9e9ee;color:#c44c6c}.ca-alternatives-head svg{width:17px;height:17px}.ca-alternatives h3{margin:0;color:#362922;font-size:12px}.ca-alternatives p{margin:4px 0 0;color:#88756e;font-size:9px;line-height:1.6}.ca-alternative-list{display:grid;gap:8px;margin-top:12px}.ca-alternative-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid #eadbd4;border-radius:14px;background:#fff;padding:11px 12px}.ca-alternative-card strong{display:block;color:#382a24;font-size:11px}.ca-alternative-card small{display:block;margin-top:3px;color:#8b7870;font-size:9px}.ca-alternative-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}.ca-alternative-tags span{border-radius:999px;background:#fff0f4;padding:3px 7px;color:#92556a;font-size:8px;font-weight:800}.ca-alternative-score{color:#5b7a62;font-size:9px;font-weight:900}.ca-use-alternative{display:inline-flex;min-height:35px;align-items:center;border:1px solid #d7bfb5;border-radius:999px;background:#fff9f6;padding:0 11px;color:#8b4b3e;font-size:9px;font-weight:900;cursor:pointer}.ca-use-alternative:hover{border-color:#bb796a;background:#fff1ec}.ca-alternative-empty{margin-top:12px!important;border:1px dashed #dfcec6;border-radius:13px;background:#fff;padding:13px!important;text-align:center}.ca-alternative-loading{margin-top:12px!important;color:#8a7770!important}
      @media(max-width:980px){.ca-store-switcher{max-width:130px}.ca-profile-grid{grid-template-columns:1fr}}
      .admin-app-shell .admin-shell-header{display:block!important}
      .admin-shell-header,.admin-app-shell .admin-shell-header,body .admin-app-shell .admin-shell-header.admin-shell-header{display:block!important;visibility:visible!important;opacity:1!important}.ca-header-store-mount{display:flex;flex:0 0 auto;align-items:center}.ca-header-actions{align-items:center!important;gap:9px!important}.ca-current-user{display:inline-flex;min-width:0;max-width:150px;align-items:center;gap:7px;color:#69554d;font-size:10px;font-weight:850;line-height:1;white-space:nowrap}.ca-current-user svg{width:15px;height:15px;flex:0 0 15px;color:#a45a4b}.ca-current-user-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ca-notification-button{position:relative;display:grid;width:42px;height:42px;flex:0 0 42px;place-items:center;border:1px solid #e8d8d0;border-radius:50%;background:linear-gradient(180deg,#fff,#fffaf7);color:#72584f;box-shadow:0 6px 18px #5b34250d;cursor:pointer;transition:.16s}.ca-notification-button:hover,.ca-notification-button[aria-expanded="true"]{border-color:#ca9486;background:#fff8f5;color:#934c3f;transform:translateY(-1px)}.ca-notification-button:focus-visible{outline:3px solid #cf4f7230;outline-offset:2px}.ca-notification-button>svg{width:18px;height:18px;pointer-events:none}.ca-notification-badge{position:absolute;top:-4px;right:-4px;display:grid;min-width:19px;height:19px;place-items:center;border:2px solid #fff;border-radius:999px;background:#cf3f4f;padding:0 4px;color:#fff;font-size:9px;font-weight:900;line-height:1}.ca-notification-panel{position:fixed;z-index:100060;width:min(390px,calc(100vw - 24px));max-height:min(610px,calc(100dvh - 92px));overflow:auto;border:1px solid #e7d4cb;border-radius:22px;background:#fffdfb;box-shadow:0 24px 70px #34221d2e;transform-origin:top right}.ca-notification-panel[hidden]{display:none}.ca-notification-head{position:sticky;z-index:2;top:0;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #eee1da;background:#fffdfbf2;padding:16px 17px;backdrop-filter:blur(10px)}.ca-notification-head strong{display:block;color:#33251f;font-size:14px}.ca-notification-head small{display:block;margin-top:3px;color:#917d75;font-size:9px}.ca-notification-head .symbol{display:grid;width:36px;height:36px;place-items:center;border-radius:50%;background:#f8e8e3;color:#a55747}.ca-notification-head svg{width:17px;height:17px}.ca-notification-list{display:grid;padding:8px}.ca-notification-item{display:grid;grid-template-columns:38px minmax(0,1fr) 14px;gap:10px;align-items:start;border-radius:15px;padding:11px;color:#48352e;text-decoration:none;transition:.14s}.ca-notification-item:hover{background:#fbefeb}.ca-notification-item .symbol{display:grid;width:36px;height:36px;place-items:center;border-radius:12px;background:#f8eeea;color:#a45a4b}.ca-notification-item.message .symbol{background:#eaf4f0;color:#42765e}.ca-notification-item.billing .symbol{background:#fff4db;color:#9a6d27}.ca-notification-item.system .symbol{background:#f3edf8;color:#725b8e}.ca-notification-item svg{width:16px;height:16px}.ca-notification-item-copy{min-width:0}.ca-notification-item strong{display:block;overflow:hidden;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.ca-notification-item p{display:-webkit-box;overflow:hidden;margin:4px 0 0;color:#806f68;font-size:10px;line-height:1.55;-webkit-box-orient:vertical;-webkit-line-clamp:2}.ca-notification-item time{display:block;margin-top:5px;color:#a08e87;font-size:9px}.ca-notification-item>.arrow{margin-top:11px;color:#a08e87}.ca-notification-empty{padding:34px 20px;text-align:center;color:#87746c;font-size:11px}.ca-context-settings-row{display:flex;min-width:max-content;flex:0 0 auto;align-items:center;justify-content:flex-end;margin:-2px 0 14px}.ca-context-settings-button{display:inline-flex!important;min-width:max-content!important;min-height:42px!important;align-items:center!important;justify-content:center!important;gap:8px!important;writing-mode:horizontal-tb!important;white-space:nowrap!important;word-break:keep-all!important;border:1px solid #dfc9bf!important;border-radius:999px!important;background:#fffdfb!important;padding:0 16px!important;color:#74483e!important;font-size:11px!important;font-weight:900!important;line-height:1!important;box-shadow:0 7px 20px #5c332713!important;cursor:pointer!important;transition:.16s!important}.ca-context-settings-button:hover{border-color:#bd7d6e!important;background:#fff7f4!important;transform:translateY(-1px)}.ca-context-settings-button:focus-visible{outline:3px solid #cf4f722c!important;outline-offset:2px}.ca-context-settings-button svg{width:16px!important;height:16px!important;flex:0 0 16px!important}.ca-hours-card{grid-column:1/-1;margin-top:14px;border:1px solid #ead8cf;border-radius:16px;background:linear-gradient(145deg,#fffaf7,#fff);padding:15px}.ca-hours-card-head{display:flex;align-items:flex-start;gap:10px}.ca-hours-card-head .symbol{display:grid;width:34px;height:34px;flex:0 0 34px;place-items:center;border-radius:11px;background:#f8e9e4;color:#a85848}.ca-hours-card-head svg{width:17px;height:17px}.ca-hours-card-head strong{display:block;color:#3f302a;font-size:11px}.ca-hours-card-head small{display:block;margin-top:3px;color:#8d7a72;font-size:9px;line-height:1.6}.ca-hours-range{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:10px;align-items:end;margin-top:13px}.ca-hours-separator{display:grid;height:45px;place-items:center;color:#9c8177;font-size:12px;font-weight:900}.ca-weekday-title{margin:14px 0 7px;color:#493a34;font-size:10px;font-weight:900}.ca-weekday-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}.ca-weekday-option{position:relative}.ca-weekday-option input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.ca-weekday-option span{display:grid;min-height:39px;place-items:center;border:1px solid #e7d6ce;border-radius:11px;background:#fff;color:#6b564e;font-size:10px;font-weight:900;cursor:pointer;transition:.16s}.ca-weekday-option input:checked+span{border-color:#c97c6e;background:#fff0eb;color:#8c4438;box-shadow:inset 0 0 0 1px #d99689}.ca-weekday-option input:focus-visible+span{outline:3px solid #cf4f7228;outline-offset:2px}.ca-settings-dialog{width:min(1040px,100%);height:min(820px,calc(100dvh - 36px));overflow:hidden;border:1px solid #e8d2c8;border-radius:26px;background:#fffdfb;box-shadow:0 32px 90px #2f201b45}.ca-settings-dialog .ca-dialog-head{height:79px;box-sizing:border-box}.ca-settings-frame-wrap{position:relative;height:calc(100% - 79px);background:#fffdfb}.ca-settings-frame{display:block;width:100%;height:100%;border:0;background:#fffdfb;opacity:0;transition:opacity .16s}.ca-settings-frame.is-ready{opacity:1}.ca-settings-loading{position:absolute;z-index:1;inset:0;display:grid;place-items:center;background:#fffdfb;color:#846e65;font-size:11px;font-weight:800}.ca-settings-loading::before{width:24px;height:24px;margin-right:10px;border:2px solid #ead9d1;border-top-color:#aa5b4b;border-radius:50%;content:"";animation:ca-spin .75s linear infinite}@keyframes ca-spin{to{transform:rotate(360deg)}}[data-ca-settings-relocated]{display:none!important}.ca-settings-embedded body{background:#fffdfb!important}.ca-settings-embedded .admin-main-content{padding:18px!important}.ca-settings-embedded .admin-main-content>div{width:min(820px,100%)!important;max-width:820px!important;margin-inline:auto!important}.ca-settings-embedded .admin-main-content form{width:100%!important;grid-template-columns:minmax(0,1fr)!important;justify-content:center!important;margin-inline:auto!important}.ca-settings-embedded .ts-launcher{display:none!important}.ca-settings-embedded [data-ca-embedded-hidden]{display:none!important}
      @media(min-width:768px){body .admin-app-shell .admin-shell-header.admin-shell-header>.admin-mobile-header{display:none!important}body .admin-app-shell .admin-shell-header.admin-shell-header>.admin-desktop-header{display:flex!important}}
      @media(max-width:767.98px){body .admin-app-shell .admin-shell-header.admin-shell-header>.admin-mobile-header{display:flex!important}body .admin-app-shell .admin-shell-header.admin-shell-header>.admin-desktop-header{display:none!important}}
      @media(max-width:680px){.ca-store-switcher{width:42px;max-width:42px;justify-content:center;padding:0}.ca-store-switcher-name,.ca-store-switcher>svg:last-child{display:none}.ca-current-user{max-width:76px;font-size:9px}.ca-notification-panel{left:8px!important;right:8px!important;top:64px!important;width:auto;max-height:calc(100dvh - 76px)}.ca-profile-fields{grid-template-columns:1fr}.ca-profile-fields .wide{grid-column:auto}.ca-hours-card{grid-column:auto}.ca-hours-range{grid-template-columns:1fr auto 1fr}.ca-weekday-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.ca-alternatives{grid-column:auto}.ca-alternative-card{grid-template-columns:1fr}.ca-use-alternative{justify-content:center}.ca-context-settings-row{min-width:0;justify-content:stretch}.ca-context-settings-button{width:100%!important}.ca-settings-dialog{height:96dvh;border-radius:24px 24px 0 0}.ca-settings-dialog .ca-dialog-head{height:72px}.ca-settings-frame-wrap{height:calc(100% - 72px)}}
      @media(min-width:1024px){body .admin-shell-header>.admin-desktop-header{padding-left:52px!important}body .admin-shell-header>.admin-desktop-header>div:first-child{display:grid!important;width:104px!important;min-width:104px!important;flex:0 0 104px!important;justify-items:center!important;text-align:center!important}body .admin-shell-header>.admin-desktop-header>div:first-child>p{width:100%!important;text-align:center!important}body button[aria-label="サイドバーを閉じる"],body button[aria-label="サイドバーを開く"]{display:grid!important;width:38px!important;height:38px!important;min-width:38px!important;min-height:38px!important;place-items:center!important;overflow:hidden!important;border:1px solid #dfcec6!important;border-radius:13px!important;background:linear-gradient(145deg,#fff,#fff8f5)!important;padding:0!important;color:#865044!important;font-size:0!important;line-height:0!important;box-shadow:0 8px 22px rgba(77,42,33,.13),inset 0 1px 0 #fff!important}body button[aria-label="サイドバーを閉じる"]::before,body button[aria-label="サイドバーを開く"]::before{display:block!important;width:18px!important;height:18px!important;background:currentColor!important;content:""!important;mask-position:center!important;mask-repeat:no-repeat!important;mask-size:18px 18px!important}body button[aria-label="サイドバーを閉じる"]::before{mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='m15 18-6-6 6-6' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")!important}body button[aria-label="サイドバーを開く"]::before{mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='m9 18 6-6-6-6' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")!important}body button.ca-sidebar-control::before,body button.ca-sidebar-control::after{display:none!important;content:none!important}body button.ca-sidebar-control>svg{display:block!important;width:18px!important;height:18px!important;flex:0 0 18px!important;pointer-events:none!important}}
    `
    style.textContent += '@media(min-width:1024px){body>div:first-child>div>header.admin-shell-header:first-child>div.admin-desktop-header{padding-left:52px!important}body>div:first-child>div>header.admin-shell-header:first-child>div.admin-desktop-header>div:first-child{display:grid!important;width:104px!important;min-width:104px!important;flex:0 0 104px!important;justify-items:center!important;text-align:center!important}body>div:first-child>div>header.admin-shell-header:first-child>div.admin-desktop-header>div:first-child>p{width:100%!important;text-align:center!important}}'
    style.textContent += `
      .ca-settings-embedded header.admin-shell-header,.ca-settings-embedded aside,.ca-settings-embedded button[aria-label*="サイドバー"]{display:none!important}.ca-settings-embedded [data-ca-embedded-content]{padding-left:0!important}.ca-settings-embedded .admin-main-content{width:100%!important;min-height:100dvh!important;background:#fffdfb!important}.ca-settings-embedded .admin-main-content>div{width:min(820px,100%)!important;max-width:820px!important;margin-inline:auto!important}.ca-settings-embedded .admin-main-content form{width:100%!important;max-width:100%!important;margin-inline:auto!important}.ca-settings-embedded .admin-main-content form>section,.ca-settings-embedded .admin-main-content form>div{margin-inline:auto!important}.ca-settings-embedded .admin-main-content form>section{width:min(680px,100%)!important}.ca-settings-embedded .admin-main-content form>div:last-child{width:min(820px,100%)!important}
      .ca-theme-card{overflow:hidden;border:1px solid var(--ca-line);border-radius:24px;background:var(--ca-paper);box-shadow:0 14px 38px #4b2d250b}.ca-theme-card-head{display:flex;align-items:flex-start;gap:13px;padding:21px 23px 16px;border-bottom:1px solid var(--ca-line)}.ca-theme-card-head .symbol{display:grid;width:39px;height:39px;flex:0 0 39px;place-items:center;border-radius:13px;background:#fae9ee;color:var(--ca-rose)}.ca-theme-card-head svg{width:19px;height:19px}.ca-theme-card-head h2{margin:0;color:var(--ca-ink);font-size:16px}.ca-theme-card-head p{margin:5px 0 0;color:var(--ca-muted);font-size:10px;line-height:1.7}.ca-theme-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;padding:18px 22px 22px}.ca-theme-option{position:relative;display:grid;grid-template-columns:48px minmax(0,1fr) 22px;gap:13px;align-items:center;min-height:84px;border:1px solid var(--ca-line);border-radius:17px;background:var(--ca-paper);padding:13px 15px;color:var(--ca-ink);text-align:left;cursor:pointer;transition:.16s}.ca-theme-option:hover{border-color:#c98778;transform:translateY(-1px);box-shadow:0 8px 20px #56312812}.ca-theme-option[aria-pressed="true"]{border-color:var(--ca-rose);box-shadow:inset 0 0 0 1px var(--ca-rose),0 8px 24px #b74c6b16}.ca-theme-preview{position:relative;width:48px;height:48px;overflow:hidden;border:1px solid #e2d5cf;border-radius:14px;background:#fffaf7;box-shadow:inset 13px 0 #f6e9e4}.ca-theme-preview::before{position:absolute;top:9px;right:6px;width:24px;height:6px;border-radius:999px;background:#eaa0b4;content:""}.ca-theme-preview::after{position:absolute;right:6px;bottom:8px;width:24px;height:19px;border:1px solid #eed9df;border-radius:6px;background:white;content:""}.ca-theme-preview.dark{border-color:#4a3c36;background:#211b18;box-shadow:inset 13px 0 #171311}.ca-theme-preview.dark::before{background:#d37b96}.ca-theme-preview.dark::after{border-color:#51413a;background:#2a2320}.ca-theme-copy strong{display:flex;align-items:center;gap:6px;font-size:12px}.ca-theme-copy strong svg{width:15px;height:15px;flex:0 0 15px;color:var(--ca-rose)}.ca-theme-copy small{display:block;margin-top:4px;color:var(--ca-muted);font-size:9px;line-height:1.5}.ca-theme-check{display:grid;width:21px;height:21px;place-items:center;border:1px solid var(--ca-line);border-radius:50%;color:transparent}.ca-theme-check svg{width:13px;height:13px}.ca-theme-option[aria-pressed="true"] .ca-theme-check{border-color:var(--ca-rose);background:var(--ca-rose);color:white}
      html[data-ca-theme="dark"]{color-scheme:dark;--lien-bg:#151210;--lien-bg-strong:#211a17;--lien-surface:#211b18;--lien-surface-soft:#2a221e;--lien-surface-rose:#35242a;--lien-border:#483a34;--lien-border-strong:#655149;--lien-ink:#f4ece7;--lien-muted:#b9aaa2;--lien-muted-2:#94857e;--lien-primary:#e18aa3;--lien-primary-dark:#f2b0c3;--lien-primary-soft:#673747;--lien-accent:#e2b96e;--lien-accent-soft:#4b3a20;--lien-sage:#8fb79a;--lien-sage-soft:#24392d;--lien-danger:#ef8d86;--lien-danger-soft:#4e2928;--lien-warning:#e0ad59;--lien-warning-soft:#49381f;--lien-shadow:0 18px 45px #0006;--lien-shadow-sm:0 8px 24px #0005;--ca-ink:#f4ece7;--ca-muted:#b9aaa2;--ca-line:#483a34;--ca-paper:#211b18;--ca-soft:#2a221e;--ca-rose:#e18aa3;--ca-primary:#d77f97;--ca-success:#83b698;--ts-primary:#d77f97;--ts-primary-dark:#f0adc0;--ts-rose:#e18aa3;--ts-ink:#f4ece7;--ts-muted:#b9aaa2;--ts-line:#483a34;--ts-paper:#211b18;--ts-soft:#2a221e;--ts-success:#83b698}
      html[data-ca-theme="dark"],html[data-ca-theme="dark"] body,html[data-ca-theme="dark"] .admin-app-shell,html[data-ca-theme="dark"] .admin-main-content{background:#151210!important;color:#f4ece7!important}html[data-ca-theme="dark"] .admin-desktop-sidebar,html[data-ca-theme="dark"] .admin-mobile-sidebar{border-color:#40342f!important;background:#191513f7!important;color:#f4ece7!important}html[data-ca-theme="dark"] .admin-shell-header{border-color:#40342f!important;background:#1d1816f5!important;color:#f4ece7!important}html[data-ca-theme="dark"] main :where(section,article,[role="region"]),html[data-ca-theme="dark"] main [class*="bg-white"],html[data-ca-theme="dark"] .ca-dialog,html[data-ca-theme="dark"] .ca-settings-dialog,html[data-ca-theme="dark"] .ca-store-menu,html[data-ca-theme="dark"] .ca-notification-panel{border-color:#483a34!important;background-color:#211b18!important;color:#f4ece7!important}html[data-ca-theme="dark"] main :where(input,select,textarea),html[data-ca-theme="dark"] .ca-dialog :where(input,select,textarea){border-color:#53433c!important;background:#191513!important;color:#f4ece7!important}html[data-ca-theme="dark"] main :where(input,textarea)::placeholder{color:#867872!important}html[data-ca-theme="dark"] main :where(h1,h2,h3,h4,strong,label,th,td),html[data-ca-theme="dark"] .ca-dialog :where(h1,h2,h3,h4,strong,label){color:#f4ece7!important}html[data-ca-theme="dark"] main :where(p,small),html[data-ca-theme="dark"] .ca-dialog :where(p,small){color:#b9aaa2}html[data-ca-theme="dark"] main :where(table,thead,tbody,tr,th,td),html[data-ca-theme="dark"] main [class*="border-"]{border-color:#483a34!important}html[data-ca-theme="dark"] main thead,html[data-ca-theme="dark"] main [class*="bg-[#fb"],html[data-ca-theme="dark"] main [class*="bg-[#fff"]{background-color:#2a221e!important}html[data-ca-theme="dark"] .ca-store-switcher,html[data-ca-theme="dark"] .ca-notification-button,html[data-ca-theme="dark"] .ca-close,html[data-ca-theme="dark"] .ca-secondary,html[data-ca-theme="dark"] .ca-icon-button{border-color:#51423b!important;background:#27201d!important;color:#eadfd9!important}html[data-ca-theme="dark"] .ca-store-menu-head,html[data-ca-theme="dark"] .ca-notification-head,html[data-ca-theme="dark"] .ca-dialog-head{border-color:#483a34!important;background:#211b18f5!important}html[data-ca-theme="dark"] .ca-theme-preview:not(.dark){opacity:.68}html[data-ca-theme="dark"] .ca-settings-embedded .admin-main-content,html[data-ca-theme="dark"] .ca-settings-frame-wrap,html[data-ca-theme="dark"] .ca-settings-loading{background:#151210!important}html[data-ca-theme="dark"] .ca-settings-frame{background:#151210!important}
      @media(max-width:680px){.ca-theme-options{grid-template-columns:1fr;padding:15px}.ca-theme-card-head{padding:18px 17px 14px}}
    `
    document.head.appendChild(style)
    const isolatedStart = style.textContent.indexOf('.ca-settings-embedded header.admin-shell-header')
    if (isolatedStart >= 0 && !document.getElementById('commercial-admin-theme-v145')) {
      const isolated = document.createElement('style')
      isolated.id = 'commercial-admin-theme-v145'
      isolated.textContent = style.textContent.slice(isolatedStart)
      document.head.appendChild(isolated)
    }
  }

  const ADMIN_THEME_KEY = 'salon-lien:admin-theme'

  function savedAdminTheme() {
    try { return localStorage.getItem(ADMIN_THEME_KEY) === 'dark' ? 'dark' : 'pink' } catch { return 'pink' }
  }

  function applyThemeElementOverrides(theme) {
    const rules = [
      ['main h1,main h2,main h3,main h4,main strong,main label,main th,main td', { color: '#f4ece7' }],
      ['main p,main small,main dt,main dd', { color: '#b9aaa2' }],
      ['main input,main select,main textarea', { 'background-color': '#191513', color: '#f4ece7', 'border-color': '#53433c' }],
      ['main section,main article,main [role="region"],main [class*="bg-white"],main [class~="bg-lien-soft"]', { 'background-color': '#211b18', color: '#f4ece7', 'border-color': '#483a34' }],
      ['main [class*="border-"]', { 'border-color': '#483a34' }],
      ['.admin-shell-header', { 'background-color': '#1d1816', color: '#f4ece7', 'border-color': '#40342f' }],
      ['.admin-shell-header input', { 'background-color': '#191513', color: '#f4ece7', 'border-color': '#53433c' }],
      ['.admin-desktop-sidebar,.admin-mobile-sidebar', { 'background-color': '#191513', color: '#f4ece7', 'border-color': '#40342f' }],
      ['.ca-store-switcher,.ca-notification-button,.ca-close,.ca-secondary,.ca-icon-button', { 'background-color': '#27201d', color: '#eadfd9', 'border-color': '#51423b' }],
    ]
    if (theme !== 'dark') {
      document.querySelectorAll('[data-ca-theme-inline]').forEach(node => {
        const originals = themeInlineOriginals.get(node)
        if (originals) Object.entries(originals).forEach(([property, original]) => {
          if (original.value) node.style.setProperty(property, original.value, original.priority)
          else node.style.removeProperty(property)
        })
        themeInlineOriginals.delete(node)
        delete node.dataset.caThemeInline
      })
      return
    }
    rules.forEach(([selector, properties]) => document.querySelectorAll(selector).forEach(node => {
      if (!themeInlineOriginals.has(node)) {
        const originals = {}
        Object.keys(properties).forEach(property => { originals[property] = { value: node.style.getPropertyValue(property), priority: node.style.getPropertyPriority(property) } })
        themeInlineOriginals.set(node, originals)
        node.dataset.caThemeInline = '1'
      }
      Object.entries(properties).forEach(([property, value]) => node.style.setProperty(property, value, 'important'))
    }))
  }

  function applyAdminTheme(theme, persist = false) {
    const normalized = theme === 'dark' ? 'dark' : 'pink'
    const root = document.documentElement
    root.dataset.caThemeTransition = 'off'
    const changed = root.dataset.caTheme !== normalized
    const colorScheme = normalized === 'dark' ? 'dark' : 'light'
    if (changed) root.dataset.caTheme = normalized
    if (root.style.colorScheme !== colorScheme) root.style.colorScheme = colorScheme
    if (persist) {
      try { localStorage.setItem(ADMIN_THEME_KEY, normalized) } catch {}
    }
    document.querySelectorAll('[data-ca-theme-option]').forEach(button => {
      const selected = button.dataset.caThemeOption === normalized
      const state = selected ? 'true' : 'false'
      if (button.getAttribute('aria-pressed') !== state) button.setAttribute('aria-pressed', state)
      if (button.getAttribute('aria-checked') !== state) button.setAttribute('aria-checked', state)
    })
    applyThemeElementOverrides(normalized)
    clearTimeout(state.themeTransitionTimer)
    state.themeTransitionTimer = window.setTimeout(() => { delete root.dataset.caThemeTransition }, 120)
    if (changed) window.dispatchEvent(new CustomEvent('salon-lien:theme-change', { detail: { theme: normalized } }))
    return normalized
  }

  applyAdminTheme(savedAdminTheme())

  function toast(message, type = 'success') {
    let node = document.querySelector('.ca-toast')
    if (!node) { node = document.createElement('div'); node.className = 'ca-toast'; node.setAttribute('role', 'status'); document.body.appendChild(node) }
    node.className = `ca-toast ${type}`; node.textContent = message
    requestAnimationFrame(() => node.classList.add('show'))
    clearTimeout(node._timer); node._timer = setTimeout(() => node.classList.remove('show'), 4200)
  }

  async function handleCatalogDeleteSubmit(event) {
    const form = event.target?.closest?.('form[data-menu-delete-form],form[data-product-delete-form]')
    if (!form || form.dataset.caDeleting === '1') return
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    form.dataset.caDeleting = '1'
    const button = form.querySelector('[type="submit"]')
    if (button) { button.disabled = true; button.textContent = '削除しています…' }
    try {
      const kind = form.matches('[data-product-delete-form]') ? 'product' : 'menu'
      const idName = kind === 'product' ? 'productId' : 'menuId'
      const id = String(form.querySelector(`[name="${idName}"]`)?.value || '').trim()
      if (!id) throw new Error(`削除する${kind === 'product' ? '商品' : 'メニュー'}を確認できませんでした。`)
      const data = new URLSearchParams({ kind, action: 'delete', [idName]: id })
      const response = await fetch('/api/admin/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: data,
        credentials: 'same-origin',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.ok) throw new Error(payload.error || `${kind === 'product' ? '商品' : 'メニュー'}を削除できませんでした。`)
      const target = kind === 'product' ? '/admin/products?notice=product-deleted' : '/admin/products?section=menus&notice=menu-deleted'
      window.location.assign(target)
    } catch (error) {
      form.dataset.caDeleting = '0'
      if (button) { button.disabled = false; button.textContent = '削除する' }
      toast(error.message || '削除できませんでした。', 'error')
    }
  }

  function normalizeSidebarControl() {
    document.querySelectorAll('button[aria-label="サイドバーを閉じる"],button[aria-label="サイドバーを開く"]').forEach(button => {
      const closes = button.getAttribute('aria-label') === 'サイドバーを閉じる'
      const expected = closes ? 'chevronLeft' : 'chevronRight'
      button.classList.add('ca-sidebar-control')
      if (button.dataset.caSidebarIcon !== expected || button.children.length !== 1 || button.querySelectorAll(':scope > svg.ca-sidebar-chevron').length !== 1) {
        button.dataset.caSidebarIcon = expected
        button.innerHTML = icon(expected, 'ca-sidebar-chevron')
      }
    })
  }

  function normalizeServiceBrand() {
    document.querySelectorAll('.admin-desktop-sidebar a[href="/admin/customers"],.admin-mobile-sidebar a[href="/admin/customers"]').forEach(link => {
      const mark = link.querySelector('span[role="img"]')
      if (mark && mark.style.backgroundImage !== 'url("/brand/salon-customer-service-mark.svg")') {
        mark.style.backgroundImage = 'url("/brand/salon-customer-service-mark.svg")'
      }
      const textGroup = link.querySelector(':scope > span.min-w-0')
      const subtitle = textGroup?.lastElementChild
      if (subtitle && subtitle.textContent !== 'Salon customer servitomer service') subtitle.textContent = 'Salon customer servitomer service'
    })
  }

  async function handleCatalogCreateSubmit(event) {
    const form = event.target?.closest?.('form')
    if (!form || form.dataset.caCatalogCreating === '1') return
    if (form.closest('.ca-overlay')) return
    if (form.matches('[data-menu-delete-form],[data-product-delete-form]')) return
    const submit = form.querySelector('[type="submit"]')
    if (String(submit?.textContent || '').replace(/\s+/g, '') !== '商品を登録') return
    const isProductCreate = form.querySelector('[name="manufacturerName"]')
      && form.querySelector('[name="name"]')
      && form.querySelector('[name="retailPrice"]')
      && form.querySelector('[name="stockQuantity"]')
      && !form.querySelector('[name="productId"]')
    if (!isProductCreate) return
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    form.dataset.caCatalogCreating = '1'
    const original = submit?.innerHTML || ''
    if (submit) { submit.disabled = true; submit.textContent = '登録しています…' }
    try {
      const data = new URLSearchParams(new FormData(form))
      data.set('kind', 'product')
      data.set('action', 'create')
      const payload = await postCatalog(data)
      const id = String(payload?.result?.id || '')
      const target = `/admin/products?notice=product-created${id ? `&focus=${encodeURIComponent(id)}#product-${encodeURIComponent(id)}` : '#product-catalog'}`
      window.location.assign(target)
    } catch (error) {
      form.dataset.caCatalogCreating = '0'
      if (submit) { submit.disabled = false; submit.innerHTML = original }
      toast(error.message || '商品を登録できませんでした。', 'error')
    }
  }

  const jsonArray = value => {
    try { const parsed = JSON.parse(String(value || '[]')); return Array.isArray(parsed) ? parsed.map(String) : [] } catch { return [] }
  }

  const postCatalog = async (data, endpoint = '/api/admin/catalog') => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: data,
      credentials: 'same-origin',
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload.ok) throw new Error(payload.error || '変更を保存できませんでした。')
    return payload
  }

  function closeCatalogDialog(root) {
    if (!root?.isConnected) return
    document.removeEventListener('keydown', root._onKeyDown)
    root.remove()
    document.body.style.overflow = ''
  }

  function menuEditorFields(button) {
    const active = button.dataset.menuActive === 'true'
    return `
      <div class="ca-field full"><label for="ca-menu-name">メニュー名</label><input id="ca-menu-name" name="menuName" maxlength="140" value="${esc(button.dataset.menuName)}" required></div>
      <div class="ca-field"><label for="ca-menu-category">カテゴリ</label><input id="ca-menu-category" name="menuCategory" maxlength="80" value="${esc(button.dataset.menuCategory)}" required></div>
      <div class="ca-field"><label for="ca-menu-duration">施術時間（分）</label><input id="ca-menu-duration" name="menuDuration" type="number" min="1" max="1440" value="${esc(button.dataset.menuDuration)}" required></div>
      <div class="ca-field"><label for="ca-menu-price">税込価格（円）</label><input id="ca-menu-price" name="menuPrice" type="number" min="0" max="10000000" value="${esc(button.dataset.menuPrice)}" required></div>
      <div class="ca-field full"><label for="ca-menu-description">説明</label><textarea id="ca-menu-description" name="menuDescription" maxlength="1200" placeholder="施術内容やお客様に伝えたい特徴">${esc(button.dataset.menuDescription)}</textarea></div>
      <section class="ca-edit-section"><h3>予約画面への公開</h3><p>OFFにすると既存の履歴は残したまま、新しい予約の選択肢から外れます。</p><label class="ca-check-row"><input name="active" type="checkbox" value="true" ${active ? 'checked' : ''}><span>予約画面で公開する<small>${active ? '現在は公開中です' : '現在は停止中です'}</small></span></label></section>`
  }

  function productEditorFields(button) {
    const categories = ['シャンプー', 'トリートメント', 'スタイリング剤', 'アウトバス', 'その他']
    const campaigns = ['夏季商戦', '年末商戦', '春季商戦']
    const selectedCampaigns = jsonArray(button.dataset.productCampaignTags)
    const concernTags = jsonArray(button.dataset.productConcernTags).join('、')
    const canManageSales = button.dataset.productCanManageSales === 'true'
    return `
      <div class="ca-field"><label for="ca-product-maker">メーカー名</label><input id="ca-product-maker" name="manufacturerName" maxlength="80" value="${esc(button.dataset.productManufacturer)}" required></div>
      <div class="ca-field"><label for="ca-product-name">商品名</label><input id="ca-product-name" name="name" maxlength="140" value="${esc(button.dataset.productName)}" required></div>
      <div class="ca-field"><label for="ca-product-category">カテゴリ</label><select id="ca-product-category" name="category" required>${categories.map(category => `<option value="${esc(category)}" ${button.dataset.productCategory === category ? 'selected' : ''}>${esc(category)}</option>`).join('')}</select></div>
      <div class="ca-field"><label for="ca-product-price">店頭価格（円）</label><input id="ca-product-price" name="retailPrice" type="number" min="1" max="10000000" value="${esc(button.dataset.productPrice)}" required></div>
      <div class="ca-field"><label for="ca-product-stock">在庫数</label><input id="ca-product-stock" name="stockQuantity" type="number" min="0" max="100000" value="${esc(button.dataset.productStock)}" required></div>
      <div class="ca-field full"><label for="ca-product-tags">悩み・効果タグ</label><input id="ca-product-tags" name="concernTags" maxlength="500" value="${esc(concernTags)}" placeholder="乾燥、ダメージ、まとまり"><small>読点またはカンマ区切りで16個まで登録できます。</small></div>
      <div class="ca-field full"><label for="ca-product-description">商品説明</label><textarea id="ca-product-description" name="description" maxlength="1200">${esc(button.dataset.productDescription)}</textarea></div>
      <div class="ca-field full"><label for="ca-product-alternative">合わない場合の代替提案</label><input id="ca-product-alternative" name="alternativeRecommendation" maxlength="180" value="${esc(button.dataset.productAlternative)}" placeholder="候補から選択、または手動で入力"><small>同じカテゴリ内で、悩み・効果タグが近い商品を自動で候補表示します。</small></div>
      <section class="ca-alternatives" data-ca-alternatives><div class="ca-alternatives-head"><span class="symbol">${icon('recommend')}</span><div><h3>タグから探した代替候補</h3><p>同じカテゴリの中から、共通タグ数と類似度が高い順に表示します。</p></div></div><p class="ca-alternative-loading" role="status">候補を照合しています…</p></section>
      ${canManageSales ? `<section class="ca-edit-section"><h3>販売設定</h3><p>販売状態と商戦タグはオーナーだけが変更できます。スタッフ画面には販売中・販売停止中のみ表示されます。</p><label class="ca-check-row"><input name="salesSuspended" type="checkbox" value="true" ${button.dataset.productSalesSuspended === 'true' ? 'checked' : ''}><span>販売を停止する<small>チェックすると会計・提案画面の販売候補から除外します。</small></span></label><div class="ca-campaign-grid" style="margin-top:8px">${campaigns.map(tag => `<label class="ca-check-row"><input name="campaignTags" type="checkbox" value="${esc(tag)}" ${selectedCampaigns.includes(tag) ? 'checked' : ''}><span>${esc(tag)}</span></label>`).join('')}</div></section>` : ''}`
  }

  async function loadProductAlternatives(productId, root) {
    const section = root.querySelector('[data-ca-alternatives]')
    if (!section) return
    try {
      const response = await fetch(`/api/admin/catalog?kind=product-alternatives&productId=${encodeURIComponent(productId)}`, { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !Array.isArray(payload.alternatives)) throw new Error(payload.error || '代替候補を取得できませんでした。')
      const alternatives = payload.alternatives
      const body = alternatives.length
        ? `<div class="ca-alternative-list">${alternatives.map(candidate => `<article class="ca-alternative-card"><div><strong>${esc(candidate.name)}</strong><small>${esc(candidate.manufacturerName)} ・ 在庫 ${yen.format(candidate.stockQuantity)}点</small><div class="ca-alternative-tags">${candidate.sharedTags.map(tag => `<span>${esc(tag)}</span>`).join('')}</div></div><div><div class="ca-alternative-score">共通 ${candidate.sharedTags.length}件・類似度 ${candidate.similarity}%</div><button type="button" class="ca-use-alternative" data-ca-alternative-name="${esc(candidate.name)}">この商品を設定</button></div></article>`).join('')}</div>`
        : '<p class="ca-alternative-empty">同じカテゴリに共通タグを持つ販売中の商品はありません。</p>'
      section.querySelector('.ca-alternative-loading')?.remove()
      section.insertAdjacentHTML('beforeend', body)
      section.querySelectorAll('[data-ca-alternative-name]').forEach(button => button.addEventListener('click', () => {
        const input = root.querySelector('[name="alternativeRecommendation"]')
        if (!input) return
        input.value = button.dataset.caAlternativeName || ''
        input.dispatchEvent(new Event('input', { bubbles: true }))
        section.querySelectorAll('[data-ca-alternative-name]').forEach(node => { node.textContent = 'この商品を設定'; node.removeAttribute('aria-pressed') })
        button.textContent = '選択済み'
        button.setAttribute('aria-pressed', 'true')
      }))
    } catch (error) {
      const loading = section.querySelector('.ca-alternative-loading')
      if (loading) { loading.textContent = error.message || '候補を取得できませんでした。'; loading.className = 'ca-alternative-empty' }
    }
  }

  function catalogEditorData(editor) {
    const data = new URLSearchParams()
    const fields = Array.from(editor.querySelectorAll('input[name], select[name], textarea[name]'))
    const invalid = fields.find(field => !field.disabled && typeof field.checkValidity === 'function' && !field.checkValidity())
    if (invalid) {
      invalid.reportValidity?.()
      invalid.focus?.()
      return null
    }
    fields.forEach(field => {
      if (field.disabled || !field.name) return
      if ((field.type === 'checkbox' || field.type === 'radio') && !field.checked) return
      data.append(field.name, field.value)
    })
    return data
  }

  function openCatalogEditor(button) {
    const kind = button.dataset.catalogEdit
    if (!['menu', 'product'].includes(kind)) return
    const root = document.createElement('div')
    root.className = 'ca-overlay'
    const label = kind === 'product' ? '商品' : 'メニュー'
    const fields = kind === 'product' ? productEditorFields(button) : menuEditorFields(button)
    root.innerHTML = `<section class="ca-dialog ${kind === 'product' ? 'ca-dialog-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="ca-catalog-dialog-title"><header class="ca-dialog-head"><div><h2 id="ca-catalog-dialog-title">${label}を編集</h2><p>基本情報と公開・販売設定を一つの画面で更新できます。</p></div><button type="button" class="ca-close" aria-label="閉じる">${icon('close')}</button></header><div class="ca-dialog-body"><div data-catalog-editor="${kind}"><div class="ca-form-columns">${fields}</div><p class="ca-feedback" role="alert"></p><div class="ca-dialog-actions"><span></span><div><button type="button" class="ca-secondary" data-ca-cancel>キャンセル</button><button type="button" class="ca-submit" data-ca-save-catalog-edit>${icon('check')}変更を保存</button></div></div></div></div></section>`
    const close = () => closeCatalogDialog(root)
    root._onKeyDown = event => { if (event.key === 'Escape') close() }
    root.querySelector('.ca-close').addEventListener('click', close)
    root.querySelector('[data-ca-cancel]').addEventListener('click', close)
    root.addEventListener('click', event => { if (event.target === root) close() })
    root.querySelector('[data-ca-save-catalog-edit]').addEventListener('click', async event => {
      event.preventDefault()
      const editor = root.querySelector('[data-catalog-editor]')
      const submit = event.currentTarget
      const feedback = editor.querySelector('.ca-feedback')
      const data = catalogEditorData(editor)
      if (!data) return
      submit.disabled = true
      submit.textContent = '保存しています…'
      feedback.textContent = ''
      try {
        data.set('kind', kind)
        data.set('action', 'update')
        data.set(kind === 'product' ? 'productId' : 'menuId', kind === 'product' ? button.dataset.productId : button.dataset.menuId)
        const recordId = kind === 'product' ? button.dataset.productId : button.dataset.menuId
        const endpoint = `/api/admin/catalog/update/${encodeURIComponent(kind)}/${encodeURIComponent(recordId)}`
        await postCatalog(data, endpoint)
        close()
        toast(`${label}を更新しました。`)
        const target = kind === 'product'
          ? `/admin/products?notice=product-updated&focus=${encodeURIComponent(button.dataset.productId)}#product-${encodeURIComponent(button.dataset.productId)}`
          : '/admin/products?section=menus&notice=menu-updated'
        window.location.assign(target)
      } catch (error) {
        feedback.textContent = error.message || '変更を保存できませんでした。'
        feedback.className = 'ca-feedback error'
        submit.disabled = false
        submit.innerHTML = `${icon('check')}変更を保存`
      }
    })
    document.body.appendChild(root)
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', root._onKeyDown)
    if (kind === 'product') loadProductAlternatives(button.dataset.productId, root)
    root.querySelector('input,select,textarea')?.focus()
  }

  function handleCatalogEditClick(event) {
    const button = event.target?.closest?.('[data-catalog-edit]')
    if (!button) return
    event.preventDefault()
    openCatalogEditor(button)
  }

  function openCatalogDeleteConfirm(button) {
    const kind = button.dataset.catalogDelete
    if (!['menu', 'product'].includes(kind)) return
    const label = kind === 'product' ? '商品' : 'メニュー'
    const id = kind === 'product' ? button.dataset.productId : button.dataset.menuId
    const root = document.createElement('div')
    root.className = 'ca-overlay'
    root.innerHTML = `<section class="ca-dialog" role="alertdialog" aria-modal="true" aria-labelledby="ca-delete-title"><header class="ca-dialog-head"><div><h2 id="ca-delete-title">${label}を削除</h2><p>対象：${esc(button.dataset.catalogName)}</p></div><button type="button" class="ca-close" aria-label="閉じる">${icon('close')}</button></header><div class="ca-dialog-body"><p style="margin:0;color:#6f5c55;font-size:12px;line-height:1.8">${kind === 'product' ? '過去の提案履歴がある商品は履歴を保持したまま商品棚から取り除きます。' : '予約・会計の履歴は保持したまま、新しい予約の選択肢から取り除きます。'}</p><p class="ca-feedback" role="alert"></p><div class="ca-dialog-actions"><span></span><div><button type="button" class="ca-secondary" data-ca-cancel>キャンセル</button><button type="button" class="ca-submit" data-ca-delete-confirm style="background:#9b4f45">削除する</button></div></div></div></section>`
    const close = () => closeCatalogDialog(root)
    root._onKeyDown = event => { if (event.key === 'Escape') close() }
    root.querySelector('.ca-close').addEventListener('click', close)
    root.querySelector('[data-ca-cancel]').addEventListener('click', close)
    root.addEventListener('click', event => { if (event.target === root) close() })
    root.querySelector('[data-ca-delete-confirm]').addEventListener('click', async event => {
      const confirm = event.currentTarget
      const feedback = root.querySelector('.ca-feedback')
      confirm.disabled = true
      confirm.textContent = '削除しています…'
      try {
        const idName = kind === 'product' ? 'productId' : 'menuId'
        await postCatalog(new URLSearchParams({ kind, action: 'delete', [idName]: id }))
        const target = kind === 'product' ? '/admin/products?notice=product-deleted' : '/admin/products?section=menus&notice=menu-deleted'
        window.location.assign(target)
      } catch (error) {
        feedback.textContent = error.message || `${label}を削除できませんでした。`
        feedback.className = 'ca-feedback error'
        confirm.disabled = false
        confirm.textContent = '削除する'
      }
    })
    document.body.appendChild(root)
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', root._onKeyDown)
    root.querySelector('[data-ca-cancel]').focus()
  }

  function handleCatalogDeleteClick(event) {
    const button = event.target?.closest?.('[data-catalog-delete]')
    if (!button) return
    event.preventDefault()
    openCatalogDeleteConfirm(button)
  }

  async function getProfile(force = false) {
    if (force) state.profilePromise = null
    if (!state.profilePromise) state.profilePromise = fetch('/api/admin/store-profile', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      .then(async response => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok || !payload.profile) throw new Error(payload.error || '店舗情報を取得できませんでした。')
        state.profile = payload.profile
        return payload.profile
      })
      .catch(error => { state.profilePromise = null; throw error })
    return state.profilePromise
  }

  function removeCommandPalette() {
    document.querySelectorAll('button,[role="button"]').forEach(node => {
      if (node.dataset.caCommandRemoved === '1') return
      const label = String(node.getAttribute('aria-label') || '')
      const text = String(node.textContent || '').replace(/\s+/g, ' ').trim()
      if (label.includes('コマンドパレット') || /(^|\s)Ctrl\s*K($|\s)/i.test(text)) {
        node.dataset.caCommandRemoved = '1'
        node.classList.add('ca-command-hidden')
        node.setAttribute('aria-hidden', 'true')
        node.tabIndex = -1
      }
    })
  }

  function removeHeaderSearch() {
    document.querySelectorAll('header.admin-shell-header form[action="/admin/customers"],header.admin-shell-header input[name="q"]').forEach(node => {
      const input = node.matches('input') ? node : node.querySelector('input')
      if (!input) return
      const form = input.closest('form')
      const target = form || input
      target.classList.add('ca-header-search-hidden')
      target.setAttribute('aria-hidden', 'true')
      input.disabled = true
      input.tabIndex = -1
    })
  }

  function bindLegacyCommandGuard() {
    if (state.commandGuardBound) return
    state.commandGuardBound = true
    window.addEventListener('keydown', event => {
      if ((event.metaKey || event.ctrlKey) && String(event.key || '').toLowerCase() === 'k') {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }, true)
  }

  function closeStoreMenus() {
    document.querySelectorAll('[data-ca-store-menu]').forEach(node => { node.hidden = true })
    document.querySelectorAll('[data-ca-store-menu-button]').forEach(node => node.setAttribute('aria-expanded', 'false'))
  }

  function closeNotificationPanels() {
    document.querySelectorAll('[data-ca-notification-panel]').forEach(node => { node.hidden = true })
    document.querySelectorAll('[data-ca-notification-button]').forEach(node => node.setAttribute('aria-expanded', 'false'))
  }

  function notificationTime(value) {
    if (!value) return ''
    const date = new Date(value)
    if (!Number.isFinite(date.getTime())) return ''
    return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
  }

  function systemNotificationSeenIds() {
    try { return new Set(JSON.parse(localStorage.getItem(`lien-admin-notification-seen:${state.profile?.organizationId || 'unknown'}`) || '[]')) } catch { return new Set() }
  }

  function markSystemNotificationsSeen(items) {
    try {
      const key = `lien-admin-notification-seen:${state.profile?.organizationId || 'unknown'}`
      const seen = systemNotificationSeenIds()
      items.filter(item => item.system).forEach(item => seen.add(item.id))
      localStorage.setItem(key, JSON.stringify(Array.from(seen).slice(-80)))
    } catch {}
  }

  function notificationItems(payload) {
    const items = []
    const appointments = Array.isArray(payload?.staff?.appointments) ? payload.staff.appointments : []
    appointments.forEach(appointment => items.push({
      id: `appointment:${appointment.id}`,
      type: 'appointment',
      iconName: 'calendar',
      title: '新しい予約が入りました',
      body: `${appointment.customerName || 'お客様'}様 / ${appointment.menu || 'メニュー相談'}`,
      time: appointment.createdAt,
      href: `/admin/appointments/${encodeURIComponent(appointment.id)}`,
    }))
    if (Number(payload?.staff?.messageCount || 0) > 0) items.unshift({
      id: 'messages:unread',
      type: 'message',
      iconName: 'message',
      title: `未読メッセージが${Number(payload.staff.messageCount)}件あります`,
      body: 'お客様からの相談内容を確認して返信できます。',
      href: '/admin/customers/messages?chat=1',
    })
    const billing = payload?.billing || {}
    if (!billing.legacyExempt) {
      const status = String(billing.subscriptionStatus || '')
      if (['past_due', 'unpaid', 'incomplete', 'incomplete_expired'].includes(status)) items.unshift({ id: `billing:${status}`, system: true, type: 'billing', iconName: 'card', title: 'お支払い情報をご確認ください', body: '決済を確認できないため、登録カードと請求状況をご確認ください。', href: '/admin/owner-analytics?section=billing' })
      if (billing.cancelAtPeriodEnd) items.unshift({ id: `billing:cancel:${billing.currentPeriodEnd || billing.trialEndsAt || ''}`, system: true, type: 'billing', iconName: 'card', title: '契約終了の予定があります', body: '契約期間と終了日をシステム利用料ページで確認できます。', href: '/admin/owner-analytics?section=billing' })
      if (status === 'trialing' && Number(billing.remainingTrialDays) <= 3) items.unshift({ id: `billing:trial:${billing.trialEndsAt || ''}`, system: true, type: 'billing', iconName: 'card', title: `無料トライアル終了まであと${Number(billing.remainingTrialDays)}日です`, body: '初回請求日と月額料金をご確認ください。', href: '/admin/owner-analytics?section=billing' })
      if (!['trialing', 'active'].includes(status) && billing.onboardingStatus && billing.onboardingStatus !== 'ACTIVE') items.unshift({ id: `billing:onboarding:${billing.onboardingStatus}`, system: true, type: 'billing', iconName: 'card', title: '利用開始の設定が未完了です', body: 'プランとお支払い方法の設定を完了してください。', href: '/admin/owner-analytics?section=billing' })
    }
    const setup = payload?.profile?.setup || {}
    const missing = []
    if (!Number(setup.staffCount || 0)) missing.push('スタッフ')
    if (!Number(setup.activeMenuCount || 0)) missing.push('メニュー')
    if (!setup.inboundAddress) missing.push('予約メール')
    if (missing.length) items.unshift({ id: `setup:${missing.join('-')}`, system: true, type: 'system', iconName: 'settings', title: '店舗の初期設定を完了してください', body: `${missing.join('・')}の設定が残っています。`, href: '/admin/settings#store-profile' })
    return items
  }

  function notificationMarkup(payload) {
    const items = notificationItems(payload)
    const list = items.length ? items.map(item => `<a class="ca-notification-item ${esc(item.type)}" href="${esc(item.href)}"><span class="symbol">${icon(item.iconName)}</span><span class="ca-notification-item-copy"><strong>${esc(item.title)}</strong><p>${esc(item.body)}</p>${item.time ? `<time datetime="${esc(item.time)}">${esc(notificationTime(item.time))}</time>` : ''}</span><span class="arrow">${icon('chevronRight')}</span></a>`).join('') : '<div class="ca-notification-empty">新しいお知らせはありません。</div>'
    return `<div class="ca-notification-head"><div><strong>お知らせ</strong><small>予約・メッセージ・システム連絡</small></div><span class="symbol">${icon('bell')}</span></div><div class="ca-notification-list">${list}</div>`
  }

  function updateNotificationBadge(payload) {
    const seen = systemNotificationSeenIds()
    const items = notificationItems(payload)
    const systemUnread = items.filter(item => item.system && !seen.has(item.id)).length
    const appointmentUnread = state.notificationAppointmentsRead ? 0 : Number(payload?.staff?.appointmentCount || 0)
    const count = Math.max(0, appointmentUnread + Number(payload?.staff?.messageCount || 0) + systemUnread)
    document.querySelectorAll('[data-ca-notification-button]').forEach(button => {
      let badge = button.querySelector('.ca-notification-badge')
      if (!count) { badge?.remove(); button.setAttribute('aria-label', 'お知らせ'); return }
      if (!badge) { badge = document.createElement('span'); badge.className = 'ca-notification-badge'; button.appendChild(badge) }
      badge.textContent = count > 99 ? '99+' : String(count)
      button.setAttribute('aria-label', `お知らせ ${count}件`)
    })
  }

  async function refreshNotifications(force = false) {
    if (state.notificationPromise && !force) return state.notificationPromise
    state.notificationPromise = Promise.all([
      fetch('/api/lien-staff-notifications', { credentials: 'same-origin', cache: 'no-store' }).then(response => response.ok ? response.json() : {}),
      fetch('/api/admin/billing/status', { credentials: 'same-origin', cache: 'no-store' }).then(response => response.ok ? response.json() : { legacyExempt: true }).catch(() => ({ legacyExempt: true })),
      getProfile().catch(() => null),
    ]).then(([staff, billing, profile]) => {
      state.notificationData = { staff, billing, profile }
      document.querySelectorAll('[data-ca-notification-panel]').forEach(panel => { panel.innerHTML = notificationMarkup(state.notificationData) })
      updateNotificationBadge(state.notificationData)
      return state.notificationData
    }).catch(() => state.notificationData).finally(() => { state.notificationPromise = null })
    return state.notificationPromise
  }

  async function toggleNotificationPanel(button) {
    if (!button?.isConnected) return
    window.location.assign('/admin/appointments?notificationHistory=1')
  }

  function toggleStoreMenu(button) {
    const menu = document.querySelector('[data-ca-store-menu]')
    if (!menu || !button?.isConnected) return
    const opening = menu.hidden || button.getAttribute('aria-expanded') !== 'true'
    closeNotificationPanels()
    closeStoreMenus()
    if (opening) {
      const rect = button.getBoundingClientRect()
      const width = Math.min(320, window.innerWidth - 24)
      menu.style.left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.right - width)) + 'px'
      menu.style.top = Math.min(window.innerHeight - 12, rect.bottom + 9) + 'px'
      menu.hidden = false
      button.setAttribute('aria-expanded', 'true')
    }
  }

  function bindStoreMenuEvents() {
    if (state.storeMenuEventsBound) return
    state.storeMenuEventsBound = true
    document.addEventListener('click', event => {
      const button = event.target.closest?.('[data-ca-store-menu-button]')
      if (button) {
        event.preventDefault()
        toggleStoreMenu(button)
        return
      }
      const notificationButton = event.target.closest?.('[data-ca-notification-button]')
      if (notificationButton) {
        event.preventDefault()
        toggleNotificationPanel(notificationButton)
        return
      }
      if (event.target.closest?.('[data-ca-notification-panel]')) return
      if (event.target.closest?.('[data-ca-store-menu]')) return
      closeStoreMenus()
      closeNotificationPanels()
    }, true)
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') { closeStoreMenus(); closeNotificationPanels() }
    })
  }

  function headerFallbackStoreName() {
    const candidates = [
      document.querySelector('.admin-mobile-header a[href="/admin/customers"] .truncate'),
      document.querySelector('aside a[href="/admin/customers"] strong'),
      document.querySelector('aside a[href="/admin/customers"] span'),
    ]
    return String(candidates.find(node => node?.textContent?.trim())?.textContent || 'Salon de Lien').trim()
  }

  function ensureHeaderActionShell(actions, profile = null) {
    if (!actions?.isConnected) return
    actions.classList.add('ca-header-actions')
    let button = actions.querySelector('[data-ca-store-menu-button]')
    if (!button) {
      button = document.createElement('button')
      button.type = 'button'
      button.className = 'ca-store-switcher'
      button.dataset.caStoreMenuButton = '1'
      button.setAttribute('aria-haspopup', 'menu')
      button.setAttribute('aria-expanded', 'false')
      actions.appendChild(button)
    }
    let notificationButton = actions.querySelector('[data-ca-notification-button]')
    if (!notificationButton) {
      notificationButton = document.createElement('button')
      notificationButton.type = 'button'
      notificationButton.className = 'ca-notification-button'
      notificationButton.dataset.caNotificationButton = '1'
      notificationButton.setAttribute('aria-haspopup', 'dialog')
      notificationButton.setAttribute('aria-expanded', 'false')
      notificationButton.setAttribute('aria-label', 'お知らせ')
      notificationButton.innerHTML = icon('bell')
      actions.insertBefore(notificationButton, button)
    }
    const storeName = String(profile?.storeName || button.querySelector('.ca-store-switcher-name')?.textContent || headerFallbackStoreName()).trim()
    if (button.dataset.caStoreButtonSignature !== storeName) {
      button.innerHTML = `${icon('store')}<span class="ca-store-switcher-name">${esc(storeName)}</span>${icon('chevronDown')}`
      button.dataset.caStoreButtonSignature = storeName
    }
    button.setAttribute('aria-label', `${storeName}の店舗メニューを開く`)
    let currentUser = actions.querySelector('[data-ca-current-user]')
    if (!currentUser) {
      currentUser = document.createElement('span')
      currentUser.className = 'ca-current-user'
      currentUser.dataset.caCurrentUser = '1'
      currentUser.setAttribute('aria-label', '現在のログイン者')
      actions.appendChild(currentUser)
    }
    const currentUserName = String(profile?.currentUserName || profile?.ownerDisplayName || profile?.loginId || currentUser.querySelector('.ca-current-user-name')?.textContent || 'ログイン中').trim()
    if (currentUser.dataset.caCurrentUserSignature !== currentUserName) {
      currentUser.innerHTML = `${icon('user')}<span class="ca-current-user-name">${esc(currentUserName)}</span>`
      currentUser.dataset.caCurrentUserSignature = currentUserName
      currentUser.title = `ログイン中：${currentUserName}`
    }
  }

  function ensureHeaderPanels() {
    let menu = document.querySelector('[data-ca-store-menu]')
    if (!menu) {
      menu = document.createElement('aside')
      menu.className = 'ca-store-menu'
      menu.dataset.caStoreMenu = '1'
      menu.setAttribute('role', 'menu')
      menu.hidden = true
      menu.innerHTML = '<div class="ca-notification-empty">店舗情報を確認しています…</div>'
      document.body.appendChild(menu)
    }
    let notificationPanel = document.querySelector('[data-ca-notification-panel]')
    if (!notificationPanel) {
      notificationPanel = document.createElement('aside')
      notificationPanel.className = 'ca-notification-panel'
      notificationPanel.dataset.caNotificationPanel = '1'
      notificationPanel.setAttribute('role', 'dialog')
      notificationPanel.setAttribute('aria-label', '店舗のお知らせ')
      notificationPanel.hidden = true
      notificationPanel.innerHTML = '<div class="ca-notification-empty">お知らせを確認しています…</div>'
      document.body.appendChild(notificationPanel)
    }
    return { menu, notificationPanel }
  }

  async function enhanceHeader() {
    removeCommandPalette()
    document.querySelectorAll('header.admin-shell-header').forEach(header => header.style.setProperty('display', 'block', 'important'))
    const legacyAccounts = Array.from(document.querySelectorAll('header a[href="/admin/account"]'))
    const legacySettings = Array.from(document.querySelectorAll('header a[href="/admin/settings"]'))
    const mounts = Array.from(document.querySelectorAll('[data-ca-header-actions],.ca-header-store-mount'))
    const fallbackHosts = legacyAccounts.map(link => link.parentElement).filter(Boolean)
    const actionHosts = Array.from(new Set([...mounts, ...fallbackHosts])).filter(node => node?.isConnected)
    ;[...legacyAccounts, ...legacySettings].forEach(node => {
      node.classList.add('ca-command-hidden')
      node.setAttribute('aria-hidden', 'true')
      node.tabIndex = -1
    })
    if (!actionHosts.length) return
    actionHosts.forEach(actions => ensureHeaderActionShell(actions))
    const panels = ensureHeaderPanels()
    bindStoreMenuEvents()
    try {
      const profile = await getProfile()
      actionHosts.forEach(actions => ensureHeaderActionShell(actions, profile))
      const { menu, notificationPanel } = panels
      const address = [profile.prefecture, profile.city, profile.addressLine1, profile.addressLine2].filter(Boolean).join(' ')
      const menuSignature = JSON.stringify([profile.storeName || '', profile.phone || '', address])
      if (menu.dataset.caStoreMenuSignature !== menuSignature) {
        menu.innerHTML = `<div class="ca-store-menu-head"><span class="symbol">${icon('store')}</span><div><strong>${esc(profile.storeName)}</strong><small>ログイン中の店舗</small></div></div>${profile.phone || address ? `<div class="ca-store-menu-meta">${profile.phone ? `<span>${icon('phone')}${esc(profile.phone)}</span>` : ''}${address ? `<span>${icon('mapPin')}${esc(address)}</span>` : ''}</div>` : ''}<nav class="ca-store-menu-links"><a href="/admin/settings#store-profile" role="menuitem">${icon('store')}店舗設定<span class="arrow">${icon('arrow')}</span></a><a href="/admin/account" role="menuitem">${icon('user')}アカウント設定<span class="arrow">${icon('arrow')}</span></a></nav>`
        menu.dataset.caStoreMenuSignature = menuSignature
      }
      bindStoreMenuEvents()
      refreshNotifications(false)
    } catch {}
  }

  async function fetchMenus() {
    const response = await fetch('/api/admin/catalog?kind=menus', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !Array.isArray(payload.menus)) throw new Error(payload.error || 'メニューを取得できませんでした。')
    state.menus = payload.menus
    return payload
  }

  function metricMarkup(menus) {
    const active = menus.filter(menu => menu.active).length
    const categories = new Set(menus.map(menu => menu.category).filter(Boolean)).size
    const average = menus.length ? Math.round(menus.reduce((sum, menu) => sum + Number(menu.durationMinutes || 0), 0) / menus.length) : 0
    return `<section class="ca-metrics" aria-label="メニュー集計">
      <article class="ca-metric"><span class="label">メニュー数</span><strong>${menus.length}<small>件</small></strong><span class="symbol">${icon('scissors')}</span><p>現在登録されている施術メニュー</p></article>
      <article class="ca-metric"><span class="label">公開中</span><strong>${active}<small>件</small></strong><span class="symbol">${icon('check')}</span><p>お客様の予約画面に表示</p></article>
      <article class="ca-metric"><span class="label">カテゴリ</span><strong>${categories}<small>種類</small></strong><span class="symbol">${icon('layers')}</span><p>登録済みメニューの分類</p></article>
      <article class="ca-metric"><span class="label">平均施術時間</span><strong>${average}<small>分</small></strong><span class="symbol">${icon('clock')}</span><p>全メニューの平均所要時間</p></article>
    </section>`
  }

  function menuRow(menu) {
    return `<article class="ca-menu-row${menu.active ? '' : ' is-inactive'}" data-menu-id="${esc(menu.id)}">
      <div class="ca-menu-main"><span class="ca-menu-icon">${icon('scissors')}</span><div class="ca-menu-copy"><strong title="${esc(menu.name)}">${esc(menu.name)}</strong><p>${esc(menu.description || '説明はまだ登録されていません。')}</p></div></div>
      <div><span class="ca-chip">${esc(menu.category)}</span></div>
      <div><span class="ca-number">${yen.format(menu.durationMinutes)}分</span></div>
      <div><span class="ca-number">¥${yen.format(menu.priceYen)}</span></div>
      <div class="ca-row-actions"><span class="ca-status${menu.active ? '' : ' off'}">${menu.active ? '公開中' : '非公開'}</span><button type="button" class="ca-icon-button" data-ca-edit-menu="${esc(menu.id)}">${icon('edit')}編集</button></div>
    </article>`
  }

  function menuPanelMarkup(menus) {
    const body = menus.length
      ? `<div class="ca-menu-table-head"><span>メニュー</span><span>カテゴリ</span><span>施術時間</span><span>税込価格</span><span>状態・操作</span></div>${menus.map(menuRow).join('')}`
      : `<div class="ca-empty"><div><span class="symbol">${icon('scissors')}</span><h3>メニューがまだ登録されていません</h3><p>上の「新しいメニューを追加」から、最初の施術メニューを登録してください。</p></div></div>`
    return `<section class="ca-menu-panel"><header class="ca-panel-head"><div class="ca-panel-title"><span class="symbol">${icon('scissors')}</span><div><h2>登録済みメニュー</h2><p>価格・施術時間・公開状態を一か所で管理します。</p></div></div><span class="ca-count">${menus.length}件</span></header><div class="ca-menu-body">${body}</div></section>`
  }

  function closeDialog(root) { root.remove(); document.body.style.overflow = '' }

  function editMenuDialog(menu) {
    const root = document.createElement('div')
    root.className = 'ca-overlay'
    root.innerHTML = `<section class="ca-dialog" role="dialog" aria-modal="true" aria-label="メニューを編集"><header class="ca-dialog-head"><div><h2>メニューを編集</h2><p>変更内容は、保存後すぐに予約画面と会計へ反映されます。</p></div><button type="button" class="ca-close" aria-label="閉じる">${icon('close')}</button></header><div class="ca-dialog-body"><form data-ca-menu-form>
      <div class="ca-form-columns"><div class="ca-field full"><label>メニュー名</label><input name="menuName" maxlength="140" value="${esc(menu.name)}" required></div><div class="ca-field"><label>カテゴリ</label><input name="menuCategory" maxlength="80" value="${esc(menu.category)}" required></div><div class="ca-field"><label>施術時間（分）</label><input name="menuDuration" type="number" min="1" max="1440" value="${Number(menu.durationMinutes)}" required></div><div class="ca-field"><label>税込価格（円）</label><input name="menuPrice" type="number" min="0" max="10000000" value="${Number(menu.priceYen)}" required></div><div class="ca-field full"><label>説明</label><textarea name="menuDescription" maxlength="1200" placeholder="施術内容や、お客様に伝えたい特徴">${esc(menu.description || '')}</textarea></div></div>
      <p class="ca-feedback" role="alert"></p><div class="ca-dialog-actions"><button type="button" class="ca-toggle" data-ca-toggle>${menu.active ? '予約画面で非公開にする' : '予約画面で公開する'}</button><div><button type="button" class="ca-secondary" data-ca-cancel>キャンセル</button> <button type="submit" class="ca-submit">${icon('check')}変更を保存</button></div></div>
    </form></div></section>`
    const form = root.querySelector('form')
    const feedback = root.querySelector('.ca-feedback')
    root.querySelector('.ca-close').addEventListener('click', () => closeDialog(root))
    root.querySelector('[data-ca-cancel]').addEventListener('click', () => closeDialog(root))
    root.addEventListener('click', event => { if (event.target === root) closeDialog(root) })
    root.querySelector('[data-ca-toggle]').addEventListener('click', async event => {
      const button = event.currentTarget; button.disabled = true; feedback.textContent = '公開状態を更新しています…'; feedback.className = 'ca-feedback'
      try {
        const data = new URLSearchParams({ kind: 'menu', action: 'set-active', menuId: menu.id, active: String(!menu.active) })
        const response = await fetch('/api/admin/catalog', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: data, credentials: 'same-origin' })
        const payload = await response.json().catch(() => ({})); if (!response.ok || !payload.ok) throw new Error(payload.error || '公開状態を更新できませんでした。')
        closeDialog(root); toast(!menu.active ? 'メニューを予約画面へ公開しました。' : 'メニューを予約画面で非公開にしました。'); await refreshMenuSurface()
      } catch (error) { feedback.textContent = error.message; feedback.className = 'ca-feedback error'; button.disabled = false }
    })
    form.addEventListener('submit', async event => {
      event.preventDefault(); const button = form.querySelector('[type="submit"]'); button.disabled = true; button.textContent = '保存しています…'; feedback.textContent = ''
      try {
        const data = new URLSearchParams(new FormData(form)); data.set('kind', 'menu'); data.set('action', 'update'); data.set('menuId', menu.id)
        const response = await fetch('/api/admin/catalog', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: data, credentials: 'same-origin' })
        const payload = await response.json().catch(() => ({})); if (!response.ok || !payload.ok) throw new Error(payload.error || 'メニューを保存できませんでした。')
        closeDialog(root); toast('メニューを更新しました。'); await refreshMenuSurface()
      } catch (error) { feedback.textContent = error.message; feedback.className = 'ca-feedback error'; button.disabled = false; button.innerHTML = `${icon('check')}変更を保存` }
    })
    document.body.appendChild(root); document.body.style.overflow = 'hidden'; form.menuName.focus()
  }

  function bindMenuActions(scope) {
    scope.querySelectorAll('[data-ca-edit-menu]').forEach(button => button.addEventListener('click', () => {
      const menu = state.menus.find(item => item.id === button.dataset.caEditMenu)
      if (menu) editMenuDialog(menu)
    }))
  }

  function menuRoot() {
    return document.querySelector('main .max-w-7xl') || document.querySelector('main > div')
  }

  async function refreshMenuSurface() {
    if (location.pathname !== '/admin/products' || new URLSearchParams(location.search).get('section') !== 'menus') return
    const payload = await fetchMenus()
    const root = menuRoot(); if (!root) return
    let surface = root.querySelector('[data-ca-menu-surface]')
    if (!surface) {
      const oldSection = Array.from(root.querySelectorAll(':scope > section')).find(section => section.textContent.includes('登録済みメニュー'))
      if (!oldSection) return
      surface = document.createElement('div'); surface.dataset.caMenuSurface = '1'; surface.className = 'grid gap-5'
      oldSection.replaceWith(surface)
    }
    surface.innerHTML = metricMarkup(payload.menus) + menuPanelMarkup(payload.menus)
    bindMenuActions(surface)
  }

  async function enhanceMenuPage() {
    /* react-owned-catalog-v106:
       The menu and product surfaces are rendered by the Next.js page itself.
       Replacing that subtree imperatively leaves React holding references to
       detached nodes and crashes on the next in-app tab transition. Keep the
       helper for non-structural shell enhancements, but never rewrite catalog
       markup outside React. */
    return
  }

  function setupStep(iconName, label, done, detail) {
    return `<div class="ca-setup-step${done ? ' done' : ''}"><span class="symbol">${icon(done ? 'check' : iconName)}</span><span>${esc(label)}<small style="display:block;margin-top:2px;font-weight:500">${esc(detail)}</small></span></div>`
  }

  async function saveProfile(action, body, feedback, button) {
    const original = button.innerHTML; button.disabled = true; button.textContent = '保存しています…'; feedback.textContent = ''; feedback.className = 'ca-feedback'
    try {
      const response = await fetch('/api/admin/store-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ action, ...body }) })
      const payload = await response.json().catch(() => ({})); if (!response.ok || !payload.profile) throw new Error(payload.error || '保存できませんでした。')
      state.profile = payload.profile; state.profilePromise = Promise.resolve(payload.profile); feedback.textContent = '保存しました。'; toast('店舗情報を更新しました。')
      if (payload.profile.businessSchedule) window.dispatchEvent(new CustomEvent('lien:business-schedule-updated', { detail: payload.profile.businessSchedule }))
      document.querySelectorAll('[data-ca-store-menu-button] .ca-store-switcher-name').forEach(node => { node.textContent = payload.profile.storeName })
      document.querySelectorAll('[data-ca-store-menu-button]').forEach(node => { node.setAttribute('aria-label', `${payload.profile.storeName}の店舗メニューを開く`) })
      return payload.profile
    } catch (error) { feedback.textContent = error.message; feedback.className = 'ca-feedback error'; throw error }
    finally { button.disabled = false; button.innerHTML = original }
  }

  function prepareStandaloneSettings(root) {
    if (!root) return
    const main = root.closest('main') || document.querySelector('main')
    const saveButton = Array.from(root.querySelectorAll('button')).find(button => String(button.textContent || '').replace(/\s+/g, '') === '設定を保存')
    const settingsForm = saveButton?.closest('form') || Array.from(root.children).find(node => node.tagName === 'FORM' && !node.matches('[data-ca-store-form],[data-ca-email-form]'))
    if (settingsForm) {
      settingsForm.dataset.caSettingsRelocated = '1'
      settingsForm.hidden = true
    }
    const introHeading = main?.querySelector('h1')
    const intro = introHeading?.closest('header') || introHeading?.parentElement
    const description = intro?.querySelector('p')
    if (description) description.textContent = '店舗名、連絡先、営業時間・定休日など、店舗の基本情報を管理します。'
  }

  async function enhanceSettingsPage() {
    if (location.pathname !== '/admin/settings') return
    if (new URLSearchParams(location.search).get('embedded') === '1') return
    const root = document.querySelector('main .max-w-7xl') || document.querySelector('main > div')
    if (!root) return
    prepareStandaloneSettings(root)
    if (root.querySelector('[data-ca-store-settings]')) return
    try {
      const profile = await getProfile()
      if (!root.isConnected || root.querySelector('[data-ca-store-settings]')) return
      const section = document.createElement('section'); section.className = 'ca-setup-card'; section.id = 'store-profile'; section.dataset.caStoreSettings = '1'
      const setup = profile.setup || {}
      const schedule = profile.businessSchedule || { openTime: '10:00', closeTime: '19:00', closedWeekdays: [1] }
      const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土']
      const weekdayOptions = weekdayLabels.map((label, day) => `<label class="ca-weekday-option"><input type="checkbox" name="closedWeekdays" value="${day}" ${schedule.closedWeekdays.includes(day) ? 'checked' : ''} ${profile.canEdit ? '' : 'disabled'}><span>${label}</span></label>`).join('')
      const disabled = profile.canEdit ? '' : 'disabled'
      section.innerHTML = `<header class="ca-setup-hero"><div><span class="ca-eyebrow">Store profile & onboarding</span><h2>店舗基本設定</h2><p>店舗名、オーナーの連絡先、営業開始までの準備状況を管理します。ここで変更した店舗名は、スタッフ画面の右上へ共通表示されます。</p></div><button type="button" class="ca-guide-button" data-ca-open-setup>${icon('spark')}初期設定を開く</button></header>
        <div class="ca-setup-progress">${setupStep('user', 'スタッフ', setup.staffCount > 0, `${setup.staffCount || 0}名登録`)}${setupStep('scissors', 'メニュー', setup.menuCount > 0, `${setup.activeMenuCount || 0}件公開中`)}${setupStep('mail', '予約メール', Boolean(setup.inboundAddress), setup.inboundAddress ? '専用アドレス発行済み' : '未設定')}</div>
        <div class="ca-profile-grid"><form class="ca-form-card ca-form-card-wide" data-ca-store-form><h3>店舗情報</h3><p>予約案内や店舗画面で利用する正式情報です。営業時間と定休日は、顧客予約の受付可否と日別シフト表へ共通反映されます。</p><div class="ca-profile-fields"><div class="ca-field"><label>店舗名</label><input name="storeName" maxlength="100" value="${esc(profile.storeName)}" ${disabled} required></div><div class="ca-field"><label>オーナー名</label><input name="ownerName" maxlength="100" value="${esc(profile.ownerName)}" ${disabled} autocomplete="name"></div><div class="ca-field"><label>電話番号</label><input name="phone" type="tel" maxlength="30" value="${esc(profile.phone)}" ${disabled} autocomplete="tel" placeholder="03-1234-5678"></div><div class="ca-field"><label>郵便番号</label><input name="postalCode" inputmode="numeric" maxlength="8" value="${esc(profile.postalCode)}" ${disabled} autocomplete="postal-code" placeholder="123-4567"></div><div class="ca-field"><label>都道府県</label><input name="prefecture" maxlength="30" value="${esc(profile.prefecture)}" ${disabled} autocomplete="address-level1"></div><div class="ca-field"><label>市区町村</label><input name="city" maxlength="100" value="${esc(profile.city)}" ${disabled} autocomplete="address-level2"></div><div class="ca-field wide"><label>番地</label><input name="addressLine1" maxlength="160" value="${esc(profile.addressLine1)}" ${disabled} autocomplete="address-line1"></div><div class="ca-field wide"><label>建物名・部屋番号</label><input name="addressLine2" maxlength="160" value="${esc(profile.addressLine2)}" ${disabled} autocomplete="address-line2"></div><section class="ca-hours-card"><div class="ca-hours-card-head"><span class="symbol">${icon('clock')}</span><div><strong>営業時間・定休日</strong><small>30分単位で設定できます。終了時刻をまたぐ予約は受け付けません。</small></div></div><div class="ca-hours-range"><div class="ca-field"><label>営業開始</label><input type="time" name="businessOpen" step="1800" value="${esc(schedule.openTime)}" ${disabled} required></div><span class="ca-hours-separator">〜</span><div class="ca-field"><label>営業終了</label><input type="time" name="businessClose" step="1800" value="${esc(schedule.closeTime)}" ${disabled} required></div></div><p class="ca-weekday-title">定休日（複数選択可）</p><div class="ca-weekday-grid">${weekdayOptions}</div></section><div class="ca-field wide"><label>WebサイトURL</label><input name="websiteUrl" type="url" maxlength="300" value="${esc(profile.websiteUrl)}" ${disabled} autocomplete="url" placeholder="https://example.com"></div></div><div class="ca-form-actions"><a class="ca-account-link" href="/admin/account">ログインID・パスワード設定</a>${profile.canEdit ? `<button type="submit" class="ca-submit">${icon('check')}店舗情報を保存</button>` : ''}</div><p class="ca-feedback" role="status"></p></form>
        <form class="ca-form-card" data-ca-email-form><h3>オーナーのメールアドレス</h3><p>アカウントや店舗運営に関する連絡先です。ログインIDは自動では変更されません。</p><div class="ca-field"><label>メールアドレス</label><input name="email" type="email" maxlength="254" autocomplete="email" value="${esc(profile.ownerEmail)}" ${profile.canEdit ? '' : 'disabled'} required></div>${profile.canEdit ? '<div class="ca-field"><label>現在のパスワード</label><input name="currentPassword" type="password" autocomplete="current-password" required><small>本人確認のため、変更時に現在のパスワードを確認します。</small></div><div class="ca-form-actions"><span></span><button type="submit" class="ca-submit">' + icon('mail') + 'メールを変更</button></div>' : ''}<p class="ca-feedback" role="status"></p></form></div>`
      const firstChild = root.firstElementChild
      if (firstChild) firstChild.insertAdjacentElement('afterend', section); else root.appendChild(section)
      section.querySelector('[data-ca-open-setup]').addEventListener('click', () => {
        const launcher = document.querySelector('.ts-launcher'); if (launcher) launcher.click(); else location.assign('/admin/settings?setup=1')
      })
      const storeForm = section.querySelector('[data-ca-store-form]')
      storeForm.addEventListener('submit', async event => { event.preventDefault(); const button = storeForm.querySelector('[type="submit"]'); if (!button) return; const formData = new FormData(storeForm); const body = Object.fromEntries(formData.entries()); body.closedWeekdays = formData.getAll('closedWeekdays'); try { await saveProfile('update-store', body, storeForm.querySelector('.ca-feedback'), button) } catch {} })
      const emailForm = section.querySelector('[data-ca-email-form]')
      emailForm.addEventListener('submit', async event => { event.preventDefault(); const button = emailForm.querySelector('[type="submit"]'); if (!button) return; try { const updated = await saveProfile('update-owner-email', { email: emailForm.email.value, currentPassword: emailForm.currentPassword.value }, emailForm.querySelector('.ca-feedback'), button); emailForm.email.value = updated.ownerEmail; emailForm.currentPassword.value = '' } catch {} })
    } catch (error) { toast(error.message, 'error') }
  }

  function enhanceAccountTheme() {
    if (location.pathname !== '/admin/account') return
    const main = document.querySelector('main')
    const root = main?.querySelector('.max-w-4xl') || main?.firstElementChild
    if (!root || root.querySelector('[data-ca-theme-settings]')) return
    const section = document.createElement('section')
    section.className = 'ca-theme-card'
    section.dataset.caThemeSettings = '1'
    section.setAttribute('aria-labelledby', 'ca-theme-heading')
    section.innerHTML = `<header class="ca-theme-card-head"><span class="symbol">${icon('palette')}</span><div><h2 id="ca-theme-heading">表示テーマ</h2><p>店舗管理画面の色合いを選べます。選択したテーマは、このブラウザのすべての管理ページに反映されます。</p></div></header><div class="ca-theme-options" role="radiogroup" aria-label="表示テーマ"><button type="button" class="ca-theme-option" data-ca-theme-option="pink" role="radio"><span class="ca-theme-preview" aria-hidden="true"></span><span class="ca-theme-copy"><strong>${icon('sun')} ピンクモード</strong><small>明るく上品な、現在のSalon de Lienカラー</small></span><span class="ca-theme-check">${icon('check')}</span></button><button type="button" class="ca-theme-option" data-ca-theme-option="dark" role="radio"><span class="ca-theme-preview dark" aria-hidden="true"></span><span class="ca-theme-copy"><strong>${icon('moon')} ダークモード</strong><small>目にやさしい、落ち着いた暗色の管理画面</small></span><span class="ca-theme-check">${icon('check')}</span></button></div>`
    root.appendChild(section)
    section.querySelectorAll('[data-ca-theme-option]').forEach(button => button.addEventListener('click', () => {
      const theme = applyAdminTheme(button.dataset.caThemeOption, true)
      toast(theme === 'dark' ? 'ダークモードに切り替えました。' : 'ピンクモードに切り替えました。', 'success')
    }))
    applyAdminTheme(savedAdminTheme())
  }

  const settingsPanels = {
    points: { title: 'ポイント・抽選・クーポン設定', description: 'ポイント利用条件、付与ルール、アンケート抽選とクーポンを設定します。', headings: ['ポイント利用条件', 'ポイント付与ルール', 'アンケート抽選', 'クーポン'] },
    checkout: { title: '会計設定', description: '会計に適用する消費税率を設定します。', headings: ['会計'] },
    inventory: { title: '商品在庫設定', description: '入荷・棚卸し後の実在庫数をまとめて更新します。', headings: ['商品在庫'] },
  }

  function settingBlock(heading, main) {
    let node = heading.parentElement
    let candidate = node
    while (node && node !== main) {
      const count = node.querySelectorAll?.('h2')?.length || 0
      if (count > 1) break
      candidate = node
      node = node.parentElement
    }
    return candidate
  }

  function configureSettingsDocument() {
    if (location.pathname !== '/admin/settings') return
    const params = new URLSearchParams(location.search)
    const panelKey = params.get('panel')
    const embedded = params.get('embedded') === '1' && settingsPanels[panelKey]
    const main = document.querySelector('main')
    if (!main) return
    const headings = Array.from(main.querySelectorAll('h2'))
    const movedHeadings = new Set(Object.values(settingsPanels).flatMap(panel => panel.headings))
    if (!embedded) {
      const root = document.querySelector('main .max-w-7xl') || document.querySelector('main > div')
      prepareStandaloneSettings(root)
      if (!root?.querySelector('[data-ca-settings-relocated]')) headings.filter(heading => movedHeadings.has(heading.textContent.trim())).forEach(heading => { const block = settingBlock(heading, main); block.dataset.caSettingsRelocated = '1'; block.hidden = true })
      return
    }
    document.documentElement.classList.add('ca-settings-embedded')
    document.body.classList.add('ca-settings-embedded')
    if (main.parentElement) main.parentElement.dataset.caEmbeddedContent = '1'
    document.querySelectorAll('aside,header.admin-shell-header,button[aria-label*="サイドバー"]').forEach(node => {
      node.dataset.caEmbeddedHidden = '1'
      node.style.setProperty('display', 'none', 'important')
    })
    const intro = main.querySelector('h1')
    if (intro) settingBlock(intro, main).dataset.caEmbeddedHidden = '1'
    const allowed = new Set(settingsPanels[panelKey].headings)
    headings.forEach(heading => {
      const text = heading.textContent.trim()
      const block = settingBlock(heading, main)
      if (!allowed.has(text)) block.dataset.caEmbeddedHidden = '1'
      else {
        block.dataset.caEmbeddedAllowed = '1'
        block.style.setProperty('width', '100%', 'important')
        block.style.setProperty('max-width', '680px', 'important')
        block.style.setProperty('margin-inline', 'auto', 'important')
        if (block.parentElement) {
          block.parentElement.dataset.caEmbeddedAllowedGrid = '1'
          block.parentElement.style.setProperty('grid-template-columns', 'minmax(0, 1fr)', 'important')
          block.parentElement.style.setProperty('justify-items', 'stretch', 'important')
        }
      }
    })
    document.documentElement.classList.add('ca-settings-ready')
    document.body.classList.add('ca-settings-ready')
  }

  function closeSettingsDialog(root) {
    if (!root?.isConnected) return
    root.remove()
    document.body.style.overflow = ''
  }

  function openSettingsDialog(panelKey) {
    const panel = settingsPanels[panelKey]
    if (!panel) return
    document.querySelectorAll('[data-ca-settings-overlay]').forEach(closeSettingsDialog)
    const root = document.createElement('div')
    root.className = 'ca-overlay'
    root.dataset.caSettingsOverlay = '1'
    root.innerHTML = `<section class="ca-settings-dialog" role="dialog" aria-modal="true" aria-label="${esc(panel.title)}"><header class="ca-dialog-head"><div><h2>${esc(panel.title)}</h2><p>${esc(panel.description)}</p></div><button type="button" class="ca-close" aria-label="閉じる">${icon('close')}</button></header><div class="ca-settings-frame-wrap"><div class="ca-settings-loading">設定を読み込んでいます…</div><iframe class="ca-settings-frame" title="${esc(panel.title)}" src="/admin/settings?embedded=1&amp;panel=${encodeURIComponent(panelKey)}"></iframe></div></section>`
    root.querySelector('.ca-close').addEventListener('click', () => closeSettingsDialog(root))
    root.addEventListener('click', event => { if (event.target === root) closeSettingsDialog(root) })
    document.body.appendChild(root)
    document.body.style.overflow = 'hidden'
    const frame = root.querySelector('.ca-settings-frame')
    const reveal = () => {
      try {
        if (!frame.contentDocument?.documentElement?.classList.contains('ca-settings-ready')) return false
        frame.classList.add('is-ready')
        root.querySelector('.ca-settings-loading')?.remove()
        return true
      } catch { return false }
    }
    const poll = window.setInterval(() => { if (!root.isConnected || reveal()) window.clearInterval(poll) }, 60)
    frame.addEventListener('load', reveal)
  }

  function settingsContext() {
    if (location.pathname === '/admin/customers/messages') return { panelKey: 'points', label: 'ポイント・抽選・クーポン設定' }
    if (location.pathname !== '/admin/products') return null
    const section = new URLSearchParams(location.search).get('section') || 'products'
    if (section === 'menus') return { panelKey: 'checkout', label: '会計設定' }
    if (section === 'products') return { panelKey: 'inventory', label: '在庫設定' }
    return null
  }

  function enhanceContextSettings() {
    if (location.pathname === '/admin/settings') { configureSettingsDocument(); return }
    const context = settingsContext()
    const main = document.querySelector('main')
    if (!main) return
    main.querySelectorAll('[data-ca-context-settings]').forEach(node => {
      if (!context || node.dataset.caContextSettings !== context.panelKey) node.remove()
    })
    if (!context) return
    const heading = main.querySelector('h1')
    const hero = heading?.closest('section') || heading?.parentElement
    if (!hero) return
    const existing = main.querySelector(`[data-ca-context-settings="${context.panelKey}"]`)
    if (existing) {
      if (existing.previousElementSibling !== hero) hero.insertAdjacentElement('afterend', existing)
      return
    }
    const row = document.createElement('div')
    row.className = 'ca-context-settings-row'
    row.dataset.caContextSettings = context.panelKey
    row.innerHTML = `<button type="button" class="ca-context-settings-button">${icon('spark')}${esc(context.label)}</button>`
    row.querySelector('button').addEventListener('click', () => openSettingsDialog(context.panelKey))
    hero.insertAdjacentElement('afterend', row)
  }

  function notificationHistoryStyles() {
    if (document.getElementById('ca-notification-history-styles')) return
    const style = document.createElement('style')
    style.id = 'ca-notification-history-styles'
    style.textContent = `
      main.ca-notification-history-mode > :not([data-ca-notification-history-root]){display:none!important}
      .ca-notification-history{max-width:1180px;margin:0 auto;padding:6px 0 44px;color:var(--ca-ink,#2f2a25)}
      .ca-notification-history-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:22px;padding:28px;border:1px solid var(--ca-line,#e8ded2);border-radius:24px;background:var(--ca-paper,#fff);box-shadow:0 16px 42px rgba(61,43,36,.07)}
      .ca-notification-history-eyebrow{display:flex;align-items:center;gap:8px;margin:0 0 8px;color:var(--ca-rose,#9f4f62);font-size:13px;font-weight:800}.ca-notification-history-eyebrow svg{width:17px;height:17px}
      .ca-notification-history h1{margin:0;color:var(--ca-ink,#2f2a25);font-size:clamp(25px,3vw,36px);letter-spacing:0;line-height:1.3}.ca-notification-history-lead{max-width:680px;margin:9px 0 0;color:var(--ca-muted,#7c7168);font-size:14px;line-height:1.8}
      .ca-notification-history-back{display:inline-flex;min-height:44px;flex:0 0 auto;align-items:center;justify-content:center;gap:7px;border:1px solid var(--ca-line,#e8ded2);border-radius:999px;background:var(--ca-paper,#fff);padding:0 17px;color:var(--ca-ink,#2f2a25);font-size:13px;font-weight:800;text-decoration:none;box-shadow:0 5px 16px rgba(61,43,36,.05)}.ca-notification-history-back svg{width:16px;height:16px}
      .ca-notification-history-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px}.ca-notification-history-tabs{display:flex;gap:7px;overflow:auto;padding:2px;scrollbar-width:none}
      .ca-notification-history-tab{min-height:40px;white-space:nowrap;border:1px solid var(--ca-line,#e8ded2);border-radius:999px;background:var(--ca-paper,#fff);padding:0 16px;color:var(--ca-muted,#7c7168);font:700 13px inherit;cursor:pointer}.ca-notification-history-tab[aria-selected="true"]{border-color:var(--ca-primary,#8f4f42);background:var(--ca-primary,#8f4f42);color:#fff}
      .ca-notification-history-count{color:var(--ca-muted,#7c7168);font-size:12px;font-weight:700;white-space:nowrap}.ca-notification-history-list{display:grid;gap:10px}
      .ca-notification-history-item{display:grid;grid-template-columns:46px minmax(0,1fr) 18px;gap:14px;align-items:center;min-height:98px;border:1px solid var(--ca-line,#e8ded2);border-radius:20px;background:var(--ca-paper,#fff);padding:17px 18px;color:var(--ca-ink,#2f2a25);text-decoration:none;box-shadow:0 8px 24px rgba(61,43,36,.045);transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}.ca-notification-history-item:hover{border-color:var(--ca-primary,#8f4f42);transform:translateY(-1px);box-shadow:0 12px 28px rgba(61,43,36,.08)}
      .ca-notification-history-symbol{display:grid;width:46px;height:46px;place-items:center;border-radius:15px;background:var(--ca-soft,#f6efe6);color:var(--ca-primary,#8f4f42)}.ca-notification-history-item.message .ca-notification-history-symbol{background:var(--lien-sage-soft,#e9f0e8);color:var(--lien-sage,#67836b)}.ca-notification-history-symbol svg,.ca-notification-history-arrow svg{width:20px;height:20px}
      .ca-notification-history-copy{min-width:0}.ca-notification-history-meta{display:flex;align-items:center;gap:9px;margin-bottom:5px;color:var(--ca-muted,#7c7168);font-size:11px;font-weight:700}.ca-notification-history-kind{border-radius:999px;background:var(--ca-soft,#f6efe6);padding:3px 8px;color:var(--ca-primary,#8f4f42)}
      .ca-notification-history-copy strong{display:block;overflow:hidden;color:var(--ca-ink,#2f2a25);font-size:15px;line-height:1.5;text-overflow:ellipsis;white-space:nowrap}.ca-notification-history-copy p{display:-webkit-box;overflow:hidden;margin:4px 0 0;color:var(--ca-muted,#7c7168);font-size:13px;line-height:1.65;-webkit-box-orient:vertical;-webkit-line-clamp:2}.ca-notification-history-arrow{color:var(--ca-muted,#7c7168)}
      .ca-notification-history-empty{display:grid;min-height:260px;place-items:center;border:1px dashed var(--ca-line,#e8ded2);border-radius:24px;background:var(--ca-paper,#fff);padding:30px;text-align:center}.ca-notification-history-empty .symbol{display:grid;width:58px;height:58px;margin:0 auto 14px;place-items:center;border-radius:20px;background:var(--ca-soft,#f6efe6);color:var(--ca-primary,#8f4f42)}.ca-notification-history-empty svg{width:25px;height:25px}.ca-notification-history-empty strong{display:block;color:var(--ca-ink,#2f2a25);font-size:16px}.ca-notification-history-empty p{margin:7px 0 0;color:var(--ca-muted,#7c7168);font-size:13px}
      .ca-notification-history-loading{display:grid;gap:10px}.ca-notification-history-skeleton{height:98px;border:1px solid var(--ca-line,#e8ded2);border-radius:20px;background:linear-gradient(90deg,var(--ca-paper,#fff),var(--ca-soft,#f6efe6),var(--ca-paper,#fff));background-size:220% 100%;animation:ca-notification-shimmer 1.3s linear infinite}@keyframes ca-notification-shimmer{to{background-position:-220% 0}}
      @media(max-width:700px){.ca-notification-history{padding:0 0 30px}.ca-notification-history-hero{align-items:flex-start;flex-direction:column;padding:21px 18px;border-radius:20px}.ca-notification-history-back{width:100%}.ca-notification-history-toolbar{align-items:flex-start;flex-direction:column}.ca-notification-history-item{grid-template-columns:42px minmax(0,1fr) 16px;gap:11px;min-height:92px;padding:15px 13px}.ca-notification-history-symbol{width:42px;height:42px}.ca-notification-history-count{padding-left:4px}}
      @media(prefers-reduced-motion:reduce){.ca-notification-history-item,.ca-notification-history-skeleton{animation:none;transition:none}}
    `
    document.head.appendChild(style)
  }

  function notificationHistoryItems(payload) {
    const appointments = (Array.isArray(payload?.appointments) ? payload.appointments : []).map(item => ({ id: `appointment:${item.id}`, type: 'appointment', title: `${item.customerName || 'お客様'}様の予約`, body: `${item.menu || 'メニュー相談'}${item.status ? ` / ${item.status}` : ''}`, time: item.createdAt, href: `/admin/appointments/${encodeURIComponent(item.id)}` }))
    const messages = (Array.isArray(payload?.messages) ? payload.messages : []).map(item => ({ id: `message:${item.id}`, type: 'message', title: `${item.customerName || 'お客様'}様からメッセージ`, body: item.body || 'メッセージを確認してください。', time: item.createdAt, href: `/admin/customers/messages?chat=1&threadId=${encodeURIComponent(item.threadId || '')}` }))
    return appointments.concat(messages).sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
  }

  function renderNotificationHistory(root, payload) {
    const items = notificationHistoryItems(payload)
    let filter = 'all'
    const list = root.querySelector('[data-ca-notification-history-list]')
    const count = root.querySelector('[data-ca-notification-history-count]')
    const render = () => {
      const visible = filter === 'all' ? items : items.filter(item => item.type === filter)
      count.textContent = `${visible.length}件`
      list.innerHTML = visible.length ? visible.map(item => `<a class="ca-notification-history-item ${esc(item.type)}" href="${esc(item.href)}"><span class="ca-notification-history-symbol">${icon(item.type === 'message' ? 'message' : 'calendar')}</span><span class="ca-notification-history-copy"><span class="ca-notification-history-meta"><span class="ca-notification-history-kind">${item.type === 'message' ? 'メッセージ' : '予約'}</span><time datetime="${esc(item.time || '')}">${esc(notificationTime(item.time))}</time></span><strong>${esc(item.title)}</strong><p>${esc(item.body)}</p></span><span class="ca-notification-history-arrow">${icon('chevronRight')}</span></a>`).join('') : `<div class="ca-notification-history-empty"><div><span class="symbol">${icon('bell')}</span><strong>表示するお知らせはありません</strong><p>新しい予約やメッセージが届くと、ここに残ります。</p></div></div>`
    }
    root.querySelectorAll('[data-ca-notification-filter]').forEach(button => button.addEventListener('click', () => { filter = button.dataset.caNotificationFilter || 'all'; root.querySelectorAll('[data-ca-notification-filter]').forEach(candidate => candidate.setAttribute('aria-selected', String(candidate === button))); render() }))
    render()
  }

  function isNotificationHistoryPage() {
    return location.pathname === '/admin/appointments'
      && new URLSearchParams(location.search).get('notificationHistory') === '1'
  }

  function enableNotificationHistoryHardNavigation() {
    if (document.documentElement.dataset.caNotificationHistoryNavigation === '1') return
    document.documentElement.dataset.caNotificationHistoryNavigation = '1'
    document.addEventListener('click', event => {
      if (!isNotificationHistoryPage() || event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = event.target?.closest?.('a[href]')
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      const target = new URL(anchor.href, location.href)
      if (target.origin !== location.origin || target.href === location.href) return
      event.preventDefault()
      event.stopImmediatePropagation()
      window.location.assign(target.href)
    }, true)
  }

  function enhanceNotificationHistoryPage() {
    if (!isNotificationHistoryPage()) return
    enableNotificationHistoryHardNavigation()
    notificationHistoryStyles()
    const main = document.querySelector('main')
    if (!main) {
      const attempts = Number(document.documentElement.dataset.caNotificationHistoryAttempts || 0)
      if (attempts < 30) {
        document.documentElement.dataset.caNotificationHistoryAttempts = String(attempts + 1)
        window.requestAnimationFrame(enhanceNotificationHistoryPage)
      }
      return
    }
    delete document.documentElement.dataset.caNotificationHistoryAttempts
    if (main.querySelector('[data-ca-notification-history-root]')) return
    main.classList.add('ca-notification-history-mode')
    const historyMarkup = `<section class="ca-notification-history" data-ca-notification-history-root><header class="ca-notification-history-hero"><div><p class="ca-notification-history-eyebrow">${icon('bell')} Notification history</p><h1>お知らせ履歴</h1><p class="ca-notification-history-lead">新しい予約とお客様からのメッセージを、確認後も履歴として見返せます。</p></div><a class="ca-notification-history-back" href="/admin/appointments">${icon('chevronLeft')}予約カレンダーへ戻る</a></header><div class="ca-notification-history-toolbar"><div class="ca-notification-history-tabs" role="tablist" aria-label="お知らせ種別"><button class="ca-notification-history-tab" type="button" role="tab" aria-selected="true" data-ca-notification-filter="all">すべて</button><button class="ca-notification-history-tab" type="button" role="tab" aria-selected="false" data-ca-notification-filter="appointment">予約</button><button class="ca-notification-history-tab" type="button" role="tab" aria-selected="false" data-ca-notification-filter="message">メッセージ</button></div><span class="ca-notification-history-count" data-ca-notification-history-count>読込中</span></div><div class="ca-notification-history-list" data-ca-notification-history-list aria-live="polite"><div class="ca-notification-history-loading"><div class="ca-notification-history-skeleton"></div><div class="ca-notification-history-skeleton"></div><div class="ca-notification-history-skeleton"></div></div></div></section>`
    main.insertAdjacentHTML('beforeend', historyMarkup)
    fetch('/api/lien-staff-notifications?history=1&read=1', { credentials: 'same-origin', cache: 'no-store' }).then(response => response.ok ? response.json() : Promise.reject(new Error('通知履歴を取得できませんでした。'))).then(payload => { renderNotificationHistory(main.querySelector('[data-ca-notification-history-root]'), payload); refreshNotifications(true) }).catch(error => { const list = main.querySelector('[data-ca-notification-history-list]'); if (list) list.innerHTML = `<div class="ca-notification-history-empty"><div><span class="symbol">${icon('bell')}</span><strong>通知履歴を読み込めませんでした</strong><p>${esc(error.message || '時間をおいて再度お試しください。')}</p></div></div>` })
  }

  function enhance() {
    styles(); applyAdminTheme(savedAdminTheme()); normalizeServiceBrand(); normalizeSidebarControl(); removeCommandPalette(); removeHeaderSearch(); enhanceHeader(); enhanceMenuPage(); enhanceSettingsPage(); enhanceAccountTheme(); enhanceContextSettings(); enhanceNotificationHistoryPage()
  }

  function schedule() {
    if (!state.frame) state.frame = requestAnimationFrame(() => { state.frame = 0; enhance() })
    state.timers.forEach(clearTimeout); state.timers = [100, 350].map(delay => setTimeout(enhance, delay))
  }

  function boot() {
    if (state.booted) return
    state.booted = true
    styles()
    bindLegacyCommandGuard()
    bindStoreMenuEvents()
    document.addEventListener('submit', handleCatalogCreateSubmit, true)
    document.addEventListener('submit', handleCatalogDeleteSubmit, true)
    document.addEventListener('click', handleCatalogEditClick, true)
    document.addEventListener('click', handleCatalogDeleteClick, true)
    schedule()
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true })
    window.addEventListener('popstate', schedule)
    window.addEventListener('pageshow', schedule)
    state.notificationTimer = window.setInterval(() => { if (document.visibilityState === 'visible') refreshNotifications(false) }, 30000)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshNotifications(true) })
    document.addEventListener('click', event => { if (event.target.closest?.('a[href]')) schedule() }, true)
  }

  const start = () => boot()
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
})()
