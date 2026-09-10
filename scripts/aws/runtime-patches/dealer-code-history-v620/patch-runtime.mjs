import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'dealer-code-history-v620'
const changes = []

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${marker}: ${label} expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ file, label, count })
}

replaceExact(
  'server.js',
  '/wholesale-ordering-v543.css?v=585-product-ui1',
  '/wholesale-ordering-v543.css?v=620-dealer-code1',
  1,
  'salon wholesale stylesheet cache key',
)

replaceExact(
  'server.js',
  'inventory-orders-common-layout-v572.js?v=572-release1',
  'inventory-orders-common-layout-v572.js?v=620-dealer-code1',
  1,
  'salon wholesale loader cache key',
)

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Admin-Rerender', 'v619') /* style-admin-rerender-v619-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  readinessAnchor + `\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Code-History', 'v620') /* ${marker}-ready */`,
  1,
  'readiness header',
)

replaceExact(
  'wholesale-ordering-v543.js',
  '/wholesale-ordering-v543.css?v=585-product-ui1',
  '/wholesale-ordering-v543.css?v=620-dealer-code1',
  1,
  'dealer wholesale stylesheet cache key',
)

replaceExact(
  'wholesale-ordering-v543.js',
  '/wholesale-ordering-client-v543.js?v=585-product-ui1',
  '/wholesale-ordering-client-v543.js?v=620-dealer-code1',
  1,
  'dealer wholesale client cache key',
)

replaceExact(
  'wholesale-ordering-v543.js',
  'SELECT c."id",c."status",c."customerCode",c."approvedAt",c."createdAt",d."id" AS "dealerId",d."name" AS "dealerName",d."loginId",d."email",d."phone"',
  'SELECT c."id",c."status",c."customerCode",c."approvedAt",c."createdAt",d."id" AS "dealerId",d."dealerCode",d."name" AS "dealerName",d."loginId",d."email",d."phone"',
  1,
  'salon contract dealer code projection',
)

replaceExact(
  'wholesale-ordering-v543.js',
  `  async function renderDeliveryNote(req, res, orderId) {
    const dealer = await dealerSession(req)
    const admin = dealer ? null : await adminSession(req)
    if (!dealer && !admin) return redirect(res, '/dealer/login?next=' + encodeURIComponent('/dealer/orders/' + orderId + '/delivery-note'), 302)
    if (dealer && !(await dealerAccessState(dealer.id)).allowed) return redirect(res, '/dealer/billing?required=1', 302)
    const where = dealer ? 'o."dealerId"=$2' : 'o."organizationId"=$2'
    const actorId = dealer ? dealer.id : admin.organizationId
`,
  `  async function renderDeliveryNote(req, res, orderId) {
    const dealer = await dealerSession(req)
    if (!dealer) {
      const admin = await adminSession(req)
      if (admin) return redirect(res, '/admin/products/orders?view=history', 302)
      return redirect(res, '/dealer/login?next=' + encodeURIComponent('/dealer/orders/' + orderId + '/delivery-note'), 302)
    }
    if (!(await dealerAccessState(dealer.id)).allowed) return redirect(res, '/dealer/billing?required=1', 302)
    const where = 'o."dealerId"=$2'
    const actorId = dealer.id
`,
  1,
  'dealer-only delivery note access',
)

replaceExact(
  'wholesale-ordering-v543.js',
  "    return html(res, 200, deliveryNotePage(orders[0], lines, dealer ? 'dealer' : 'admin'))",
  "    return html(res, 200, deliveryNotePage(orders[0], lines, 'dealer'))",
  1,
  'dealer-only delivery note rendering',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  "<small>得意先コード ' + esc(contract.customerCode) + '</small>",
  "<small>ディーラー固有コード ' + esc(contract.dealerCode) + '</small>",
  1,
  'connected dealer code display',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  '<div class="wo-history-header"><span>発注番号 / 発注日</span><span>発注先</span><span>内容</span><span>金額</span><span>状態</span><span>納品書</span></div>',
  '<div class="wo-history-header"><span>発注番号 / 発注日</span><span>発注先</span><span>内容</span><span>金額</span><span>状態</span></div>',
  1,
  'salon order history header',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  "<div>' + statusBadge(order.status) + '</div><div><a class=\"wo-icon-link\" href=\"/dealer/orders/' + encodeURIComponent(order.id) + '/delivery-note\" target=\"_blank\" rel=\"noopener\" aria-label=\"' + esc(order.orderNo) + 'の納品書を開く\">' + icon('printer') + '</a></div></article>",
  "<div>' + statusBadge(order.status) + '</div></article>",
  1,
  'salon delivery note action',
)

replaceExact(
  'public/inventory-orders-common-layout-v572.js',
  '/wholesale-ordering-client-v543.js?v=585-product-ui1',
  '/wholesale-ordering-client-v543.js?v=620-dealer-code1',
  1,
  'salon wholesale client cache key',
)

replaceExact(
  'wholesale-ordering-v543.css',
  '.wo-history-header, .wo-order-history article { display: grid; grid-template-columns: 1.35fr 1fr .75fr .9fr .8fr 60px; min-width: 940px; align-items: center; }',
  '.wo-history-header, .wo-order-history article { display: grid; grid-template-columns: 1.35fr 1fr .75fr .9fr .8fr; min-width: 820px; align-items: center; }',
  1,
  'salon order history desktop columns',
)

replaceExact(
  'wholesale-ordering-v543.css',
  '  .wo-order-history article > div:nth-child(6) { grid-column: 2; grid-row: 2 / 5; align-self: end; }\n',
  '',
  1,
  'salon order history mobile delivery note placement',
)

fs.writeFileSync('/tmp/dealer-code-history-v620-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: marker, modified: [...new Set(changes.map(change => change.file))] }))
