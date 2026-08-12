const path = require('path')
const http = require('http')
const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')

const dir = path.join(__dirname)

process.env.NODE_ENV = 'production'
process.chdir(__dirname)

const currentPort = parseInt(process.env.PORT, 10) || 3000
const hostname = process.env.HOSTNAME || '0.0.0.0'

let keepAliveTimeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT, 10)
const nextConfig = {"env":{},"webpack":null,"eslint":{"ignoreDuringBuilds":false},"typescript":{"ignoreBuildErrors":false,"tsconfigPath":"tsconfig.json"},"distDir":"./.next","cleanDistDir":true,"assetPrefix":"","cacheMaxMemorySize":52428800,"configOrigin":"next.config.mjs","useFileSystemPublicRoutes":true,"generateEtags":true,"pageExtensions":["tsx","ts","jsx","js"],"poweredByHeader":true,"compress":true,"analyticsId":"","images":{"deviceSizes":[640,750,828,1080,1200,1920,2048,3840],"imageSizes":[16,32,48,64,96,128,256,384],"path":"/_next/image","loader":"default","loaderFile":"","domains":[],"disableStaticImages":false,"minimumCacheTTL":60,"formats":["image/webp"],"dangerouslyAllowSVG":false,"contentSecurityPolicy":"script-src 'none'; frame-src 'none'; sandbox;","contentDispositionType":"inline","remotePatterns":[],"unoptimized":false},"devIndicators":{"buildActivity":true,"buildActivityPosition":"bottom-right"},"onDemandEntries":{"maxInactiveAge":60000,"pagesBufferLength":5},"amp":{"canonicalBase":""},"basePath":"","sassOptions":{},"trailingSlash":false,"i18n":null,"productionBrowserSourceMaps":false,"optimizeFonts":true,"excludeDefaultMomentLocales":true,"serverRuntimeConfig":{},"publicRuntimeConfig":{},"reactProductionProfiling":false,"reactStrictMode":null,"httpAgentOptions":{"keepAlive":true},"outputFileTracing":true,"staticPageGenerationTimeout":60,"swcMinify":true,"output":"standalone","modularizeImports":{"@mui/icons-material":{"transform":"@mui/icons-material/{{member}}"},"lodash":{"transform":"lodash/{{member}}"}},"experimental":{"multiZoneDraftMode":false,"prerenderEarlyExit":false,"serverMinification":true,"serverSourceMaps":false,"linkNoTouchStart":false,"caseSensitiveRoutes":false,"clientRouterFilter":true,"clientRouterFilterRedirects":false,"fetchCacheKeyPrefix":"","middlewarePrefetch":"flexible","optimisticClientCache":true,"manualClientBasePath":false,"cpus":31,"memoryBasedWorkersCount":false,"isrFlushToDisk":true,"workerThreads":false,"optimizeCss":false,"nextScriptWorkers":false,"scrollRestoration":false,"externalDir":false,"disableOptimizedLoading":false,"gzipSize":true,"craCompat":false,"esmExternals":true,"fullySpecified":false,"outputFileTracingRoot":"/app","swcTraceProfiling":false,"forceSwcTransforms":false,"largePageDataBytes":128000,"adjustFontFallbacks":false,"adjustFontFallbacksWithSizeAdjust":false,"typedRoutes":false,"instrumentationHook":true,"bundlePagesExternals":false,"parallelServerCompiles":false,"parallelServerBuildTraces":false,"ppr":false,"missingSuspenseWithCSRBailout":true,"optimizeServerReact":true,"useEarlyImport":false,"staleTimes":{"dynamic":30,"static":300},"optimizePackageImports":["lucide-react","date-fns","lodash-es","ramda","antd","react-bootstrap","ahooks","@ant-design/icons","@headlessui/react","@headlessui-float/react","@heroicons/react/20/solid","@heroicons/react/24/solid","@heroicons/react/24/outline","@visx/visx","@tremor/react","rxjs","@mui/material","@mui/icons-material","recharts","react-use","@material-ui/core","@material-ui/icons","@tabler/icons-react","mui-core","react-icons/ai","react-icons/bi","react-icons/bs","react-icons/cg","react-icons/ci","react-icons/di","react-icons/fa","react-icons/fa6","react-icons/fc","react-icons/fi","react-icons/gi","react-icons/go","react-icons/gr","react-icons/hi","react-icons/hi2","react-icons/im","react-icons/io","react-icons/io5","react-icons/lia","react-icons/lib","react-icons/lu","react-icons/md","react-icons/pi","react-icons/ri","react-icons/rx","react-icons/si","react-icons/sl","react-icons/tb","react-icons/tfi","react-icons/ti","react-icons/vsc","react-icons/wi"],"trustHostHeader":false,"isExperimentalCompile":false},"configFileName":"next.config.mjs"}

process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig)

const next = require('next')

if (
  Number.isNaN(keepAliveTimeout) ||
  !Number.isFinite(keepAliveTimeout) ||
  keepAliveTimeout < 0
) {
  keepAliveTimeout = undefined
}

const prisma = globalThis.__lienChatPrisma || new PrismaClient()
globalThis.__lienChatPrisma = prisma
const staff = [
  { key: 'tanizaki', name: '谷崎 太二' },
  { key: 'watanabe', name: '渡邊 浩明' },
  { key: 'asano', name: '浅野 清美' },
  { key: 'kobayashi', name: '小林 美奈子' },
  { key: 'kaori', name: 'kaori' },
]

