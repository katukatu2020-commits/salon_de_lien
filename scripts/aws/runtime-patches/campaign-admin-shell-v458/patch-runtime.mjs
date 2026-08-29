import fs from 'node:fs'

const campaignPath = '/app/customer-campaigns-v427.js'
const marker = 'campaign-admin-shell-v458'

function boundedSection(source, startToken, endToken, label) {
  const start = source.indexOf(startToken)
  const end = source.indexOf(endToken, start + startToken.length)
  if (start < 0 || end < 0) throw new Error(`${label}: section was not found`)
  return { start, end }
}

function replaceSection(source, section, replacement) {
  return source.slice(0, section.start) + replacement + source.slice(section.end)
}

function replacementAdminCssV429() {
    return `/* campaign-admin-shell-v458 */
[data-campaign-admin]{min-width:0}
[data-campaign-admin] .campaign-page-header{border:1px solid var(--lien-border,#e8ded2);border-radius:24px;background:linear-gradient(145deg,#fffaf8,#f8f0e9);padding:24px;box-shadow:0 10px 30px rgba(47,42,37,.05)}
[data-campaign-admin] .eyebrow{display:inline-flex;align-items:center;gap:8px;border:1px solid #eab8c5;border-radius:999px;background:#fff;padding:7px 12px;color:#a23f59;font-size:12px;font-weight:700}
[data-campaign-admin] .eyebrow svg{width:16px;height:16px;flex:0 0 16px}
[data-campaign-admin] .campaign-page-header h1{margin:12px 0 0;color:var(--lien-ink,#2f2a25);font-family:inherit;font-size:30px;font-weight:600;line-height:1.35;letter-spacing:0}
[data-campaign-admin] .campaign-page-header p{max-width:800px;margin:10px 0 0;color:var(--lien-muted,#7c7168);font-size:14px;line-height:1.75}
[data-campaign-admin] .grid{display:grid;grid-template-columns:minmax(0,1fr) 352px;gap:24px;align-items:start;margin-top:24px}
[data-campaign-admin] .card{min-width:0;border:1px solid var(--lien-border,#e8ded2);border-radius:22px;background:#fff;padding:24px;box-shadow:0 8px 24px rgba(47,42,37,.06)}
[data-campaign-admin] .card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
[data-campaign-admin] .card h2{margin:0;color:var(--lien-ink,#2f2a25);font-family:inherit;font-size:18px;font-weight:600;line-height:1.5;letter-spacing:0}
[data-campaign-admin] .card-intro{margin:6px 0 0;color:var(--lien-muted,#7c7168);font-size:13px;line-height:1.7}
[data-campaign-admin] .field{display:grid;gap:8px;margin-top:18px;color:var(--lien-ink,#2f2a25);font-size:13px;font-weight:700}
[data-campaign-admin] .input{width:100%;min-width:0;min-height:48px;box-sizing:border-box;border:1px solid var(--lien-border,#e8ded2);border-radius:12px;background:#fff;padding:0 14px;color:var(--lien-ink,#2f2a25);font:inherit;font-size:14px;outline:none;transition:border-color .16s,box-shadow .16s}
[data-campaign-admin] textarea.input{min-height:116px;resize:vertical;padding-top:12px;line-height:1.7}
[data-campaign-admin] input[type=file].input{padding:10px 12px}
[data-campaign-admin] .input:focus{border-color:var(--lien-primary,#8f4f42);box-shadow:0 0 0 4px rgba(233,201,190,.42)}
[data-campaign-admin] .columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
[data-campaign-admin] .preview{display:grid;min-height:210px;place-items:center;overflow:hidden;margin-top:12px;border:1px dashed #ddc9bf;border-radius:16px;background:#fff8f5;color:#9a8279;font-size:12px;text-align:center}
[data-campaign-admin] .preview img{display:block;width:100%;max-height:360px;object-fit:cover}
[data-campaign-admin] .editing{display:none;align-items:center;justify-content:space-between;gap:12px;margin-top:16px;border-radius:12px;background:#fff3df;padding:12px;color:#855c24;font-size:12px;font-weight:700}
[data-campaign-admin] .editing.show{display:flex}
[data-campaign-admin] .text-button{border:0;background:transparent;color:#8f4f42;font:inherit;font-weight:800;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
[data-campaign-admin] .form-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
[data-campaign-admin] .primary,[data-campaign-admin] .secondary,[data-campaign-admin] .danger{display:inline-flex;min-height:44px;align-items:center;justify-content:center;border-radius:999px;padding:0 18px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;transition:background-color .16s,border-color .16s,transform .16s,opacity .16s}
[data-campaign-admin] .primary{border:1px solid var(--lien-primary,#8f4f42);background:var(--lien-primary,#8f4f42);color:#fff;box-shadow:0 7px 18px rgba(143,79,66,.18)}
[data-campaign-admin] .primary:hover{background:#7d453a;transform:translateY(-1px)}
[data-campaign-admin] .secondary{border:1px solid var(--lien-border,#e8ded2);background:#fff;color:var(--lien-ink,#2f2a25)}
[data-campaign-admin] .secondary:hover{background:var(--lien-surface-soft,#f6efe6)}
[data-campaign-admin] button:disabled{cursor:wait;opacity:.58;transform:none}
[data-campaign-admin] .message{display:none;margin-top:16px;border-radius:12px;padding:12px 14px;font-size:12px;font-weight:700;line-height:1.6}
[data-campaign-admin] .message.show{display:block}
[data-campaign-admin] .message.ok{background:#edf6ed;color:#3e6847}
[data-campaign-admin] .message.error{background:#fff0f0;color:#a13d3d}
[data-campaign-admin] .history{display:grid;gap:16px;margin-top:18px}
[data-campaign-admin] .history article{overflow:hidden;border:1px solid var(--lien-border,#e8ded2);border-radius:16px;background:#fff;box-shadow:0 3px 12px rgba(47,42,37,.04)}
[data-campaign-admin] .history-media{position:relative;overflow:hidden;aspect-ratio:16/9;background:#f7eee8}
[data-campaign-admin] .history-media img,[data-campaign-admin] .history-media .fallback{display:flex;width:100%;height:100%;align-items:center;justify-content:center;object-fit:cover;color:#8f4f42;font-size:11px;font-weight:800;letter-spacing:.08em}
[data-campaign-admin] .history-status{position:absolute;top:10px;left:10px;border-radius:999px;background:#fffdf9e8;padding:5px 9px;color:#67473d;font-size:10px;font-weight:800;box-shadow:0 2px 8px rgba(47,42,37,.12)}
[data-campaign-admin] .history-copy{padding:14px}
[data-campaign-admin] .history-copy h3{margin:0;color:var(--lien-ink,#2f2a25);font-size:14px;line-height:1.55}
[data-campaign-admin] .history-copy p{margin:6px 0 0;color:var(--lien-muted,#7c7168);font-size:11px;line-height:1.55}
[data-campaign-admin] .history-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px}
[data-campaign-admin] .badge{border-radius:999px;background:#fff0f4;padding:5px 9px;color:#af4764;font-size:10px;font-weight:800}
[data-campaign-admin] .history-actions{display:flex;gap:6px}
[data-campaign-admin] .icon-action{display:inline-flex;min-height:34px;align-items:center;gap:5px;border:1px solid var(--lien-border,#e8ded2);border-radius:999px;background:#fff;padding:0 10px;color:#66564e;font:inherit;font-size:10px;font-weight:800;cursor:pointer}
[data-campaign-admin] .icon-action svg{width:13px;height:13px}
[data-campaign-admin] .icon-action.delete{color:#a44747}
[data-campaign-admin] .empty{border:1px dashed var(--lien-border,#e8ded2);border-radius:14px;padding:28px 16px;color:var(--lien-muted,#7c7168);font-size:12px;text-align:center}
.campaign-workspace-tabs svg{width:16px;height:16px;flex:0 0 16px}
.admin-desktop-sidebar .lien-nav-item>svg,.admin-desktop-sidebar form button>svg{width:16px;height:16px;flex:0 0 16px}
html[data-ca-theme="dark"] [data-campaign-admin] .campaign-page-header{border-color:var(--border,#483a34);background:linear-gradient(145deg,#211b18,#2a221e)}
html[data-ca-theme="dark"] [data-campaign-admin] .card,html[data-ca-theme="dark"] [data-campaign-admin] .history article{border-color:var(--border,#483a34);background:#211b18;color:#f4ece7}
html[data-ca-theme="dark"] [data-campaign-admin] .input{border-color:#53433c;background:#191513;color:#f4ece7}
@media(max-width:1279px){[data-campaign-admin] .grid{grid-template-columns:minmax(0,1fr) 320px}}
@media(max-width:1120px){[data-campaign-admin] .grid{grid-template-columns:minmax(0,1fr)}[data-campaign-admin] .history{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(prefers-reduced-motion:reduce){[data-campaign-admin] *,[data-campaign-admin] *::before,[data-campaign-admin] *::after{scroll-behavior:auto!important;transition-duration:.01ms!important}}
`
  }

