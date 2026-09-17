import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'dealer-order-documents-v656'
const servicePath = path.join(root, 'wholesale-ordering-v543.js')
const clientPath = path.join(root, 'wholesale-ordering-client-v543.js')
const cssPath = path.join(root, 'wholesale-ordering-v543.css')
const serverPath = path.join(root, 'server.js')

let service = fs.readFileSync(servicePath, 'utf8')
let client = fs.readFileSync(clientPath, 'utf8')
let css = fs.readFileSync(cssPath, 'utf8')
let server = fs.readFileSync(serverPath, 'utf8')

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${label}: target was not found`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: target was not unique`)
  return source.slice(0, first) + after + source.slice(first + before.length)
}

function replaceSection(source, start, end, replacement, label) {
  const first = source.indexOf(start)
  if (first < 0) throw new Error(`${label}: start target was not found`)
  if (source.indexOf(start, first + start.length) >= 0) throw new Error(`${label}: start target was not unique`)
  const last = source.indexOf(end, first + start.length)
  if (last < 0) throw new Error(`${label}: end target was not found`)
  return source.slice(0, first) + replacement + source.slice(last + end.length)
}

service = replaceOnce(
  service,
  `function redirect(res, location, status = 303) {`,
  `function csvDownload(res, filename, body) {
  const fallback = String(filename || 'order.csv').replace(/[^A-Za-z0-9._-]/g, '_') || 'order.csv'
  const encoded = encodeURIComponent(String(filename || fallback)).replace(/[!'()*]/g, character => '%' + character.charCodeAt(0).toString(16).toUpperCase())
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="' + fallback + '"; filename*=UTF-8\\'\\'' + encoded)
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(Buffer.from('\\uFEFF' + body, 'utf8'))
}

function redirect(res, location, status = 303) {`,
  'CSV response helper',
)

