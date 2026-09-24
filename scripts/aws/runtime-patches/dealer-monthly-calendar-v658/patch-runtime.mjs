import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const release = 'dealer-monthly-calendar-v658'
const patchDirectory = path.dirname(fileURLToPath(import.meta.url))
const serverPath = path.join(root, 'server.js')
const dealerServicePath = path.join(root, 'wholesale-ordering-v543.js')
const dealerClientPath = path.join(root, 'wholesale-ordering-client-v543.js')
const publicCssPath = path.join(root, 'public', 'dealer-monthly-calendar-v658.css')

let server = fs.readFileSync(serverPath, 'utf8')
let dealerService = fs.readFileSync(dealerServicePath, 'utf8')
let dealerClient = fs.readFileSync(dealerClientPath, 'utf8')
const serverFragment = fs.readFileSync(path.join(patchDirectory, 'dealer-calendar-server.fragment.js'), 'utf8')
const clientFragment = fs.readFileSync(path.join(patchDirectory, 'dealer-calendar-client.fragment.js'), 'utf8')

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${label}: target was not found`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: target was not unique`)
  return source.slice(0, first) + after + source.slice(first + before.length)
}

dealerService = replaceOnce(
  dealerService,
  `<link id="orimia-mobile-workspaces-v657" rel="stylesheet" href="/mobile-workspaces-v657.css?v=657-release1"><script id="orimia-mobile-workspaces-v657-script" src="/mobile-workspaces-v657.js?v=657-release1" defer></script></head>`,
  `<link id="orimia-mobile-workspaces-v657" rel="stylesheet" href="/mobile-workspaces-v657.css?v=657-release1"><script id="orimia-mobile-workspaces-v657-script" src="/mobile-workspaces-v657.js?v=657-release1" defer></script><link id="orimia-dealer-monthly-calendar-v658" rel="stylesheet" href="/dealer-monthly-calendar-v658.css?v=658-release1"></head>`,
  'dealer calendar stylesheet injection',
)

dealerService = replaceOnce(
  dealerService,
  `  const pages = {\n    orders: { title: '受注管理', eyebrow: 'ORDER OPERATIONS', description: '契約美容室から届いた注文を確認し、受注・出荷・納品まで更新します。' },`,
  `  const pages = {\n    calendar: { title: '売上カレンダー', eyebrow: 'MONTHLY SALES', description: '日ごとの伝票数と売上見込みを月次で確認し、営業目標を管理します。' },\n    orders: { title: '受注管理', eyebrow: 'ORDER OPERATIONS', description: '契約美容室から届いた注文を確認し、受注・出荷・納品まで更新します。' },`,
  'dealer calendar page definition',
)

dealerService = replaceOnce(
  dealerService,
  `  const nav = [\n    ['orders', '/dealer/orders', 'clipboard', '受注管理'],`,
  `  const nav = [\n    ['calendar', '/dealer/calendar', 'calendar', '月次売上'],\n    ['orders', '/dealer/orders', 'clipboard', '受注管理'],`,
  'dealer calendar navigation item',
)

dealerService = replaceOnce(
  dealerService,
  `<nav class="wo-dealer-mobile-nav" aria-label="ディーラー管理">${'${navMarkup}'}</nav><script src="/wholesale-ordering-client-v543.js?v=656-order-documents1" defer></script>`,
  `<nav class="wo-dealer-mobile-nav" aria-label="ディーラー管理">${'${navMarkup}'}</nav><script src="/wholesale-ordering-client-v543.js?v=658-calendar1" defer></script>`,
  'dealer client cache key',
)

const orderIndexAnchor = `      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "WholesaleOrder_dealer_status_idx" ON "WholesaleOrder"("dealerId","status","orderedAt" DESC)')`
dealerService = replaceOnce(
  dealerService,
  orderIndexAnchor,
  `${orderIndexAnchor}\n      await prisma.$executeRawUnsafe(\`CREATE TABLE IF NOT EXISTS "WholesaleDealerMonthlyPlan" (\n        "dealerId" TEXT NOT NULL REFERENCES "WholesaleDealer"("id") ON DELETE CASCADE,\n        "monthKey" TEXT NOT NULL,\n        "salesTargetYen" BIGINT NOT NULL DEFAULT 0,\n        "newAcquisitionCount" INTEGER NOT NULL DEFAULT 0,\n        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n        PRIMARY KEY ("dealerId", "monthKey"),\n        CHECK ("salesTargetYen" BETWEEN 0 AND 1000000000000),\n        CHECK ("newAcquisitionCount" BETWEEN 0 AND 999999)\n      )\`)\n      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "WholesaleDealerMonthlyPlan_month_idx" ON "WholesaleDealerMonthlyPlan"("monthKey","dealerId")')`,
  'dealer monthly plan schema',
)

dealerService = replaceOnce(
  dealerService,
  `  async function dealerBootstrap(session, url) {`,
  `${serverFragment}  async function dealerBootstrap(session, url) {`,
  'dealer calendar server functions',
)

dealerService = replaceOnce(
  dealerService,
  `    const dealerPageMatch = pathname.match(/^\\/dealer\\/(orders|salons|products|pricing|company)$/)`,
  `    const dealerPageMatch = pathname.match(/^\\/dealer\\/(calendar|orders|salons|products|pricing|company)$/)`,
  'dealer calendar page route',
)

