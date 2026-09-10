import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'stamp-card-commercial-v617'
const here = path.dirname(fileURLToPath(import.meta.url))
const changes = []

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ kind: 'replace', file, before, after, count })
}

function replaceSection(file, start, end, replacement, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex)
  if (startIndex < 0 || endIndex < 0) throw new Error(`${label}: section anchors not found`)
  const before = source.slice(startIndex, endIndex)
  fs.writeFileSync(target, source.slice(0, startIndex) + replacement + source.slice(endIndex))
  changes.push({ kind: 'replace', file, before, after: replacement, count: 1 })
}

function addFile(sourceName, targetName) {
  const target = path.join(root, targetName)
  if (fs.existsSync(target)) throw new Error(`${targetName}: target already exists`)
  fs.copyFileSync(path.join(here, sourceName), target)
  changes.push({ kind: 'add', file: targetName })
}

addFile('stamp-card-commercial-v617.css', 'public/stamp-card-commercial-v617.css')

const customerPage = `async function customerStampsPage(res, session) {
  const [data, card] = await Promise.all([
    customerAppData(session),
    stampProgramV603.customerCard(session),
  ])
  const requiredVisits = Math.max(1, Math.min(50, Number(card.requiredVisits || 10)))
  const currentStamps = Math.max(0, Math.min(requiredVisits, Number(card.currentStamps || 0)))
  const remainingVisits = Math.max(0, Number(card.remainingVisits || 0))
  const totalVisits = Math.max(0, Number(card.totalVisits || 0))
  const completedCards = Math.max(0, Number(card.completedCards || 0))
  const isComplete = totalVisits > 0 && remainingVisits === 0
  const progress = Math.round((currentStamps / requiredVisits) * 100)
  const columns = Math.min(requiredVisits, requiredVisits > 10 ? 8 : 5)
  const mobileColumns = Math.min(requiredVisits, 5)
  const check = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>'
  const stamps = Array.from({ length:requiredVisits }, (_, index) => {
    const earned = index < currentStamps
    const milestone = index === requiredVisits - 1
    const content = earned ? check : String(index + 1)
    return '<li class="sc-stamp-v617' + (earned ? ' is-earned' : '') + (milestone ? ' is-milestone' : '') + '" aria-label="' + (index + 1) + '個目' + (earned ? '獲得済み' : '未獲得') + '"><span class="sc-stamp-seal-v617">' + content + '</span><small>' + (milestone ? '特典' : '') + '</small></li>'
  }).join('')
  const progressMessage = isComplete ? '特典を獲得しました' : 'あと ' + (remainingVisits || requiredVisits) + ' 回で特典'
  const statusLabel = isComplete ? '利用できます' : currentStamps + '個獲得中'
  const rewardEyebrow = isComplete ? 'AVAILABLE REWARD' : 'YOUR NEXT REWARD'
  const rewardState = isComplete ? '特典を利用できます' : requiredVisits + '個で獲得'
  const body = '<div class="sc-page-v617">'
    + '<header class="sc-page-head-v617"><div><small class="sc-page-eyebrow-v617">LOYALTY PROGRAM</small><h1>スタンプカード</h1></div><p>ご来店1回につき1スタンプ。次の特典までの進み具合をいつでも確認できます。</p></header>'
    + '<section class="sc-card-v617' + (isComplete ? ' is-complete' : '') + '" data-stamp-card-v603 data-stamp-card-v617>'
    + '<header class="sc-card-head-v617"><div class="sc-brand-row-v617"><span class="sc-brand-mark-v617">' + customerIcon('loyalty') + '</span><div class="sc-card-brand-v617"><small>ORIMIA MEMBER CARD</small><h2>' + htmlEscape(card.organization.name || 'ご利用店舗') + '</h2><p>' + requiredVisits + '回のご来店で特典</p></div></div><div class="sc-count-v617"><span>CURRENT STAMPS</span><strong>' + currentStamps + '<small>/' + requiredVisits + '</small></strong></div></header>'
    + '<div class="sc-progress-v617" role="progressbar" aria-label="スタンプ進捗" aria-valuemin="0" aria-valuemax="' + requiredVisits + '" aria-valuenow="' + currentStamps + '"><span style="--sc-progress:' + progress + '%"></span></div>'
    + '<div class="sc-card-body-v617"><div class="sc-stamp-panel-v617"><div class="sc-panel-head-v617"><span class="sc-panel-label-v617">VISIT STAMPS</span><strong>' + currentStamps + ' / ' + requiredVisits + '</strong></div><ol class="sc-stamps-v617" style="--sc-columns:' + columns + ';--sc-mobile-columns:' + mobileColumns + '">' + stamps + '</ol></div>'
    + '<aside class="sc-status-panel-v617"><small>PROGRESS</small><strong>' + progressMessage + '</strong><span class="sc-status-chip-v617' + (isComplete ? ' is-complete' : '') + '">' + (isComplete ? check : '') + statusLabel + '</span><div class="sc-metrics-v617"><span class="sc-metric-v617"><strong>' + totalVisits + '回</strong><span>総来店回数</span></span><span class="sc-metric-v617"><strong>' + completedCards + '回</strong><span>特典達成</span></span></div></aside></div>'
    + '<footer class="sc-reward-v617"><span class="sc-reward-icon-v617">' + customerIcon('ticket') + '</span><div class="sc-reward-copy-v617"><small>' + rewardEyebrow + '</small><h3>' + htmlEscape(card.reward.title) + '</h3><p>' + htmlEscape(card.reward.description) + '</p></div><span class="sc-reward-state-v617">' + rewardState + '</span><a class="sc-reward-link-v617" href="/u/appointments">予約する' + customerIcon('chevron') + '</a></footer>'
    + '<p class="sc-note-v617">' + customerIcon('points') + '<span>スタンプは会計完了後に自動で反映されます。特典をご利用の際は店舗スタッフへお伝えください。</span></p>'
    + '</section></div>'
  sendCustomerHtml(res, customerShell({ title:'スタンプカード', unread:data.unread, back:'/u/home', body }))
}
`

replaceSection(
  'server.js',
  'async function customerStampsPage',
  '\nasync function customerNotificationItems',
  customerPage,
  'customer stamp page',
)

const customerRouteAnchor = `  if (pathname === '/u/appointments' && !output.includes('customer-booking-confirmation-v616')) {
    output = output.replace('</head>', '<script id="customer-booking-confirmation-v616" src="/customer-booking-confirmation-v616.js?v=616-release1" defer></script></head>')
  } /* customer-booking-confirmation-v616-assets */`
replaceExact(
  'server.js',
  customerRouteAnchor,
  `${customerRouteAnchor}
  if (pathname === '/u/stamps' && !output.includes('stamp-card-commercial-v617')) {
    output = output.replace('</head>', '<link id="stamp-card-commercial-v617" rel="stylesheet" href="/stamp-card-commercial-v617.css?v=617-release1"></head>')
  } /* ${marker}-assets */`,
  1,
  'commercial stamp card assets',
)

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Booking-Confirmation', 'v616') /* customer-booking-confirmation-v616-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  `${readinessAnchor}
      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Stamp-Card-Commercial', 'v617') /* ${marker}-ready */`,
  1,
  'commercial stamp card readiness header',
)

fs.writeFileSync('/tmp/stamp-card-commercial-v617-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({
  release: marker,
  modified: [...new Set(changes.filter(change => change.kind === 'replace').map(change => change.file))],
  added: changes.filter(change => change.kind === 'add').map(change => change.file),
}))