service = replaceSection(
  service,
  `function deliveryNotePage(order, lines, actorType) {`,
  `function createWholesaleOrderingService(`,
  `function documentAmount(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0
}

function documentQuantity(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : documentQuantity(fallback, 0)
}

function orderDocumentTotals(order, lines) {
  const normalizedLines = lines.map(line => {
    const quantity = documentQuantity(line.quantity)
    const deliveredQuantity = documentQuantity(line.deliveredQuantity, quantity)
    const billedUnitPrice = documentAmount(line.unitPrice)
    const listUnitPrice = line.listPrice == null ? billedUnitPrice : documentAmount(line.listPrice)
    return {
      ...line,
      quantity,
      deliveredQuantity,
      billedUnitPrice,
      billedLineTotal: documentAmount(line.lineTotal == null ? billedUnitPrice * deliveredQuantity : line.lineTotal),
      listUnitPrice,
      listLineTotal: listUnitPrice * deliveredQuantity,
    }
  })
  const lineBilledSubtotal = normalizedLines.reduce((sum, line) => sum + line.billedLineTotal, 0)
  const billedSubtotal = order.subtotalYen == null ? lineBilledSubtotal : documentAmount(order.subtotalYen)
  const listSubtotal = normalizedLines.reduce((sum, line) => sum + line.listLineTotal, 0)
  const discountYen = Math.max(0, listSubtotal - billedSubtotal)
  const adjustmentYen = Math.max(0, billedSubtotal - listSubtotal)
  const taxRate = documentAmount(order.taxRate)
  const billedTaxYen = order.taxYen == null ? Math.round(billedSubtotal * taxRate / 100) : documentAmount(order.taxYen)
  const billedTotalYen = order.totalYen == null ? billedSubtotal + billedTaxYen : documentAmount(order.totalYen)
  const listTaxYen = Math.round(listSubtotal * taxRate / 100)
  return {
    lines: normalizedLines,
    listSubtotal,
    listTaxYen,
    listTotalYen: listSubtotal + listTaxYen,
    billedSubtotal,
    billedTaxYen,
    billedTotalYen,
    discountYen,
    adjustmentYen,
    taxRate,
  }
}

function noteAddresses(order) {
  return {
    dealer: [
      order.dealerPostalCode ? '〒' + order.dealerPostalCode : '',
      order.dealerPrefecture,
      order.dealerCity,
      order.dealerAddressLine1,
      order.dealerAddressLine2,
      !order.dealerPrefecture && !order.dealerCity ? order.dealerAddress : '',
    ].filter(Boolean).join(' '),
    salon: [
      order.salonPostalCode ? '〒' + order.salonPostalCode : '',
      order.salonPrefecture,
      order.salonCity,
      order.salonAddressLine1,
      order.salonAddressLine2,
    ].filter(Boolean).join(' '),
  }
}

function documentRows(lines) {
  return lines.map(line => \`<tr><td><strong>\${escapeHtml(line.productName)}</strong><small>\${escapeHtml([line.manufacturerName, line.productCode, line.janCode].filter(Boolean).join(' / '))}</small></td><td>\${line.quantity.toLocaleString('ja-JP')}</td><td>\${line.deliveredQuantity.toLocaleString('ja-JP')}</td><td>\${yen(line.listUnitPrice)}</td><td>\${yen(line.listLineTotal)}</td></tr>\`).join('')
}

function documentIssuer(order, address) {
  const registration = order.dealerInvoiceRegistrationNumber ? \`<small>登録番号 \${escapeHtml(order.dealerInvoiceRegistrationNumber)}</small>\` : ''
  return \`<div class="wo-note-dealer"><img src="/brand/orimia-icon-192.png" alt=""><strong>\${escapeHtml(order.dealerName)}</strong><small>\${escapeHtml(address)}</small><small>\${escapeHtml(order.dealerPhone || '')}</small>\${registration}</div>\`
}

function deliveryNotePage(order, lines) {
  const addresses = noteAddresses(order)
  const totals = orderDocumentTotals(order, lines)
  const draft = order.status === 'ORDERED' || order.status === 'CANCELLED'
  return \`\${sharedHead('納品書 ' + (order.deliveryNo || order.orderNo))}<body class="wo-note-body"><div class="wo-note-actions"><a class="wo-button wo-button-secondary" href="/dealer/orders">\${icon('arrowLeft')}一覧へ戻る</a><button class="wo-button wo-button-primary" type="button" onclick="window.print()">\${icon('printer')}印刷</button></div><main class="wo-delivery-note"><header><div><p>DELIVERY NOTE</p><h1>納品書</h1><span>\${draft ? 'プレビュー' : '1 / 1'}</span></div>\${documentIssuer(order, addresses.dealer)}</header><section class="wo-note-meta"><div class="wo-note-customer"><small>納品先</small><h2>\${escapeHtml(order.organizationName)} 御中</h2><p>\${escapeHtml(addresses.salon)}</p><p>\${escapeHtml(order.salonPhone || '')}</p></div><dl><div><dt>発注No.</dt><dd>\${escapeHtml(order.orderNo)}</dd></div><div><dt>納品No.</dt><dd>\${escapeHtml(order.deliveryNo || '未発行')}</dd></div><div><dt>受注日</dt><dd>\${escapeHtml(dateJa(order.orderedAt))}</dd></div><div><dt>出荷日</dt><dd>\${escapeHtml(dateJa(order.shippedAt))}</dd></div></dl></section><table><thead><tr><th>商品 / 商品コード</th><th>受注数</th><th>納品数</th><th>定価</th><th>定価金額</th></tr></thead><tbody>\${documentRows(totals.lines)}</tbody><tfoot><tr><th colspan="4">定価小計（税抜）</th><td>\${yen(totals.listSubtotal)}</td></tr><tr><th colspan="4">消費税（\${totals.taxRate}%）</th><td>\${yen(totals.listTaxYen)}</td></tr><tr class="wo-note-total"><th colspan="4">定価合計</th><td>\${yen(totals.listTotalYen)}</td></tr></tfoot></table><section class="wo-note-bottom"><div><strong>備考</strong><p>\${escapeHtml(order.dealerNote || order.salonNote || ' ')}</p></div><p>本書の価格欄は定価で表示しています。請求金額は請求書をご確認ください。</p></section></main></body></html>\`
}

function invoicePage(order, lines) {
  const addresses = noteAddresses(order)
  const totals = orderDocumentTotals(order, lines)
  const invoiceNo = 'INV-' + String(order.orderNo || '').replace(/^PO-/, '')
  const discount = totals.discountYen > 0 ? '-' + yen(totals.discountYen) : yen(0)
  const adjustment = totals.adjustmentYen > 0 ? \`<tr><th colspan="4">価格調整</th><td>\${yen(totals.adjustmentYen)}</td></tr>\` : ''
  return \`\${sharedHead('請求書 ' + invoiceNo)}<body class="wo-note-body"><div class="wo-note-actions"><a class="wo-button wo-button-secondary" href="/dealer/orders">\${icon('arrowLeft')}一覧へ戻る</a><button class="wo-button wo-button-primary" type="button" onclick="window.print()">\${icon('printer')}印刷</button></div><main class="wo-delivery-note wo-invoice-note"><header><div><p>INVOICE</p><h1>請求書</h1><span>1 / 1</span></div>\${documentIssuer(order, addresses.dealer)}</header><section class="wo-note-meta"><div class="wo-note-customer"><small>請求先</small><h2>\${escapeHtml(order.organizationName)} 御中</h2><p>\${escapeHtml(addresses.salon)}</p><p>\${escapeHtml(order.salonPhone || '')}</p></div><dl><div><dt>請求No.</dt><dd>\${escapeHtml(invoiceNo)}</dd></div><div><dt>発注No.</dt><dd>\${escapeHtml(order.orderNo)}</dd></div><div><dt>請求日</dt><dd>\${escapeHtml(dateJa(order.deliveredAt || order.shippedAt || order.orderedAt))}</dd></div><div><dt>納品No.</dt><dd>\${escapeHtml(order.deliveryNo || '未発行')}</dd></div></dl></section><table><thead><tr><th>商品 / 商品コード</th><th>受注数</th><th>請求数</th><th>定価</th><th>定価金額</th></tr></thead><tbody>\${documentRows(totals.lines)}</tbody><tfoot><tr><th colspan="4">定価小計（税抜）</th><td>\${yen(totals.listSubtotal)}</td></tr><tr class="wo-note-discount"><th colspan="4">値引き合計</th><td>\${discount}</td></tr>\${adjustment}<tr><th colspan="4">税抜請求額</th><td>\${yen(totals.billedSubtotal)}</td></tr><tr><th colspan="4">消費税（\${totals.taxRate}%）</th><td>\${yen(totals.billedTaxYen)}</td></tr><tr class="wo-note-total"><th colspan="4">請求金額</th><td>\${yen(totals.billedTotalYen)}</td></tr></tfoot></table><section class="wo-note-bottom"><div><strong>備考</strong><p>\${escapeHtml(order.dealerNote || order.salonNote || ' ')}</p></div><p>値引きは商品別ではなく、注文全体の合計額で表示しています。</p></section></main></body></html>\`
}

function csvCell(value) {
  let text = String(value == null ? '' : value).replace(/\\r\\n?/g, '\\n')
  if (/^\\s*[=+\\-@]/.test(text)) text = "'" + text
  return '"' + text.replace(/"/g, '""') + '"'
}

function orderCsv(order, lines) {
  const totals = orderDocumentTotals(order, lines)
  const header = ['発注番号', '受注日', '希望納品日', '美容室', 'ディーラー名', 'メーカー', '商品名', 'カテゴリ', '商品コード', 'JANコード', '受注数量', '納品数量', '定価（税抜）', '定価金額（税抜）', '美容室メモ', 'ディーラーメモ']
  const rows = [...totals.lines].sort((left, right) => String(left.manufacturerName || '').localeCompare(String(right.manufacturerName || ''), 'ja') || String(left.productName || '').localeCompare(String(right.productName || ''), 'ja')).map(line => [
    order.orderNo,
    dateJa(order.orderedAt),
    order.requestedDeliveryDate ? dateJa(order.requestedDeliveryDate) : '',
    order.organizationName,
    order.dealerName,
    line.manufacturerName,
    line.productName,
    line.category,
    line.productCode,
    line.janCode,
    line.quantity,
    line.deliveredQuantity,
    line.listUnitPrice,
    line.listLineTotal,
    order.salonNote,
    order.dealerNote,
  ])
  return [header, ...rows].map(row => row.map(csvCell).join(',')).join('\\r\\n') + '\\r\\n'
}

function createWholesaleOrderingService(`,
  'order document builders',
)

