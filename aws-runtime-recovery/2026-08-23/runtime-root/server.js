const path = require('path')
const http = require('http')
const crypto = require('crypto')
const fs = require('fs')
const { PrismaClient } = require('@prisma/client')
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns')
const { handlePublicSiteRequest } = require('./public-site') /* public-review-pages-v46 */
const { createBillingService } = require('./billing') /* stripe-subscription-billing-v52 */
const { createTenantSetupService } = require('./tenant-setup') /* tenant-bootstrap-v70 */
const { createPlatformOperatorService } = require('./platform-operator') /* platform-readonly-operations-v95 */
const { createCatalogOperationsService } = require('./catalog-operations') /* catalog-registration-v96 */
const { createStoreProfileService } = require('./store-profile') /* commercial-admin-v101 */
const { createAppointmentOperationsService } = require('./appointment-operations-v267')
const { createCustomerAppointmentCancellationService } = require('./customer-appointment-cancellation-v362') /* customer-appointment-cancellation-v362-require */
const { createCustomerBookingCouponService } = require('./customer-booking-coupon-v366') /* customer-booking-coupon-v366-require */
const { createCustomerStoreStaffService } = require('./customer-store-staff-v276')
const { createCustomerLinkService } = require('./customer-links-v293')
const { createCustomerWithdrawalService } = require('./customer-withdrawal-v309') /* verified-customer-withdrawal-v309 */
const { createSalesLedgerAccountsService } = require('./sales-ledger-accounts-v318') /* sales-ledger-accounts-v318 */
const { createCustomerMergeService } = require('./customer-merge-v385') /* customer-record-merge-v385 */
const { createAttendanceNotificationProductService } = require('./attendance-multi-shift-v349') /* attendance-multi-shift-v349 */
const { createCommunityPublishingService } = require('./community-publishing-v348') /* community-publishing-v337 */

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
let customerStoreStaff = null
let customerLinks = null

