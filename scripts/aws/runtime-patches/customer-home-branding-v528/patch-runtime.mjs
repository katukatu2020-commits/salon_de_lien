import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.APP_ROOT || '/app'
const serverPath = path.join(root, 'server.js')
const tenantClientPath = path.join(root, 'tenant-setup-client.js')
const releaseDir = path.dirname(fileURLToPath(import.meta.url))
const marker = 'customer-home-branding-v528'

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

fs.copyFileSync(
  path.join(releaseDir, 'customer-home-branding-v528.js'),
  path.join(root, 'customer-home-branding-v528.js'),
)

let tenantClient = fs.readFileSync(tenantClientPath, 'utf8')
if (tenantClient.includes(marker)) throw new Error(`${marker}: settings client already applied`)
tenantClient += `\n\n;/* ${marker}-client-boundary */\n${fs.readFileSync(path.join(releaseDir, 'customer-home-branding-client-v528.js'), 'utf8')}\n/* ${marker} */\n`
fs.writeFileSync(tenantClientPath, tenantClient)

let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes(marker)) throw new Error(`${marker}: server patch already applied`)

server = replaceExact(
  server,
  `const { createCustomerCampaignService } = require('./customer-campaigns-v427') /* customer-campaigns-v427 */`,
  `const { createCustomerCampaignService } = require('./customer-campaigns-v427') /* customer-campaigns-v427 */
const { createCustomerHomeBrandingService } = require('./customer-home-branding-v528') /* ${marker} */`,
  1,
  'customer home branding import',
)

server = replaceExact(
  server,
  `})
const lineReservations = createLineReservationService({`,
  `})
const customerHomeBranding = createCustomerHomeBrandingService({
  prisma,
  customerSession: req => chatSession(req, 'customer'),
  staffSession: req => chatSession(req, 'staff'),
  json,
}) /* ${marker} */
const lineReservations = createLineReservationService({`,
  1,
  'customer home branding initialization',
)

server = replaceExact(
  server,
  `    store: '<path d="M3 10h18"></path><path d="m5 4-2 6v2a3 3 0 0 0 6 0v-2l1-6"></path><path d="m14 4 1 6v2a3 3 0 0 0 6 0v-2l-2-6"></path><path d="M5 15v6h14v-6"></path><path d="M9 21v-5h6v5"></path>',`,
  `    store: '<path d="M3 10h18"></path><path d="m5 4-2 6v2a3 3 0 0 0 6 0v-2l1-6"></path><path d="m14 4 1 6v2a3 3 0 0 0 6 0v-2l-2-6"></path><path d="M5 15v6h14v-6"></path><path d="M9 21v-5h6v5"></path>',
    booking: '<rect x="3" y="4" width="18" height="17" rx="3"></rect><path d="M8 2v4M16 2v4M3 9h18"></path><path d="m8.5 15 2.2 2.2 4.8-5"></path>',
    campaign: '<path d="m3 11 15-5v12L3 14v-3Z"></path><path d="M7 15.3 8.5 21h4l-1.8-7"></path><path d="M21 8V5M20 11h3M21 14v3"></path>',
    profile: '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="9" r="3"></circle><path d="M6.8 19a6 6 0 0 1 10.4 0"></path>',
    coupon: '<path d="M3 6h18v4a2.5 2.5 0 0 0 0 5v3H3v-3a2.5 2.5 0 0 0 0-5V6Z"></path><path d="m9 15 6-6"></path><circle cx="9.5" cy="9.5" r=".7" fill="currentColor" stroke="none"></circle><circle cx="14.5" cy="14.5" r=".7" fill="currentColor" stroke="none"></circle>',
    salons: '<path d="M4 10v10h16V10"></path><path d="M3 10 5 4h14l2 6"></path><path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"></path><path d="M9 20v-5h6v5"></path>',
    loyalty: '<path d="M7 14h10l2 5H5l2-5Z"></path><path d="M9 14V9a3 3 0 0 1 6 0v5"></path><path d="m12 4 .7 1.4 1.6.2-1.2 1.1.3 1.6L12 7.5l-1.4.8.3-1.6-1.2-1.1 1.6-.2L12 4Z"></path><path d="M5 22h14"></path>',
    styles: '<circle cx="6" cy="7" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="m8.5 9 10.5 10M8.5 16 19 5"></path><path d="M20 2v4M18 4h4"></path>',
    recommendations: '<path d="M5 8h14l-1 13H6L5 8Z"></path><path d="M9 9V6a3 3 0 0 1 6 0v3"></path><path d="m15.5 14 .6 1.3 1.4.2-1 1 .2 1.4-1.2-.7-1.3.7.3-1.4-1.1-1 1.5-.2.6-1.3Z"></path>',
    reviews: '<path d="M20 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4v8Z"></path><path d="M12 14.5 8.8 11.4a2.1 2.1 0 0 1 3-3l.2.2.2-.2a2.1 2.1 0 0 1 3 3L12 14.5Z"></path>',`,
  1,
  'commercial customer service icons',
)