service = replaceSection(
  service,
  `  async function renderDeliveryNote(req, res, orderId) {`,
  `  async function handle(req, res, url) {`,
  `  async function loadDealerOrderDocument(req, res, orderId, requestPath) {
    const dealer = await dealerSession(req)
    if (!dealer) {
      const admin = await adminSession(req)
      if (admin) { redirect(res, '/admin/products/orders?view=history', 302); return null }
      redirect(res, '/dealer/login?next=' + encodeURIComponent(requestPath), 302)
      return null
    }
    const orders = await prisma.$queryRawUnsafe(\`SELECT o.*,org."name" AS "organizationName",p."phone" AS "salonPhone",p."postalCode" AS "salonPostalCode",p."prefecture" AS "salonPrefecture",p."city" AS "salonCity",p."addressLine1" AS "salonAddressLine1",p."addressLine2" AS "salonAddressLine2",d."name" AS "dealerName",d."phone" AS "dealerPhone",d."postalCode" AS "dealerPostalCode",d."prefecture" AS "dealerPrefecture",d."city" AS "dealerCity",d."addressLine1" AS "dealerAddressLine1",d."addressLine2" AS "dealerAddressLine2",d."address" AS "dealerAddress",d."invoiceRegistrationNumber" AS "dealerInvoiceRegistrationNumber" FROM "WholesaleOrder" o JOIN "Organization" org ON org."id"=o."organizationId" JOIN "WholesaleDealer" d ON d."id"=o."dealerId" LEFT JOIN "OrganizationStoreProfile" p ON p."organizationId"=o."organizationId" WHERE o."id"=$1 AND o."dealerId"=$2 LIMIT 1\`, orderId, dealer.id)
    if (!orders[0]) {
      html(res, 404, sharedHead('注文帳票') + '<body class="wo-auth-body"><main class="wo-auth-card"><h1>注文が見つかりません</h1></main></body></html>')
      return null
    }
    const lines = await prisma.$queryRawUnsafe('SELECT * FROM "WholesaleOrderLine" WHERE "orderId"=$1 ORDER BY "createdAt","id"', orderId)
    return { order: orders[0], lines }
  }

  async function renderDeliveryNote(req, res, orderId) {
    const path = '/dealer/orders/' + encodeURIComponent(orderId) + '/delivery-note'
    const document = await loadDealerOrderDocument(req, res, orderId, path)
    if (!document) return
    html(res, 200, deliveryNotePage(document.order, document.lines))
  }

  async function renderInvoice(req, res, orderId) {
    const path = '/dealer/orders/' + encodeURIComponent(orderId) + '/invoice'
    const document = await loadDealerOrderDocument(req, res, orderId, path)
    if (!document) return
    html(res, 200, invoicePage(document.order, document.lines))
  }

  async function exportOrderCsv(req, res, orderId) {
    const path = '/dealer/orders/' + encodeURIComponent(orderId) + '/export.csv'
    const document = await loadDealerOrderDocument(req, res, orderId, path)
    if (!document) return
    const orderNo = String(document.order.orderNo || orderId).replace(/[^A-Za-z0-9._-]/g, '_')
    csvDownload(res, orderNo + '-order.csv', orderCsv(document.order, document.lines))
  }

  async function handle(req, res, url) {`,
  'dealer order document handlers',
)