function replacementAdminShellV429(session, content, organizationName) {
    const displayName = htmlEscape(String(session.displayName || session.name || session.email || (session.role === 'ADMIN' ? '管理者' : 'スタッフ')).split('@')[0])
    const storeName = htmlEscape(String(organizationName || 'Salon de Lien'))
    const nav = [
      ['calendar', '予約カレンダー', '/admin/appointments'],
      ['users', '顧客・チャット・配信', '/admin/customers'],
      ['package', 'メニュー・商品棚・集計', '/admin/products?section=menus'],
      ['image', 'スタイル共有', '/admin/community'],
      ['chart', '経営分析', '/admin/owner-analytics'],
    ].map(([icon, label, href], index) => `<a class="lien-nav-item group flex min-h-11 items-center gap-3 rounded-full px-3 text-sm font-semibold transition ${index === 1 ? 'bg-[color:var(--lien-primary)] text-white shadow-sm' : 'text-lien-muted hover:bg-lien-soft hover:text-lien-ink'}"${index === 1 ? ' aria-current="page"' : ''} href="${href}">${adminIconV429(icon)}<span class="truncate">${label}</span></a>`).join('')
    const tabs = `<nav class="campaign-workspace-tabs inline-grid w-full grid-cols-4 gap-1 rounded-[18px] border border-lien bg-white p-1 shadow-lien-sm" aria-label="顧客ページ切替"><a class="lien-segment inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] px-2 text-[13px] font-semibold text-lien-muted transition sm:gap-2 sm:px-4 sm:text-sm hover:bg-lien-soft hover:text-lien-ink" href="/admin/customers">${adminIconV429('users')}<span>顧客管理</span></a><a class="lien-segment inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] px-2 text-[13px] font-semibold text-lien-muted transition sm:gap-2 sm:px-4 sm:text-sm hover:bg-lien-soft hover:text-lien-ink" href="/admin/customers/messages/chat">${adminIconV429('message')}<span>チャット</span></a><a class="lien-segment inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] px-2 text-[13px] font-semibold text-lien-muted transition sm:gap-2 sm:px-4 sm:text-sm hover:bg-lien-soft hover:text-lien-ink" href="/admin/customers/messages">${adminIconV429('megaphone')}<span>配信</span></a><a class="lien-segment inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] bg-[color:var(--lien-primary)] px-2 text-[13px] font-semibold text-white shadow-sm transition sm:gap-2 sm:px-4 sm:text-sm" aria-current="page" href="/admin/customers/messages/campaigns">${adminIconV429('campaign')}<span>キャンペーン</span></a></nav>`
    const sidebar = `<aside class="admin-desktop-sidebar fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-lien bg-white/90 shadow-lien-sm transition-transform duration-200 md:block translate-x-0"><div class="flex h-[100dvh] min-h-0 flex-col bg-[#fffdf9] text-lien-ink md:h-full"><div class="border-b border-lien px-4 py-4"><div class="flex items-center justify-between gap-3"><a class="flex min-w-0 items-center gap-3 text-lien-ink" href="/admin/customers"><span role="img" aria-label="店舗アイコン" class="h-11 w-11 rounded-2xl text-lg inline-flex shrink-0 items-center justify-center border border-[#ead8ca] bg-[#fff7ef] bg-cover bg-center font-semibold text-[color:var(--lien-primary-dark)] shadow-sm" style="background-image:url(/brand/salon-customer-service-mark.svg)"><span class="sr-only">Salon customer servitomer service</span></span><span class="min-w-0"><span class="block truncate text-lg font-semibold tracking-normal">Salon de Lien</span><span class="block truncate text-[11px] font-semibold text-lien-muted">Salon customer servitomer service</span></span></a></div></div><nav class="grid min-h-0 flex-1 content-start gap-1 overflow-y-auto overscroll-contain p-3 pb-3" aria-label="管理画面ナビゲーション">${nav}</nav><div class="mx-3 mb-1 hidden lg:block"><figure class="relative isolate h-28 overflow-hidden rounded-[18px] border border-lien bg-[#efe5da] shadow-sm"><img src="/brand/salon-interior-illustrated.png" alt="Salon de Lienの明るい施術スペースを描いたイラスト" class="absolute inset-0 h-full w-full object-cover object-[24%_58%]"><span aria-hidden="true" class="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#2f2a25]/24 via-transparent to-white/5"></span><div class="relative z-10 h-full"><div class="flex h-full items-end bg-gradient-to-t from-[#2f2a25]/70 via-transparent to-transparent p-3"><p class="text-xs font-semibold leading-5 text-white">今日の接客を、次の関係へ。</p></div></div></figure></div><div class="mt-auto p-3"><form action="/api/auth/logout" method="post"><button type="submit" class="flex min-h-11 w-full items-center gap-3 rounded-full border-0 bg-transparent px-3 text-sm font-semibold text-lien-muted transition hover:bg-lien-soft hover:text-lien-ink">${adminIconV429('logout')}<span>ログアウト</span></button></form></div></div></aside>`
    const header = `<header class="admin-shell-header sticky top-0 z-40 border-b border-lien bg-[#fffdf9]/92 backdrop-blur-xl"><div class="admin-mobile-header hidden h-14 items-center justify-between px-4"><a class="flex min-w-0 items-center gap-2 font-semibold text-lien-ink" href="/admin/customers"><span role="img" aria-label="店舗アイコン" class="h-8 w-8 rounded-full border border-[#ead8ca] bg-[#fff7ef] bg-cover bg-center shadow-sm" style="background-image:url(/brand/salon-customer-service-mark.svg)"></span><span class="truncate">Salon de Lien</span></a><div class="ca-header-store-mount" data-ca-header-actions></div></div><div class="admin-desktop-header hidden min-h-16 min-w-0 items-center gap-3 px-5 py-3 md:flex lg:px-8"><div class="min-w-0"><p class="text-[11px] font-semibold text-lien-muted">Salon de Lien</p><p class="truncate text-sm font-semibold text-lien-ink">顧客・チャット・配信</p></div><div class="ca-header-store-mount" data-ca-header-actions><a class="ca-command-hidden" href="/admin/account" aria-hidden="true" tabindex="-1">${displayName}</a><a class="ca-command-hidden" href="/admin/settings" aria-hidden="true" tabindex="-1">設定</a></div></div></header>`
    const sidebarScript = `<script>(()=>{const button=document.getElementById('campaign-sidebar-toggle'),sidebar=document.querySelector('.admin-desktop-sidebar'),stage=document.querySelector('[data-campaign-stage]');if(!button||!sidebar||!stage)return;const left='<svg class="ts-sidebar-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>',right='<svg class="ts-sidebar-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>';const apply=collapsed=>{sidebar.classList.toggle('translate-x-0',!collapsed);sidebar.classList.toggle('-translate-x-full',collapsed);stage.classList.toggle('md:pl-64',!collapsed);button.setAttribute('aria-label',collapsed?'サイドバーを開く':'サイドバーを閉じる');button.title=button.getAttribute('aria-label');button.style.left=collapsed?'.75rem':'15rem';button.innerHTML=collapsed?right:left;try{localStorage.setItem('salon-admin-sidebar-collapsed',collapsed?'1':'0')}catch{}};let collapsed=false;try{collapsed=localStorage.getItem('salon-admin-sidebar-collapsed')==='1'}catch{}apply(collapsed);button.addEventListener('click',()=>apply(button.getAttribute('aria-label')==='サイドバーを閉じる'))})()</script>`
    return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>キャンペーン配信 | Salon de Lien</title><script>try{if(localStorage.getItem('salon-lien:admin-theme')==='dark')document.documentElement.dataset.caTheme='dark'}catch{}</script><link rel="stylesheet" href="/_next/static/css/51ded9af5ca8c344.customer-native-v82.customer-shell-v88.customer-layout-v92.navigation-v84.sidebar-shift-v87.admin-theme-first-paint-v153.css" data-precedence="next"><style>${adminCssV429()}</style><script src="/tenant-setup-client.js?v=20260829-450" defer data-runtime="admin-route-lifecycle"></script><script src="/commercial-admin-v136.js?v=20260829-449" defer data-runtime="commercial-admin-shell"></script></head><body><div class="admin-app-shell admin-mobile-workspace-v38 admin-staff-unified-v48 min-h-screen overflow-x-hidden bg-lien text-lien-ink">${sidebar}<button id="campaign-sidebar-toggle" type="button" class="fixed top-20 z-50 hidden h-9 w-9 items-center justify-center rounded-full border border-lien bg-white text-base font-bold text-lien-primary shadow-md transition-all hover:bg-lien-soft md:inline-flex ca-sidebar-control ts-sidebar-toggle" style="left:15rem" aria-label="サイドバーを閉じる" title="サイドバーを閉じる">${adminIconV429('chevronLeft')}</button><div class="min-w-0 transition-[padding] duration-200 md:pl-64" data-campaign-stage>${header}<main class="admin-main-content min-w-0 overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8"><div class="mx-auto grid w-full max-w-7xl gap-6" data-layout="campaign-admin-shell-v458">${tabs}<div data-campaign-admin>${content}</div></div></main></div></div>${sidebarScript}</body></html>`
  }

let source = fs.readFileSync(campaignPath, 'utf8')
if (source.includes(marker)) throw new Error(`${marker}: patch is already applied`)
if (!source.includes('campaign-admin-layout-v457')) throw new Error(`${marker}: reviewed v457 parent marker is missing`)

const legacyCssSection = boundedSection(source, '  function adminCss() {', '  function localDateTimeValue', 'legacy campaign admin shell')
source = replaceSection(source, legacyCssSection, `  function adminCss() { return adminCssV429() }\n\n  function adminShell(session, content) { return adminShellV429(session, content, 'Salon de Lien') }\n\n`)

const legacyPageSection = boundedSection(source, '  async function adminPage(req, res, session) {', '  function adminIconV429', 'legacy campaign admin page')
source = replaceSection(source, legacyPageSection, `  async function adminPage(req, res, session) { return adminPageV429(req, res, session) }\n\n`)

const cssSection = boundedSection(source, '  function adminCssV429() {', '  function adminShellV429', 'campaign admin CSS')
const cssReplacement = replacementAdminCssV429.toString().replace('replacementAdminCssV429', 'adminCssV429') + '\n\n'
source = replaceSection(source, cssSection, cssReplacement)

const shellSection = boundedSection(source, '  function adminShellV429', '  async function adminPageV429', 'campaign admin shell')
const shellReplacement = replacementAdminShellV429.toString().replace('replacementAdminShellV429', 'adminShellV429') + '\n\n'
source = replaceSection(source, shellSection, shellReplacement)

const campaignHeaderToken = 'const content = `<section class="hero">'
const campaignHeaderCount = source.split(campaignHeaderToken).length - 1
if (campaignHeaderCount !== 1) throw new Error(`${marker}: expected one campaign page header, found ${campaignHeaderCount}`)
source = source.replace(campaignHeaderToken, 'const content = `<section class="campaign-page-header">')

const campaignIconToken = `      campaign: '<path d="M3 11v2a2 2 0 0 0 2 2h2l4 5h3l-2-5 7-3V6l-12 4H5a2 2 0 0 0-2 1Z"/><path d="M19 8a3 3 0 0 0 0-6"/>',`
const iconCount = source.split(campaignIconToken).length - 1
if (iconCount !== 1) throw new Error(`${marker}: expected one icon insertion point, found ${iconCount}`)
source = source.replace(campaignIconToken, `      logout: '<path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>',\n      chevronRight: '<path d="m9 18 6-6-6-6"/>',\n${campaignIconToken}`)

fs.writeFileSync(campaignPath, source)
console.log(`${marker} patched`)