const oldQuickCss = `.quick-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px}.quick-card{display:flex;min-height:112px;flex-direction:column;align-items:center;justify-content:center;border:1px solid #eee1dc;border-radius:10px;background:#fff;box-shadow:0 3px 10px #8b67500c;transition:.18s}.quick-card:active{transform:scale(.97);background:var(--rose-soft)}.quick-card .icon{width:30px;height:30px;color:#d16b82}.quick-card strong{margin-top:9px;font-size:11px;text-align:center}.quick-card small{margin-top:4px;color:#b8a8a1;font:7px Georgia,serif;letter-spacing:.1em}`
const newQuickCss = `.quick-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:12px}.quick-card{position:relative;display:flex;min-width:0;min-height:118px;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;border:1px solid #eaded9;border-radius:8px;background:#fff;box-shadow:0 5px 16px #61463b0d;transition:border-color .18s,box-shadow .18s,transform .18s,background-color .18s}.quick-card:active{transform:scale(.975);background:#fff9f8}.quick-card:focus-visible{outline:3px solid #d85d7938;outline-offset:2px}.quick-icon{display:grid;width:48px;height:48px;flex:0 0 48px;place-items:center;border-radius:50%;background:var(--quick-bg);color:var(--quick-ink);box-shadow:inset 0 0 0 1px var(--quick-line)}.quick-icon .icon{width:25px;height:25px;stroke-width:1.65}.quick-tone-rose{--quick-bg:#fbe9ee;--quick-ink:#bf506b;--quick-line:#f1ccd6}.quick-tone-sage{--quick-bg:#eaf3ee;--quick-ink:#4c7b67;--quick-line:#d3e4da}.quick-tone-amber{--quick-bg:#f8f0df;--quick-ink:#99703d;--quick-line:#eadcbd}.quick-tone-blue{--quick-bg:#eaf0f3;--quick-ink:#587483;--quick-line:#d5e0e5}.quick-tone-plum{--quick-bg:#f1eaf2;--quick-ink:#795d7d;--quick-line:#e2d4e4}.quick-card strong{display:block;max-width:100%;margin-top:10px;padding:0 5px;color:#3b302b;font-size:11px;font-weight:800;line-height:1.35;text-align:center;word-break:keep-all}.quick-card small{display:block;margin-top:4px;color:#a8958d;font:7px Georgia,serif;letter-spacing:.08em}`
server = replaceExact(server, oldQuickCss, newQuickCss, 1, 'customer quick card styles')

server = replaceExact(
  server,
  `.quick-grid{max-width:1120px;margin:0 auto;gap:14px;padding:22px 0}.quick-card{min-height:150px}.quick-card strong{font-size:13px}.quick-card small{font-size:8px}`,
  `.quick-grid{max-width:1120px;margin:0 auto;gap:14px;padding:22px 0}.quick-card{min-height:154px}.quick-icon{width:56px;height:56px;flex-basis:56px}.quick-icon .icon{width:29px;height:29px}.quick-card strong{margin-top:12px;font-size:13px}.quick-card small{font-size:8px}`,
  1,
  'desktop customer quick card styles',
)

server = replaceExact(
  server,
  `.quick-card:hover{border-color:#e9cbd4;background:#fff9fa}`,
  `.quick-card:hover{border-color:#d9c4ba;background:#fffdfa;box-shadow:0 12px 28px #61463b18;transform:translateY(-2px)}`,
  1,
  'customer quick card hover',
)