service = replaceOnce(
  service,
  `    const deliveryMatch = pathname.match(/^\\/dealer\\/orders\\/([^/]+)\\/delivery-note$/)
    if (deliveryMatch && req.method === 'GET') { await renderDeliveryNote(req, res, decodeURIComponent(deliveryMatch[1])); return true }`,
  `    const deliveryMatch = pathname.match(/^\\/dealer\\/orders\\/([^/]+)\\/delivery-note$/)
    if (deliveryMatch && req.method === 'GET') { await renderDeliveryNote(req, res, decodeURIComponent(deliveryMatch[1])); return true }
    const invoiceMatch = pathname.match(/^\\/dealer\\/orders\\/([^/]+)\\/invoice$/)
    if (invoiceMatch && req.method === 'GET') { await renderInvoice(req, res, decodeURIComponent(invoiceMatch[1])); return true }
    const csvMatch = pathname.match(/^\\/dealer\\/orders\\/([^/]+)\\/export\\.csv$/)
    if (csvMatch && req.method === 'GET') { await exportOrderCsv(req, res, decodeURIComponent(csvMatch[1])); return true }`,
  'dealer document routes',
)

const clientCacheKey = '/wholesale-ordering-client-v543.js?v=641-search-input-stability1'
const clientCacheCount = service.split(clientCacheKey).length - 1
if (clientCacheCount !== 2) throw new Error(`dealer client cache key: expected 2 matches, found ${clientCacheCount}`)
service = service.split(clientCacheKey).join('/wholesale-ordering-client-v543.js?v=656-order-documents1')
service = replaceOnce(service, '/wholesale-ordering-v543.css?v=631-pricing-pagination1', '/wholesale-ordering-v543.css?v=656-order-documents1', 'document stylesheet cache key')
service = replaceOnce(
  service,
  `module.exports = { createWholesaleOrderingService, WholesaleError, SESSION_COOKIE, ORDER_STATUSES, CONTRACT_STATUSES, DEALER_OPERATIONS_RELEASE, DEALER_PLAN_KEY, buildDealerCheckoutParams, dealerBillingConfig, dealerBillingStatusLabel, normalizeDealerCode }`,
  `module.exports = { createWholesaleOrderingService, WholesaleError, SESSION_COOKIE, ORDER_STATUSES, CONTRACT_STATUSES, DEALER_OPERATIONS_RELEASE, DEALER_PLAN_KEY, buildDealerCheckoutParams, dealerBillingConfig, dealerBillingStatusLabel, normalizeDealerCode, orderDocumentTotals, deliveryNotePage, invoicePage, orderCsv }`,
  'document helper exports',
)
service += `\n/* ${marker} */\n`

