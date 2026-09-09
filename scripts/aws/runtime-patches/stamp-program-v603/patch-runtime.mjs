import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const marker = 'stamp-program-v603'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function replaceSection(source, startNeedle, endNeedle, replacement, label) {
  const start = source.indexOf(startNeedle)
  const end = source.indexOf(endNeedle, start + startNeedle.length)
  if (start < 0 || end < 0 || source.indexOf(startNeedle, start + 1) >= 0) {
    throw new Error(`${label}: section anchors were not unique`)
  }
  return source.slice(0, start) + replacement + source.slice(end)
}

function copy(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive:true })
  fs.copyFileSync(source, target)
}

copy(path.join(patchRoot, 'stamp-program-v603.js'), path.join(root, 'stamp-program-v603.js'))
copy(path.join(patchRoot, 'stamp-program-v603-client.js'), path.join(root, 'public', 'stamp-program-v603.js'))
copy(path.join(patchRoot, 'stamp-program-v603.css'), path.join(root, 'public', 'stamp-program-v603.css'))

const serverPath = path.join(root, 'server.js')
let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes(`/* ${marker} */`)) throw new Error(`${marker}: patch already applied`)

const serviceAnchor = `const styleSystemV602 = require('./style-system-integration-v602').createStyleSystemIntegrationService({
  prisma,
  staffSessionProvider: req => chatSession(req, 'staff'),
  customerSessionProvider: req => chatSession(req, 'customer'),
}) /* style-system-integration-v602 */`
server = replaceOnce(
  server,
  serviceAnchor,
  `${serviceAnchor}
const stampProgramV603 = require('./stamp-program-v603').createStampProgramService({
  prisma,
  staffSessionProvider: req => chatSession(req, 'staff'),
}) /* ${marker} */`,
  'stamp program service',
)

server = replaceOnce(
  server,
  `  await styleSystemV602.ensureSchema() /* style-system-integration-v602-schema */`,
  `  await styleSystemV602.ensureSchema() /* style-system-integration-v602-schema */
  await stampProgramV603.ensureSchema() /* ${marker}-schema */`,
  'stamp program schema',
)

server = replaceOnce(
  server,
  `  const styleCommunityRouteV602 = /^\\/(?:admin|u)\\/community(?:\\/[^/]+)?\\/?$/.test(pathname)`,
  `  const styleCommunityRouteV602 = /^\\/(?:admin|u)\\/community(?:\\/[^/]+)?\\/?$/.test(pathname)
  const stampSettingsRouteV603 = pathname === '/admin/settings'
  const customerStampRouteV603 = pathname === '/u/stamps'`,
  'stamp route detection',
)

server = replaceOnce(
  server,
  `  if (!customerRoute) return output`,
  `  if ((stampSettingsRouteV603 || customerStampRouteV603) && !output.includes('orimia-stamp-program-style-v603')) {
    const stampProgramAssetsV603 = '<link id="orimia-stamp-program-style-v603" rel="stylesheet" href="/stamp-program-v603.css?v=603">' + (stampSettingsRouteV603 ? '<script id="orimia-stamp-program-script-v603" src="/stamp-program-v603.js?v=603" defer></script>' : '')
    output = output.replace('</head>', stampProgramAssetsV603 + '</head>')
  }
  if (!customerRoute) return output`,
  'stamp program assets',
)

const readyAnchor = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-System-Integration', 'v602') /* style-system-integration-v602-ready */`
server = replaceOnce(
  server,
  readyAnchor,
  `${readyAnchor}
      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Stamp-Program', 'v603') /* ${marker}-ready */`,
  'stamp readiness header',
)

server = replaceOnce(
  server,
  `      if (await styleSystemV602.handle(req,res,url)) return /* style-system-integration-v602-route */`,
  `      if (await stampProgramV603.handle(req,res,url)) return /* ${marker}-route */
      if (await styleSystemV602.handle(req,res,url)) return /* style-system-integration-v602-route */`,
  'stamp program route',
)

const customerPage = `async function customerStampsPage(res, session) {
  const [data, card] = await Promise.all([
    customerAppData(session),
    stampProgramV603.customerCard(session),
  ])
  const requiredVisits = Math.max(1, Math.min(50, Number(card.requiredVisits || 10)))
  const currentStamps = Math.max(0, Math.min(requiredVisits, Number(card.currentStamps || 0)))
  const progress = Math.round((currentStamps / requiredVisits) * 100)
  const columns = Math.min(requiredVisits, 5)
  const check = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>'
  const stamps = Array.from({ length:requiredVisits }, (_, index) => {
    const earned = index < currentStamps
    return '<span class="sp-stamp-v603' + (earned ? ' is-earned' : '') + '" aria-label="' + (index + 1) + '個目' + (earned ? '獲得済み' : '未獲得') + '">' + (earned ? check : index + 1) + '</span>'
  }).join('')
  const achieved = card.completedCards > 0
    ? '<span class="sp-earned-count-v603">特典達成 ' + Number(card.completedCards) + '回</span>'
    : '<span>総来店 ' + Number(card.totalVisits || 0) + '回</span>'
  const progressMessage = Number(card.remainingVisits) === 0
    ? '特典を獲得しました'
    : '次の特典まで ' + Number(card.remainingVisits || requiredVisits) + '回'
  const body = '<div class="sp-customer-page-v603">'
    + '<header class="sp-customer-intro-v603"><small>STAMP CARD</small><h1>スタンプカード</h1><p>ご来店1回につき1スタンプ。お店ごとに特典をお楽しみいただけます。</p></header>'
    + '<section class="sp-customer-card-v603" data-stamp-card-v603>'
    + '<header class="sp-card-head-v603"><div><small>' + htmlEscape(card.reward.typeLabel) + '</small><h2>' + htmlEscape(card.organization.name || 'ご利用店舗') + '</h2><p>' + requiredVisits + '回のご来店で特典</p></div><div class="sp-card-count-v603"><strong>' + currentStamps + ' / ' + requiredVisits + '</strong><span>スタンプ</span></div></header>'
    + '<div class="sp-card-progress-v603" role="progressbar" aria-label="スタンプ進捗" aria-valuemin="0" aria-valuemax="' + requiredVisits + '" aria-valuenow="' + currentStamps + '"><span style="--sp-progress:' + progress + '%"></span></div>'
    + '<div class="sp-card-body-v603"><div class="sp-stamp-grid-v603" style="--sp-columns:' + columns + '">' + stamps + '</div><div class="sp-card-status-v603"><strong>' + progressMessage + '</strong>' + achieved + '</div></div>'
    + '<footer class="sp-reward-v603"><span class="sp-reward-icon-v603">' + customerIcon('ticket') + '</span><div class="sp-reward-copy-v603"><small>NEXT REWARD</small><h3>' + htmlEscape(card.reward.title) + '</h3><p>' + htmlEscape(card.reward.description) + '</p></div><a href="/u/appointments">次回予約へ</a></footer>'
    + '</section></div>'
  sendCustomerHtml(res, customerShell({ title:'スタンプカード', unread:data.unread, back:'/u/home', body }))
}
`

server = replaceSection(
  server,
  'async function customerStampsPage',
  '\nasync function customerNotificationItems',
  customerPage,
  'customer stamp page',
)

server += `\n/* ${marker} */\n`
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release:marker, server:true, service:true, customerPage:true, assets:true }))