function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map(v => v.trim()).filter(Boolean).map(v => {
    const i = v.indexOf('='); return [decodeURIComponent(v.slice(0, i)), decodeURIComponent(v.slice(i + 1))]
  }))
}
function verifySession(token, secret, version, roles) {
  if (!token || !secret || secret.length < 32) return null
  const parts = token.split('.'); if (parts.length !== 2) return null
  const signature = crypto.createHmac('sha256', secret).update(parts[0]).digest('base64url')
  if (signature.length !== parts[1].length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(parts[1]))) return null
  try {
    const value = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
    if (value.version !== version || !roles.includes(value.role) || value.expiresAt <= Math.floor(Date.now() / 1000)) return null
    return value
  } catch { return null }
}
async function chatSession(req, audience) {
  const jar = cookies(req)
  if (audience === 'customer') {
    const value = verifySession(jar.lien_customer_session, process.env.CUSTOMER_AUTH_SECRET || process.env.ADMIN_AUTH_SECRET, 1, ['CUSTOMER'])
    if (!value) return null
    const users = await prisma.$queryRawUnsafe('SELECT "id" FROM "AppUser" WHERE "id"=$1 AND "customerId"=$2 AND "organizationId"=$3 AND "role"=\'CUSTOMER\' AND "active"=true LIMIT 1', value.userId, value.customerId, value.organizationId)
    return users[0] ? value : null
  }
  const value = verifySession(jar.lien_admin_session, process.env.ADMIN_AUTH_SECRET, 2, ['ADMIN', 'STAFF'])
  if (!value || !value.organizationId) return null
  const users = await prisma.$queryRawUnsafe('SELECT "id", "displayName", "role" FROM "AppUser" WHERE "id"=$1 AND "organizationId"=$2 AND "active"=true LIMIT 1', value.userId, value.organizationId)
  return users[0] ? { ...value, displayName: users[0].displayName, role: users[0].role } : null
}
function canAccessThread(session, thread) {
  if (session.role === 'ADMIN') return true
  const selected = staff.find(s => s.key === thread.staffKey)
  return selected && [selected.name, selected.name.replace(/\s/g, '')].includes(String(session.displayName || '').replace(/\s/g, ''))
}
function json(res, status, value) {
  res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(value))
}
function htmlEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
function jsonArray(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (!value) return []
  try { const parsed = typeof value === 'string' ? JSON.parse(value) : value; return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [] } catch { return [] }
}
function customerIcon(name, className = '') {
  const paths = {
    home: '<path d="M3 10.5 12 3l9 7.5"></path><path d="M5 9.5V21h14V9.5"></path><path d="M9 21v-7h6v7"></path>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18"></path>',
    repeat: '<path d="m17 1 4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="m7 23-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path>',
    user: '<circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path>',
    ticket: '<path d="M2 9a3 3 0 0 0 0 6v4h20v-4a3 3 0 0 0 0-6V5H2z"></path><path d="M13 5v2M13 11v2M13 17v2"></path>',
    news: '<path d="m3 11 18-5v12L3 13z"></path><path d="M11.6 15.4 13 21H7l-1.7-7"></path>',
    stamp: '<path d="M7 13h10l2 5H5z"></path><path d="M9 13V8a3 3 0 0 1 6 0v5"></path><path d="M5 21h14"></path>',
    scissors: '<circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="m8.5 8.5 11 11M8.5 15.5 20 4"></path>',
    crown: '<path d="m3 7 4 4 5-7 5 7 4-4-2 12H5z"></path><path d="M5 22h14"></path>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8z"></path>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3 7 9 6 9-6"></path>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"></path>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path>',
    chevron: '<path d="m9 18 6-6-6-6"></path>',
    arrow: '<path d="m15 18-6-6 6-6"></path>',
    clock: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
    points: '<rect x="3" y="5" width="18" height="14" rx="3"></rect><path d="M8 10h8M8 14h5"></path>',
  }
  return `<svg class="icon ${htmlEscape(className)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.heart}</svg>`
}
function yen(value) { return `${Number(value || 0).toLocaleString('ja-JP')}円` }
function jpDate(value, withTime = false) {
  if (!value) return '未登録'
  return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(new Date(value))
}
function customerAppCss() {
  return `:root{--rose:#d85d79;--rose-dark:#bc4966;--rose-soft:#fceaf0;--ink:#332d2a;--muted:#81756f;--line:#eaded9;--paper:#fffdfb;--cream:#faf6f2}*{box-sizing:border-box}html{background:#efe9e5}body{margin:0;color:var(--ink);background:#efe9e5;font-family:-apple-system,BlinkMacSystemFont,"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;-webkit-font-smoothing:antialiased}a{color:inherit;text-decoration:none}button,input,select,textarea{font:inherit}.app{position:relative;width:100%;max-width:480px;min-height:100dvh;margin:0 auto;background:var(--paper);box-shadow:0 0 42px #55423918}.topbar{position:sticky;top:0;z-index:30;display:grid;grid-template-columns:48px 1fr 48px;align-items:center;height:68px;padding:0 12px;background:#fffdfbf2;border-bottom:1px solid var(--line);backdrop-filter:blur(12px)}.brand{text-align:center;line-height:1}.brand-script{font:italic 23px Georgia,"Times New Roman",serif;color:#715f58;letter-spacing:.02em}.brand-sub{display:block;margin-top:5px;font-size:8px;letter-spacing:.22em;color:#b7a39b;text-transform:uppercase}.icon-button{position:relative;display:grid;width:42px;height:42px;place-items:center;border:0;background:transparent;color:#75655e;border-radius:50%}.icon{width:22px;height:22px}.badge{position:absolute;top:4px;right:2px;display:grid;min-width:18px;height:18px;padding:0 5px;place-items:center;border:2px solid white;border-radius:99px;background:#d83f57;color:white;font-size:10px;font-weight:800}.content{padding-bottom:86px}.welcome{padding:14px 18px 12px}.welcome strong{display:block;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:16px;letter-spacing:.03em}.welcome span{display:block;margin-top:5px;color:var(--muted);font-size:11px}.hero{position:relative;height:192px;overflow:hidden;background:#ddd}.hero img{width:100%;height:100%;object-fit:cover;filter:saturate(.82) contrast(.96)}.hero:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,#33211999 0,#4028212e 62%,transparent)}.hero-copy{position:absolute;z-index:1;left:20px;bottom:24px;color:white;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:23px;line-height:1.55;letter-spacing:.12em;text-shadow:0 2px 12px #3a2219}.quick-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px}.quick-card{display:flex;min-height:112px;flex-direction:column;align-items:center;justify-content:center;border:1px solid #eee1dc;border-radius:10px;background:#fff;box-shadow:0 3px 10px #8b67500c;transition:.18s}.quick-card:active{transform:scale(.97);background:var(--rose-soft)}.quick-card .icon{width:30px;height:30px;color:#d16b82}.quick-card strong{margin-top:9px;font-size:11px;text-align:center}.quick-card small{margin-top:4px;color:#b8a8a1;font:7px Georgia,serif;letter-spacing:.1em}.section{padding:18px}.section+.section{border-top:8px solid var(--cream)}.section-head{display:flex;align-items:end;justify-content:space-between;margin-bottom:14px}.section-head h1,.section-head h2{margin:0;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:20px;letter-spacing:.04em}.section-head p{margin:4px 0 0;color:var(--muted);font-size:11px}.section-head a{color:var(--rose-dark);font-size:11px;font-weight:700}.status-card{display:block;border:1px solid #f0d8df;border-radius:14px;background:linear-gradient(135deg,#fff 0,#fff4f7 100%);padding:16px}.status-card .label{color:var(--rose-dark);font-size:11px;font-weight:700}.status-card strong{display:block;margin-top:7px;font-size:15px}.status-card p{margin:5px 0 0;color:var(--muted);font-size:11px}.metrics{display:grid;grid-template-columns:1fr 1fr;gap:9px}.metric{border:1px solid var(--line);border-radius:12px;padding:14px;background:#fff}.metric span{color:var(--muted);font-size:10px}.metric strong{display:block;margin-top:6px;font-family:Georgia,"Yu Mincho",serif;font-size:21px}.notice{display:flex;align-items:center;gap:12px;border:1px solid #eed8df;border-radius:12px;background:#fff8fa;padding:13px}.notice .icon{color:var(--rose)}.notice div{min-width:0;flex:1}.notice strong{font-size:12px}.notice p{overflow:hidden;margin:4px 0 0;color:var(--muted);font-size:10px;text-overflow:ellipsis;white-space:nowrap}.bottom-nav{position:fixed;z-index:40;right:0;bottom:0;left:0;margin:auto;display:grid;width:100%;max-width:480px;grid-template-columns:repeat(5,1fr);padding:7px 4px calc(7px + env(safe-area-inset-bottom));border-top:1px solid #e6d9d4;background:#fffdfbf5;box-shadow:0 -8px 22px #6d493c0d;backdrop-filter:blur(14px)}.bottom-link{display:flex;min-width:0;flex-direction:column;align-items:center;gap:3px;color:#a3948d;font-size:9px;font-weight:700}.bottom-link .icon{width:20px;height:20px}.bottom-link.active{color:var(--rose)}.page-title{padding:18px;border-bottom:1px solid var(--line);text-align:center}.page-title h1{margin:0;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:17px}.tabs{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;border-bottom:1px solid var(--line);background:white}.tab{padding:12px 5px;border-bottom:3px solid transparent;color:var(--muted);text-align:center;font-size:10px;font-weight:700}.tab.active{border-color:var(--rose);color:var(--rose-dark);background:#fff9fa}.ranking-intro{margin:16px 18px;padding:18px;border-radius:13px;background:linear-gradient(135deg,#fffaf0,#fff);text-align:center}.ranking-intro .laurel{color:#c9a044;font-family:Georgia,serif;font-size:13px}.ranking-intro h2{margin:5px 0;font-family:"Yu Mincho",serif;color:#9d7430;font-size:18px}.ranking-intro p{margin:0;color:var(--muted);font-size:10px}.product-list{padding:0 18px 22px}.product-row{display:grid;grid-template-columns:38px 68px 1fr 20px;align-items:center;gap:10px;min-height:106px;border-bottom:1px solid var(--line)}.rank{font:700 17px Georgia,serif;color:#8f8079;text-align:center}.rank.top{display:grid;width:29px;height:29px;place-items:center;border-radius:50%;background:#d9ae43;color:white}.product-art{position:relative;display:grid;width:58px;height:78px;place-items:end center;border-radius:20px 20px 9px 9px;background:linear-gradient(160deg,#765b85,#bea9c9 55%,#f2eafa);box-shadow:inset -8px 0 14px #ffffff45,0 5px 12px #6b536327;color:white;font:700 9px Georgia,serif;padding-bottom:10px}.product-art.jar{height:58px;border-radius:9px 9px 20px 20px}.product-meta h3{margin:0;font-size:12px;line-height:1.55}.product-meta p{display:-webkit-box;overflow:hidden;margin:5px 0 0;color:var(--muted);font-size:9px;line-height:1.5;-webkit-box-orient:vertical;-webkit-line-clamp:2}.tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}.tag{border:1px solid #ead5dc;border-radius:3px;padding:2px 5px;color:#a05568;font-size:8px}.detail-visual{display:flex;justify-content:center;padding:28px 18px 14px}.detail-visual .product-art{width:110px;height:155px;font-size:13px}.detail-card{padding:12px 22px 30px}.detail-card h1{margin:0;font-family:"Yu Mincho",serif;font-size:19px;line-height:1.5}.price{margin-top:10px;font-size:12px}.description{margin-top:18px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:16px 0;color:#5f5550;font-size:12px;line-height:1.9}.recommend{margin-top:18px}.recommend h2{font-size:13px}.recommend ul{padding-left:18px;color:var(--muted);font-size:11px;line-height:1.8}.primary,.secondary{display:flex;min-height:48px;align-items:center;justify-content:center;border-radius:6px;font-size:12px;font-weight:700}.primary{margin-top:16px;background:var(--rose);color:white}.secondary{margin-top:8px;border:1px solid #e6d1d7;background:#fff;color:var(--rose-dark)}.coupon-list{display:grid;gap:12px;padding:16px 18px}.coupon{position:relative;overflow:hidden;border:1px solid #f0d3dc;border-radius:13px;background:linear-gradient(135deg,#fff3f6,#fff);padding:16px;text-align:center}.coupon:before,.coupon:after{content:"";position:absolute;top:50%;width:16px;height:16px;border-radius:50%;background:var(--paper);transform:translateY(-50%)}.coupon:before{left:-8px}.coupon:after{right:-8px}.coupon small{color:var(--rose-dark);font-weight:800}.coupon h2{margin:7px 0 4px;font-family:"Yu Mincho",serif;font-size:17px}.coupon .benefit{color:#c34f6c;font:700 22px Georgia,serif}.coupon p{margin:5px 0;color:var(--muted);font-size:10px}.coupon a{display:block;margin-top:11px;border-radius:5px;background:var(--rose);padding:10px;color:white;font-size:11px;font-weight:700}.stamp-card{margin:18px;border:1px solid #ead0d8;border-radius:14px;background:linear-gradient(135deg,#fff4f7,#f7cad6);padding:18px}.stamp-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:9px;margin-top:16px}.stamp-dot{display:grid;aspect-ratio:1;place-items:center;border:2px solid #fff;border-radius:50%;background:#fff;color:#cbbbc0;font-size:10px}.stamp-dot.on{background:#d66782;color:white;box-shadow:0 3px 8px #a4445f2d}.menu-list{padding:8px 18px 24px}.menu-row{display:flex;min-height:62px;align-items:center;gap:13px;border-bottom:1px solid var(--line)}.menu-row>.icon{color:var(--rose);width:21px}.menu-row strong{flex:1;font-size:12px}.menu-row .chev{color:#b5a6a0;width:17px}@media(min-width:700px){body{padding:24px 0}.app{min-height:calc(100dvh - 48px);border-radius:24px;overflow:hidden}.bottom-nav{bottom:24px;border-radius:0 0 24px 24px}.topbar{border-radius:24px 24px 0 0}}`
}
function customerBottomNav(active) {
  const items = [['home','ホーム','/u/home'],['calendar','予約','/u/appointments'],['clock','履歴','/u/history'],['mail','メッセージ','/u/appointments?view=chat'],['menu','メニュー','/u/menu']]
  return `<nav class="bottom-nav" aria-label="メインメニュー">${items.map(([icon,label,href]) => `<a class="bottom-link ${active === label ? 'active' : ''}" href="${href}">${customerIcon(icon)}<span>${label}</span></a>`).join('')}</nav>`
}
function customerShell({ title, active = '', unread = 0, back = '', body }) {
  const left = back ? `<a class="icon-button" href="${back}" aria-label="戻る">${customerIcon('arrow')}</a>` : `<a class="icon-button" href="/u/menu" aria-label="メニュー">${customerIcon('menu')}</a>`
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#fffdfb"><title>${htmlEscape(title)} | Salon de Lien</title><style>${customerAppCss()}</style></head><body><div class="app"><header class="topbar">${left}<a class="brand" href="/u/home"><span class="brand-script">Salon de Lien</span><span class="brand-sub">Beauty Membership</span></a><a class="icon-button" href="/u/news" aria-label="お知らせ">${customerIcon('bell')}${unread ? `<span class="badge">${unread > 99 ? '99+' : unread}</span>` : ''}</a></header><main class="content">${body}</main>${customerBottomNav(active)}</div></body></html>`
}
async function customerAppData(session) {
  const now = new Date()
  const [customers, visits, appointments, pointAccounts, broadcasts, chatCounts] = await Promise.all([
    prisma.$queryRawUnsafe('SELECT "id","name","gender","profileImageUrl" FROM "Customer" WHERE "id"=$1 AND "organizationId"=$2 AND "deletedAt" IS NULL LIMIT 1', session.customerId, session.organizationId),
    prisma.$queryRawUnsafe('SELECT "visitedAt","performedStyle","stylistName" FROM "Visit" WHERE "customerId"=$1 ORDER BY "visitedAt" DESC LIMIT 1', session.customerId),
    prisma.$queryRawUnsafe('SELECT "id","scheduledAt","menu","staffName" FROM "Appointment" WHERE "customerId"=$1 AND "scheduledAt">=$2 AND "status" NOT IN (\'キャンセル\',\'無断キャンセル\',\'来店済み\') ORDER BY "scheduledAt" ASC LIMIT 1', session.customerId, now),
    prisma.$queryRawUnsafe('SELECT "availablePoints" FROM "CustomerPointAccount" WHERE "customerId"=$1 LIMIT 1', session.customerId),
    prisma.$queryRawUnsafe('SELECT r."readAt",b."title",b."body",b."couponEnabled",r."deliveredAt" FROM "CustomerBroadcastRecipient" r JOIN "CustomerBroadcast" b ON b."id"=r."broadcastId" WHERE r."customerId"=$1 AND b."status"=\'sent\' ORDER BY r."deliveredAt" DESC LIMIT 20', session.customerId),
    prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "ChatMessage" m JOIN "ChatThread" t ON t."id"=m."threadId" WHERE t."customerId"=$1 AND t."organizationId"=$2 AND m."senderType"=\'staff\' AND (t."customerLastReadAt" IS NULL OR m."createdAt">t."customerLastReadAt")', session.customerId, session.organizationId),
  ])
  return { customer: customers[0], visit: visits[0], appointment: appointments[0], points: pointAccounts[0]?.availablePoints || 0, broadcasts, unread: broadcasts.filter(v => !v.readAt).length + (chatCounts[0]?.count || 0) }
}
function sendCustomerHtml(res, html) {
  res.statusCode = 200; res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.end(html)
}
async function body(req) {
  let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 20000) throw Error('too_large') }
  return raw ? JSON.parse(raw) : {}
}
async function chatApi(req, res, url) {
  const audience = url.searchParams.get('audience') === 'staff' ? 'staff' : 'customer'
  const session = await chatSession(req, audience)
  if (!session) return json(res, 401, { error: 'ログインが必要です。' })
  if (req.method === 'GET') {
    let threads
    if (audience === 'customer') {
      threads = await prisma.$queryRawUnsafe('SELECT t.*, c."name" AS "customerName", (SELECT COUNT(*)::int FROM "ChatMessage" m WHERE m."threadId"=t."id" AND m."senderType"=\'staff\' AND (t."customerLastReadAt" IS NULL OR m."createdAt">t."customerLastReadAt")) AS "unreadCount" FROM "ChatThread" t JOIN "Customer" c ON c."id"=t."customerId" WHERE t."customerId"=$1 AND t."organizationId"=$2 ORDER BY t."updatedAt" DESC', session.customerId, session.organizationId)
    } else {
      threads = await prisma.$queryRawUnsafe('SELECT t.*, c."name" AS "customerName", (SELECT COUNT(*)::int FROM "ChatMessage" m WHERE m."threadId"=t."id" AND m."senderType"=\'customer\' AND (t."staffLastReadAt" IS NULL OR m."createdAt">t."staffLastReadAt")) AS "unreadCount" FROM "ChatThread" t JOIN "Customer" c ON c."id"=t."customerId" WHERE t."organizationId"=$1 ORDER BY t."updatedAt" DESC', session.organizationId)
      threads = threads.filter(t => canAccessThread(session, t))
    }
    const requested = url.searchParams.get('threadId')
    const thread = requested ? threads.find(t => t.id === requested) : threads[0]
    const messages = thread ? await prisma.$queryRawUnsafe('SELECT * FROM "ChatMessage" WHERE "threadId"=$1 ORDER BY "createdAt" ASC LIMIT 300', thread.id) : []
    if (thread) await prisma.$executeRawUnsafe(`UPDATE "ChatThread" SET "${audience === 'customer' ? 'customerLastReadAt' : 'staffLastReadAt'}"=CURRENT_TIMESTAMP WHERE "id"=$1`, thread.id)
    return json(res, 200, { threads, thread: thread || null, messages, staff })
  }
  if (req.method !== 'POST' || (req.headers.origin && ![req.headers.origin, `https://${req.headers.host}`, `http://${req.headers.host}`].includes(req.headers.origin))) return json(res, 403, { error: '不正なリクエストです。' })
  const data = await body(req)
  if (data.action === 'create' && audience === 'customer') {
    const target = staff.find(s => s.key === data.staffKey); const text = String(data.body || '').trim()
    if (!target || !text || text.length > 2000) return json(res, 400, { error: '担当者と相談内容を確認してください。' })
    const id = crypto.randomUUID(), messageId = crypto.randomUUID()
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe('INSERT INTO "ChatThread" ("id","organizationId","customerId","staffKey","staffName","customerLastReadAt","updatedAt") VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("customerId","staffKey") DO UPDATE SET "status"=\'open\', "updatedAt"=CURRENT_TIMESTAMP', id, session.organizationId, session.customerId, target.key, target.name)
      const rows = await tx.$queryRawUnsafe('SELECT "id" FROM "ChatThread" WHERE "customerId"=$1 AND "staffKey"=$2', session.customerId, target.key)
      await tx.$executeRawUnsafe('INSERT INTO "ChatMessage" ("id","threadId","senderType","senderUserId","body") VALUES ($1,$2,\'customer\',$3,$4)', messageId, rows[0].id, session.userId, text)
    })
    return json(res, 201, { success: true })
  }
  if (data.action === 'send') {
    const text = String(data.body || '').trim(); if (!text || text.length > 2000) return json(res, 400, { error: 'メッセージは1〜2,000文字で入力してください。' })
    const rows = await prisma.$queryRawUnsafe('SELECT * FROM "ChatThread" WHERE "id"=$1 AND "organizationId"=$2 LIMIT 1', String(data.threadId || ''), session.organizationId)
    const thread = rows[0]
    if (!thread || (audience === 'customer' ? thread.customerId !== session.customerId : !canAccessThread(session, thread))) return json(res, 404, { error: '会話が見つかりません。' })
    await prisma.$transaction([
      prisma.$executeRawUnsafe('INSERT INTO "ChatMessage" ("id","threadId","senderType","senderUserId","body") VALUES ($1,$2,$3,$4,$5)', crypto.randomUUID(), thread.id, audience, session.userId, text),
      prisma.$executeRawUnsafe(`UPDATE "ChatThread" SET "updatedAt"=CURRENT_TIMESTAMP, "${audience === 'customer' ? 'customerLastReadAt' : 'staffLastReadAt'}"=CURRENT_TIMESTAMP WHERE "id"=$1`, thread.id),
    ])
    return json(res, 201, { success: true })
  }
  return json(res, 400, { error: '操作を確認してください。' })
}
function chatHtmlBase(audience) {
  const customer = audience === 'customer'
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${customer ? 'スタッフへ相談' : 'チャット通知'} | Salon de Lien</title><style>*{box-sizing:border-box}body{margin:0;background:#fbf7f0;color:#2f2a25;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}header{position:sticky;top:0;z-index:3;background:#fffdf9eF;border-bottom:1px solid #eadfd4;padding:14px 18px;display:flex;justify-content:space-between;align-items:center}a{color:#8f4f42;font-weight:700;text-decoration:none}.wrap{max-width:1100px;margin:auto;padding:22px 14px}.hero,.panel{background:white;border:1px solid #e8ded2;border-radius:24px;padding:20px;box-shadow:0 8px 24px #6c554314}.hero h1{margin:4px 0}.grid{display:grid;grid-template-columns:300px 1fr;gap:16px;margin-top:16px}.threads{display:grid;gap:8px}.thread{width:100%;text-align:left;border:1px solid #e8ded2;background:#fff;padding:13px;border-radius:15px}.thread.active{background:#8f4f42;color:white}.badge{background:#c3483f;color:white;border-radius:99px;padding:2px 7px;font-size:11px}.messages{height:48vh;overflow:auto;display:flex;flex-direction:column;gap:10px;padding:8px}.msg{max-width:78%;padding:11px 14px;border-radius:16px;background:#f1ebe5;white-space:pre-wrap}.msg.mine{align-self:flex-end;background:#8f4f42;color:white}.send{display:flex;gap:8px;margin-top:12px}textarea,select{width:100%;border:1px solid #d8cbbf;border-radius:13px;padding:12px;font:inherit}button{cursor:pointer}.primary{border:0;border-radius:13px;background:#8f4f42;color:white;font-weight:700;padding:12px 18px}.new{display:grid;gap:10px;margin-bottom:14px}.empty{text-align:center;color:#7c7168;padding:40px 10px}@media(max-width:700px){.grid{grid-template-columns:1fr}.messages{height:42vh}.threads{max-height:220px;overflow:auto}}</style></head><body><header><a href="${customer ? '/u/appointments' : '/admin/appointments'}">← ${customer ? 'サロン予約へ戻る' : '管理画面へ戻る'}</a><strong>${customer ? '通知・チャット' : '顧客チャット通知'}</strong></header><main class="wrap"><section class="hero"><small>Salon de Lien Chat</small><h1>${customer ? 'スタッフへチャット相談' : 'お客様からの相談'}</h1><p>${customer ? '担当スタッフを選び、予約前の相談や髪のお悩みを送れます。' : '未読の相談を確認し、担当スタッフとして返信できます。'}</p></section><div class="grid"><aside class="panel">${customer ? '<div class="new"><select id="staff"></select><textarea id="newBody" rows="3" placeholder="相談内容を入力"></textarea><button class="primary" id="create">相談を送る</button></div>' : ''}<div id="threads" class="threads"></div></aside><section class="panel"><h2 id="title">会話を選択</h2><div id="messages" class="messages empty">メッセージはまだありません</div><div class="send"><textarea id="body" rows="2" placeholder="メッセージを入力"></textarea><button class="primary" id="send">送信</button></div><p id="error" style="color:#a02f28"></p></section></div></main><script>const audience='${audience}';let current=null;const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));async function api(method,data,threadId){const r=await fetch('/api/lien-chat?audience='+audience+(threadId?'&threadId='+encodeURIComponent(threadId):''),{method,headers:{'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});const j=await r.json();if(!r.ok)throw Error(j.error||'通信に失敗しました');return j}async function load(id){try{const d=await api('GET',null,id);current=d.thread?.id||null;if(document.querySelector('#staff'))document.querySelector('#staff').innerHTML=d.staff.map(s=>'<option value="'+s.key+'">'+esc(s.name)+'</option>').join('');document.querySelector('#threads').innerHTML=d.threads.map(t=>'<button class="thread '+(t.id===current?'active':'')+'" data-id="'+t.id+'"><strong>'+esc(audience==='customer'?t.staffName:t.customerName)+'</strong> '+(t.unreadCount?'<span class="badge">'+t.unreadCount+'</span>':'')+'<br><small>'+esc(t.staffName)+'</small></button>').join('')||'<div class="empty">会話はまだありません</div>';document.querySelectorAll('.thread').forEach(b=>b.onclick=()=>load(b.dataset.id));document.querySelector('#title').textContent=d.thread?(audience==='customer'?d.thread.staffName:d.thread.customerName+' → '+d.thread.staffName):'会話を選択';const box=document.querySelector('#messages');box.className='messages'+(d.messages.length?'':' empty');box.innerHTML=d.messages.map(m=>'<div class="msg '+(m.senderType===audience?'mine':'')+'">'+esc(m.body)+'</div>').join('')||'メッセージはまだありません';box.scrollTop=box.scrollHeight;document.querySelector('#error').textContent=''}catch(e){document.querySelector('#error').textContent=e.message}}document.querySelector('#send').onclick=async()=>{const b=document.querySelector('#body');if(!current||!b.value.trim())return;try{await api('POST',{action:'send',threadId:current,body:b.value});b.value='';await load(current)}catch(e){document.querySelector('#error').textContent=e.message}};if(document.querySelector('#create'))document.querySelector('#create').onclick=async()=>{const b=document.querySelector('#newBody');try{await api('POST',{action:'create',staffKey:document.querySelector('#staff').value,body:b.value});b.value='';await load()}catch(e){document.querySelector('#error').textContent=e.message}};load();setInterval(()=>load(current),15000)</script></body></html>`
}

function chatHtml(audience, session) {
  let html = chatHtmlBase(audience)
  if (audience === 'customer') return html
  const displayName = String(session?.displayName || (session?.role === 'ADMIN' ? '管理者' : 'スタッフ')).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
  const icon = (name, content, className = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-${name} ${className}" aria-hidden="true">${content}</svg>`
  const icons = {
    calendar: icon('calendar-days', '<path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path><path d="M8 14h.01"></path><path d="M12 14h.01"></path><path d="M16 14h.01"></path><path d="M8 18h.01"></path><path d="M12 18h.01"></path><path d="M16 18h.01"></path>'),
    users: icon('users-round', '<path d="M18 21a8 8 0 0 0-16 0"></path><circle cx="10" cy="8" r="5"></circle><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"></path>'),
    package: icon('package-search', '<path d="M12 22V12"></path><path d="M20.27 18.27 22 20"></path><path d="M21 10.498V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.729l7 4a2 2 0 0 0 2 .001l.98-.559"></path><path d="M3.29 7 12 12l8.71-5"></path><path d="m7.5 4.27 8.997 5.148"></path><circle cx="18.5" cy="16.5" r="2.5"></circle>'),
    images: icon('images', '<path d="m22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16"></path><path d="M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2"></path><circle cx="13" cy="7" r="1" fill="currentColor"></circle><rect x="8" y="2" width="14" height="14" rx="2"></rect>'),
    chart: icon('chart-column', '<path d="M3 3v16a2 2 0 0 0 2 2h16"></path><path d="M18 17V9"></path><path d="M13 17V5"></path><path d="M8 17v-3"></path>'),
    search: icon('search', '<circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path>'),
    command: icon('command', '<path d="M18 9a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3Z"></path>'),
    settings: icon('settings', '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"></path><circle cx="12" cy="12" r="3"></circle>'),
    user: icon('user-round', '<circle cx="12" cy="8" r="5"></circle><path d="M20 21a8 8 0 0 0-16 0"></path>'),
    message: icon('message-square', '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>'),
    megaphone: icon('megaphone', '<path d="m3 11 18-5v12L3 14v-3z"></path><path d="M11.6 16.8 13 21H7l-1.8-6"></path>')
  }
  const shellCss = `<style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap');body{display:flex;min-height:100vh;background:#faf6ef;font-family:"Noto Sans JP","Zen Kaku Gothic New","Hiragino Sans","Yu Gothic UI",system-ui,sans-serif}.admin-sidebar{position:fixed;inset:0 auto 0 0;width:255px;background:#fffdf9;border-right:1px solid #e5d8cb;z-index:20;display:flex;flex-direction:column}.admin-brand{height:77px;padding:15px 16px;display:flex;align-items:center;gap:11px;border-bottom:1px solid #eadfd4}.brand-logo{width:42px;height:42px;border-radius:50%;object-fit:cover;border:1px solid #dfcdbd}.admin-brand b{display:block;font-size:17px;font-weight:700;color:#2d201b}.admin-brand small{display:block;color:#806e64;font-size:11px;margin-top:2px}.admin-nav{display:grid;gap:5px;padding:17px 10px}.admin-nav a{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;color:#66544b;font-size:14px}.admin-nav a:hover{background:#f6ede7}.admin-nav a.active{background:#9c5344;color:#fff;box-shadow:0 2px 5px #6b39262b}.nav-icon{width:18px;height:18px;display:inline-flex;opacity:.8}.nav-icon svg,.customer-tabs svg,.top-search svg,.shortcut svg,.admin-user svg{width:16px;height:16px;flex:0 0 auto}.admin-sidebar-footer{margin:auto 12px 14px;border-radius:18px;overflow:hidden;background:#e9ded2;padding:70px 12px 12px;color:#fff;font-size:12px;font-weight:700;background:linear-gradient(0deg,#5d4037aa,#ffffff05),url('/brand/salon-interior.jpg') center/cover}.admin-stage{width:100%;min-width:0;margin-left:255px}.admin-topbar{height:70px;background:#fffdf9;border-bottom:1px solid #e6d9cc;display:flex;align-items:center;gap:18px;padding:0 26px;position:sticky;top:0;z-index:10}.admin-topbar-title{min-width:145px}.admin-topbar-title small{display:block;color:#9a7c6e;font-size:11px}.admin-topbar-title b{font-size:14px}.top-search{height:44px;flex:1;max-width:580px;border:1px solid #e3d4c7;border-radius:999px;background:white;color:#aa9a91;padding:0 18px;display:flex;align-items:center;gap:10px}.admin-user{margin-left:auto;display:flex;align-items:center;gap:10px}.admin-user a,.shortcut{display:flex;align-items:center;gap:7px;border:1px solid #e1d2c5;border-radius:999px;padding:9px 13px;background:white;color:#5d4037;font-size:13px}.admin-user .gear{width:42px;height:42px;justify-content:center;padding:0}.customer-tabs{max-width:1216px;margin:20px auto 0;display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:4px;border:1px solid #e3d4c7;border-radius:18px;background:white}.customer-tabs a{min-height:46px;display:flex;align-items:center;justify-content:center;gap:8px;border-radius:14px;color:#6f5d54;font-size:14px}.customer-tabs a.active{background:#9c5344;color:white}.chat-local-header{display:none!important}.admin-stage .wrap{max-width:1216px;padding:24px 0 36px}.admin-stage .hero{border-radius:22px;background:linear-gradient(135deg,#fffdf9,#f7efe7);padding:25px 28px}.admin-stage .hero h1{font-family:inherit;font-size:30px;font-weight:700}.admin-stage .panel{border-radius:20px;box-shadow:0 8px 24px #5c403414}.admin-stage .grid{grid-template-columns:310px minmax(0,1fr);gap:16px}.admin-stage .messages{height:54vh}.admin-stage .send textarea{min-height:58px}.admin-stage .primary{background:#9c5344}@media(max-width:900px){.admin-sidebar{width:220px}.admin-stage{margin-left:220px}.top-search{display:none}}@media(max-width:700px){body{display:block}.admin-sidebar{display:none}.admin-stage{margin-left:0}.admin-topbar{height:62px;padding:0 12px}.admin-topbar-title small,.shortcut{display:none}.admin-user span{display:none}.customer-tabs{margin:10px 10px 0}.admin-stage .wrap{padding:14px 10px}.admin-stage .grid{grid-template-columns:1fr}}
  </style>`
  const shell = `<aside class="admin-sidebar"><div class="admin-brand"><img class="brand-logo" src="/_next/image?url=%2Fbrand%2Fsalon-interior-illustrated.png&w=3840&q=75" alt="Salon de Lien"><div><b>Salon de Lien</b><small>既存客を動かす美容室CRM</small></div></div><nav class="admin-nav" aria-label="管理画面ナビゲーション"><a href="/admin/appointments"><span class="nav-icon">${icons.calendar}</span>予約カレンダー</a><a class="active" href="/admin/customers"><span class="nav-icon">${icons.users}</span>顧客・チャット・配信</a><a href="/admin/products?section=menus"><span class="nav-icon">${icons.package}</span>メニュー・商品棚・集計</a><a href="/admin/community"><span class="nav-icon">${icons.images}</span>スタイル共有</a><a href="/admin/owner-analytics"><span class="nav-icon">${icons.chart}</span>経営分析</a></nav><div class="admin-sidebar-footer">今日の接客を、次の関係へ。</div></aside><div class="admin-stage"><div class="admin-topbar"><div class="admin-topbar-title"><small>Salon de Lien</small><b>顧客・チャット・配信</b></div><div class="top-search">${icons.search}<span>顧客名・電話・メモで検索</span></div><span class="shortcut">${icons.command}<span>Ctrl K</span></span><div class="admin-user"><a href="/admin/account" aria-label="アカウント設定">${icons.user}<span>${displayName}</span></a><a class="gear" href="/admin/settings" aria-label="設定">${icons.settings}</a></div></div><nav class="customer-tabs" aria-label="顧客ページ切替"><a href="/admin/customers">${icons.users}<span>顧客管理</span></a><a class="active" href="/admin/customers/messages/chat">${icons.message}<span>チャット</span></a><a href="/admin/customers/messages">${icons.megaphone}<span>配信</span></a></nav>`
  html = html.replace('</head>', `${shellCss}</head>`).replace('<body>', `<body>${shell}`).replace('<header>', '<header class="chat-local-header">').replace('</body>', '</div></body>')
  return html
}

async function chatForm(req, res) {
  const session = await chatSession(req, 'staff')
  if (!session) { res.statusCode = 302; res.setHeader('Location', '/admin/login'); return res.end() }
  let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 20000) throw Error('too_large') }
  const form = new URLSearchParams(raw)
  const threadId = String(form.get('threadId') || '')
  const customerId = String(form.get('customerId') || '')
  const text = String(form.get('body') || '').trim()
  let rows = threadId ? await prisma.$queryRawUnsafe('SELECT * FROM "ChatThread" WHERE "id"=$1 AND "organizationId"=$2 LIMIT 1', threadId, session.organizationId) : []
  let thread = rows[0]
  if (!thread && customerId && text && text.length <= 2000) {
    const customers = await prisma.$queryRawUnsafe('SELECT "id" FROM "Customer" WHERE "id"=$1 AND "organizationId"=$2 AND "deletedAt" IS NULL LIMIT 1', customerId, session.organizationId)
    if (customers[0]) {
      const matchedStaff = staff.find(s => String(session.displayName || '').replace(/\s/g, '').includes(s.name.replace(/\s/g, ''))) || staff[0]
      await prisma.$executeRawUnsafe('INSERT INTO "ChatThread" ("id","organizationId","customerId","staffKey","staffName","staffLastReadAt","updatedAt") VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("customerId","staffKey") DO UPDATE SET "status"=\'open\', "updatedAt"=CURRENT_TIMESTAMP', crypto.randomUUID(), session.organizationId, customerId, matchedStaff.key, matchedStaff.name)
      rows = await prisma.$queryRawUnsafe('SELECT * FROM "ChatThread" WHERE "customerId"=$1 AND "staffKey"=$2 LIMIT 1', customerId, matchedStaff.key)
      thread = rows[0]
    }
  }
  if (!thread || !canAccessThread(session, thread) || !text || text.length > 2000) {
    res.statusCode = 303; res.setHeader('Location', `/admin/customers/messages/chat?${threadId ? `threadId=${encodeURIComponent(threadId)}` : `customerId=${encodeURIComponent(customerId)}`}`); return res.end()
  }
  await prisma.$transaction([
    prisma.$executeRawUnsafe('INSERT INTO "ChatMessage" ("id","threadId","senderType","senderUserId","body") VALUES ($1,$2,\'staff\',$3,$4)', crypto.randomUUID(), thread.id, session.userId, text),
    prisma.$executeRawUnsafe('UPDATE "ChatThread" SET "updatedAt"=CURRENT_TIMESTAMP, "staffLastReadAt"=CURRENT_TIMESTAMP WHERE "id"=$1', thread.id),
  ])
  res.statusCode = 303; res.setHeader('Location', `/admin/customers/messages/chat?threadId=${encodeURIComponent(thread.id)}`); return res.end()
}