client = replaceOnce(
  client,
  `    printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',`,
  `    printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    receipt: '<path d="M4 2v20l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2V2l-2 2-2-2-2 2-2-2-2 2-2-2-2 2Z"/><path d="M16 8h-6M16 12h-6M13 16h-3"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',`,
  'document action icons',
)

client = replaceSection(
  client,
  `  function dealerOrders() {`,
  `  function renderDealer() {`,
  `  function orderDocumentActions(order) {
    const base = '/dealer/orders/' + encodeURIComponent(order.id)
    const label = esc(order.orderNo)
    return '<nav class="wo-order-document-actions-v656" aria-label="' + label + 'の帳票出力">' +
      '<a class="wo-icon-link" href="' + base + '/delivery-note" target="_blank" rel="noopener" title="納品書を表示・印刷" aria-label="' + label + 'の納品書を表示・印刷">' + icon('printer') + '</a>' +
      '<a class="wo-icon-link" href="' + base + '/invoice" target="_blank" rel="noopener" title="請求書を表示・印刷" aria-label="' + label + 'の請求書を表示・印刷">' + icon('receipt') + '</a>' +
      '<a class="wo-icon-link" href="' + base + '/export.csv" title="注文内容をCSV出力" aria-label="' + label + 'の注文内容をCSV出力">' + icon('download') + '</a></nav>'
  }

  function dealerOrders() {
    const orders = filteredDealerOrders()
    const filters = [['ALL', 'すべて'], ['ORDERED', '新規'], ['ACCEPTED', '受注済み'], ['SHIPPED', '出荷済み'], ['DELIVERED', '納品済み'], ['CANCELLED', 'キャンセル']]
    return dealerStats() + '<section class="wo-workspace wo-order-management-v641"><header class="wo-workspace-head"><div><p class="wo-section-label">PURCHASE ORDERS</p><h2>注文一覧</h2><p>注文明細の更新、納品書・請求書の印刷、注文単位のCSV出力を行えます。</p></div></header><div class="wo-order-toolbar"><div class="wo-segmented">' + filters.map(function (filter) { return '<button type="button" data-action="dealer-status-filter" data-status="' + filter[0] + '" class="' + (dealer.status === filter[0] ? 'active' : '') + '">' + filter[1] + '</button>' }).join('') + '</div><label class="wo-search">' + icon('search') + '<input id="dealer-order-search" value="' + esc(dealer.query) + '" placeholder="美容室名・発注番号で検索" autocomplete="off" enterkeyhint="search"></label></div><div class="wo-order-results-v641">' +
      (orders.length ? '<div class="wo-dealer-orders"><div class="wo-dealer-order-head"><span>発注番号 / 受注日時</span><span>美容室</span><span>商品</span><span>金額</span><span>状態</span><span>帳票・CSV</span><span></span></div>' + orders.map(function (order) {
        return '<article class="wo-dealer-order-row"><button type="button" data-action="open-order" data-id="' + esc(order.id) + '"><span><strong>' + esc(order.orderNo) + '</strong><small>' + date(order.orderedAt, true) + '</small></span><span><small class="wo-mobile-label">美容室</small>' + esc(order.organizationName) + '</span><span><small class="wo-mobile-label">商品</small>' + Number(order.lineCount) + '商品 / ' + Number(order.totalQuantity) + '点</span><span><small class="wo-mobile-label">金額</small>' + (Number(order.totalYen) ? yen(order.totalYen) : '未確定') + '</span><span>' + statusBadge(order.status) + '</span><span>' + icon('chevron') + '</span></button>' + orderDocumentActions(order) + '</article>'
      }).join('') + '</div>' : emptyState('clipboard', '該当する注文はありません', '条件を変更して確認してください。')) + '</div></section>'
  }

  function renderDealer() {`,
  'dealer order document actions',
)

