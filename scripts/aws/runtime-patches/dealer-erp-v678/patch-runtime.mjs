import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const source = path.dirname(fileURLToPath(import.meta.url))
function replace(file, before, after, count = 1) {
  const target = path.join(root, file), content = fs.readFileSync(target, 'utf8')
  if (content.split(before).length - 1 !== count) throw new Error(`Parent anchor mismatch: ${file}: ${before.slice(0, 120)}`)
  fs.writeFileSync(target, content.replaceAll(before, after))
}
for (const name of ['dealer-erp-v678.js', 'dealer-erp-v678-client.js', 'dealer-erp-v678-nav.js', 'dealer-erp-v678.css']) fs.copyFileSync(path.join(source, name), path.join(root, name))
fs.copyFileSync(path.join(source, 'schema.sql'), path.join(root, 'dealer-erp-v678.sql'))
const req = createRequire(path.join(root, 'package.json'))
const React = req('react'), { renderToStaticMarkup } = req('react-dom/server'), icons = req('lucide-react')
const markup = Object.fromEntries(['Plus', 'Search', 'RefreshCw', 'ChevronLeft', 'ChevronRight', 'X', 'Printer', 'Download', 'Send', 'Package', 'Truck', 'Check', 'Undo2', 'Pencil', 'MessageSquare'].map(name => [name, renderToStaticMarkup(React.createElement(icons[name], { size: 18, 'aria-hidden': true }))]))
const client = path.join(root, 'dealer-erp-v678-client.js')
fs.writeFileSync(client, 'window.DealerErpIcons=' + JSON.stringify(markup) + ';\n' + fs.readFileSync(client, 'utf8'))
const w = 'wholesale-ordering-v543.js'
replace(w, '  const authAttempts = new Map()', `  const authAttempts = new Map()
  const dealerErpV678 = require('./dealer-erp-v678.js').createDealerErp({ prisma, crypto, helpers: { session: dealerSession, adminSession, portal: dealerPortalPage, sameOrigin: validSameOrigin, readPayload, json, html, redirect } })`)
replace(w, '      await salesTeamV671.ensureSchema()', '      await salesTeamV671.ensureSchema()\n      await dealerErpV678.ensureSchema()\n      salesTeamV671.setReporting(dealerErpV678.report)')
replace(w, "    if (pathname.startsWith('/dealer-sales-team-v671'))", "    if (pathname.startsWith('/dealer-erp-v678')) return dealerErpV678.handle(req, res, url)\n    if (pathname.startsWith('/dealer-sales-team-v671'))")
replace(w, "pathname.startsWith('/admin/products/orders') || pathname.startsWith('/dealer')", "pathname.startsWith('/admin/products/orders') || pathname === '/admin/dealer-messages' || pathname.startsWith('/dealer')")
replace(w, '    if (await salesTeamV671.handle(req, res, url)) return true', '    if (await salesTeamV671.handle(req, res, url)) return true\n    if (await dealerErpV678.handle(req, res, url)) return true')
replace(w, "  const pages = {\n    sales:", `  const pages = {
    operations: { title: '業務ダッシュボード', eyebrow: 'DEALER OPERATIONS', description: '' },
    inventory: { title: '倉庫・在庫', eyebrow: 'WAREHOUSE', description: '' },
    fulfillment: { title: '出荷・納品', eyebrow: 'FULFILLMENT', description: '' },
    receivables: { title: '請求・入金', eyebrow: 'RECEIVABLES', description: '' },
    activities: { title: '営業予定・活動', eyebrow: 'ACTIVITIES', description: '' },
    messages: { title: '連絡', eyebrow: 'MESSAGES', description: '' },
    sales:`)
