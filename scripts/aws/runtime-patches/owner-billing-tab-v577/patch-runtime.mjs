import fs from 'node:fs'

const salesClientPath = '/app/sales-ledger-client-v318.js'
const tenantClientPath = '/app/tenant-setup-client.js'
const serverPath = '/app/server.js'
const marker = 'owner-billing-tab-v577'

let salesClient = fs.readFileSync(salesClientPath, 'utf8')
let tenantClient = fs.readFileSync(tenantClientPath, 'utf8')
let server = fs.readFileSync(serverPath, 'utf8')

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${label}: target was not found`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: target was not unique`)
  return source.slice(0, first) + after + source.slice(first + before.length)
}

const enhanceStart = `  function enhance() {
    const route = location.pathname + location.search`

const tabSynchronizer = `  const ownerTabActiveClasses = ['bg-[color:var(--lien-primary)]', 'text-white', 'shadow-sm']
  const ownerTabInactiveClasses = ['text-lien-muted', 'hover:bg-lien-soft', 'hover:text-lien-ink']

  function syncOwnerAnalyticsTabs() { /* ${marker} */
    if (location.pathname !== '/admin/owner-analytics') return
    const params = new URLSearchParams(location.search)
    const activeKey = params.get('section') === 'billing'
      ? 'billing'
      : params.get('salesLedger') === '1' ? 'ledger' : 'analytics'
    const nav = document.querySelector('nav[aria-label="経営ページ切替"]')
    if (!nav) return

    nav.querySelectorAll(':scope > a[href]').forEach(link => {
      const target = new URL(link.getAttribute('href') || '', location.origin)
      const linkKey = target.searchParams.get('section') === 'billing'
        ? 'billing'
        : target.searchParams.get('salesLedger') === '1' ? 'ledger' : 'analytics'
      const current = linkKey === activeKey
      link.classList.remove(...(current ? ownerTabInactiveClasses : ownerTabActiveClasses))
      link.classList.add(...(current ? ownerTabActiveClasses : ownerTabInactiveClasses))
      if (current) link.setAttribute('aria-current', 'page')
      else link.removeAttribute('aria-current')
    })
    nav.dataset.ownerTabActiveV577 = activeKey
  }

${enhanceStart}
    syncOwnerAnalyticsTabs()`

salesClient = replaceOnce(salesClient, enhanceStart, tabSynchronizer, 'owner analytics tab synchronizer')
salesClient = replaceOnce(
  salesClient,
  `  addEventListener('popstate', enhance)`,
  `  addEventListener('popstate', enhance)
  addEventListener('pageshow', enhance)`,
  'restored-page synchronization',
)
salesClient = replaceOnce(
  salesClient,
  `    setTimeout(enhance, link ? 40 : 0)`,
  `    setTimeout(enhance, link ? 40 : 0)
    if (link) setTimeout(enhance, 240)`,
  'late route synchronization',
)

tenantClient = replaceOnce(
  tenantClient,
  `script.src='/sales-ledger-v318.js?v=413'`,
  `script.src='/sales-ledger-v318.js?v=577-owner-billing-tab1'`,
  'sales client cache key',
)

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Operations', 'v576') /* dealer-operations-v576 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Owner-Billing-Tab', 'v577') /* ${marker} */`,
  'readiness marker',
)

fs.writeFileSync(salesClientPath, salesClient)
fs.writeFileSync(tenantClientPath, tenantClient)
fs.writeFileSync(serverPath, server)
console.log(JSON.stringify({ release:marker, patched:true }))