client = replaceOnce(
  client,
  `<footer><a class="wo-button wo-button-secondary" href="/dealer/orders/' + encodeURIComponent(order.id) + '/delivery-note" target="_blank" rel="noopener">' + icon('printer') + '納品書</a><span class="wo-dialog-spacer"></span><button class="wo-button wo-button-secondary" value="cancel">閉じる</button>' + actions + '</footer>`,
  `<footer><div class="wo-dialog-document-actions-v656"><a class="wo-button wo-button-secondary" href="/dealer/orders/' + encodeURIComponent(order.id) + '/delivery-note" target="_blank" rel="noopener">' + icon('printer') + '納品書</a><a class="wo-button wo-button-secondary" href="/dealer/orders/' + encodeURIComponent(order.id) + '/invoice" target="_blank" rel="noopener">' + icon('receipt') + '請求書</a><a class="wo-button wo-button-secondary" href="/dealer/orders/' + encodeURIComponent(order.id) + '/export.csv">' + icon('download') + 'CSV</a></div><span class="wo-dialog-spacer"></span><button class="wo-button wo-button-secondary" value="cancel">閉じる</button>' + actions + '</footer>`,
  'order detail document actions',
)

client = replaceOnce(client, '取引先への表示と納品書に使用する、自社の正式な情報を管理します。', '取引先への表示と納品書・請求書に使用する、自社の正式な情報を管理します。', 'company document description')
client = replaceOnce(client, '保存した情報は、次回表示する納品書にも反映されます。', '保存した情報は、次回表示する納品書・請求書にも反映されます。', 'company document save notice')
client += `\n/* ${marker} */\n`