async function staffForOrganization(organizationId) {
  if (customerStoreStaff) return customerStoreStaff.staffForOrganization(organizationId)
  const rows = await prisma.$queryRawUnsafe('SELECT "staffKey","staffName" FROM "StaffBookingSetting" WHERE "organizationId"=$1 AND "active"=TRUE AND "onLeave"=FALSE ORDER BY "createdAt","staffName"', organizationId)
  return rows.map(row => ({ key: row.staffKey, name: row.staffName }))
}

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
    const users = await prisma.$queryRawUnsafe('SELECT u."id" FROM "AppUser" u JOIN "Customer" c ON c."id"=u."customerId" WHERE u."id"=$1 AND u."customerId"=$2 AND u."organizationId"=$3 AND u."role"=\'CUSTOMER\' AND u."active"=true AND c."deletedAt" IS NULL LIMIT 1', value.userId, value.customerId, value.organizationId)
    return users[0] ? value : null
  }
  const value = verifySession(jar.lien_admin_session, process.env.ADMIN_AUTH_SECRET, 2, ['ADMIN', 'STAFF'])
  if (!value || !value.organizationId) return null
  const users = value.userId
    ? await prisma.$queryRawUnsafe('SELECT "id", "displayName", "role" FROM "AppUser" WHERE "id"=$1 AND "organizationId"=$2 AND "active"=true LIMIT 1', value.userId, value.organizationId)
    : await prisma.$queryRawUnsafe('SELECT "id", "displayName", "role" FROM "AppUser" WHERE "organizationId"=$1 AND "active"=true AND (LOWER("loginId")=LOWER($2) OR LOWER("email")=LOWER($2)) LIMIT 1', value.organizationId, value.subject)
  return users[0] ? { ...value, userId: value.userId || users[0].id, displayName: users[0].displayName, role: users[0].role } : null
}
function canAccessThread(session, thread) {
  if (session.role === 'ADMIN') return true
  const accountName = String(session.displayName || '').replace(/\s/g, '')
  const staffName = String(thread.staffName || '').replace(/\s/g, '')
  return Boolean(accountName && staffName && (accountName === staffName || accountName.includes(staffName) || staffName.includes(accountName)))
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
    store: '<path d="M3 10h18"></path><path d="m5 4-2 6v2a3 3 0 0 0 6 0v-2l1-6"></path><path d="m14 4 1 6v2a3 3 0 0 0 6 0v-2l-2-6"></path><path d="M5 15v6h14v-6"></path><path d="M9 21v-5h6v5"></path>',
  }
  return `<svg class="icon ${htmlEscape(className)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.heart}</svg>`
}
function yen(value) { return `${Number(value || 0).toLocaleString('ja-JP')}円` }
function jpDate(value, withTime = false) {
  if (!value) return '未登録'
  return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(new Date(value))
}
function customerAppCss() {
  return `:root{--rose:#d85d79;--rose-dark:#bc4966;--rose-soft:#fceaf0;--ink:#332d2a;--muted:#81756f;--line:#eaded9;--paper:#fffdfb;--cream:#faf6f2}*{box-sizing:border-box}html{background:#efe9e5}body{margin:0;color:var(--ink);background:#efe9e5;font-family:-apple-system,BlinkMacSystemFont,"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;-webkit-font-smoothing:antialiased}a{color:inherit;text-decoration:none}button,input,select,textarea{font:inherit}.app{position:relative;width:100%;max-width:480px;min-height:100dvh;margin:0 auto;background:var(--paper);box-shadow:0 0 42px #55423918}.topbar{position:sticky;top:0;z-index:30;display:grid;grid-template-columns:48px 1fr 48px;align-items:center;height:68px;padding:0 12px;background:#fffdfbf2;border-bottom:1px solid var(--line);backdrop-filter:blur(12px)}.brand{text-align:center;line-height:1}.brand-script{font:italic 23px Georgia,"Times New Roman",serif;color:#715f58;letter-spacing:.02em}.brand-sub{display:block;margin-top:5px;font-size:8px;letter-spacing:.22em;color:#b7a39b;text-transform:uppercase}.icon-button{position:relative;display:grid;width:42px;height:42px;place-items:center;border:0;background:transparent;color:#75655e;border-radius:50%}.icon{width:22px;height:22px}.badge{position:absolute;top:4px;right:2px;display:grid;min-width:18px;height:18px;padding:0 5px;place-items:center;border:2px solid white;border-radius:99px;background:#d83f57;color:white;font-size:10px;font-weight:800}.content{padding-bottom:86px}.welcome{padding:14px 18px 12px}.welcome strong{display:block;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:16px;letter-spacing:.03em}.welcome span{display:block;margin-top:5px;color:var(--muted);font-size:11px}.hero{position:relative;height:192px;overflow:hidden;background:#ddd}.hero img{width:100%;height:100%;object-fit:cover;filter:saturate(.82) contrast(.96)}.hero:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,#33211999 0,#4028212e 62%,transparent)}.hero-copy{position:absolute;z-index:1;left:20px;bottom:24px;color:white;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:23px;line-height:1.55;letter-spacing:.12em;text-shadow:0 2px 12px #3a2219}.quick-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px}.quick-card{display:flex;min-height:112px;flex-direction:column;align-items:center;justify-content:center;border:1px solid #eee1dc;border-radius:10px;background:#fff;box-shadow:0 3px 10px #8b67500c;transition:.18s}.quick-card:active{transform:scale(.97);background:var(--rose-soft)}.quick-card .icon{width:30px;height:30px;color:#d16b82}.quick-card strong{margin-top:9px;font-size:11px;text-align:center}.quick-card small{margin-top:4px;color:#b8a8a1;font:7px Georgia,serif;letter-spacing:.1em}.section{padding:18px}.section+.section{border-top:8px solid var(--cream)}.section-head{display:flex;align-items:end;justify-content:space-between;margin-bottom:14px}.section-head h1,.section-head h2{margin:0;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:20px;letter-spacing:.04em}.section-head p{margin:4px 0 0;color:var(--muted);font-size:11px}.section-head a{color:var(--rose-dark);font-size:11px;font-weight:700}.status-card{display:block;border:1px solid #f0d8df;border-radius:14px;background:linear-gradient(135deg,#fff 0,#fff4f7 100%);padding:16px}.status-card .label{color:var(--rose-dark);font-size:11px;font-weight:700}.status-card strong{display:block;margin-top:7px;font-size:15px}.status-card p{margin:5px 0 0;color:var(--muted);font-size:11px}.metrics{display:grid;grid-template-columns:1fr 1fr;gap:9px}.metric{border:1px solid var(--line);border-radius:12px;padding:14px;background:#fff}.metric span{color:var(--muted);font-size:10px}.metric strong{display:block;margin-top:6px;font-family:Georgia,"Yu Mincho",serif;font-size:21px}.notice{display:flex;align-items:center;gap:12px;border:1px solid #eed8df;border-radius:12px;background:#fff8fa;padding:13px}.notice .icon{color:var(--rose)}.notice div{min-width:0;flex:1}.notice strong{font-size:12px}.notice p{overflow:hidden;margin:4px 0 0;color:var(--muted);font-size:10px;text-overflow:ellipsis;white-space:nowrap}.bottom-nav{position:fixed;z-index:40;right:0;bottom:0;left:0;margin:auto;display:grid;width:100%;max-width:480px;grid-template-columns:repeat(4,1fr);padding:7px 4px calc(7px + env(safe-area-inset-bottom));border-top:1px solid #e6d9d4;background:#fffdfbf5;box-shadow:0 -8px 22px #6d493c0d;backdrop-filter:blur(14px)}.bottom-link{display:flex;min-width:0;flex-direction:column;align-items:center;gap:3px;color:#a3948d;font-size:9px;font-weight:700}.bottom-link .icon{width:20px;height:20px}.bottom-link.active{color:var(--rose)}.page-title{padding:18px;border-bottom:1px solid var(--line);text-align:center}.page-title h1{margin:0;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:17px}.tabs{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;border-bottom:1px solid var(--line);background:white}.tab{padding:12px 5px;border-bottom:3px solid transparent;color:var(--muted);text-align:center;font-size:10px;font-weight:700}.tab.active{border-color:var(--rose);color:var(--rose-dark);background:#fff9fa}.ranking-intro{margin:16px 18px;padding:18px;border-radius:13px;background:linear-gradient(135deg,#fffaf0,#fff);text-align:center}.ranking-intro .laurel{color:#c9a044;font-family:Georgia,serif;font-size:13px}.ranking-intro h2{margin:5px 0;font-family:"Yu Mincho",serif;color:#9d7430;font-size:18px}.ranking-intro p{margin:0;color:var(--muted);font-size:10px}.product-list{padding:0 18px 22px}.product-row{display:grid;grid-template-columns:38px 68px 1fr 20px;align-items:center;gap:10px;min-height:106px;border-bottom:1px solid var(--line)}.rank{font:700 17px Georgia,serif;color:#8f8079;text-align:center}.rank.top{display:grid;width:29px;height:29px;place-items:center;border-radius:50%;background:#d9ae43;color:white}.product-art{position:relative;display:grid;width:58px;height:78px;place-items:end center;border-radius:20px 20px 9px 9px;background:linear-gradient(160deg,#765b85,#bea9c9 55%,#f2eafa);box-shadow:inset -8px 0 14px #ffffff45,0 5px 12px #6b536327;color:white;font:700 9px Georgia,serif;padding-bottom:10px}.product-art.jar{height:58px;border-radius:9px 9px 20px 20px}.product-meta h3{margin:0;font-size:12px;line-height:1.55}.product-meta p{display:-webkit-box;overflow:hidden;margin:5px 0 0;color:var(--muted);font-size:9px;line-height:1.5;-webkit-box-orient:vertical;-webkit-line-clamp:2}.tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}.tag{border:1px solid #ead5dc;border-radius:3px;padding:2px 5px;color:#a05568;font-size:8px}.detail-visual{display:flex;justify-content:center;padding:28px 18px 14px}.detail-visual .product-art{width:110px;height:155px;font-size:13px}.detail-card{padding:12px 22px 30px}.detail-card h1{margin:0;font-family:"Yu Mincho",serif;font-size:19px;line-height:1.5}.price{margin-top:10px;font-size:12px}.description{margin-top:18px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:16px 0;color:#5f5550;font-size:12px;line-height:1.9}.recommend{margin-top:18px}.recommend h2{font-size:13px}.recommend ul{padding-left:18px;color:var(--muted);font-size:11px;line-height:1.8}.primary,.secondary{display:flex;min-height:48px;align-items:center;justify-content:center;border-radius:6px;font-size:12px;font-weight:700}.primary{margin-top:16px;background:var(--rose);color:white}.secondary{margin-top:8px;border:1px solid #e6d1d7;background:#fff;color:var(--rose-dark)}.coupon-list{display:grid;gap:12px;padding:16px 18px}.coupon{position:relative;overflow:hidden;border:1px solid #f0d3dc;border-radius:13px;background:linear-gradient(135deg,#fff3f6,#fff);padding:16px;text-align:center}.coupon:before,.coupon:after{content:"";position:absolute;top:50%;width:16px;height:16px;border-radius:50%;background:var(--paper);transform:translateY(-50%)}.coupon:before{left:-8px}.coupon:after{right:-8px}.coupon small{color:var(--rose-dark);font-weight:800}.coupon h2{margin:7px 0 4px;font-family:"Yu Mincho",serif;font-size:17px}.coupon .benefit{color:#c34f6c;font:700 22px Georgia,serif}.coupon p{margin:5px 0;color:var(--muted);font-size:10px}.coupon a{display:block;margin-top:11px;border-radius:5px;background:var(--rose);padding:10px;color:white;font-size:11px;font-weight:700}.stamp-card{margin:18px;border:1px solid #ead0d8;border-radius:14px;background:linear-gradient(135deg,#fff4f7,#f7cad6);padding:18px}.stamp-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:9px;margin-top:16px}.stamp-dot{display:grid;aspect-ratio:1;place-items:center;border:2px solid #fff;border-radius:50%;background:#fff;color:#cbbbc0;font-size:10px}.stamp-dot.on{background:#d66782;color:white;box-shadow:0 3px 8px #a4445f2d}.menu-list{padding:8px 18px 24px}.menu-row{display:flex;min-height:62px;align-items:center;gap:13px;border-bottom:1px solid var(--line)}.menu-row>.icon{color:var(--rose);width:21px}.menu-row strong{flex:1;font-size:12px}.menu-row .chev{color:#b5a6a0;width:17px}@media(min-width:700px){body{padding:24px 0}.app{min-height:calc(100dvh - 48px);border-radius:24px;overflow:hidden}.bottom-nav{bottom:24px;border-radius:0 0 24px 24px}.topbar{border-radius:24px 24px 0 0}}
@media(min-width:1024px){
  body{padding:0}.app{max-width:1440px;min-height:100dvh;padding-left:238px;border-radius:0;overflow:visible;box-shadow:0 0 54px #55423916}.topbar{height:78px;border-radius:0;padding:0 28px}.brand-script{font-size:27px}.content{padding:0 32px 54px}.bottom-nav{top:0;right:auto;bottom:0;left:max(0px,calc(50% - 720px));width:238px;max-width:238px;height:100dvh;grid-template-columns:1fr;align-content:start;gap:8px;padding:104px 18px 24px;border-top:0;border-right:1px solid var(--line);border-radius:0;background:#fffaf7f5;box-shadow:none}.bottom-link{min-height:52px;flex-direction:row;justify-content:flex-start;gap:13px;border-radius:12px;padding:0 16px;font-size:12px}.bottom-link .icon{width:21px;height:21px}.bottom-link.active{background:var(--rose-soft);color:var(--rose-dark)}.welcome,.section,.page-title,.ranking-intro,.product-list,.coupon-list,.stamp-card,.menu-list,.detail-card{max-width:1120px;margin-right:auto;margin-left:auto}.welcome{padding:28px 28px 20px}.welcome strong{font-size:22px}.welcome span{font-size:12px}.hero{height:350px;max-width:1120px;margin:0 auto;border-radius:20px}.hero-copy{left:44px;bottom:42px;font-size:34px}.quick-grid{max-width:1120px;margin:0 auto;gap:14px;padding:22px 0}.quick-card{min-height:150px}.quick-card strong{font-size:13px}.quick-card small{font-size:8px}.section{padding:30px 24px}.section-head h1,.section-head h2{font-size:25px}.metrics{gap:16px}.metric{padding:22px}.page-title{padding:30px 20px}.page-title h1{font-size:24px}.product-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:28px;padding:0 22px 32px}.product-row{min-height:128px}.coupon-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;padding:24px}.menu-list{padding:18px 28px 36px}.menu-row{min-height:72px}.detail-card{padding:18px 44px 48px}.detail-visual{padding-top:42px}}

/* commercial-chat-catalog-v52: official product photography, premium ranking badges, and shared interaction polish. */
.ranking-intro{position:relative;overflow:hidden;border:1px solid #ead9c1;background:radial-gradient(circle at 50% -20%,#fff 0,#fffaf0 48%,#f8efe2 100%);box-shadow:0 12px 32px #5f41200d}
.ranking-intro:before,.ranking-intro:after{content:"";position:absolute;top:18px;width:52px;height:74px;opacity:.2;background:radial-gradient(ellipse at center,#b88c42 0 2px,transparent 3px);background-size:9px 13px;transform:rotate(-18deg)}
.ranking-intro:before{left:18px}.ranking-intro:after{right:18px;transform:scaleX(-1) rotate(-18deg)}
.ranking-kicker{position:relative;z-index:1;display:inline-flex;align-items:center;gap:7px;color:#a27632;font:700 9px Georgia,serif;letter-spacing:.18em}.ranking-kicker svg{width:18px;height:18px;fill:#d8b869;stroke:#9f762e;stroke-width:1.2}.ranking-intro h2{position:relative;z-index:1;margin-top:8px;color:#68472c;letter-spacing:.06em}.product-row{grid-template-columns:46px 76px minmax(0,1fr) 18px;gap:11px;padding:10px 4px;border-radius:14px;transition:background-color .2s ease,transform .2s ease}.product-row:active{background:#fff5f7;transform:scale(.995)}
.rank{font-family:Georgia,"Yu Mincho",serif}.rank-badge{position:relative;display:grid;width:42px;height:50px;place-items:center;border:1px solid var(--rank-border);border-radius:21px 21px 15px 15px;background:linear-gradient(150deg,var(--rank-top),var(--rank-bottom));color:var(--rank-ink);box-shadow:inset 0 1px 0 #ffffffc7,0 6px 14px var(--rank-shadow)}.rank-badge svg{position:absolute;top:4px;width:20px;height:20px;fill:var(--rank-crown);stroke:var(--rank-ink);stroke-width:1.25;stroke-linecap:round;stroke-linejoin:round}.rank-badge strong{position:absolute;top:21px;font-size:17px;line-height:1}.rank-badge small{position:absolute;bottom:4px;font:700 7px -apple-system,BlinkMacSystemFont,"Yu Gothic",sans-serif}.rank-gold{--rank-top:#fff6c6;--rank-bottom:#d8aa42;--rank-border:#c89425;--rank-ink:#745019;--rank-crown:#fff2a4;--rank-shadow:#b8872f38}.rank-silver{--rank-top:#f9fbfc;--rank-bottom:#bfc8ce;--rank-border:#9faab2;--rank-ink:#53606a;--rank-crown:#f7fbfd;--rank-shadow:#73808a2d}.rank-bronze{--rank-top:#f7dfca;--rank-bottom:#bd7c4c;--rank-border:#a76537;--rank-ink:#693a1f;--rank-crown:#f2c092;--rank-shadow:#8c4e292f}.rank-standard{display:flex;align-items:baseline;justify-content:center;gap:1px;color:#857670}.rank-standard strong{font-size:17px}.rank-standard small{font-size:8px}
.product-art.product-photo{display:flex;width:68px;height:88px;align-items:center;justify-content:center;overflow:hidden;border:1px solid #eee4df;border-radius:16px;background:linear-gradient(145deg,#fff,#faf7f5);padding:6px;box-shadow:0 7px 18px #61463b14}.product-art.product-photo img{display:block;width:100%;height:100%;object-fit:contain}.product-art-fallback{width:68px;height:88px}.detail-visual .product-photo-detail{width:190px;height:244px;border-radius:24px;padding:18px;box-shadow:0 18px 42px #5d44351c}.detail-visual .product-photo-detail img{object-fit:contain}.product-meta h3{font-size:12px;letter-spacing:.01em}.product-meta p{font-size:10px}.product-row>.icon{color:#b6a49d}
@media(hover:hover){.product-row:hover{background:#fff7f8;transform:translateY(-1px);box-shadow:0 8px 20px #7353410c}.quick-card:hover{border-color:#e9cbd4;background:#fff9fa}.primary:hover{background:var(--rose-dark)}}
@media(min-width:1024px){.product-row{grid-template-columns:50px 88px minmax(0,1fr) 20px;padding:12px 10px}.product-art.product-photo{width:78px;height:100px}.product-meta h3{font-size:13px}.detail-visual .product-photo-detail{width:230px;height:300px}}
a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid #e8a7b8;outline-offset:3px}

/* Customer page back link follows the shared home shell without replacing its header icon. */
.customer-page-back{display:inline-flex;min-height:42px;align-items:center;gap:6px;margin:10px 18px 0;color:var(--muted);font-size:11px;font-weight:700}.customer-page-back .icon{width:17px;height:17px}
@media(min-width:1024px){.content{width:100%}.customer-page-back{display:flex;width:100%;max-width:1120px;margin:18px auto 0;padding:0 4px}.content>.customer-page-back+.page-title{margin-top:0}}

/* Keep the native customer pages aligned with CustomerAccountShell on mobile. */
@media(max-width:1023px){
  .content{padding-bottom:88px}
  .bottom-nav{height:calc(64px + env(safe-area-inset-bottom));grid-template-columns:repeat(4,minmax(0,1fr));padding:0 4px env(safe-area-inset-bottom)}
  .bottom-link{min-width:0;justify-content:center;gap:4px;border-radius:12px;font-size:11px;font-weight:600}
  .bottom-link .icon{width:20px;height:20px}
  .bottom-link.active{background:#f7e7e1;color:#8f4f42;box-shadow:inset 0 0 0 1px #ead0c7}
}
`
}
function customerBottomNav(active) {
  const items = [['home','ホーム','/u/home'],['calendar','予約','/u/appointments'],['clock','履歴','/u/history'],['mail','チャット相談','/u/chat']]
  return `<nav class="bottom-nav" aria-label="お客様アプリメニュー">${items.map(([icon,label,href]) => `<a class="bottom-link ${active === label ? 'active' : ''}" href="${href}"${active === label ? ' aria-current="page"' : ''}>${customerIcon(icon)}<span>${label}</span></a>`).join('')}</nav>`
}
function customerShell({ title, active = '', unread = 0, back = '', body }) {
  const left = `<a class="icon-button customer-menu-button" href="/u/menu" aria-label="メニューを開く">${customerIcon('menu')}</a>`
  const pageBack = back ? `<a class="customer-page-back" href="${back}">${customerIcon('arrow')}<span>戻る</span></a>` : ''
  const badge = unread ? `<span class="customer-notification-badge" aria-hidden="true">${Math.min(99, Number(unread) || 0)}</span>` : ''
  const bell = `<a class="icon-button customer-notification-link" href="/u/news" aria-label="お知らせ${unread ? ` ${unread}件` : ''}">${customerIcon('bell')}${badge}</a>`
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#fffdfb"><title>${htmlEscape(title)} | Salon de Lien</title><link rel="stylesheet" href="/customer-native-shell-v92.css"></head><body><div class="app"><header class="topbar">${left}<a class="brand" href="/u/home"><span class="brand-script">Salon de Lien</span><span class="brand-sub">Beauty Membership</span></a>${bell}</header><main class="content">${pageBack}${body}</main>${customerBottomNav(active)}</div><script src="/customer-experience-v278.js" defer></script><script src="/customer-link-ui-v293.js?v=293-4" defer></script></body></html>`
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
  const organizationStaff = session ? await staffForOrganization(session.organizationId) : []
  if (!session) return json(res, 401, { error: 'ログインが必要です。' })
  if (req.method === 'GET') {
    let threads
    if (audience === 'customer') {
      threads = await prisma.$queryRawUnsafe('SELECT t.*, COALESCE(s."staffName",t."staffName") AS "staffName", c."name" AS "customerName", (SELECT COUNT(*)::int FROM "ChatMessage" m WHERE m."threadId"=t."id" AND m."senderType"=\'staff\' AND (t."customerLastReadAt" IS NULL OR m."createdAt">t."customerLastReadAt")) AS "unreadCount" FROM "ChatThread" t JOIN "Customer" c ON c."id"=t."customerId" LEFT JOIN "StaffBookingSetting" s ON s."organizationId"=t."organizationId" AND s."staffKey"=t."staffKey" WHERE t."customerId"=$1 AND t."organizationId"=$2 ORDER BY t."updatedAt" DESC', session.customerId, session.organizationId)
    } else {
      threads = await prisma.$queryRawUnsafe('SELECT t.*, COALESCE(s."staffName",t."staffName") AS "staffName", c."name" AS "customerName", (SELECT COUNT(*)::int FROM "ChatMessage" m WHERE m."threadId"=t."id" AND m."senderType"=\'customer\' AND (t."staffLastReadAt" IS NULL OR m."createdAt">t."staffLastReadAt")) AS "unreadCount" FROM "ChatThread" t JOIN "Customer" c ON c."id"=t."customerId" LEFT JOIN "StaffBookingSetting" s ON s."organizationId"=t."organizationId" AND s."staffKey"=t."staffKey" WHERE t."organizationId"=$1 AND c."deletedAt" IS NULL ORDER BY t."updatedAt" DESC', session.organizationId)
      threads = threads.filter(t => canAccessThread(session, t))
    }
    if (audience === 'customer') {
      const seenStaff = new Set()
      threads = threads.filter(thread => {
        const identity = String(thread.staffName || thread.staffKey || '').normalize('NFKC').replace(/[\s　]+/g, '').toLowerCase()
        if (!identity || seenStaff.has(identity)) return false
        seenStaff.add(identity)
        return true
      })
    }
    const requested = url.searchParams.get('threadId')
    // Listing conversations must not mark the first thread as read. A thread is
    // read only when its id is explicitly opened by the customer or staff member.
    const thread = requested ? threads.find(t => t.id === requested) : null
    const messages = thread ? await prisma.$queryRawUnsafe('SELECT * FROM "ChatMessage" WHERE "threadId"=$1 ORDER BY "createdAt" ASC LIMIT 300', thread.id) : []
    if (thread) await prisma.$executeRawUnsafe(`UPDATE "ChatThread" SET "${audience === 'customer' ? 'customerLastReadAt' : 'staffLastReadAt'}"=CURRENT_TIMESTAMP WHERE "id"=$1`, thread.id)
    const existingStaffKeys = new Set(threads.map(item => String(item.staffKey || '')))
    const existingStaffNames = new Set(threads.map(item => String(item.staffName || '').normalize('NFKC').replace(/[\s　]+/g, '').toLowerCase()))
    const seenDirectory = new Set()
    const availableStaff = organizationStaff.filter(item => {
      const identity = String(item.name || item.key || '').normalize('NFKC').replace(/[\s　]+/g, '').toLowerCase()
      if (!identity || seenDirectory.has(identity) || existingStaffKeys.has(String(item.key || '')) || existingStaffNames.has(identity)) return false
      seenDirectory.add(identity)
      return true
    })
    return json(res, 200, { threads, thread: thread || null, messages, staff: audience === 'customer' ? availableStaff : organizationStaff, directory: audience === 'customer' ? organizationStaff : undefined })
  }
  if (req.method !== 'POST' || (req.headers.origin && ![req.headers.origin, `https://${req.headers.host}`, `http://${req.headers.host}`].includes(req.headers.origin))) return json(res, 403, { error: '不正なリクエストです。' })
  const data = await body(req)
  if (data.action === 'create' && audience === 'customer') {
    const target = organizationStaff.find(s => s.key === data.staffKey); const text = String(data.body || '').trim()
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
  if (audience === 'customer') return html.replace('</body>', '<script src="/customer-experience-v278.js" defer></script><script src="/customer-link-ui-v293.js?v=293-4" defer></script></body>')
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
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap');body{display:flex;min-height:100vh;background:#faf6ef;font-family:"Noto Sans JP","Zen Kaku Gothic New","Hiragino Sans","Yu Gothic UI",system-ui,sans-serif}.admin-sidebar{position:fixed;inset:0 auto 0 0;width:255px;background:#fffdf9;border-right:1px solid #e5d8cb;z-index:20;display:flex;flex-direction:column}.admin-brand{height:77px;padding:15px 16px;display:flex;align-items:center;gap:11px;border-bottom:1px solid #eadfd4}.brand-logo{width:42px;height:42px;border-radius:50%;object-fit:cover;border:1px solid #dfcdbd}.admin-brand b{display:block;font-size:17px;font-weight:700;color:#2d201b}.admin-brand small{display:block;color:#806e64;font-size:11px;margin-top:2px}.admin-nav{display:grid;gap:5px;padding:17px 10px}.admin-nav a{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;color:#66544b;font-size:14px}.admin-nav a:hover{background:#f6ede7}.admin-nav a.active{background:#9c5344;color:#fff;box-shadow:0 2px 5px #6b39262b}.nav-icon{width:18px;height:18px;display:inline-flex;opacity:.8}.nav-icon svg,.customer-tabs svg,.shortcut svg,.admin-user svg{width:16px;height:16px;flex:0 0 auto}.admin-sidebar-footer{margin:auto 12px 14px;border-radius:18px;overflow:hidden;background:#e9ded2;padding:70px 12px 12px;color:#fff;font-size:12px;font-weight:700;background:linear-gradient(0deg,#5d4037aa,#ffffff05),url('/brand/salon-interior.jpg') center/cover}.admin-stage{width:100%;min-width:0;margin-left:255px}.admin-topbar{height:70px;background:#fffdf9;border-bottom:1px solid #e6d9cc;display:flex;align-items:center;gap:18px;padding:0 26px;position:sticky;top:0;z-index:10}.admin-topbar-title{min-width:145px}.admin-topbar-title small{display:block;color:#9a7c6e;font-size:11px}.admin-topbar-title b{font-size:14px}.top-search{display:none!important}.admin-user{margin-left:auto;display:flex;align-items:center;gap:10px}.admin-user a,.shortcut{display:flex;align-items:center;gap:7px;border:1px solid #e1d2c5;border-radius:999px;padding:9px 13px;background:white;color:#5d4037;font-size:13px}.admin-user .gear{width:42px;height:42px;justify-content:center;padding:0}.customer-tabs{max-width:1216px;margin:20px auto 0;display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:4px;border:1px solid #e3d4c7;border-radius:18px;background:white}.customer-tabs a{min-height:46px;display:flex;align-items:center;justify-content:center;gap:8px;border-radius:14px;color:#6f5d54;font-size:14px}.customer-tabs a.active{background:#9c5344;color:white}.chat-local-header{display:none!important}.admin-stage .wrap{max-width:1216px;padding:24px 0 36px}.admin-stage .hero{border-radius:22px;background:linear-gradient(135deg,#fffdf9,#f7efe7);padding:25px 28px}.admin-stage .hero h1{font-family:inherit;font-size:30px;font-weight:700}.admin-stage .panel{border-radius:20px;box-shadow:0 8px 24px #5c403414}.admin-stage .grid{grid-template-columns:310px minmax(0,1fr);gap:16px}.admin-stage .messages{height:54vh}.admin-stage .send textarea{min-height:58px}.admin-stage .primary{background:#9c5344}@media(max-width:900px){.admin-sidebar{width:220px}.admin-stage{margin-left:220px}}@media(max-width:700px){body{display:block}.admin-sidebar{display:none}.admin-stage{margin-left:0}.admin-topbar{height:62px;padding:0 12px}.admin-topbar-title small,.shortcut{display:none}.admin-user span{display:none}.customer-tabs{margin:10px 10px 0}.admin-stage .wrap{padding:14px 10px}.admin-stage .grid{grid-template-columns:1fr}}
  </style>`
  const shell = `<aside class="admin-sidebar"><div class="admin-brand"><img class="brand-logo" src="/brand/salon-customer-service-mark.svg" alt="Salon de Lien"><div><b>Salon de Lien</b><small>Salon customer servitomer service</small></div></div><nav class="admin-nav" aria-label="管理画面ナビゲーション"><a href="/admin/appointments"><span class="nav-icon">${icons.calendar}</span>予約カレンダー</a><a class="active" href="/admin/customers"><span class="nav-icon">${icons.users}</span>顧客・チャット・配信</a><a href="/admin/products?section=menus"><span class="nav-icon">${icons.package}</span>メニュー・商品棚・集計</a><a href="/admin/community"><span class="nav-icon">${icons.images}</span>スタイル共有</a><a href="/admin/owner-analytics"><span class="nav-icon">${icons.chart}</span>経営分析</a></nav><div class="admin-sidebar-footer">今日の接客を、次の関係へ。</div></aside><div class="admin-stage"><div class="admin-topbar"><div class="admin-topbar-title"><small>Salon de Lien</small><b>顧客・チャット・配信</b></div><div class="top-search">${icons.search}<span>顧客名・電話・メモで検索</span></div><span class="shortcut">${icons.command}<span>Ctrl K</span></span><div class="admin-user"><a href="/admin/account" aria-label="アカウント設定">${icons.user}<span>${displayName}</span></a><a class="gear" href="/admin/settings" aria-label="設定">${icons.settings}</a></div></div><nav class="customer-tabs" aria-label="顧客ページ切替"><a href="/admin/customers">${icons.users}<span>顧客管理</span></a><a class="active" href="/admin/customers/messages/chat">${icons.message}<span>チャット</span></a><a href="/admin/customers/messages">${icons.megaphone}<span>配信</span></a></nav>`
  html = html.replace('</head>', `${shellCss}</head>`).replace('<body>', `<body>${shell}`).replace('<header>', '<header class="chat-local-header">').replace('</body>', '</div></body>')
  return html
}

async function chatForm(req, res) {
  const session = await chatSession(req, 'staff')
  if (!session) { res.statusCode = 302; res.setHeader('Location', '/admin/login'); return res.end() }
  const organizationStaff = await staffForOrganization(session.organizationId)
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
      const matchedStaff = organizationStaff.find(s => String(session.displayName || '').replace(/\s/g, '').includes(s.name.replace(/\s/g, ''))) || organizationStaff[0]
      if (!matchedStaff) throw Error('スタッフが登録されていません。')
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
  const organizationStaff = await staffForOrganization(session.organizationId)
  let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 20000) throw Error('too_large') }
  const form = new URLSearchParams(raw)
  const text = String(form.get('body') || '').trim()
  const staffKey = String(form.get('staffKey') || '')
  let threadId = String(form.get('threadId') || '')
  if (!text || text.length > 2000) { res.statusCode = 303; res.setHeader('Location', '/u/chat'); return res.end() }
  let rows = threadId ? await prisma.$queryRawUnsafe('SELECT * FROM "ChatThread" WHERE "id"=$1 AND "customerId"=$2 AND "organizationId"=$3 LIMIT 1', threadId, session.customerId, session.organizationId) : []
  if (!rows[0]) {
    const target = organizationStaff.find(s => s.key === staffKey) || organizationStaff[0]
    if (!target) { res.statusCode = 303; res.setHeader('Location', '/u/chat?error=staff-required'); return res.end() }
    await prisma.$executeRawUnsafe('INSERT INTO "ChatThread" ("id","organizationId","customerId","staffKey","staffName","customerLastReadAt","updatedAt") VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("customerId","staffKey") DO UPDATE SET "status"=\'open\', "updatedAt"=CURRENT_TIMESTAMP', crypto.randomUUID(), session.organizationId, session.customerId, target.key, target.name)
    rows = await prisma.$queryRawUnsafe('SELECT * FROM "ChatThread" WHERE "customerId"=$1 AND "staffKey"=$2 LIMIT 1', session.customerId, target.key)
  }
  const thread = rows[0]
  await prisma.$transaction([
    prisma.$executeRawUnsafe('INSERT INTO "ChatMessage" ("id","threadId","senderType","senderUserId","body") VALUES ($1,$2,\'customer\',$3,$4)', crypto.randomUUID(), thread.id, session.userId, text),
    prisma.$executeRawUnsafe('UPDATE "ChatThread" SET "updatedAt"=CURRENT_TIMESTAMP, "customerLastReadAt"=CURRENT_TIMESTAMP WHERE "id"=$1', thread.id),
  ])
  res.statusCode = 303; res.setHeader('Location', `/u/chat&threadId=${encodeURIComponent(thread.id)}`); return res.end()
}

async function unreadChatCount(req, audience) {
  const session = await chatSession(req, audience)
  if (!session) return 0
  if (audience === 'customer') {
    const rows = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "ChatMessage" m JOIN "ChatThread" t ON t."id"=m."threadId" WHERE t."customerId"=$1 AND t."organizationId"=$2 AND m."senderType"=\'staff\' AND (t."customerLastReadAt" IS NULL OR m."createdAt">t."customerLastReadAt")', session.customerId, session.organizationId)
    return rows[0]?.count || 0
  }
  let threads = await prisma.$queryRawUnsafe('SELECT t.*, COALESCE(s."staffName",t."staffName") AS "staffName", (SELECT COUNT(*)::int FROM "ChatMessage" m WHERE m."threadId"=t."id" AND m."senderType"=\'customer\' AND (t."staffLastReadAt" IS NULL OR m."createdAt">t."staffLastReadAt")) AS "unreadCount" FROM "ChatThread" t LEFT JOIN "StaffBookingSetting" s ON s."organizationId"=t."organizationId" AND s."staffKey"=t."staffKey" WHERE t."organizationId"=$1', session.organizationId)
  threads = threads.filter(t => canAccessThread(session, t))
  return threads.reduce((sum, t) => sum + (t.unreadCount || 0), 0)
}

async function ensureLienEnhancementTables() {
  await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "StaffProfileSetting" ("id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "userId" TEXT NOT NULL, "introduction" TEXT NOT NULL DEFAULT \'\', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE("organizationId", "userId"))')
  await prisma.$executeRawUnsafe('ALTER TABLE "StaffProfileSetting" ADD COLUMN IF NOT EXISTS "profileImageKey" TEXT')
  await prisma.$executeRawUnsafe('ALTER TABLE "StaffProfileSetting" ADD COLUMN IF NOT EXISTS "roleLabel" TEXT')
  await prisma.$executeRawUnsafe('ALTER TABLE "StaffProfileSetting" ADD COLUMN IF NOT EXISTS "specialties" TEXT')
  await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "StaffNotificationState" ("userId" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "appointmentsReadAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)')
  await prisma.$executeRawUnsafe('ALTER TABLE "StaffNotificationState" ADD COLUMN IF NOT EXISTS "eventsReadAt" TIMESTAMP(3)')
  await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "StaffNotificationRead" ("userId" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"notificationType" TEXT NOT NULL,"notificationId" TEXT NOT NULL,"readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY ("userId","notificationType","notificationId"))')
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StaffNotificationRead_org_user_idx" ON "StaffNotificationRead"("organizationId","userId","readAt" DESC)')
  await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "StaffSystemNotification" ("id" TEXT PRIMARY KEY,"organizationId" TEXT NOT NULL,"type" TEXT NOT NULL,"title" TEXT NOT NULL,"body" TEXT,"href" TEXT,"entityType" TEXT,"entityId" TEXT NOT NULL,"source" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)')
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "StaffSystemNotification_org_type_entity_key" ON "StaffSystemNotification"("organizationId","type","entityId")')
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "StaffSystemNotification_org_created_idx" ON "StaffSystemNotification"("organizationId","createdAt" DESC)')
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
  const membershipCode = await customerLinks.customerPublicCode(session)
  if (!data.customer) { res.statusCode = 404; return res.end('Not found') }
  const name = htmlEscape(data.customer.name)
  const quick = [
    ['calendar','予約する','RESERVE','/u/appointments'],
    ['repeat','前回と同じ予約','QUICK RESERVE','/u/appointments?repeat=last'],
    ['user','マイページ','MY PAGE','/u/profile'],
    ['ticket','クーポン','COUPON','/u/coupons'],
    ['store','登録済みの店舗','MY SALONS','/u/stores'],
    ['stamp','スタンプカード','STAMP CARD','/u/stamps'],
    ['scissors','ヘアスタイル','STYLE','/u/community'],
    ['crown','私に合うアイテム','ITEM RANKING','/u/catalog'],
    ['heart','お客様の声','IMPRESSION','/u/reviews'],
  ]
  const body = `<section class="welcome"><strong>${name} 様</strong><span>いつもご来店ありがとうございます</span></section><section class="hero"><img src="/brand/salon-interior-illustrated.png" alt="Salon de Lien 店内"><div class="hero-copy">あたらしい、<br>美しさを大切に。</div></section><section class="quick-grid" aria-label="サービス一覧">${quick.map(([icon,label,en,href]) => `<a class="quick-card" href="${href}">${customerIcon(icon)}<strong>${label}</strong><small>${en}</small></a>`).join('')}</section>${data.appointment ? `<section class="section"><div class="section-head"><div><h2>次回のご予約</h2><p>ご来店をお待ちしております</p></div><a href="/u/appointments?detail=${encodeURIComponent(data.appointment.id)}#current-reservations">詳細・キャンセル</a></div><a class="status-card" href="/u/appointments?detail=${encodeURIComponent(data.appointment.id)}#current-reservations"><span class="label">UPCOMING RESERVATION</span><strong>${htmlEscape(jpDate(data.appointment.scheduledAt, true))}</strong><p>${htmlEscape(data.appointment.menu || 'メニュー相談')} / ${htmlEscape(data.appointment.staffName || '担当フリー')}</p></a></section>` : ''}<section class="section"><div class="section-head"><div><h2>会員情報</h2><p>Salon de Lien メンバーシップ</p></div></div><div class="metrics"><a class="metric" href="/u/points"><span>利用可能ポイント</span><strong>${Number(data.points).toLocaleString('ja-JP')}<small> pt</small></strong></a><a class="metric" href="/u/history"><span>前回来店</span><strong style="font-size:14px">${htmlEscape(jpDate(data.visit?.visitedAt))}</strong></a></div>${customerLinks.membershipMarkup(membershipCode)}</section>`
  sendCustomerHtml(res, customerShell({ title: 'ホーム', active: 'ホーム', unread: data.unread, body }))
}


// commercial-chat-catalog-v52: official manufacturer imagery and accessible ranking medals.
const customerProductImageRules = [
  [/ウェット\s*シャイン.*(?:\s|クリーム)8(?:\D|$)/i, '/catalog-products/global-milbon-wetshine-8.jpg'],
  [/ウェット\s*シャイン/i, '/catalog-products/global-milbon-wetshine-5.jpg'],
  [/モールディング\s*ワックス.*7(?:\D|$)/i, '/catalog-products/global-milbon-molding-7.jpg'],
  [/モールディング\s*ワックス/i, '/catalog-products/global-milbon-molding-5.jpg'],
  [/ブリリアント\s*ポリッシング\s*オイル/i, '/catalog-products/global-milbon-polishing-oil.jpg'],
  [/プレセディア/i, '/catalog-products/aujua-presedia.png'],
  [/グロウシブ/i, '/catalog-products/aujua-growsive.png'],
  [/オーセナム/i, '/catalog-products/aujua-oathenam.png'],
  [/モイストカーム/i, '/catalog-products/aujua-moistcalm.png'],
  [/エイジングスパ/i, '/catalog-products/aujua-agingspa.png'],
  [/ディオーラム/i, '/catalog-products/aujua-diorum.png'],
  [/イミュライズ/i, '/catalog-products/aujua-immurise.png'],
  [/タイムサージ/i, '/catalog-products/aujua-timesurge.png'],
  [/インメトリィ|インメトリー/i, '/catalog-products/aujua-inmmetry.png'],
  [/リペアリティ/i, '/catalog-products/aujua-repairlity.png'],
  [/フィルメロウ/i, '/catalog-products/aujua-fillmellow.png'],
  [/アクアヴィア/i, '/catalog-products/aujua-aquaveer.png'],
  [/スムース/i, '/catalog-products/aujua-smooth.png'],
  [/クエンチ/i, '/catalog-products/aujua-quench.png'],
]
function customerProductImagePath(product) {
  if (product?.imageUrl) return product.imageUrl
  const label = [product?.manufacturerName, product?.name].filter(Boolean).join(' ')
  const official = customerProductImageRules.find(([pattern]) => pattern.test(label))?.[1]
  if (official) return official
  const category = String(product?.category || '')
  if (/シャンプー/.test(category)) return '/images/products/yohaku/shampoo.png'
  if (/トリートメント/.test(category)) return '/images/products/yohaku/treatment.png'
  if (/スタイリング/.test(category)) return '/images/products/yohaku/styling.png'
  if (/アウトバス|洗い流さない/.test(category)) return '/images/products/yohaku/leave-in.png'
  return '/images/products/yohaku/scalp.png'
}
function customerProductArt(product, detail = false) {
  const src = customerProductImagePath(product)
  if (!src) return '<span class="product-art product-art-fallback">' + htmlEscape(String(product?.manufacturerName || 'Salon item').slice(0, 8)) + '</span>'
  return '<span class="product-art product-photo' + (detail ? ' product-photo-detail' : '') + '"><img src="' + src + '" alt="' + htmlEscape(product.name) + 'の商品写真" loading="' + (detail ? 'eager' : 'lazy') + '" decoding="async"></span>'
}
function customerRankBadge(index) {
  const rank = Number(index) + 1
  if (rank > 3) return '<span class="rank rank-standard" aria-label="' + rank + '位"><strong>' + rank + '</strong><small>位</small></span>'
  const tone = ['gold', 'silver', 'bronze'][rank - 1]
  return '<span class="rank rank-badge rank-' + tone + '" aria-label="' + rank + '位"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 8 4 3.2L12 5l4 6.2L20 8l-1.7 8.8H5.7z"></path><path d="M6 19h12"></path></svg><strong>' + rank + '</strong><small>位</small></span>'
}

async function customerCatalogPage(res, session, productId, url) {
  const data = await customerAppData(session)
  const products = await prisma.$queryRawUnsafe('SELECT p."id",p."manufacturerName",p."name",p."category",p."retailPrice",p."concernTags",p."description",p."alternativeRecommendation",p."imageUrl",COALESCE(SUM(sl."quantity"),0)::int AS "soldCount" FROM "Product" p LEFT JOIN "ProductSaleLine" sl ON sl."productId"=p."id" WHERE p."organizationId"=$1 AND p."active"=true AND p."salesSuspended"=false GROUP BY p."id" ORDER BY "soldCount" DESC,p."updatedAt" DESC LIMIT 40', session.organizationId)
  if (productId) {
    const product = products.find(p => p.id === productId)
    if (!product) { res.statusCode = 404; return res.end('Not found') }
    const tags = jsonArray(product.concernTags)
    const alternatives = products.filter(p => p.id !== product.id && jsonArray(p.concernTags).some(t => tags.includes(t))).sort((a,b) => jsonArray(b.concernTags).filter(t => tags.includes(t)).length - jsonArray(a.concernTags).filter(t => tags.includes(t)).length).slice(0,3)
    const body = `<div class="page-title"><h1>アイテム詳細</h1></div><div class="detail-visual">${customerProductArt(product, true)}</div><article class="detail-card"><h1>${htmlEscape(product.name)}</h1><div class="tags">${[product.category,...tags].filter(Boolean).map(t => `<span class="tag">${htmlEscape(t)}</span>`).join('')}</div><p class="price">${yen(product.retailPrice)}（税込）</p><div class="description">${htmlEscape(product.description || 'サロンで髪の状態を確認し、使い方と使用量をご案内します。')}</div><section class="recommend"><h2>こんなお悩みにおすすめ</h2><ul>${(tags.length ? tags : ['毎日のホームケア','髪のまとまり']).map(t => `<li>${htmlEscape(t)}が気になる方</li>`).join('')}</ul></section>${alternatives.length ? `<section class="recommend"><h2>合わない場合の代替アイテム</h2><ul>${alternatives.map(p => `<li><a href="/u/catalog/${encodeURIComponent(p.id)}">${htmlEscape(p.name)}</a></li>`).join('')}</ul></section>` : ''}<a class="primary" href="/u/appointments">次回来店時に取り置きを相談</a><a class="secondary" href="/u/chat">スタッフにチャットで相談</a></article>`
    return sendCustomerHtml(res, customerShell({ title: product.name, unread: data.unread, back: '/u/catalog', body }))
  }

  const allowed = new Set(['all','haircare','styling','concerns'])
  const requested = url?.searchParams.get('category') || 'all'
  const selected = allowed.has(requested) ? requested : 'all'
  const textFor = p => [p.name,p.category,p.description,...jsonArray(p.concernTags)].filter(Boolean).join(' ')
  const haircarePattern = /シャンプー|トリートメント|ヘアケア|スカルプ|頭皮|オージュア|Aujua/i
  const stylingPattern = /スタイリング|ワックス|ジェル|スプレー|オイル|バーム|ミスト|フォーム/i
  const visibleProducts = products.filter(p => selected === 'all' || (selected === 'haircare' && haircarePattern.test(textFor(p))) || (selected === 'styling' && stylingPattern.test(textFor(p))) || (selected === 'concerns' && jsonArray(p.concernTags).length > 0))
  const categories = [['all','総合'],['haircare','ヘアケア'],['styling','スタイリング'],['concerns','お悩み別']]
  const tabs = categories.map(([key,label]) => `<a class="tab ${selected === key ? 'active' : ''}" href="${key === 'all' ? '/u/catalog' : `/u/catalog?category=${key}`}"${selected === key ? ' aria-current="page"' : ''}>${label}</a>`).join('')
  const body = `<div class="page-title"><h1>私に合うアイテムランキング</h1></div><section class="ranking-intro"><div class="ranking-kicker"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 8 4 3.2L12 5l4 6.2L20 8l-1.7 8.8H5.7z"></path><path d="M6 19h12"></path></svg><span>MONTHLY SELECT</span></div><h2>お客様愛用ランキング</h2><p>実際の購入データと髪のお悩みタグからご紹介</p></section><nav class="tabs" aria-label="商品カテゴリー">${tabs}</nav><section class="product-list">${visibleProducts.length ? visibleProducts.map((p,i) => { const tags = jsonArray(p.concernTags).slice(0,2); return `<a class="product-row" href="/u/catalog/${encodeURIComponent(p.id)}">${customerRankBadge(i)}${customerProductArt(p)}<span class="product-meta"><h3>${htmlEscape(p.name)}</h3><p>${htmlEscape(p.description || `${p.category || 'ヘアケア'}のためのサロン専売アイテム`)}</p><span class="tags">${tags.map(t => `<span class="tag">${htmlEscape(t)}</span>`).join('')}</span></span>${customerIcon('chevron')}</a>` }).join('') : '<p style="padding:30px;text-align:center;color:#81756f">このカテゴリーに該当する販売中の商品はありません</p>'}</section>`
  sendCustomerHtml(res, customerShell({ title: 'アイテムランキング', unread: data.unread, back: '/u/home', body }))
}

async function customerCouponsPage(res, session, url) {
  const data = await customerAppData(session), now = new Date()
  const referralEnabled = process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED !== 'false' // temporary-sms-referral-off-v39
  const [coupons, issues] = await Promise.all([
    prisma.$queryRawUnsafe('SELECT "id","title","description","targetMenu","discountType","discountValue","validUntil","couponCode" FROM "Coupon" WHERE "customerId"=$1 AND "status"=\'issued\' AND "validUntil">=$2 ORDER BY "validUntil" ASC LIMIT 30', session.customerId, now),
    prisma.$queryRawUnsafe('SELECT "id",\'限定クーポン\' AS title,"discountRate","targetMenusJson","expiresAt" AS "validUntil","couponCode" FROM "CouponIssue" WHERE "customerId"=$1 AND "status"=\'issued\' AND "expiresAt">=$2 ORDER BY "expiresAt" ASC LIMIT 30', session.customerId, now),
  ])
  const referralPattern = /紹介|友達|家族/
  const allRows = [...coupons.map(c => ({...c, benefit: `${c.discountValue}${String(c.discountType).includes('%') ? '%OFF' : ''}`, menu: c.targetMenu})), ...issues.map(c => ({...c, issueType: true, benefit: `${c.discountRate}%OFF`, menu: jsonArray(c.targetMenusJson).join('・')}))]
  const rows = referralEnabled ? allRows : allRows.filter(c => !referralPattern.test([c.title,c.description,c.menu].filter(Boolean).join(' ')))
  const allowed = new Set(referralEnabled ? ['all','recommended','limited','referral'] : ['all','recommended','limited'])
  const requested = url?.searchParams.get('filter') || 'all'
  const selected = allowed.has(requested) ? requested : 'all'
  const viewRows = selected === 'recommended' ? rows.slice(0,8) : selected === 'limited' ? rows.filter(c => (new Date(c.validUntil).getTime() - now.getTime()) <= 45 * 86400000) : selected === 'referral' ? rows.filter(c => referralPattern.test([c.title,c.description,c.menu].filter(Boolean).join(' '))) : rows
  const filters = referralEnabled ? [['all','すべて'],['recommended','おすすめ'],['limited','期間限定'],['referral','紹介特典']] : [['all','すべて'],['recommended','おすすめ'],['limited','期間限定']]
  const tabs = filters.map(([key,label]) => `<a class="tab ${selected === key ? 'active' : ''}" href="${key === 'all' ? '/u/coupons' : `/u/coupons?filter=${key}`}"${selected === key ? ' aria-current="page"' : ''}>${label}</a>`).join('')
  const body = `<div class="page-title"><h1>クーポン一覧</h1></div><nav class="tabs" aria-label="クーポン絞り込み">${tabs}</nav><section class="coupon-list">${viewRows.length ? viewRows.map((c,i) => `<article class="coupon"><small>${i === 0 && selected !== 'referral' ? 'おすすめ' : 'Salon de Lien Member'}</small><h2>${htmlEscape(c.title)}</h2><div class="benefit">${htmlEscape(c.benefit || 'SPECIAL')}</div><p>${htmlEscape(c.menu || c.description || '対象メニューはスタッフへご確認ください')}</p><p>有効期限：${htmlEscape(jpDate(c.validUntil))}</p><a href="${c.issueType ? `/u/appointments?coupon=${encodeURIComponent(c.id)}` : '/u/appointments'}">このクーポンを使う</a></article>`).join('') : '<article class="coupon"><h2>条件に合うクーポンはありません</h2><p>ほかのカテゴリーもご確認ください。新しいクーポンが届くと、お知らせにも表示されます。</p><a href="/u/coupons">すべてのクーポンを見る</a></article>'}</section>`
  sendCustomerHtml(res, customerShell({ title: 'クーポン', unread: data.unread, back: '/u/home', body }))
}

async function customerStampsPage(res, session, url) {
  const data = await customerAppData(session)
  const visits = await prisma.$queryRawUnsafe('SELECT "performedStyle","requestedStyle" FROM "Visit" WHERE "customerId"=$1 ORDER BY "visitedAt" DESC', session.customerId)
  const selected = url?.searchParams.get('type') === 'facial' ? 'facial' : 'hair'
  const facialPattern = /フェイシャル|フェイス|顔|エステ/
  const total = visits.filter(v => { const text = `${v.performedStyle || ''} ${v.requestedStyle || ''}`; return selected === 'facial' ? facialPattern.test(text) : !facialPattern.test(text) }).length
  const stamps = total % 10
  const label = selected === 'facial' ? 'フェイシャル' : 'ヘア'
  const tabs = `<a class="tab ${selected === 'hair' ? 'active' : ''}" href="/u/stamps"${selected === 'hair' ? ' aria-current="page"' : ''}>ヘア</a><a class="tab ${selected === 'facial' ? 'active' : ''}" href="/u/stamps?type=facial"${selected === 'facial' ? ' aria-current="page"' : ''}>フェイシャル</a>`
  const body = `<div class="page-title"><h1>スタンプカード</h1></div><nav class="tabs" aria-label="スタンプカード種別">${tabs}</nav><section class="stamp-card"><div class="section-head"><div><h2>${label}スタンプカード</h2><p>ご来店1回につき1スタンプ</p></div><strong>${stamps} / 10個</strong></div><div class="stamp-grid">${Array.from({length:10},(_,i) => `<span class="stamp-dot ${i < stamps ? 'on' : ''}">${i < stamps ? '✓' : i+1}</span>`).join('')}</div></section><section class="section"><div class="section-head"><div><h2>特典内容</h2><p>次回ご来店時にご利用いただけます</p></div></div><div class="coupon"><small>NEXT REWARD</small><h2>10個達成特典</h2><div class="benefit">${selected === 'facial' ? 'FACIAL SERVICE' : 'CARE SERVICE'}</div><p>${selected === 'facial' ? 'フェイシャルメニューの特典をご案内します。' : 'トリートメントサービスなど、現在の髪に合う特典をご案内します。'}</p><a href="/u/appointments">次回予約へ</a></div></section>`
  sendCustomerHtml(res, customerShell({ title: 'スタンプカード', unread: data.unread, back: '/u/home', body }))
}

async function customerNotificationItems(session) {
  const [broadcasts, messages] = await Promise.all([
    prisma.$queryRawUnsafe('SELECT b."id",b."title",b."body",r."readAt",r."deliveredAt" AS "createdAt" FROM "CustomerBroadcastRecipient" r JOIN "CustomerBroadcast" b ON b."id"=r."broadcastId" WHERE r."customerId"=$1 AND b."status"=\'sent\' ORDER BY r."deliveredAt" DESC LIMIT 200', session.customerId),
    prisma.$queryRawUnsafe('SELECT m."id",m."createdAt",LEFT(m."body",240) AS "body",t."id" AS "threadId",t."staffName",t."customerLastReadAt" FROM "ChatMessage" m JOIN "ChatThread" t ON t."id"=m."threadId" WHERE t."customerId"=$1 AND t."organizationId"=$2 AND m."senderType"=\'staff\' ORDER BY m."createdAt" DESC LIMIT 200', session.customerId, session.organizationId),
  ])
  return [
    ...broadcasts.map(row => ({ id: 'broadcast:' + row.id, readType: 'broadcast', readId: row.id, type: 'broadcast', title: row.title, body: row.body || '', createdAt: row.createdAt, href: '/u/news?open=broadcast:' + encodeURIComponent(row.id), isUnread: !row.readAt })),
    ...messages.map(row => ({ id: 'message:' + row.id, readType: 'message', readId: row.id, type: 'message', title: (row.staffName || '店舗スタッフ') + 'からメッセージ', body: row.body || '', createdAt: row.createdAt, href: '/u/chat?threadId=' + encodeURIComponent(row.threadId), isUnread: !row.customerLastReadAt || new Date(row.createdAt).getTime() > new Date(row.customerLastReadAt).getTime() })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

async function markCustomerNotificationsRead(req, res) {
  const session = await chatSession(req, 'customer')
  if (!session) return json(res, 401, { error: 'ログインが必要です。' })
  const origin = String(req.headers.origin || '')
  if (origin && !new Set(['https://' + req.headers.host, 'http://' + req.headers.host, 'https://salon-de-lien.com']).has(origin)) return json(res, 403, { error: '安全性を確認できませんでした。' })
  const input = await body(req)
  const ids = [...new Set((Array.isArray(input.ids) ? input.ids : []).map(String))].slice(0, 500)
  if (!ids.length) return json(res, 400, { error: '既読にする通知を選択してください。' })
  for (const key of ids) {
    const separator = key.indexOf(':')
    const type = key.slice(0, separator), id = key.slice(separator + 1)
    if (!id) continue
    if (type === 'broadcast') {
      await prisma.$executeRawUnsafe('UPDATE "CustomerBroadcastRecipient" SET "readAt"=COALESCE("readAt",CURRENT_TIMESTAMP) WHERE "customerId"=$1 AND "broadcastId"=$2', session.customerId, id)
    } else if (type === 'message') {
      const rows = await prisma.$queryRawUnsafe('SELECT m."createdAt",t."id" AS "threadId" FROM "ChatMessage" m JOIN "ChatThread" t ON t."id"=m."threadId" WHERE m."id"=$1 AND t."customerId"=$2 AND t."organizationId"=$3 AND m."senderType"=\'staff\' LIMIT 1', id, session.customerId, session.organizationId)
      if (rows[0]) await prisma.$executeRawUnsafe('UPDATE "ChatThread" SET "customerLastReadAt"=CASE WHEN "customerLastReadAt" IS NULL OR "customerLastReadAt"<$1 THEN $1 ELSE "customerLastReadAt" END WHERE "id"=$2', rows[0].createdAt, rows[0].threadId)
    }
  }
  return json(res, 200, { ok: true, marked: ids.length })
}

async function customerNewsPage(res, session) {
  const data = await customerAppData(session)
  const items = await customerNotificationItems(session)
  const rows = items.length ? items.map(item => '<article class="cn-row ' + (item.isUnread ? 'is-unread' : '') + '"><label class="cn-check"><input type="checkbox" data-cn-select="' + htmlEscape(item.id) + '" ' + (item.isUnread ? '' : 'disabled') + ' aria-label="' + htmlEscape(item.title) + 'を選択"></label><a href="' + htmlEscape(item.href) + '"' + (item.type === 'broadcast' && item.isUnread ? ' data-cn-open="' + htmlEscape(item.id) + '"' : '') + '><span class="cn-symbol">' + customerIcon(item.type === 'message' ? 'mail' : 'news') + '</span><span class="cn-copy"><span class="cn-meta">' + (item.isUnread ? '<b>未読</b>' : '<span>既読</span>') + '<time>' + htmlEscape(jpDate(item.createdAt, true)) + '</time></span><strong>' + htmlEscape(item.title) + '</strong><p>' + htmlEscape(item.body) + '</p></span>' + customerIcon('chevron','cn-arrow') + '</a></article>').join('') : '<p class="cn-empty">新しいお知らせはありません。</p>'
  const style = '<style>.cn-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:14px 18px;padding:12px 14px;border:1px solid var(--line);border-radius:13px;background:#fff}.cn-toolbar label{font-size:10px;font-weight:800}.cn-toolbar button{min-height:38px;border:0;border-radius:10px;background:var(--rose);padding:0 13px;color:#fff;font-size:10px;font-weight:900}.cn-toolbar button:disabled{opacity:.45}.cn-list{margin:0 18px 28px;overflow:hidden;border:1px solid var(--line);border-radius:15px;background:#fff}.cn-row{display:grid;grid-template-columns:38px 1fr;border-bottom:1px solid var(--line)}.cn-row:last-child{border-bottom:0}.cn-row.is-unread{background:#fff7f9}.cn-check{display:grid;place-items:center}.cn-check input{width:16px;height:16px;accent-color:var(--rose)}.cn-row>a{display:grid;grid-template-columns:38px 1fr 18px;align-items:center;gap:10px;padding:14px 12px 14px 0}.cn-symbol{display:grid;width:36px;height:36px;place-items:center;border-radius:50%;background:var(--rose-soft);color:var(--rose)}.cn-symbol .icon{width:19px;height:19px}.cn-copy{min-width:0}.cn-copy strong{display:block;margin-top:5px;font-size:11px}.cn-copy p{overflow:hidden;margin:5px 0 0;color:var(--muted);font-size:10px;text-overflow:ellipsis;white-space:nowrap}.cn-meta{display:flex;align-items:center;gap:8px;color:#a6958e;font-size:8px}.cn-meta b{border-radius:99px;background:#d84f69;padding:2px 6px;color:#fff}.cn-meta time{margin-left:auto}.cn-arrow{width:16px!important;color:#b6a59e}.cn-empty{padding:42px;text-align:center;color:var(--muted);font-size:11px}@media(min-width:1024px){.cn-toolbar,.cn-list{max-width:1120px;margin-right:auto;margin-left:auto}.cn-toolbar{margin-top:22px}.cn-list{margin-top:14px}}</style>'
  const script = '<script>document.addEventListener("DOMContentLoaded",()=>{const mark=ids=>fetch("/api/lien-customer-notifications/read",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids})});const all=document.querySelector("[data-cn-all]"),boxes=[...document.querySelectorAll("[data-cn-select]:not(:disabled)")],button=document.querySelector("[data-cn-read]");const sync=()=>{const selected=boxes.filter(x=>x.checked);button.disabled=!selected.length;button.textContent=selected.length?"選択した"+selected.length+"件を既読にする":"選択した通知を既読にする";all.checked=boxes.length>0&&selected.length===boxes.length;all.indeterminate=selected.length>0&&selected.length<boxes.length};boxes.forEach(x=>x.addEventListener("change",sync));all.addEventListener("change",()=>{boxes.forEach(x=>x.checked=all.checked);sync()});button.addEventListener("click",async()=>{button.disabled=true;const response=await mark(boxes.filter(x=>x.checked).map(x=>x.dataset.cnSelect));if(response.ok)location.reload();else{const result=await response.json().catch(()=>({}));alert(result.error||"既読にできませんでした。");button.disabled=false}});document.querySelectorAll("[data-cn-open]").forEach(link=>link.addEventListener("click",async event=>{event.preventDefault();const response=await mark([link.dataset.cnOpen]);if(response.ok)location.assign(link.href)}));sync()})</script>'
  const bodyHtml = '<div class="page-title"><h1>お知らせ</h1></div><div class="cn-toolbar"><label><input type="checkbox" data-cn-all> 表示中の未読をすべて選択</label><button type="button" data-cn-read disabled>選択した通知を既読にする</button></div><section class="cn-list">' + rows + '</section>' + style + script
  sendCustomerHtml(res, customerShell({ title: 'お知らせ', unread: data.unread, back: '/u/home', body: bodyHtml }))
}

async function customerMenuPage(res, session) {
  const data = await customerAppData(session)
  const rows = [['bell','SMS予約通知','/u/sms-settings'],['user','会員情報の確認・変更','/u/profile'],['store','登録済みの店舗','/u/stores'],['clock','来店履歴','/u/history'],['points','ポイント','/u/points'],['ticket','クーポン','/u/coupons'],['stamp','スタンプカード','/u/stamps'],['crown','アイテムランキング','/u/catalog'],['scissors','ヘアスタイル','/u/community'],['heart','商品アンケート','/u/reviews'],['mail','チャット相談','/u/chat']]
  const body = `<section class="welcome"><strong>${htmlEscape(data.customer?.name)} 様</strong><span>会員メニュー</span></section><section class="menu-list">${rows.map(([icon,label,href]) => `<a class="menu-row" href="${href}">${customerIcon(icon)}<strong>${label}</strong>${customerIcon('chevron','chev')}</a>`).join('')}<form action="/api/customer-auth/logout" method="post"><button class="secondary" style="width:100%;margin-top:18px" type="submit">ログアウト</button></form></section>`
  sendCustomerHtml(res, customerShell({ title: 'メニュー', active: 'メニュー', unread: data.unread, body }))
}

async function customerBrandedPage(req, res, url) {
  const session = await chatSession(req, 'customer')
  if (!session) { res.statusCode = 302; res.setHeader('Location', '/u/login'); return res.end() }
  if (url.pathname === '/u/home') return customerHomePage(res, session)
  if (url.pathname === '/u/catalog') return customerCatalogPage(res, session, null, url)
  if (url.pathname.startsWith('/u/catalog/')) return customerCatalogPage(res, session, decodeURIComponent(url.pathname.slice('/u/catalog/'.length)), url)
  if (url.pathname === '/u/coupons') return customerCouponsPage(res, session, url)
  if (url.pathname === '/u/stamps') return customerStampsPage(res, session, url)
  if (url.pathname === '/u/news') return customerNewsPage(res, session)
  if (url.pathname === '/u/menu') return customerMenuPage(res, session)
}

function staffProfileKey(row) {
  const loginId = String(row.loginId || '').trim().toLowerCase()
  const byLogin = { tanizaki: 'tanizaki', watanabe: 'watanabe', asano: 'asano', kobayashi: 'kobayashi', kaori: 'kaori', lien: 'tanizaki' }
  if (byLogin[loginId]) return byLogin[loginId]
  const name = String(row.displayName || '').replace(/[\s　]/g, '')
  if (/谷崎/.test(name)) return 'tanizaki'
  if (/渡邉|渡辺|渡邊/.test(name)) return 'watanabe'
  if (/浅野/.test(name)) return 'asano'
  if (/小林/.test(name)) return 'kobayashi'
  if (/kaori/i.test(name)) return 'kaori'
  return ''
}

async function staffProfilesApi(req, res) {
  const session = await chatSession(req, 'customer')
  if (!session) return json(res, 401, { error: 'ログインが必要です。' })
  await ensureLienEnhancementTables()
  const rows = await prisma.$queryRawUnsafe('SELECT u."loginId",u."displayName",p."introduction",p."updatedAt" FROM "AppUser" u JOIN "StaffProfileSetting" p ON p."userId"=u."id" AND p."organizationId"=u."organizationId" WHERE u."organizationId"=$1 AND u."role" IN (\'ADMIN\',\'STAFF\') AND u."active"=true AND BTRIM(p."introduction")<>\'\' ORDER BY p."updatedAt" ASC', session.organizationId)
  const profiles = {}, priorities = {}
  for (const row of rows) {
    const key = staffProfileKey(row)
    if (!key) continue
    const priority = String(row.loginId || '').toLowerCase() === 'lien' ? 1 : 2
    if ((priorities[key] || 0) > priority) continue
    profiles[key] = String(row.introduction || '').trim().slice(0, 160)
    priorities[key] = priority
  }
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  return json(res, 200, { profiles })
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

async function syncStaffSystemNotifications(organizationId) {
  const recentCustomers = await prisma.$queryRawUnsafe('SELECT "id","name","gender","createdAt" FROM "Customer" WHERE "organizationId"=$1 AND "deletedAt" IS NULL AND "createdAt">NOW()-INTERVAL \'7 days\' ORDER BY "createdAt" DESC LIMIT 50', organizationId)
  for (const customer of recentCustomers) {
    const inflow = await prisma.$queryRawUnsafe('SELECT "id" FROM "StaffSystemNotification" WHERE "organizationId"=$1 AND "type"=\'store_inflow\' AND "entityId"=$2 LIMIT 1', organizationId, customer.id)
    if (inflow.length) continue
    await prisma.$executeRawUnsafe('INSERT INTO "StaffSystemNotification" ("id","organizationId","type","title","body","href","entityType","entityId","source") VALUES ($1,$2,\'new_registration\',\'新しいお客様が登録されました\',$3,$4,\'customer\',$5,\'customer_registration\') ON CONFLICT ("organizationId","type","entityId") DO NOTHING', crypto.randomUUID(), organizationId, `${customer.name || 'お客様'}様の顧客情報を確認してください。`, `/admin/customers/${encodeURIComponent(customer.id)}`, customer.id)
  }
  const duplicates = await prisma.$queryRawUnsafe(`SELECT LOWER(REGEXP_REPLACE(BTRIM("name"),'[\\s　]+','','g')) AS "normalizedName",COALESCE("gender",'') AS "gender",COUNT(*)::int AS "count",MIN("id") AS "firstId",STRING_AGG("id",',' ORDER BY "createdAt") AS "customerIds",MIN("name") AS "displayName" FROM "Customer" WHERE "organizationId"=$1 AND "deletedAt" IS NULL GROUP BY 1,2 HAVING COUNT(*)>1 LIMIT 40`, organizationId)
  for (const duplicate of duplicates) {
    const entityId = crypto.createHash('sha256').update(`${duplicate.normalizedName}:${duplicate.gender}`).digest('hex').slice(0, 32)
    await prisma.$executeRawUnsafe('INSERT INTO "StaffSystemNotification" ("id","organizationId","type","title","body","href","entityType","entityId","source") VALUES ($1,$2,\'duplicate_candidate\',\'同一人物の可能性がある顧客が見つかりました\',$3,$4,\'customer_group\',$5,\'duplicate_detection\') ON CONFLICT ("organizationId","type","entityId") DO NOTHING', crypto.randomUUID(), organizationId, `${duplicate.displayName || '同名のお客様'}様が${duplicate.count}件登録されています。内容を確認し、統合が必要か判断してください。`, `/admin/customers/${encodeURIComponent(duplicate.firstId)}`, entityId)
  }
}

async function markStaffNotificationRead(req, res) {
  const session = await chatSession(req, 'staff')
  if (!session) return json(res, 401, { error: 'ログインが必要です。' })
  const origin = req.headers.origin
  if (origin && new URL(origin).host !== req.headers.host) return json(res, 403, { error: '不正な送信元です。' })
  await ensureLienEnhancementTables()
  const data = await body(req)
  const submitted = Array.isArray(data.notifications) ? data.notifications : [{ type: data.type, id: data.id }]
  if (!submitted.length || submitted.length > 500) return json(res, 400, { error: '1件以上500件以下の通知を選択してください。' })

  const notifications = []
  const seen = new Set()
  for (const candidate of submitted) {
    const type = String(candidate?.type || '')
    const id = String(candidate?.id || '')
    if (!['appointment', 'event', 'message'].includes(type) || !id || id.length > 200) {
      return json(res, 400, { error: '既読にする通知を特定できません。' })
    }
    const key = type + ':' + id
    if (!seen.has(key)) { seen.add(key); notifications.push({ type, id }) }
  }

  const validated = []
  for (const notification of notifications) {
    if (notification.type === 'appointment') {
      const rows = await prisma.$queryRawUnsafe('SELECT a."id" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" WHERE a."id"=$1 AND c."organizationId"=$2 AND c."deletedAt" IS NULL LIMIT 1', notification.id, session.organizationId)
      if (!rows.length) return json(res, 404, { error: '選択した予約通知が見つかりません。' })
      validated.push(notification)
      continue
    }
    if (notification.type === 'event') {
      const rows = await prisma.$queryRawUnsafe('SELECT "id" FROM "StaffSystemNotification" WHERE "id"=$1 AND "organizationId"=$2 LIMIT 1', notification.id, session.organizationId)
      if (!rows.length) return json(res, 404, { error: '選択したシステム通知が見つかりません。' })
      validated.push(notification)
      continue
    }
    const rows = await prisma.$queryRawUnsafe('SELECT m."id",m."createdAt",t."id" AS "threadId" FROM "ChatMessage" m JOIN "ChatThread" t ON t."id"=m."threadId" WHERE m."id"=$1 AND t."organizationId"=$2 AND m."senderType"=\'customer\' LIMIT 1', notification.id, session.organizationId)
    if (!rows.length) return json(res, 404, { error: '選択したメッセージ通知が見つかりません。' })
    validated.push({ ...notification, threadId: rows[0].threadId, createdAt: rows[0].createdAt })
  }

  await prisma.$transaction(async tx => {
    for (const notification of validated) {
      if (notification.type === 'message') {
        await tx.$executeRawUnsafe('UPDATE "ChatThread" SET "staffLastReadAt"=CASE WHEN "staffLastReadAt" IS NULL OR "staffLastReadAt"<$1 THEN $1 ELSE "staffLastReadAt" END WHERE "id"=$2 AND "organizationId"=$3', notification.createdAt, notification.threadId, session.organizationId)
      } else {
        await tx.$executeRawUnsafe('INSERT INTO "StaffNotificationRead" ("userId","organizationId","notificationType","notificationId","readAt") VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP) ON CONFLICT ("userId","notificationType","notificationId") DO UPDATE SET "readAt"=CURRENT_TIMESTAMP,"organizationId"=EXCLUDED."organizationId"', session.userId, session.organizationId, notification.type, notification.id)
      }
    }
  })
  return json(res, 200, { success: true, marked: validated.length })
}

async function staffNotifications(req, res, options = {}) {
  const history = Boolean(options.history)
  const session = await chatSession(req, 'staff')
  if (!session) return json(res, 401, { error: 'ログインが必要です。' })
  await ensureLienEnhancementTables()
  await syncStaffSystemNotifications(session.organizationId)
  const appointments = history
    ? await prisma.$queryRawUnsafe('SELECT a."id",a."createdAt",a."scheduledAt",a."menu",a."status",c."name" AS "customerName" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" WHERE c."organizationId"=$1 AND c."deletedAt" IS NULL AND COALESCE(a."source",\'\') NOT LIKE \'ses:%\' ORDER BY a."createdAt" DESC LIMIT 100', session.organizationId)
    : await prisma.$queryRawUnsafe('SELECT a."id",a."createdAt",a."scheduledAt",a."menu",a."status",c."name" AS "customerName" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" WHERE c."organizationId"=$1 AND c."deletedAt" IS NULL AND COALESCE(a."source",\'\') NOT LIKE \'ses:%\' AND NOT EXISTS (SELECT 1 FROM "StaffNotificationRead" r WHERE r."userId"=$2 AND r."notificationType"=\'appointment\' AND r."notificationId"=a."id") ORDER BY a."createdAt" DESC LIMIT 30', session.organizationId, session.userId)
  const messages = history
    ? await prisma.$queryRawUnsafe('SELECT m."id",m."createdAt",LEFT(m."body",180) AS "body",t."id" AS "threadId",t."staffName",t."staffLastReadAt",c."id" AS "customerId",c."name" AS "customerName" FROM "ChatMessage" m JOIN "ChatThread" t ON t."id"=m."threadId" JOIN "Customer" c ON c."id"=t."customerId" WHERE t."organizationId"=$1 AND c."deletedAt" IS NULL AND m."senderType"=\'customer\' ORDER BY m."createdAt" DESC LIMIT 100', session.organizationId)
    : []
  const events = history
    ? await prisma.$queryRawUnsafe('SELECT n."id",n."type",n."title",n."body",n."href",n."source",n."createdAt" FROM "StaffSystemNotification" n WHERE n."organizationId"=$1 AND NOT (n."type"=\'new_registration\' AND EXISTS (SELECT 1 FROM "StaffSystemNotification" i WHERE i."organizationId"=n."organizationId" AND i."type"=\'store_inflow\' AND i."entityId"=n."entityId")) ORDER BY n."createdAt" DESC LIMIT 150', session.organizationId)
    : await prisma.$queryRawUnsafe('SELECT n."id",n."type",n."title",n."body",n."href",n."source",n."createdAt" FROM "StaffSystemNotification" n WHERE n."organizationId"=$1 AND NOT EXISTS (SELECT 1 FROM "StaffNotificationRead" r WHERE r."userId"=$2 AND r."notificationType"=\'event\' AND r."notificationId"=n."id") AND NOT (n."type"=\'new_registration\' AND EXISTS (SELECT 1 FROM "StaffSystemNotification" i WHERE i."organizationId"=n."organizationId" AND i."type"=\'store_inflow\' AND i."entityId"=n."entityId")) ORDER BY n."createdAt" DESC LIMIT 50', session.organizationId, session.userId)
  const readRows = history ? await prisma.$queryRawUnsafe('SELECT "notificationType","notificationId" FROM "StaffNotificationRead" WHERE "userId"=$1 AND "organizationId"=$2', session.userId, session.organizationId) : []
  const readKeys = new Set(readRows.map(item => item.notificationType + ':' + item.notificationId))
  const appointmentItems = appointments.map(item => ({ ...item, isUnread: !readKeys.has('appointment:' + item.id) }))
  const messageItems = messages.filter(item => canAccessThread(session, item)).map(item => ({ ...item, isUnread: !item.staffLastReadAt || new Date(item.createdAt).getTime() > new Date(item.staffLastReadAt).getTime() }))
  const messageCount = history ? messageItems.filter(item => item.isUnread).length : await unreadChatCount(req, 'staff')
  const eventItems = events.map(item => ({ ...item, isUnread: !readKeys.has('event:' + item.id) }))
  return json(res, 200, {
    count: history ? appointmentItems.filter(item => item.isUnread).length + messageCount + eventItems.filter(item => item.isUnread).length : appointments.length + messageCount + events.length,
    appointmentCount: history ? appointmentItems.filter(item => item.isUnread).length : appointments.length,
    messageCount,
    eventCount: history ? eventItems.filter(item => item.isUnread).length : events.length,
    appointments: appointmentItems,
    messages: messageItems,
    events: eventItems,
  })
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

let smsComplianceSchemaPromise = null
let smsCompliancePollRunning = false

async function ensureSmsComplianceSchema() {
  if (!smsComplianceSchemaPromise) {
    smsComplianceSchemaPromise = (async () => {
      const migration = fs.readFileSync(path.join(__dirname, 'sms-compliance-migration.sql'), 'utf8')
      const statements = migration.split(/\n\s*-- statement-breakpoint\s*\n/g).map(value => value.trim()).filter(Boolean)
      for (const statement of statements) await prisma.$executeRawUnsafe(statement)
    })().catch(error => {
      smsComplianceSchemaPromise = null
      throw error
    })
  }
  return smsComplianceSchemaPromise
}

function smsMaskedPhone(value) {
  const match = String(value || '').match(/^\+81(70|80|90)(\d{4})(\d{4})$/)
  return match ? ('0' + match[1] + '-****-' + match[3]) : '未登録'
}

function smsIsCancelled(status) {
  return /cancel|キャンセル/i.test(String(status || ''))
}

function smsJpDateTime(value) {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(value))
}

function smsMessageFor(type, appointment) {
  const when = smsJpDateTime(appointment.scheduledAt)
  const menu = String(appointment.menu || 'ご予約メニュー').replace(/[\r\n]+/g, ' ').slice(0, 80)
  const messages = {
    RESERVATION_CONFIRMATION: `Salon de Lien 予約確認: ${when} ${menu}。ご予約内容はお客様アプリで確認できます。`,
    RESERVATION_REMINDER: `Salon de Lien 予約リマインド: ${when} ${menu}。ご来店をお待ちしております。`,
    RESERVATION_CHANGED: `Salon de Lien 予約変更: 変更後は ${when} ${menu} です。お客様アプリで内容をご確認ください。`,
    RESERVATION_CANCELLED: `Salon de Lien 予約キャンセル: ${when} ${menu} のご予約をキャンセルしました。`,
  }
  return messages[type]
}

function smsProviderClient() {
  if (!globalThis.__lienSmsSnsClient) {
    globalThis.__lienSmsSnsClient = new SNSClient({ region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-northeast-1' })
  }
  return globalThis.__lienSmsSnsClient
}

async function smsPublish(phoneE164, message) {
  const attributes = {
    'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' },
    'AWS.SNS.SMS.SenderID': { DataType: 'String', StringValue: (process.env.SMS_SENDER_ID || 'SalonLien').trim() || 'SalonLien' },
  }
  const maxPrice = process.env.SMS_MAX_PRICE_USD && process.env.SMS_MAX_PRICE_USD.trim()
  if (maxPrice) attributes['AWS.SNS.SMS.MaxPrice'] = { DataType: 'Number', StringValue: maxPrice }
  const result = await smsProviderClient().send(new PublishCommand({ PhoneNumber: phoneE164, Message: message, MessageAttributes: attributes }))
  if (!result.MessageId) throw new Error('AWS SNS did not return a message ID')
  return result.MessageId
}

async function smsInsertSkippedLog(appointment, customer, type, eventKey, status, phoneE164) {
  const rows = await prisma.$queryRawUnsafe(
    'INSERT INTO "SmsSendLog" ("id","organizationId","customerId","appointmentId","phoneE164","smsType","smsCategory","eventKey","requestedAt","success","status","provider","transactionalOptInAtSend","consentSourceAtSend","userInitiated","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,\'RESERVATION\',$7,CURRENT_TIMESTAMP,false,$8,\'AWS_SNS\',$9,$10,false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("eventKey") DO NOTHING RETURNING "id"',
    crypto.randomUUID(), customer.organizationId, customer.id, appointment.id, phoneE164, type, eventKey, status,
    Boolean(customer.smsTransactionalOptIn), customer.smsConsentSource || null,
  )
  return rows.length > 0
}

async function sendReservationSms(type, appointment, eventKey) {
  const message = smsMessageFor(type, appointment)
  if (!message) throw new Error(`Unsupported reservation SMS type: ${type}`)
  const customers = await prisma.$queryRawUnsafe(
    'SELECT c."id",c."organizationId",c."phone",c."phoneVerifiedAt",c."smsTransactionalOptIn",c."smsTransactionalOptInAt",c."smsTransactionalOptOutAt",c."smsConsentSource",i."phoneE164",i."verifiedAt" AS "identityVerifiedAt" FROM "Customer" c LEFT JOIN "CustomerPhoneIdentity" i ON i."customerId"=c."id" AND i."organizationId"=c."organizationId" WHERE c."id"=$1 AND c."deletedAt" IS NULL LIMIT 1',
    appointment.customerId,
  )
  const customer = customers[0]
  if (!customer) return false
  const phone = customer.phoneE164 || ''
  let skipped = null
  if (!phone) skipped = 'SKIPPED_NO_PHONE'
  else if (!customer.phoneVerifiedAt || !customer.identityVerifiedAt) skipped = 'SKIPPED_UNVERIFIED'
  else if (customer.smsTransactionalOptOutAt) skipped = 'SKIPPED_OPTED_OUT'
  else if (customer.smsTransactionalOptIn !== true) skipped = 'SKIPPED_NO_CONSENT'
  if (skipped) {
    await smsInsertSkippedLog(appointment, customer, type, eventKey, skipped, phone)
    return false
  }

  const logId = crypto.randomUUID()
  const claimed = await prisma.$queryRawUnsafe(
    'INSERT INTO "SmsSendLog" ("id","organizationId","customerId","appointmentId","phoneE164","smsType","smsCategory","eventKey","requestedAt","success","status","provider","transactionalOptInAtSend","consentSourceAtSend","userInitiated","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,\'RESERVATION\',$7,CURRENT_TIMESTAMP,NULL,\'PENDING\',\'AWS_SNS\',true,$8,false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("eventKey") DO NOTHING RETURNING "id"',
    logId, customer.organizationId, customer.id, appointment.id, phone, type, eventKey, customer.smsConsentSource || null,
  )
  if (!claimed.length) return false

  try {
    const messageId = await smsPublish(phone, message)
    await prisma.$executeRawUnsafe(
      'UPDATE "SmsSendLog" SET "sentAt"=CURRENT_TIMESTAMP,"success"=true,"status"=\'SENT\',"awsMessageId"=$2,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1',
      logId, messageId,
    )
    return true
  } catch (error) {
    const code = error && typeof error === 'object' && 'name' in error ? String(error.name).slice(0, 100) : 'SMS_SEND_FAILED'
    const detail = (error instanceof Error ? error.message : String(error)).slice(0, 500)
    await prisma.$executeRawUnsafe(
      'UPDATE "SmsSendLog" SET "success"=false,"status"=\'FAILED\',"errorCode"=$2,"errorMessage"=$3,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1',
      logId, code, detail,
    )
    console.error('reservation SMS failed', { appointmentId: appointment.id, type, code })
    return false
  }
}

async function observeAppointmentSmsChanges() {
  const initialized = (await prisma.$queryRawUnsafe('SELECT "initializedAt" FROM "SmsComplianceState" WHERE "id"=\'sms-compliance-v1\' LIMIT 1'))[0]
  if (!initialized) return
  const appointments = await prisma.$queryRawUnsafe(
    'SELECT a."id",a."customerId",a."scheduledAt",a."menu",a."status",a."createdAt",a."updatedAt",s."scheduledAt" AS "observedScheduledAt",s."status" AS "observedStatus",s."lastObservedUpdatedAt" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" LEFT JOIN "SmsAppointmentState" s ON s."appointmentId"=a."id" WHERE c."deletedAt" IS NULL AND (s."id" IS NULL OR s."scheduledAt" IS DISTINCT FROM a."scheduledAt" OR s."status" IS DISTINCT FROM a."status") ORDER BY a."updatedAt" ASC LIMIT 200',
  )
  for (const appointment of appointments) {
    if (!appointment.lastObservedUpdatedAt) {
      const inserted = await prisma.$queryRawUnsafe(
        'INSERT INTO "SmsAppointmentState" ("id","appointmentId","scheduledAt","status","lastObservedUpdatedAt","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("appointmentId") DO NOTHING RETURNING "id"',
        `sms-state-${appointment.id}`, appointment.id, appointment.scheduledAt, appointment.status || null, appointment.updatedAt,
      )
      if (inserted.length && new Date(appointment.createdAt) >= new Date(initialized.initializedAt) && !smsIsCancelled(appointment.status)) {
        await sendReservationSms('RESERVATION_CONFIRMATION', appointment, `reservation-confirmation:${appointment.id}`)
      }
      continue
    }

    const won = await prisma.$queryRawUnsafe(
      'UPDATE "SmsAppointmentState" SET "scheduledAt"=$2,"status"=$3,"lastObservedUpdatedAt"=$4,"updatedAt"=CURRENT_TIMESTAMP WHERE "appointmentId"=$1 AND "scheduledAt"=$5 AND "status" IS NOT DISTINCT FROM $6 RETURNING "id"',
      appointment.id, appointment.scheduledAt, appointment.status || null, appointment.updatedAt,
      appointment.observedScheduledAt, appointment.observedStatus || null,
    )
    if (!won.length) continue
    if (smsIsCancelled(appointment.status) && !smsIsCancelled(appointment.observedStatus)) {
      await sendReservationSms('RESERVATION_CANCELLED', appointment, `reservation-cancelled:${appointment.id}`)
    } else if (new Date(appointment.scheduledAt).getTime() !== new Date(appointment.observedScheduledAt).getTime() && !smsIsCancelled(appointment.status)) {
      await sendReservationSms('RESERVATION_CHANGED', appointment, `reservation-changed:${appointment.id}:${new Date(appointment.scheduledAt).toISOString()}`)
    }
  }
}

async function sendDueReservationReminders() {
  const appointments = await prisma.$queryRawUnsafe(
    'SELECT a."id",a."customerId",a."scheduledAt",a."menu",a."status",a."createdAt",a."updatedAt" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" JOIN "SmsAppointmentState" s ON s."appointmentId"=a."id" AND s."scheduledAt"=a."scheduledAt" WHERE c."deletedAt" IS NULL AND a."scheduledAt">CURRENT_TIMESTAMP + INTERVAL \'20 hours\' AND a."scheduledAt"<=CURRENT_TIMESTAMP + INTERVAL \'24 hours\' AND a."updatedAt"<CURRENT_TIMESTAMP - INTERVAL \'1 hour\' ORDER BY a."scheduledAt" ASC LIMIT 200',
  )
  for (const appointment of appointments) {
    if (!smsIsCancelled(appointment.status)) {
      await sendReservationSms('RESERVATION_REMINDER', appointment, `reservation-reminder:${appointment.id}:${new Date(appointment.scheduledAt).toISOString()}`)
    }
  }
}

async function runSmsComplianceCycle() {
  if (smsCompliancePollRunning) return
  smsCompliancePollRunning = true
  try {
    await ensureSmsComplianceSchema()
    await prisma.$executeRawUnsafe('UPDATE "SmsSendLog" AS log SET "customerId"=identity."customerId","updatedAt"=CURRENT_TIMESTAMP FROM "CustomerPhoneIdentity" AS identity WHERE log."customerId" IS NULL AND log."organizationId"=identity."organizationId" AND log."phoneE164"=identity."phoneE164" AND log."smsCategory"=\'OTP\'')
    await observeAppointmentSmsChanges()
    await sendDueReservationReminders()
  } catch (error) {
    console.error('SMS compliance cycle failed', error)
  } finally {
    smsCompliancePollRunning = false
  }
}

async function customerSmsSettingsPage(res, session, url) {
  await ensureSmsComplianceSchema()
  const data = await customerAppData(session)
  const rows = await prisma.$queryRawUnsafe(
    'SELECT c."phoneVerifiedAt",c."smsTransactionalOptIn",c."smsTransactionalOptInAt",c."smsTransactionalOptOutAt",c."smsConsentSource",i."phoneE164",i."verifiedAt" AS "identityVerifiedAt" FROM "Customer" c LEFT JOIN "CustomerPhoneIdentity" i ON i."customerId"=c."id" AND i."organizationId"=c."organizationId" WHERE c."id"=$1 LIMIT 1',
    session.customerId,
  )
  const state = rows[0] || {}
  const verified = Boolean(state.phoneVerifiedAt && state.identityVerifiedAt)
  const enabled = verified && state.smsTransactionalOptIn === true && !state.smsTransactionalOptOutAt
  const notice = url.searchParams.get('saved') === '1' ? '<p role="status" style="margin:0 0 14px;border:1px solid #bfd5c1;border-radius:12px;background:#f2f8f2;padding:12px;color:#315c3c;font-size:12px">SMS予約通知の設定を保存しました。</p>' : ''
  const body = `<div class="page-title"><h1>SMS予約通知</h1></div><section class="section">${notice}<form action="/api/lien-sms-consent" method="post" style="margin-top:16px"><input type="hidden" name="disabledValue" value="1"><label style="display:flex;align-items:flex-start;gap:12px;border:1px solid #eaded9;border-radius:14px;background:#fff;padding:16px"><input type="checkbox" name="enabled" value="1" ${enabled ? 'checked' : ''} ${verified ? '' : 'disabled'} style="width:22px;height:22px;accent-color:#d85d79"><span><strong style="display:block;font-size:13px;line-height:1.6">SMSで予約確認、予約変更・キャンセル通知、予約リマインドを受け取る</strong><small style="display:block;margin-top:6px;color:#81756f;line-height:1.7">任意の設定です。電話番号認証用OTPとは別の同意で、初期状態はOFFです。いつでもOFFにできます。</small></span></label><button class="primary" type="submit" style="width:100%;border:0" ${verified ? '' : 'disabled'}>設定を保存</button></form>${verified ? '' : '<p style="margin-top:12px;color:#a04d42;font-size:11px">予約通知をONにするには、認証済みの電話番号が必要です。</p>'}<div class="recommend"><h2>現在の記録</h2><ul><li>予約関連SMS: ${enabled ? 'ON' : 'OFF'}</li><li>同意日時: ${state.smsTransactionalOptInAt ? htmlEscape(jpDate(state.smsTransactionalOptInAt, true)) : '未同意'}</li><li>解除日時: ${state.smsTransactionalOptOutAt ? htmlEscape(jpDate(state.smsTransactionalOptOutAt, true)) : 'なし'}</li></ul></div></section>`
  sendCustomerHtml(res, customerShell({ title: 'SMS予約通知', active: 'メニュー', unread: data.unread, back: '/u/menu', body }))
}

async function customerSmsConsent(req, res) {
  const session = await chatSession(req, 'customer')
  if (!session) { res.statusCode = 302; res.setHeader('Location', '/u/login'); return res.end() }
  const origin = req.headers.origin
  if (origin && new URL(origin).host !== req.headers.host) return json(res, 403, { error: '不正な送信元です。' })
  await ensureSmsComplianceSchema()
  let raw = ''; for await (const chunk of req) raw += chunk
  const form = new URLSearchParams(raw)
  const enabled = form.get('enabled') === '1'
  const verified = (await prisma.$queryRawUnsafe('SELECT c."smsTransactionalOptIn",c."phoneVerifiedAt",i."verifiedAt" FROM "Customer" c LEFT JOIN "CustomerPhoneIdentity" i ON i."customerId"=c."id" AND i."organizationId"=c."organizationId" WHERE c."id"=$1 AND c."organizationId"=$2 LIMIT 1', session.customerId, session.organizationId))[0]
  if (!verified) return json(res, 404, { error: '顧客情報が見つかりません。' })
  if (enabled && (!verified.phoneVerifiedAt || !verified.verifiedAt)) return json(res, 400, { error: '電話番号認証を完了してください。' })
  if (enabled) {
    await prisma.$executeRawUnsafe('UPDATE "Customer" SET "smsTransactionalOptIn"=true,"smsTransactionalOptInAt"=CURRENT_TIMESTAMP,"smsTransactionalOptOutAt"=NULL,"smsConsentSource"=\'customer_portal\',"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1 AND "organizationId"=$2', session.customerId, session.organizationId)
  } else {
    await prisma.$executeRawUnsafe('UPDATE "Customer" SET "smsTransactionalOptIn"=false,"smsTransactionalOptOutAt"=CASE WHEN "smsTransactionalOptIn" THEN CURRENT_TIMESTAMP ELSE "smsTransactionalOptOutAt" END,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1 AND "organizationId"=$2', session.customerId, session.organizationId)
  }
  res.statusCode = 303; res.setHeader('Location', '/u/sms-settings?saved=1'); res.end()
}

async function adminSmsStatusApi(req, res, url) {
  await ensureSmsComplianceSchema()
  const session = await chatSession(req, 'staff')
  if (!session) return json(res, 401, { error: 'ログインが必要です。' })
  const customerId = String(url.searchParams.get('customerId') || '')
  if (!customerId) return json(res, 400, { error: '顧客IDが必要です。' })
  const rows = await prisma.$queryRawUnsafe('SELECT c."phoneVerifiedAt",c."smsTransactionalOptIn",c."smsTransactionalOptInAt",c."smsTransactionalOptOutAt",c."smsConsentSource",i."phoneE164",i."verifiedAt" AS "identityVerifiedAt" FROM "Customer" c LEFT JOIN "CustomerPhoneIdentity" i ON i."customerId"=c."id" AND i."organizationId"=c."organizationId" WHERE c."id"=$1 AND c."organizationId"=$2 AND c."deletedAt" IS NULL LIMIT 1', customerId, session.organizationId)
  const state = rows[0]
  if (!state) return json(res, 404, { error: '顧客が見つかりません。' })
  const verified = Boolean(state.phoneVerifiedAt && state.identityVerifiedAt)
  const enabled = verified && state.smsTransactionalOptIn === true && !state.smsTransactionalOptOutAt
  return json(res, 200, {
    phone: smsMaskedPhone(state.phoneE164),
    verified,
    phoneVerifiedAt: state.phoneVerifiedAt ? jpDate(state.phoneVerifiedAt, true) : null,
    enabled,
    optInAt: state.smsTransactionalOptInAt ? jpDate(state.smsTransactionalOptInAt, true) : null,
    optOutAt: state.smsTransactionalOptOutAt ? jpDate(state.smsTransactionalOptOutAt, true) : null,
    source: state.smsConsentSource || null,
    readOnly: true,
  })
}

const billing = createBillingService({
  prisma,
  sessionProvider: req => chatSession(req, 'staff'),
  crypto,
}) /* stripe-subscription-billing-v52-service */

const tenantSetup = createTenantSetupService({
  prisma,
  sessionProvider: req => chatSession(req, 'staff'),
  customerSessionProvider: req => chatSession(req, 'customer'),
  crypto,
}) /* tenant-bootstrap-v70-service */
const platformOperator = createPlatformOperatorService({ prisma, crypto }) /* platform-readonly-operations-v95-service */
const catalogOperations = createCatalogOperationsService({ prisma, crypto }) /* catalog-registration-v96-service */
const storeProfile = createStoreProfileService({ prisma, crypto }) /* commercial-admin-v101-service */
customerStoreStaff = createCustomerStoreStaffService({
  prisma,
  staffSessionProvider: req => chatSession(req, 'staff'),
  customerSessionProvider: req => chatSession(req, 'customer'),
  renderCustomerShell: customerShell,
})
customerLinks = createCustomerLinkService({
  prisma,
  staffSessionProvider: req => chatSession(req, 'staff'),
  customerSessionProvider: req => chatSession(req, 'customer'),
  renderCustomerShell: customerShell,
})
const customerWithdrawal = createCustomerWithdrawalService({
  prisma,
  crypto,
  sessionProvider: req => chatSession(req, 'customer'),
}) /* verified-customer-withdrawal-v309-service */
const salesLedgerAccounts = createSalesLedgerAccountsService({
  prisma,
  crypto,
  sessionProvider: req => chatSession(req, 'staff'),
}) /* sales-ledger-accounts-v318-service */
const customerMerge = createCustomerMergeService({
  prisma,
  crypto,
  sessionProvider: req => chatSession(req, 'staff'),
}) /* customer-record-merge-v385-service */
const attendanceNotificationProduct = createAttendanceNotificationProductService({
  prisma,
  crypto,
  sessionProvider: req => chatSession(req, 'staff'),
}) /* attendance-multi-shift-v349-service */
const communityPublishing = createCommunityPublishingService({
  prisma,
  crypto,
  sessionProvider: req => chatSession(req, 'staff'),
}) /* community-publishing-v348-service */
const appointmentOperations = createAppointmentOperationsService({
  prisma,
  crypto,
  sessionProvider: req => chatSession(req, 'staff'),
  customerSessionProvider: req => chatSession(req, 'customer'),
  runtimeScript: fs.readFileSync(path.join(__dirname, 'customer-runtime-v267.js')),
})

const customerAppointmentCancellation = createCustomerAppointmentCancellationService({ prisma, crypto, sessionProvider: req => chatSession(req, 'customer') }) /* customer-appointment-cancellation-v362-service */
const customerBookingCoupon = createCustomerBookingCouponService({ prisma, sessionProvider: req => chatSession(req, 'customer') }) /* customer-booking-coupon-v366-service */

const app = next({ dev: false, dir, conf: nextConfig })
app.prepare().then(async () => {
  await billing.ensureSchema() /* stripe-subscription-billing-v52-schema */
  await tenantSetup.ensureSchema() /* tenant-bootstrap-v70-schema */
  await catalogOperations.ensureSchema() /* catalog-registration-v96-schema */
  await appointmentOperations.ensureSchema()
  await customerStoreStaff.ensureSchema()
  await customerLinks.ensureSchema()
  await customerWithdrawal.ensureSchema() /* verified-customer-withdrawal-v309-schema */
  await customerBookingCoupon.ensureSchema() /* customer-booking-coupon-v366-schema */
  await salesLedgerAccounts.ensureSchema() /* sales-ledger-accounts-v318-schema */
  await customerMerge.ensureSchema() /* customer-record-merge-v385-schema */
  await attendanceNotificationProduct.ensureSchema() /* attendance-multi-shift-v349-schema */
  await communityPublishing.ensureSchema() /* community-publishing-v348-schema */
  await ensureSmsComplianceSchema()
  const handle = app.getRequestHandler()
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
      if (url.pathname === '/admin/settings' && req.method === 'GET') {
        const settingsActor = await chatSession(req, 'staff')
        if (settingsActor && settingsActor.role !== 'ADMIN') {
          res.statusCode = 303
          res.setHeader('Location', '/admin/account?notice=owner-required')
          res.setHeader('Cache-Control', 'private, no-store')
          res.end()
          return
        }
      } /* backoffice-access-consistency-v379-owner-guard */
      if (url.pathname.startsWith('/u/community')) {
        res.setHeader('Cache-Control', 'private, no-store, max-age=0')
        res.setHeader('Pragma', 'no-cache')
      } /* customer-community-mobile-runtime-v376-no-store */
      if (url.pathname === '/customer-community-mobile-v383.js' && req.method === 'GET') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.end(fs.readFileSync(path.join(dir, 'public', 'customer-community-mobile-v383.js')))
        return
      } /* community-image-aspect-v383 */
      if (url.pathname === '/customer-community-mobile-v377.js' && req.method === 'GET') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.end(fs.readFileSync(path.join(dir, 'public', 'customer-community-mobile-v377.js')))
        return
      } /* customer-community-mobile-runtime-v377 */
      if (url.pathname === '/customer-community-mobile-v376.js' && req.method === 'GET') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.end(fs.readFileSync(path.join(dir, 'public', 'customer-community-mobile-v376.js')))
        return
      } /* customer-community-mobile-runtime-v376 */
      if (url.pathname === '/customer-registration-resend-v347.js' && req.method === 'GET') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.end(fs.readFileSync(path.join(dir, 'customer-registration-resend-v347.js')))
        return
      } /* customer-registration-resend-v347 */
      if (url.pathname === '/customer-registration-resend-v345.js' && req.method === 'GET') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.end(fs.readFileSync(path.join(dir, 'customer-registration-resend-v345.js')))
        return
      } /* customer-registration-resend-v345 */
      if (url.pathname === '/ui-workflows-v294.js' && req.method === 'GET') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        res.setHeader('Cache-Control', 'private, no-store')
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.end(fs.readFileSync(path.join(dir, 'ui-workflows-v294.js')))
        return
      }
      if (url.pathname === '/admin/settings' && url.searchParams.get('embedded') === '1') {
        const originalSetHeader = res.setHeader.bind(res)
        res.setHeader = (name, value) => {
          const normalizedName = String(name || '').toLowerCase()
          if (normalizedName === 'x-frame-options') value = 'SAMEORIGIN'
          if (normalizedName === 'content-security-policy' && typeof value === 'string') {
            value = value.replace(/frame-ancestors\s+'none'/gi, "frame-ancestors 'self'")
          }
          return originalSetHeader(name, value)
        }
      } /* embedded-settings-sameorigin-v125 */
      if (handlePublicSiteRequest(req, res, url)) return /* public-review-pages-v46-route */
      if (await platformOperator.handle(req, res, url)) return /* platform-readonly-operations-v95-route */
      if (await customerWithdrawal.handle(req, res, url)) return /* verified-customer-withdrawal-v309-route */
      if (await customerAppointmentCancellation.handle(req, res, url)) return /* customer-appointment-cancellation-v362-route */
      if (await customerBookingCoupon.handle(req, res, url, request => chatSession(request, 'staff'))) return /* customer-booking-coupon-v366-route */
      if (await salesLedgerAccounts.handle(req, res, url)) return /* sales-ledger-accounts-v318-route */
      if (await customerMerge.handle(req, res, url)) return /* customer-record-merge-v385-route */
      if (await attendanceNotificationProduct.handle(req, res, url)) return /* attendance-multi-shift-v349-route */
      if (await communityPublishing.handle(req, res, url)) return /* community-publishing-v348-route */
      if (await billing.handle(req, res, url)) return /* stripe-subscription-billing-v52-route */
      if (await customerLinks.handle(req, res, url)) return
      if (await customerStoreStaff.handle(req, res, url)) return
      if (await tenantSetup.handle(req, res, url)) return /* tenant-bootstrap-v70-route */
      if (await storeProfile.handle(req, res, url)) return /* commercial-admin-v101-route */
      if (await billing.enforceAccess(req, res, url)) return /* stripe-subscription-billing-v52-access */
      if (await appointmentOperations.handle(req, res, url)) return
      if (await catalogOperations.handle(req, res, url)) return /* catalog-registration-v96-route */
      if (url.pathname === '/api/lien-sms-consent' && req.method === 'POST') return await customerSmsConsent(req, res)
      if (url.pathname === '/api/lien-admin-sms-status' && req.method === 'GET') return await adminSmsStatusApi(req, res, url)
      if (url.pathname === '/api/lien-chat') return await chatApi(req, res, url)
      if (url.pathname === '/api/lien-chat-form' && req.method === 'POST') return await chatForm(req, res)
      if (url.pathname === '/api/lien-chat-customer-form' && req.method === 'POST') return await customerChatForm(req, res)
      if (url.pathname === '/api/lien-staff-profiles' && req.method === 'GET') return await staffProfilesApi(req, res)
      if (url.pathname === '/api/lien-staff-introduction' && req.method === 'POST') return await staffIntroductionForm(req, res)
      if (url.pathname === '/api/lien-appointment-cancel' && req.method === 'POST') return await cancelAppointment(req, res)
      if (url.pathname === '/api/lien-staff-notifications' && req.method === 'POST') return await markStaffNotificationRead(req, res)
      if (url.pathname === '/api/lien-staff-notifications' && req.method === 'GET') return await staffNotifications(req, res, { history: url.searchParams.get('history') === '1' })
      if (url.pathname === '/api/lien-customer-notifications/read' && req.method === 'POST') return await markCustomerNotificationsRead(req, res)
      if (url.pathname === '/api/lien-capacity') return await capacityOverride(req, res)
      if (url.pathname === '/api/lien-customer-real-name' && req.method === 'POST') return await customerRealName(req, res)
      if (req.method === 'GET' && ['/u/home','/u/catalog','/u/coupons','/u/stamps','/u/news','/u/menu','/u/sms-settings'].includes(url.pathname)) {
        if (url.pathname === '/u/sms-settings') {
          const session = await chatSession(req, 'customer')
          if (!session) { res.statusCode = 302; res.setHeader('Location', '/u/login'); return res.end() }
          return await customerSmsSettingsPage(res, session, url)
        }
        return await customerBrandedPage(req, res, url)
      }
      if (req.method === 'GET' && url.pathname.startsWith('/u/catalog/')) return await customerBrandedPage(req, res, url)
      if (url.pathname === '/admin/notifications') {
        const session = await chatSession(req, 'staff')
        if (!session) { res.statusCode = 302; res.setHeader('Location', '/admin/login'); return res.end() }
        res.statusCode = 302
        res.setHeader('Location', '/admin/appointments?notificationHistory=1')
        res.setHeader('Cache-Control', 'no-store')
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
      if (url.pathname === '/u/messages') { res.statusCode = 307; res.setHeader('Location', '/u/chat'); return res.end() }
      if (url.pathname === '/u/chat') {
        const query = new URLSearchParams(url.searchParams)
        query.set('view', 'chat')
        req.url = '/u/appointments?' + query.toString()
        return handle(req, res)
      } /* review-chat-free-navigation-v45-route */
      if (url.pathname === '/u/appointments') return handle(req, res)
      const acceptsAdminHtml = String(req.headers.accept || '').includes('text/html')
      if (req.method === 'GET' && acceptsAdminHtml && url.pathname === '/admin/attendance') {
        const attendanceSession = await chatSession(req, 'staff')
        if (!attendanceSession) { res.statusCode = 302; res.setHeader('Location', '/admin/login'); return res.end() }
        res.statusCode = 302
        res.setHeader('Location', '/admin/account?panel=attendance')
        return res.end()
      }
      // A withdrawn customer must not be reachable from a bookmarked or copied
      // store-side record URL. The Next page already filters list queries; this
      // guard also avoids rendering the legacy detail bundle with a null model.
      const customerRecordMatch = req.method === 'GET' ? url.pathname.match(/^\/admin\/customers\/([^/]+)$/) : null
      if (customerRecordMatch && customerRecordMatch[1] !== 'messages') {
        const recordSession = await chatSession(req, 'staff')
        if (!recordSession) { res.statusCode = 302; res.setHeader('Location', '/admin/login'); return res.end() }
        const customerId = decodeURIComponent(customerRecordMatch[1]).slice(0, 160)
        const activeCustomer = await prisma.$queryRawUnsafe('SELECT 1 FROM "Customer" WHERE "id"=$1 AND "organizationId"=$2 AND "deletedAt" IS NULL LIMIT 1', customerId, recordSession.organizationId)
        if (!activeCustomer[0]) {
          res.statusCode = 302
          res.setHeader('Location', '/admin/customers?notice=customer-unavailable')
          res.setHeader('Cache-Control', 'private, no-store')
          return res.end()
        }
      } /* withdrawn-customer-direct-guard-v343 */
      if (req.method === 'GET' && acceptsAdminHtml && url.pathname.startsWith('/admin/') && !url.pathname.startsWith('/admin/login')) return tenantSetup.renderNext(req, res, url, handle) /* tenant-bootstrap-v93-ui-lifecycle */
      if (url.pathname.startsWith('/admin/') && !url.pathname.startsWith('/admin/login')) return handle(req, res)
      return handle(req, res)
    } catch (err) { console.error('chat server error', err); if (!res.headersSent) json(res, 500, { error: 'チャット処理に失敗しました。' }); else res.end() }
  })
  if (keepAliveTimeout !== undefined) server.keepAliveTimeout = keepAliveTimeout
  server.listen(currentPort, hostname, () => {
    console.log(`Salon de Lien listening on ${hostname}:${currentPort}`)
    tenantSetup.startPolling() /* tenant-bootstrap-v70-poller */
    if (process.env.SMS_COMPLIANCE_DISABLE_POLLER !== 'true') {
      const initialTimer = setTimeout(runSmsComplianceCycle, 5000); initialTimer.unref()
      const smsTimer = setInterval(runSmsComplianceCycle, 60000); smsTimer.unref()
    }
  })
}).catch(err => { console.error(err); process.exit(1) })