const homeStart = server.indexOf('async function customerHomePage(res, session) {')
const homeEnd = server.indexOf('\n\n// commercial-chat-catalog-v52:', homeStart)
if (homeStart < 0 || homeEnd < 0 || homeEnd <= homeStart) throw new Error('customer home page boundaries were not found')
const customerHome = `async function customerHomePage(res, session) { /* ${marker} */
  const [data, membershipCode, homeBranding] = await Promise.all([
    customerAppData(session),
    customerLinks.customerPublicCode(session),
    customerHomeBranding.getForOrganization(session.organizationId, 'customer'),
  ])
  if (!data.customer) { res.statusCode = 404; return res.end('Not found') }
  const name = htmlEscape(data.customer.name)
  const quick = [
    ['booking','予約する','RESERVE','/u/appointments','rose'],
    ['campaign','キャンペーン','CAMPAIGN','/u/campaigns','amber'],
    ['profile','マイページ','MY PAGE','/u/profile','blue'],
    ['coupon','クーポン','COUPON','/u/coupons','plum'],
    ['salons','登録済みの店舗','MY SALONS','/u/stores','sage'],
    ['loyalty','スタンプカード','STAMP CARD','/u/stamps','amber'],
    ['styles','ヘアスタイル','STYLE','/u/community','blue'],
    ['recommendations','私に合うアイテム','ITEM RANKING','/u/catalog','sage'],
    ['reviews','お客様の声','IMPRESSION','/u/reviews','rose'],
  ]
  const announcementSection = customerCampaigns.homeSection(data.campaigns)
  const heroPhrase = htmlEscape(homeBranding.phrase).replace(/\\r?\\n/g, '<br>')
  const heroImage = htmlEscape(homeBranding.imageUrl)
  const body = \`<section class="welcome"><strong>\${name} 様</strong><span>いつもご来店ありがとうございます</span></section><section class="hero" data-customer-home-branding="v528"><img src="\${heroImage}" alt="店舗からのホームメッセージ" loading="eager" fetchpriority="high" decoding="async" onerror="this.onerror=null;this.src='/brand/salon-interior-illustrated.png'"><div class="hero-copy">\${heroPhrase}</div></section><section class="quick-grid" aria-label="サービス一覧">\${quick.map(([icon,label,en,href,tone]) => \`<a class="quick-card" href="\${href}" aria-label="\${label}"><span class="quick-icon quick-tone-\${tone}">\${customerIcon(icon, 'quick-service-icon')}</span><strong>\${label}</strong><small>\${en}</small></a>\`).join('')}</section>\${announcementSection}\${data.appointment ? \`<section class="section"><div class="section-head"><div><h2>次回のご予約</h2><p>ご来店をお待ちしております</p></div><a href="/u/appointments?detail=\${encodeURIComponent(data.appointment.id)}#current-reservations">詳細・キャンセル</a></div><a class="status-card" href="/u/appointments?detail=\${encodeURIComponent(data.appointment.id)}#current-reservations"><span class="label">UPCOMING RESERVATION</span><strong>\${htmlEscape(jpDate(data.appointment.scheduledAt, true))}</strong><p>\${htmlEscape(data.appointment.menu || 'メニュー相談')} / \${htmlEscape(data.appointment.staffName || '担当フリー')}</p></a></section>\` : ''}<section class="section"><div class="section-head"><div><h2>会員情報</h2><p>ORIMIA メンバーシップ</p></div></div><div class="metrics"><a class="metric" href="/u/points"><span>利用可能ポイント</span><strong>\${Number(data.points).toLocaleString('ja-JP')}<small> pt</small></strong></a><a class="metric" href="/u/history"><span>前回来店</span><strong style="font-size:14px">\${htmlEscape(jpDate(data.visit?.visitedAt))}</strong></a></div>\${customerLinks.membershipMarkup(membershipCode)}</section>\`
  sendCustomerHtml(res, customerShell({ title: 'ホーム', active: 'ホーム', unread: data.unread, body }))
}`
server = server.slice(0, homeStart) + customerHome + server.slice(homeEnd)

server = replaceExact(
  server,
  `  await customerNameAutoMerge.ensureSchema() /* customer-name-auto-merge-v489-schema */`,
  `  await customerNameAutoMerge.ensureSchema() /* customer-name-auto-merge-v489-schema */
  await customerHomeBranding.ensureSchema() /* ${marker} */`,
  1,
  'customer home branding schema startup',
)

server = replaceExact(
  server,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Line-Booking-UI-Parity', 'v527')`,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Line-Booking-UI-Parity', 'v527')
      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Home-Branding', 'v528')`,
  1,
  'customer home branding readiness marker',
)

server = replaceExact(
  server,
  `      if (await customerCampaigns.handle(req, res, url)) return /* customer-campaigns-v427-route */`,
  `      if (await customerHomeBranding.handle(req, res, url)) return /* ${marker} */
      if (await customerCampaigns.handle(req, res, url)) return /* customer-campaigns-v427-route */`,
  1,
  'customer home branding route',
)

server += `\n/* ${marker} */\n`
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release: marker, patched: true }))