css += `

/* ${marker} */
.wo-dealer-order-head { grid-template-columns: minmax(190px,1.25fr) minmax(150px,1.1fr) minmax(92px,.7fr) minmax(92px,.7fr) minmax(94px,.75fr) 126px 28px; min-width: 1080px; }
.wo-dealer-order-row { min-width: 1080px; }
.wo-dealer-order-row > button { grid-template-columns: minmax(190px,1.25fr) minmax(150px,1.1fr) minmax(92px,.7fr) minmax(92px,.7fr) minmax(94px,.75fr) 126px 28px; padding-right: 20px; }
.wo-order-document-actions-v656 { position: absolute; top: 50%; right: 53px; z-index: 2; display: flex; gap: 6px; transform: translateY(-50%); }
.wo-order-document-actions-v656 .wo-icon-link { width: 36px; height: 36px; color: #665651; }
.wo-order-document-actions-v656 .wo-icon-link:hover { transform: translateY(-1px); }
.wo-dialog-document-actions-v656 { display: flex; flex-wrap: wrap; gap: 8px; }
.wo-dialog-document-actions-v656 .wo-button svg { width: 17px; height: 17px; }
.wo-note-dealer { grid-template-rows: auto; }
.wo-note-dealer img { grid-row: 1 / 6; }
.wo-delivery-note header p, .wo-delivery-note h1 { letter-spacing: 0; }
.wo-delivery-note header > div:first-child { flex: 0 0 auto; }
.wo-delivery-note h1 { white-space: nowrap; }
.wo-delivery-note table { table-layout: fixed; }
.wo-delivery-note thead th:nth-child(1) { width: 42%; }
.wo-delivery-note thead th:nth-child(2), .wo-delivery-note thead th:nth-child(3) { width: 11%; }
.wo-delivery-note thead th:nth-child(4) { width: 17%; }
.wo-delivery-note thead th:nth-child(5) { width: 19%; }
.wo-delivery-note th, .wo-delivery-note td, .wo-note-dealer small, .wo-note-meta dd { overflow-wrap: anywhere; }
.wo-note-discount th, .wo-note-discount td { color: #a33f57; font-weight: 900; }
.wo-invoice-note .wo-note-total th, .wo-invoice-note .wo-note-total td { font-size: 14px; }

@media (max-width: 620px) {
  .wo-dealer-order-row { min-width: 0; padding-bottom: 48px; }
  .wo-dealer-order-row > button { padding: 14px 50px 10px 14px; }
  .wo-order-document-actions-v656 { top: auto; right: auto; bottom: 10px; left: 14px; transform: none; }
  .wo-order-document-actions-v656 .wo-icon-link:hover { transform: none; }
  .wo-dialog-document-actions-v656 { width: 100%; }
  .wo-dialog-document-actions-v656 .wo-button { min-width: 0 !important; }
  .wo-delivery-note header { gap: 16px; }
  .wo-delivery-note h1 { font-size: 30px; }
  .wo-note-dealer { grid-template-columns: 36px minmax(0, 1fr); gap: 2px 8px; min-width: 0; }
  .wo-note-dealer img { width: 36px; height: 36px; }
  .wo-delivery-note th, .wo-delivery-note td { padding: 8px 4px; }
  .wo-delivery-note thead th { font-size: 8px; white-space: nowrap; }
}

@media print {
  .wo-note-discount { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
}
`

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Sales-Ledger-Product-Names', 'v655') /* sales-ledger-product-names-v655-ready */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Order-Documents', 'v656') /* ${marker}-ready */`,
  'dealer order documents readiness marker',
)
server += `\n/* ${marker} */\n`

fs.writeFileSync(servicePath, service)
fs.writeFileSync(clientPath, client)
fs.writeFileSync(cssPath, css)
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release: marker, patched: true }))