async function customerChatForm(req, res) {
  const session = await chatSession(req, 'customer')
  if (!session) { res.statusCode = 302; res.setHeader('Location', '/u/login'); return res.end() }
  let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 20000) throw Error('too_large') }
  const form = new URLSearchParams(raw)
  const text = String(form.get('body') || '').trim()
  const staffKey = String(form.get('staffKey') || '')
  let threadId = String(form.get('threadId') || '')
  if (!text || text.length > 2000) { res.statusCode = 303; res.setHeader('Location', '/u/appointments?view=chat'); return res.end() }
  let rows = threadId ? await prisma.$queryRawUnsafe('SELECT * FROM "ChatThread" WHERE "id"=$1 AND "customerId"=$2 AND "organizationId"=$3 LIMIT 1', threadId, session.customerId, session.organizationId) : []
  if (!rows[0]) {
    const target = staff.find(s => s.key === staffKey) || staff[0]
    await prisma.$executeRawUnsafe('INSERT INTO "ChatThread" ("id","organizationId","customerId","staffKey","staffName","customerLastReadAt","updatedAt") VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("customerId","staffKey") DO UPDATE SET "status"=\'open\', "updatedAt"=CURRENT_TIMESTAMP', crypto.randomUUID(), session.organizationId, session.customerId, target.key, target.name)
    rows = await prisma.$queryRawUnsafe('SELECT * FROM "ChatThread" WHERE "customerId"=$1 AND "staffKey"=$2 LIMIT 1', session.customerId, target.key)
  }
  const thread = rows[0]
  await prisma.$transaction([
    prisma.$executeRawUnsafe('INSERT INTO "ChatMessage" ("id","threadId","senderType","senderUserId","body") VALUES ($1,$2,\'customer\',$3,$4)', crypto.randomUUID(), thread.id, session.userId, text),
    prisma.$executeRawUnsafe('UPDATE "ChatThread" SET "updatedAt"=CURRENT_TIMESTAMP, "customerLastReadAt"=CURRENT_TIMESTAMP WHERE "id"=$1', thread.id),
  ])
  res.statusCode = 303; res.setHeader('Location', `/u/appointments?view=chat&threadId=${encodeURIComponent(thread.id)}`); return res.end()
}