dealerService = replaceOnce(
  dealerService,
  `        if (pathname === '/api/dealer/bootstrap' && req.method === 'GET') { json(res, 200, { ok: true, ...(await dealerBootstrap(session, url)) }); return true } /* list-pagination-performance-v628 */`,
  `        if (pathname === '/api/dealer/calendar' && req.method === 'GET') { json(res, 200, { ok: true, ...(await dealerCalendarPayload(session, url.searchParams.get('month'))) }); return true } /* ${release} */\n        if (pathname === '/api/dealer/bootstrap' && req.method === 'GET') { json(res, 200, { ok: true, ...(await dealerBootstrap(session, url)) }); return true } /* list-pagination-performance-v628 */`,
  'dealer calendar read api',
)

dealerService = replaceOnce(
  dealerService,
  `        const payload = await readPayload(req)\n        if (pathname === '/api/dealer/contracts')`,
  `        const payload = await readPayload(req)\n        if (pathname === '/api/dealer/calendar/targets') { json(res, 200, { ok: true, ...(await saveDealerCalendarPlan(session, payload)) }); return true } /* ${release} */\n        if (pathname === '/api/dealer/contracts')`,
  'dealer calendar save api',
)

dealerClient = replaceOnce(
  dealerClient,
  `    view: document.body.dataset.dealerView || 'orders',`,
  `    view: document.body.dataset.dealerView || 'orders',\n    calendarMonth: dealerProductLocationV628.get('month') || '',\n    calendar: null,\n    calendarLoadId: 0,`,
  'dealer calendar client state',
)

dealerClient = replaceOnce(
  dealerClient,
  `  function dealerCompany() {`,
  `${clientFragment}  function dealerCompany() {`,
  'dealer calendar client functions',
)

dealerClient = replaceOnce(
  dealerClient,
  `  function renderDealer() {\n    if (dealer.view === 'company') {`,
  `  function renderDealer() {\n    if (dealer.view === 'calendar') {\n      root.innerHTML = dealerCalendar()\n      return\n    }\n    if (dealer.view === 'company') {`,
  'dealer calendar render branch',
)

dealerClient = replaceOnce(
  dealerClient,
  `  async function reloadDealer(refreshBilling, renderMode) {\n    if (dealer.view === 'company') {`,
  `  async function reloadDealer(refreshBilling, renderMode) {\n    if (dealer.view === 'calendar') {\n      const monthKey = normalizedDealerCalendarMonth(dealer.calendarMonth)\n      const requestId = ++dealer.calendarLoadId\n      const result = await api('/api/dealer/calendar?month=' + encodeURIComponent(monthKey))\n      if (requestId !== dealer.calendarLoadId) return false\n      dealer.calendar = result.calendar\n      dealer.calendarMonth = result.calendar.monthKey\n      syncDealerCalendarUrl()\n      renderDealer()\n      return true\n    }\n    if (dealer.view === 'company') {`,
  'dealer calendar reload branch',
)

dealerClient = replaceOnce(
  dealerClient,
  `      if (target.dataset.action === 'dealer-pricing-page') {`,
  `      if (target.dataset.action === 'dealer-calendar-month') {\n        const nextMonth = normalizedDealerCalendarMonth(target.dataset.month)\n        if (nextMonth === dealer.calendarMonth) return\n        const previousMonth = dealer.calendarMonth\n        dealer.calendarMonth = nextMonth\n        syncDealerCalendarUrl()\n        target.disabled = true\n        root.querySelector('.wo-dealer-calendar-v658')?.setAttribute('aria-busy', 'true')\n        try {\n          await reloadDealer()\n        } catch (error) {\n          dealer.calendarMonth = previousMonth\n          syncDealerCalendarUrl()\n          root.querySelector('.wo-dealer-calendar-v658')?.removeAttribute('aria-busy')\n          notify(error.message, 'error')\n          target.disabled = false\n        }\n      }\n      else if (target.dataset.action === 'dealer-pricing-page') {`,
  'dealer calendar month interaction',
)

dealerClient = replaceOnce(
  dealerClient,
  `    root.addEventListener('submit', async function (event) {\n      if (event.target.id === 'dealer-company-form') {`,
  `    root.addEventListener('submit', async function (event) {\n      if (event.target.id === 'dealer-calendar-plan-form') {\n        event.preventDefault()\n        await saveDealerCalendarPlan(event.target)\n        return\n      }\n      if (event.target.id === 'dealer-company-form') {`,
  'dealer calendar target submit',
)

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Mobile-Workspaces', 'v657') /* mobile-workspaces-v657-ready */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Monthly-Calendar', 'v658') /* ${release}-ready */`,
  'dealer calendar readiness marker',
)

server += `\n/* ${release} */\n`
dealerService += `\n/* ${release} */\n`
dealerClient += `\n/* ${release} */\n`

fs.copyFileSync(path.join(patchDirectory, 'dealer-monthly-calendar-v658.css'), publicCssPath)
fs.writeFileSync(serverPath, server)
fs.writeFileSync(dealerServicePath, dealerService)
fs.writeFileSync(dealerClientPath, dealerClient)

console.log(JSON.stringify({ release, patched: true, route: '/dealer/calendar', stylesheet: '/dealer-monthly-calendar-v658.css' }))