replace(w, "  const nav = [\n    ['sales'", `  const nav = [
    ['operations', '/dealer/operations', 'building', '業務ダッシュボード'],
    ['fulfillment', '/dealer/fulfillment', 'truck', '出荷・納品'],
    ['inventory', '/dealer/inventory', 'package', '倉庫・在庫'],
    ['receivables', '/dealer/receivables', 'clipboard', '請求・入金'],
    ['activities', '/dealer/activities', 'calendar', '営業予定・活動'],
    ['messages', '/dealer/messages', 'users', '連絡'],
    ['sales'`)
replace(w, '<script src="/dealer-sales-team-v671-nav.js?v=671-1" defer></script>', '<script src="/dealer-sales-team-v671-nav.js?v=671-1" defer></script><link rel="stylesheet" href="/dealer-erp-v678.css?v=1"><script src="/dealer-erp-v678-nav.js?v=1" defer></script>')
replace(w, '      const orders = await tx.$queryRawUnsafe(\'SELECT * FROM "WholesaleOrder"', `      try { await dealerErpV678.legacyGuard(tx, session, orderId, target) } catch (error) { throw new WholesaleError(error.message, error.status || 500) }
      const orders = await tx.$queryRawUnsafe('SELECT * FROM "WholesaleOrder"`)
replace(w, 'WHERE o."id"=$1 AND o."dealerId"=$2 LIMIT 1`, orderId, session.id)', 'WHERE o."id"=$1 AND o."dealerId"=$2 AND ($3::text IS NULL OR o."salesMemberId"=$3) LIMIT 1`, orderId, session.id, session.role === \'ADMIN\' ? null : session.memberId)')
replace(w, 'WHERE o."id"=$1 AND o."dealerId"=$2 LIMIT 1`, orderId, dealer.id)', 'WHERE o."id"=$1 AND o."dealerId"=$2 AND ($3::text IS NULL OR o."salesMemberId"=$3) LIMIT 1`, orderId, dealer.id, dealer.role === \'ADMIN\' ? null : dealer.memberId)')
replace(w, 'WHERE o."dealerId"=$1 GROUP BY o."id",org."name" ORDER BY CASE', 'WHERE o."dealerId"=$1 AND ($2::text IS NULL OR o."salesMemberId"=$2) GROUP BY o."id",org."name" ORDER BY CASE')
replace(w, 'o."orderedAt" DESC LIMIT 200`, session.id),', 'o."orderedAt" DESC LIMIT 200`, session.id, session.role === \'ADMIN\' ? null : session.memberId),')
const team = 'dealer-sales-team-v671.js'
replace(team, '  async function report(s, query) {', '  let reportingOverride\n  async function report(s, query) {\n    if (reportingOverride) return reportingOverride(s, query)')
replace(team, '  return { ensureSchema, extendSession,', '  return { setReporting: fn => { reportingOverride = fn }, ensureSchema, extendSession,')
replace('wholesale-ordering-client-v543.js', "esc(contract.dealerCode) + '</small></span>'", "esc(contract.dealerCode) + '</small><a href=\"/admin/dealer-messages?dealer=' + encodeURIComponent(contract.dealerId) + '\">取引先へ連絡</a></span>'")
// Version every inherited reference, including salon pages and script substitution anchors.
for (const directory of [root, path.join(root, 'public')]) {
  for (const entry of fs.readdirSync(directory, { withFileTypes:true })) {
    if (!entry.isFile() || !entry.name.endsWith('.js')) continue
    const target = path.join(directory, entry.name), content = fs.readFileSync(target, 'utf8')
    const updated = content.replaceAll('wholesale-ordering-client-v543.js?v=659-product-search-filters1', 'wholesale-ordering-client-v543.js?v=678-erp1')
    if (updated !== content) fs.writeFileSync(target, updated)
  }
}
// The authenticated salon shell receives only a navigation enhancer, never a polling renderer.
replace('server.js', "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Branch-Shared-Contact', 'v677') /* branch-shared-contact-v677-ready */", "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Branch-Shared-Contact', 'v677') /* branch-shared-contact-v677-ready */\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Erp', 'v678') /* dealer-erp-v678-ready */")
console.log('Dealer ERP v678 runtime patched')