async function unreadChatCount(req, audience) {
  const session = await chatSession(req, audience)
  if (!session) return 0
  if (audience === 'customer') {
    const rows = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "ChatMessage" m JOIN "ChatThread" t ON t."id"=m."threadId" WHERE t."customerId"=$1 AND t."organizationId"=$2 AND m."senderType"=\'staff\' AND (t."customerLastReadAt" IS NULL OR m."createdAt">t."customerLastReadAt")', session.customerId, session.organizationId)
    return rows[0]?.count || 0
  }
  let threads = await prisma.$queryRawUnsafe('SELECT t.*, (SELECT COUNT(*)::int FROM "ChatMessage" m WHERE m."threadId"=t."id" AND m."senderType"=\'customer\' AND (t."staffLastReadAt" IS NULL OR m."createdAt">t."staffLastReadAt")) AS "unreadCount" FROM "ChatThread" t WHERE t."organizationId"=$1', session.organizationId)
  threads = threads.filter(t => canAccessThread(session, t))
  return threads.reduce((sum, t) => sum + (t.unreadCount || 0), 0)
}

async function ensureLienEnhancementTables() {
  await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "StaffProfileSetting" ("id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "userId" TEXT NOT NULL, "introduction" TEXT NOT NULL DEFAULT \'\', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE("organizationId", "userId"))')
  await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "StaffNotificationState" ("userId" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "appointmentsReadAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)')
  await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "BookingCapacityOverride" ("id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "date" TEXT NOT NULL, "slotStart" INTEGER NOT NULL, "remaining" INTEGER NOT NULL, "updatedByUserId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE("organizationId", "date", "slotStart"))')
  await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "CustomerRealName" ("customerId" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "realName" TEXT NOT NULL, "updatedByUserId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)')
}

async function capacityOverride(req, res) {
  const session = await chatSession(req, 'staff')
  if (!session) return json(res, 401, { error: 'ログインが必要です。' })
  await ensureLienEnhancementTables()
  if (req.method === 'GET') {
    const date = new URL(req.url, 'http://localhost').searchParams.get('date') || ''
    const rows = await prisma.$queryRawUnsafe('SELECT "slotStart","remaining" FROM "BookingCapacityOverride" WHERE "organizationId"=$1 AND "date"=$2 ORDER BY "slotStart"', session.organizationId, date)
    return json(res, 200, { overrides: rows })
  }
  const data = await body(req), date = String(data.date || ''), slotStart = Number(data.slotStart), remaining = Number(data.remaining)
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(slotStart) || slotStart < 0 || slotStart > 1440 || !Number.isInteger(remaining) || remaining < 0 || remaining > 99) return json(res, 400, { error: '受付数を確認してください。' })
  await prisma.$executeRawUnsafe('INSERT INTO "BookingCapacityOverride" ("id","organizationId","date","slotStart","remaining","updatedByUserId","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP) ON CONFLICT ("organizationId","date","slotStart") DO UPDATE SET "remaining"=EXCLUDED."remaining","updatedByUserId"=EXCLUDED."updatedByUserId","updatedAt"=CURRENT_TIMESTAMP', crypto.randomUUID(), session.organizationId, date, slotStart, remaining, session.userId)
  return json(res, 200, { success: true })
}

async function customerRealName(req, res) {
  const session = await chatSession(req, 'staff')
  if (!session) { res.statusCode = 302; res.setHeader('Location', '/admin/login'); return res.end() }
  await ensureLienEnhancementTables()
  let raw = ''; for await (const chunk of req) raw += chunk
  const form = new URLSearchParams(raw), customerId = String(form.get('customerId') || ''), realName = String(form.get('realName') || '').trim().slice(0, 100)
  const found = await prisma.$queryRawUnsafe('SELECT "id" FROM "Customer" WHERE "id"=$1 AND "organizationId"=$2 AND "deletedAt" IS NULL LIMIT 1', customerId, session.organizationId)
  if (!found[0] || !realName) { res.statusCode = 303; res.setHeader('Location', `/admin/customers/${encodeURIComponent(customerId)}?realName=invalid`); return res.end() }
  await prisma.$executeRawUnsafe('INSERT INTO "CustomerRealName" ("customerId","organizationId","realName","updatedByUserId","updatedAt") VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP) ON CONFLICT ("customerId") DO UPDATE SET "realName"=EXCLUDED."realName","updatedByUserId"=EXCLUDED."updatedByUserId","updatedAt"=CURRENT_TIMESTAMP', customerId, session.organizationId, realName, session.userId)
  res.statusCode = 303; res.setHeader('Location', `/admin/customers/${encodeURIComponent(customerId)}?realName=saved`); res.end()
}

async function customerHomePage(res, session) {
  const data = await customerAppData(session)
  if (!data.customer) { res.statusCode = 404; return res.end('Not found') }
  const name = htmlEscape(data.customer.name)
  const quick = [
    ['calendar','予約する','RESERVE','/u/appointments'],
    ['repeat','前回と同じ予約','QUICK RESERVE','/u/appointments?repeat=last'],
    ['user','マイページ','MY PAGE','/u/profile'],
    ['ticket','クーポン','COUPON','/u/coupons'],
    ['news','お知らせ','NEWS','/u/news'],
    ['stamp','スタンプカード','STAMP CARD','/u/stamps'],
    ['scissors','ヘアスタイル','STYLE','/u/community'],
    ['crown','私に合うアイテム','ITEM RANKING','/u/catalog'],
    ['heart','お客様の声','IMPRESSION','/u/reviews'],
  ]
  const body = `<section class="welcome"><strong>${name} 様</strong><span>いつもご来店ありがとうございます</span></section><section class="hero"><img src="/brand/salon-interior-illustrated.png" alt="Salon de Lien 店内"><div class="hero-copy">あたらしい、<br>美しさを大切に。</div></section><section class="quick-grid" aria-label="サービス一覧">${quick.map(([icon,label,en,href]) => `<a class="quick-card" href="${href}">${customerIcon(icon)}<strong>${label}</strong><small>${en}</small></a>`).join('')}</section>${data.appointment ? `<section class="section"><div class="section-head"><div><h2>次回のご予約</h2><p>ご来店をお待ちしております</p></div><a href="/u/appointments">詳細</a></div><a class="status-card" href="/u/appointments"><span class="label">UPCOMING RESERVATION</span><strong>${htmlEscape(jpDate(data.appointment.scheduledAt, true))}</strong><p>${htmlEscape(data.appointment.menu || 'メニュー相談')} / ${htmlEscape(data.appointment.staffName || '担当フリー')}</p></a></section>` : ''}<section class="section"><div class="section-head"><div><h2>会員情報</h2><p>Salon de Lien メンバーシップ</p></div></div><div class="metrics"><a class="metric" href="/u/points"><span>利用可能ポイント</span><strong>${Number(data.points).toLocaleString('ja-JP')}<small> pt</small></strong></a><a class="metric" href="/u/history"><span>前回来店</span><strong style="font-size:14px">${htmlEscape(jpDate(data.visit?.visitedAt))}</strong></a></div>${data.broadcasts[0] ? `<a class="notice" href="/u/news">${customerIcon('news')}<div><strong>${htmlEscape(data.broadcasts[0].title)}</strong><p>${htmlEscape(data.broadcasts[0].body)}</p></div>${customerIcon('chevron')}</a>` : ''}</section>`
  sendCustomerHtml(res, customerShell({ title: 'ホーム', active: 'ホーム', unread: data.unread, body }))
}

async function customerCatalogPage(res, session, productId) {
  const data = await customerAppData(session)
  const products = await prisma.$queryRawUnsafe('SELECT p."id",p."manufacturerName",p."name",p."category",p."retailPrice",p."concernTags",p."description",p."alternativeRecommendation",COALESCE(SUM(sl."quantity"),0)::int AS "soldCount" FROM "Product" p LEFT JOIN "ProductSaleLine" sl ON sl."productId"=p."id" WHERE p."organizationId"=$1 AND p."active"=true AND p."salesSuspended"=false GROUP BY p."id" ORDER BY "soldCount" DESC,p."updatedAt" DESC LIMIT 40', session.organizationId)
  if (productId) {
    const product = products.find(p => p.id === productId)
    if (!product) { res.statusCode = 404; return res.end('Not found') }
    const tags = jsonArray(product.concernTags)
    const alternatives = products.filter(p => p.id !== product.id && jsonArray(p.concernTags).some(t => tags.includes(t))).sort((a,b) => jsonArray(b.concernTags).filter(t => tags.includes(t)).length - jsonArray(a.concernTags).filter(t => tags.includes(t)).length).slice(0,3)
    const body = `<div class="page-title"><h1>アイテム詳細</h1></div><div class="detail-visual"><div class="product-art">${htmlEscape(product.manufacturerName.slice(0,8))}</div></div><article class="detail-card"><h1>${htmlEscape(product.name)}</h1><div class="tags">${[product.category,...tags].filter(Boolean).map(t => `<span class="tag">${htmlEscape(t)}</span>`).join('')}</div><p class="price">${yen(product.retailPrice)}（税込）</p><div class="description">${htmlEscape(product.description || 'サロンで髪の状態を確認し、使い方と使用量をご案内します。')}</div><section class="recommend"><h2>こんなお悩みにおすすめ</h2><ul>${(tags.length ? tags : ['毎日のホームケア','髪のまとまり']).map(t => `<li>${htmlEscape(t)}が気になる方</li>`).join('')}</ul></section>${alternatives.length ? `<section class="recommend"><h2>合わない場合の代替アイテム</h2><ul>${alternatives.map(p => `<li><a href="/u/catalog/${encodeURIComponent(p.id)}">${htmlEscape(p.name)}</a></li>`).join('')}</ul></section>` : ''}<a class="primary" href="/u/appointments">次回来店時に取り置きを相談</a><a class="secondary" href="/u/appointments?view=chat">スタッフにチャットで相談</a></article>`
    return sendCustomerHtml(res, customerShell({ title: product.name, unread: data.unread, back: '/u/catalog', body }))
  }
  const category = ['総合','ヘアケア','スタイリング','年代別']
  const body = `<div class="page-title"><h1>私に合うアイテムランキング</h1></div><section class="ranking-intro"><div class="laurel">❧ 今月の ❧</div><h2>お客様愛用ランキング</h2><p>実際の購入データと髪のお悩みタグからご紹介</p></section><nav class="tabs">${category.map((v,i) => `<span class="tab ${i === 0 ? 'active' : ''}">${v}</span>`).join('')}</nav><section class="product-list">${products.length ? products.map((p,i) => { const tags = jsonArray(p.concernTags).slice(0,2); return `<a class="product-row" href="/u/catalog/${encodeURIComponent(p.id)}"><span class="rank ${i < 3 ? 'top' : ''}">${i+1}</span><span class="product-art ${i % 3 === 1 ? 'jar' : ''}">${htmlEscape(p.manufacturerName.slice(0,5))}</span><span class="product-meta"><h3>${htmlEscape(p.name)}</h3><p>${htmlEscape(p.description || `${p.category || 'ヘアケア'}のためのサロン専売アイテム`)}</p><span class="tags">${tags.map(t => `<span class="tag">${htmlEscape(t)}</span>`).join('')}</span></span>${customerIcon('chevron')}</a>` }).join('') : '<p style="padding:30px;text-align:center;color:#81756f">販売中の商品はありません</p>'}</section>`
  sendCustomerHtml(res, customerShell({ title: 'アイテムランキング', unread: data.unread, back: '/u/home', body }))
}

async function customerCouponsPage(res, session) {
  const data = await customerAppData(session), now = new Date()
  const [coupons, issues] = await Promise.all([
    prisma.$queryRawUnsafe('SELECT "id","title","description","targetMenu","discountType","discountValue","validUntil","couponCode" FROM "Coupon" WHERE "customerId"=$1 AND "status"=\'issued\' AND "validUntil">=$2 ORDER BY "validUntil" ASC LIMIT 30', session.customerId, now),
    prisma.$queryRawUnsafe('SELECT "id",\'限定クーポン\' AS title,"discountRate","targetMenusJson","expiresAt" AS "validUntil","couponCode" FROM "CouponIssue" WHERE "customerId"=$1 AND "status"=\'issued\' AND "expiresAt">=$2 ORDER BY "expiresAt" ASC LIMIT 30', session.customerId, now),
  ])
  const rows = [...coupons.map(c => ({...c, benefit: `${c.discountValue}${String(c.discountType).includes('%') ? '%OFF' : ''}`, menu: c.targetMenu})), ...issues.map(c => ({...c, benefit: `${c.discountRate}%OFF`, menu: jsonArray(c.targetMenusJson).join('・')}))]
  const body = `<div class="page-title"><h1>クーポン一覧</h1></div><nav class="tabs"><span class="tab active">すべて</span><span class="tab">おすすめ</span><span class="tab">期間限定</span><span class="tab">紹介特典</span></nav><section class="coupon-list">${rows.length ? rows.map((c,i) => `<article class="coupon"><small>${i === 0 ? 'おすすめ' : 'Salon de Lien Member'}</small><h2>${htmlEscape(c.title)}</h2><div class="benefit">${htmlEscape(c.benefit || 'SPECIAL')}</div><p>${htmlEscape(c.menu || c.description || '対象メニューはスタッフへご確認ください')}</p><p>有効期限：${htmlEscape(jpDate(c.validUntil))}</p><a href="/u/appointments">このクーポンを使う</a></article>`).join('') : '<article class="coupon"><h2>利用できるクーポンはありません</h2><p>新しいクーポンが届くと、お知らせにも表示されます。</p><a href="/u/home">ホームへ戻る</a></article>'}</section>`
  sendCustomerHtml(res, customerShell({ title: 'クーポン', unread: data.unread, back: '/u/home', body }))
}

async function customerStampsPage(res, session) {
  const data = await customerAppData(session)
  const countRows = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "Visit" WHERE "customerId"=$1', session.customerId)
  const total = countRows[0]?.count || 0, stamps = total % 10
  const body = `<div class="page-title"><h1>スタンプカード</h1></div><nav class="tabs"><span class="tab active">ヘア</span><span class="tab">フェイシャル</span></nav><section class="stamp-card"><div class="section-head"><div><h2>ヘアスタンプカード</h2><p>ご来店1回につき1スタンプ</p></div><strong>${stamps} / 10個</strong></div><div class="stamp-grid">${Array.from({length:10},(_,i) => `<span class="stamp-dot ${i < stamps ? 'on' : ''}">${i < stamps ? '✓' : i+1}</span>`).join('')}</div></section><section class="section"><div class="section-head"><div><h2>特典内容</h2><p>次回ご来店時にご利用いただけます</p></div></div><div class="coupon"><small>NEXT REWARD</small><h2>10個達成特典</h2><div class="benefit">CARE SERVICE</div><p>トリートメントサービスなど、現在の髪に合う特典をご案内します。</p><a href="/u/appointments">次回予約へ</a></div></section>`
  sendCustomerHtml(res, customerShell({ title: 'スタンプカード', unread: data.unread, back: '/u/home', body }))
}

async function customerNewsPage(res, session) {
  const data = await customerAppData(session)
  await prisma.$executeRawUnsafe('UPDATE "CustomerBroadcastRecipient" SET "readAt"=COALESCE("readAt",CURRENT_TIMESTAMP) WHERE "customerId"=$1', session.customerId)
  const body = `<div class="page-title"><h1>お知らせ</h1></div><section class="menu-list">${data.broadcasts.length ? data.broadcasts.map(row => `<article class="menu-row" style="align-items:flex-start;padding:14px 0">${customerIcon('news')}<div style="flex:1"><strong>${htmlEscape(row.title)}</strong><p style="margin:6px 0;color:#81756f;font-size:11px;line-height:1.7">${htmlEscape(row.body)}</p><small style="color:#aa9b94">${htmlEscape(jpDate(row.deliveredAt))}</small></div></article>`).join('') : '<p style="padding:36px;text-align:center;color:#81756f">お知らせはまだありません</p>'}</section>`
  sendCustomerHtml(res, customerShell({ title: 'お知らせ', unread: 0, back: '/u/home', body }))
}

async function customerMenuPage(res, session) {
  const data = await customerAppData(session)
  const rows = [['user','会員情報の確認・変更','/u/profile'],['clock','来店履歴','/u/history'],['points','ポイント','/u/points'],['ticket','クーポン','/u/coupons'],['stamp','スタンプカード','/u/stamps'],['crown','アイテムランキング','/u/catalog'],['scissors','ヘアスタイル','/u/community'],['heart','商品アンケート','/u/reviews'],['mail','チャット相談','/u/appointments?view=chat'],['news','お知らせ','/u/news']]
  const body = `<section class="welcome"><strong>${htmlEscape(data.customer?.name)} 様</strong><span>会員メニュー</span></section><section class="menu-list">${rows.map(([icon,label,href]) => `<a class="menu-row" href="${href}">${customerIcon(icon)}<strong>${label}</strong>${customerIcon('chevron','chev')}</a>`).join('')}<form action="/api/customer-auth/logout" method="post"><button class="secondary" style="width:100%;margin-top:18px" type="submit">ログアウト</button></form></section>`
  sendCustomerHtml(res, customerShell({ title: 'メニュー', active: 'メニュー', unread: data.unread, body }))
}

async function customerBrandedPage(req, res, url) {
  const session = await chatSession(req, 'customer')
  if (!session) { res.statusCode = 302; res.setHeader('Location', '/u/login'); return res.end() }
  if (url.pathname === '/u/home') return customerHomePage(res, session)
  if (url.pathname === '/u/catalog') return customerCatalogPage(res, session)
  if (url.pathname.startsWith('/u/catalog/')) return customerCatalogPage(res, session, decodeURIComponent(url.pathname.slice('/u/catalog/'.length)))
  if (url.pathname === '/u/coupons') return customerCouponsPage(res, session)
  if (url.pathname === '/u/stamps') return customerStampsPage(res, session)
  if (url.pathname === '/u/news') return customerNewsPage(res, session)
  if (url.pathname === '/u/menu') return customerMenuPage(res, session)
}

async function staffIntroductionForm(req, res) {
  const session = await chatSession(req, 'staff')
  if (!session) { res.statusCode = 302; res.setHeader('Location', '/admin/login'); return res.end() }
  await ensureLienEnhancementTables()
  let raw = ''; for await (const chunk of req) raw += chunk
  const form = new URLSearchParams(raw)
  const introduction = String(form.get('introduction') || '').trim().slice(0, 160)
  await prisma.$executeRawUnsafe('INSERT INTO "StaffProfileSetting" ("id","organizationId","userId","introduction","updatedAt") VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP) ON CONFLICT ("organizationId","userId") DO UPDATE SET "introduction"=EXCLUDED."introduction", "updatedAt"=CURRENT_TIMESTAMP', crypto.randomUUID(), session.organizationId, session.userId, introduction)
  res.statusCode = 303; res.setHeader('Location', '/admin/account?introduction=saved'); res.end()
}

async function cancelAppointment(req, res) {
  const session = await chatSession(req, 'staff')
  if (!session) { res.statusCode = 302; res.setHeader('Location', '/admin/login'); return res.end() }
  let raw = ''; for await (const chunk of req) raw += chunk
  const form = new URLSearchParams(raw), appointmentId = String(form.get('appointmentId') || '')
  const rows = await prisma.$queryRawUnsafe('SELECT a.*, c."name" AS "customerName", c."organizationId" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" WHERE a."id"=$1 AND c."organizationId"=$2 AND c."deletedAt" IS NULL LIMIT 1', appointmentId, session.organizationId)
  const appointment = rows[0]
  if (!appointment) { res.statusCode = 404; return res.end('Not found') }
  if (!['キャンセル', '無断キャンセル'].includes(appointment.status)) {
    const broadcastId = crypto.randomUUID(), recipientId = crypto.randomUUID()
    const when = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(appointment.scheduledAt))
    await prisma.$transaction([
      prisma.$executeRawUnsafe('UPDATE "Appointment" SET "status"=\'キャンセル\', "updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1', appointment.id),
      prisma.$executeRawUnsafe('INSERT INTO "CustomerBroadcast" ("id","organizationId","createdByStaffId","title","body","status","audienceMatchedCount","couponEnabled","sentAt","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,\'sent\',1,false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)', broadcastId, session.organizationId, session.userId, '予約キャンセルのお知らせ', `${when}のご予約（${appointment.menu || '施術'}）を店舗にてキャンセルしました。ご不明点は店舗へお問い合わせください。`),
      prisma.$executeRawUnsafe('INSERT INTO "CustomerBroadcastRecipient" ("id","broadcastId","customerId","deliveredAt","createdAt") VALUES ($1,$2,$3,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)', recipientId, broadcastId, appointment.customerId),
    ])
  }
  res.statusCode = 303; res.setHeader('Location', `/admin/appointments/${encodeURIComponent(appointment.id)}?cancelled=1`); res.end()
}

async function staffNotifications(req, res, markRead = false) {
  const session = await chatSession(req, 'staff')
  if (!session) return json(res, 401, { error: 'ログインが必要です。' })
  await ensureLienEnhancementTables()
  const state = (await prisma.$queryRawUnsafe('SELECT * FROM "StaffNotificationState" WHERE "userId"=$1 LIMIT 1', session.userId))[0]
  const since = state?.appointmentsReadAt || new Date(0)
  const appointments = await prisma.$queryRawUnsafe('SELECT a."id",a."createdAt",a."scheduledAt",a."menu",c."name" AS "customerName" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" WHERE c."organizationId"=$1 AND c."deletedAt" IS NULL AND a."createdAt">$2 ORDER BY a."createdAt" DESC LIMIT 30', session.organizationId, since)
  const messageCount = await unreadChatCount(req, 'staff')
  if (markRead) await prisma.$executeRawUnsafe('INSERT INTO "StaffNotificationState" ("userId","organizationId","appointmentsReadAt","updatedAt") VALUES ($1,$2,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("userId") DO UPDATE SET "appointmentsReadAt"=CURRENT_TIMESTAMP,"updatedAt"=CURRENT_TIMESTAMP', session.userId, session.organizationId)
  return json(res, 200, { count: appointments.length + messageCount, appointmentCount: appointments.length, messageCount, appointments })
}

async function handleWithChatLink(handle, req, res, audience) {
  req.headers['accept-encoding'] = 'identity'
  const count = await unreadChatCount(req, audience).catch(() => 0)
  const originalWrite = res.write.bind(res), originalEnd = res.end.bind(res)
  res.end = (chunk, encoding, callback) => {
    if (typeof encoding === 'function') { callback = encoding; encoding = undefined }
    const type = String(res.getHeader('content-type') || '')
    if (type.includes('text/html')) {
      const href = audience === 'customer' ? '/u/chat' : '/admin/chat'
      const label = audience === 'customer' ? 'スタッフへチャット相談' : '顧客チャット通知'
      const badge = count ? `<span style="margin-left:8px;background:#c3483f;color:white;border-radius:999px;padding:2px 7px;font-size:11px">${count}</span>` : ''
      const link = `<a href="${href}" aria-label="${label}" style="position:fixed;right:18px;bottom:${audience === 'customer' ? '82px' : '22px'};z-index:9999;display:flex;align-items:center;min-height:48px;padding:0 18px;border-radius:999px;background:#8f4f42;color:#fff;text-decoration:none;font:700 13px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 8px 24px #4c302a55">💬 ${label}${badge}</a>`
      res.removeHeader('content-length')
      if (chunk) originalWrite(chunk, encoding)
      originalWrite(link)
      return originalEnd(callback)
    }
    return originalEnd(chunk, encoding, callback)
  }
  await handle(req, res)
}

const app = next({ dev: false, dir, conf: nextConfig })
app.prepare().then(() => {
  const handle = app.getRequestHandler()
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
      if (url.pathname === '/api/lien-chat') return await chatApi(req, res, url)
      if (url.pathname === '/api/lien-chat-form' && req.method === 'POST') return await chatForm(req, res)
      if (url.pathname === '/api/lien-chat-customer-form' && req.method === 'POST') return await customerChatForm(req, res)
      if (url.pathname === '/api/lien-staff-introduction' && req.method === 'POST') return await staffIntroductionForm(req, res)
      if (url.pathname === '/api/lien-appointment-cancel' && req.method === 'POST') return await cancelAppointment(req, res)
      if (url.pathname === '/api/lien-staff-notifications') return await staffNotifications(req, res, url.searchParams.get('read') === '1')
      if (url.pathname === '/api/lien-capacity') return await capacityOverride(req, res)
      if (url.pathname === '/api/lien-customer-real-name' && req.method === 'POST') return await customerRealName(req, res)
      if (req.method === 'GET' && ['/u/home','/u/catalog','/u/coupons','/u/stamps','/u/news','/u/menu'].includes(url.pathname)) return await customerBrandedPage(req, res, url)
      if (req.method === 'GET' && url.pathname.startsWith('/u/catalog/')) return await customerBrandedPage(req, res, url)
      if (url.pathname === '/admin/notifications') {
        const session = await chatSession(req, 'staff')
        if (!session) { res.statusCode = 302; res.setHeader('Location', '/admin/login'); return res.end() }
        await ensureLienEnhancementTables()
        const state = (await prisma.$queryRawUnsafe('SELECT * FROM "StaffNotificationState" WHERE "userId"=$1 LIMIT 1', session.userId))[0]
        const since = state?.appointmentsReadAt || new Date(0)
        const recent = await prisma.$queryRawUnsafe('SELECT a."id" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" WHERE c."organizationId"=$1 AND c."deletedAt" IS NULL AND a."createdAt">$2 ORDER BY a."createdAt" DESC LIMIT 1', session.organizationId, since)
        const messages = await unreadChatCount(req, 'staff')
        await prisma.$executeRawUnsafe('INSERT INTO "StaffNotificationState" ("userId","organizationId","appointmentsReadAt","updatedAt") VALUES ($1,$2,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("userId") DO UPDATE SET "appointmentsReadAt"=CURRENT_TIMESTAMP,"updatedAt"=CURRENT_TIMESTAMP', session.userId, session.organizationId)
        res.statusCode = 303
        res.setHeader('Location', messages ? '/admin/customers/messages/chat' : recent[0] ? `/admin/appointments/${encodeURIComponent(recent[0].id)}` : '/admin/appointments')
        return res.end()
      }
      if (url.pathname === '/admin/chat') { res.statusCode = 308; res.setHeader('Location', '/admin/customers/messages/chat'); return res.end() }
      if (url.pathname === '/admin/customers/messages/chat') {
        const threadId = url.searchParams.get('threadId')
        const customerId = url.searchParams.get('customerId')
        res.statusCode = 307
        res.setHeader('Location', `/admin/customers/messages?chat=1${threadId ? `&threadId=${encodeURIComponent(threadId)}` : ''}${customerId ? `&customerId=${encodeURIComponent(customerId)}` : ''}`)
        return res.end()
      }
      if (url.pathname === '/u/chat' || url.pathname === '/u/messages') { res.statusCode = 307; res.setHeader('Location', '/u/appointments?view=chat'); return res.end() }
      if (url.pathname === '/u/appointments') return handle(req, res)
      if (url.pathname.startsWith('/admin/') && !url.pathname.startsWith('/admin/login')) return handle(req, res)
      return handle(req, res)
    } catch (err) { console.error('chat server error', err); if (!res.headersSent) json(res, 500, { error: 'チャット処理に失敗しました。' }); else res.end() }
  })
  if (keepAliveTimeout !== undefined) server.keepAliveTimeout = keepAliveTimeout
  server.listen(currentPort, hostname, () => console.log(`Salon de Lien listening on ${hostname}:${currentPort}`))
}).catch(err => { console.error(err); process.exit(1) })
