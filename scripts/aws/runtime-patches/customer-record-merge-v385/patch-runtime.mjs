import fs from 'node:fs'

const serverPath = '/app/server.js'
const tenantClientPath = '/app/tenant-setup-client.js'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceOnce(
  server,
  `const { createSalesLedgerAccountsService } = require('./sales-ledger-accounts-v318') /* sales-ledger-accounts-v318 */`,
  `const { createSalesLedgerAccountsService } = require('./sales-ledger-accounts-v318') /* sales-ledger-accounts-v318 */\nconst { createCustomerMergeService } = require('./customer-merge-v385') /* customer-record-merge-v385 */`,
  'customer merge service import',
)
server = replaceOnce(
  server,
  `const salesLedgerAccounts = createSalesLedgerAccountsService({
  prisma,
  crypto,
  sessionProvider: req => chatSession(req, 'staff'),
}) /* sales-ledger-accounts-v318-service */`,
  `const salesLedgerAccounts = createSalesLedgerAccountsService({
  prisma,
  crypto,
  sessionProvider: req => chatSession(req, 'staff'),
}) /* sales-ledger-accounts-v318-service */
const customerMerge = createCustomerMergeService({
  prisma,
  crypto,
  sessionProvider: req => chatSession(req, 'staff'),
}) /* customer-record-merge-v385-service */`,
  'customer merge service initialization',
)
server = replaceOnce(
  server,
  `  await salesLedgerAccounts.ensureSchema() /* sales-ledger-accounts-v318-schema */`,
  `  await salesLedgerAccounts.ensureSchema() /* sales-ledger-accounts-v318-schema */\n  await customerMerge.ensureSchema() /* customer-record-merge-v385-schema */`,
  'customer merge schema initialization',
)
server = replaceOnce(
  server,
  `      if (await salesLedgerAccounts.handle(req, res, url)) return /* sales-ledger-accounts-v318-route */`,
  `      if (await salesLedgerAccounts.handle(req, res, url)) return /* sales-ledger-accounts-v318-route */\n      if (await customerMerge.handle(req, res, url)) return /* customer-record-merge-v385-route */`,
  'customer merge route registration',
)
fs.writeFileSync(serverPath, server)

let tenantClient = fs.readFileSync(tenantClientPath, 'utf8')
tenantClient += `\n;(() => {
  if (window.__lienCustomerMergeLoaderV385) return
  window.__lienCustomerMergeLoaderV385 = true
  const load = () => {
    if (!/^\\/admin\\/customers\\/[^/]+$/.test(location.pathname) || document.querySelector('script[data-customer-merge-v385]')) return
    const script = document.createElement('script')
    script.src = '/customer-merge-v385.js?v=385'
    script.dataset.customerMergeV385 = '1'
    script.defer = true
    document.head.appendChild(script)
  }
  const wrap = name => {
    const original = history[name]
    history[name] = function () { const result = original.apply(this, arguments); setTimeout(load, 0); return result }
  }
  wrap('pushState'); wrap('replaceState')
  addEventListener('popstate', load)
  load()
})() /* customer-record-merge-v385-loader */\n`
fs.writeFileSync(tenantClientPath, tenantClient)
