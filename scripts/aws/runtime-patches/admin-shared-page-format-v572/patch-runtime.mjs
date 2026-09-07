import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const publicRoot = path.join(root, 'public')
const serverPath = path.join(root, 'server.js')
const salesClientPath = path.join(root, 'sales-ledger-client-v318.js')
const marker = 'admin-shared-page-format-v572'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function replaceBlock(source, start, end, replacement, label) {
  const startIndex = source.indexOf(start)
  if (startIndex < 0 || source.indexOf(start, startIndex + start.length) >= 0) {
    throw new Error(`${label}: block start was not unique`)
  }
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (endIndex < 0) throw new Error(`${label}: block end was not found`)
  return `${source.slice(0, startIndex)}${replacement}${source.slice(endIndex)}`
}

for (const asset of [
  'admin-workspace-layout-v572.js',
  'admin-workspace-layout-v572.css',
  'inventory-orders-common-layout-v572.js',
  'inventory-orders-common-layout-v572.css',
]) {
  fs.copyFileSync(path.join(patchRoot, asset), path.join(publicRoot, asset))
}

let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes(`/* ${marker} */`)) throw new Error(`${marker}: patch already applied`)

server = replaceOnce(
  server,
  `  } /* owner-shared-switch-v550-assets */`,
  `  } /* owner-shared-switch-v550-assets */
  if (adminRoute && !output.includes('orimia-admin-workspace-layout-v572')) {
    output = output.replace('<head>', '<head>' + '<link id="orimia-admin-workspace-layout-style-v572" rel="stylesheet" href="/admin-workspace-layout-v572.css?v=572-release1"><script id="orimia-admin-workspace-layout-v572" src="/admin-workspace-layout-v572.js?v=572-release1"></script>')
  } /* ${marker}-assets */`,
  'shared admin workspace assets',
)

server = replaceOnce(
  server,
  `const inventoryOrdersShellRoute = pathname === '/admin/products' && String(requestUrl || '').includes('orimiaWholesaleShell=v570') /* inventory-orders-common-layout-v570 */`,
  `const inventoryOrdersShellRoute = pathname === '/admin/products' && String(requestUrl || '').includes('orimiaWholesaleShell=v572') /* ${marker} */`,
  'inventory shell route version',
)

server = replaceOnce(
  server,
  `const shellSearch = new URLSearchParams({ section: 'products', orimiaWholesaleShell: 'v570' })`,
  `const shellSearch = new URLSearchParams({ section: 'products', orimiaWholesaleShell: 'v572' })`,
  'inventory internal rewrite version',
)

server = replaceOnce(
  server,
  `if (inventoryOrdersShellRoute && !output.includes('orimia-inventory-orders-common-script-v570'))`,
  `if (inventoryOrdersShellRoute && !output.includes('orimia-inventory-orders-common-script-v572'))`,
  'inventory asset guard',
)

const previousInventoryAssets = '<script id="orimia-inventory-orders-first-paint-v570">document.documentElement.classList.add("orimia-inventory-orders-pending-v570");window.setTimeout(function(){document.documentElement.classList.remove("orimia-inventory-orders-pending-v570")},10000)</script><link id="orimia-inventory-orders-workspace-style-v543" rel="stylesheet" href="/wholesale-ordering-v543.css?v=570-common-layout1"><link id="orimia-inventory-orders-common-style-v570" rel="stylesheet" href="/inventory-orders-common-layout-v570.css?v=570-release1"><script id="orimia-inventory-orders-common-script-v570" src="/inventory-orders-common-layout-v570.js?v=570-release1" defer></script>'
const nextInventoryAssets = '<script id="orimia-inventory-orders-first-paint-v572">document.documentElement.classList.add("orimia-inventory-orders-pending-v572");window.setTimeout(function(){document.documentElement.classList.remove("orimia-inventory-orders-pending-v572")},10000)</script><link id="orimia-inventory-orders-workspace-style-v543" rel="stylesheet" href="/wholesale-ordering-v543.css?v=570-common-layout1"><link id="orimia-inventory-orders-common-style-v572" rel="stylesheet" href="/inventory-orders-common-layout-v572.css?v=572-release1"><script id="orimia-inventory-orders-common-script-v572" src="/inventory-orders-common-layout-v572.js?v=572-release1" defer></script>'
server = replaceOnce(
  server,
  JSON.stringify(previousInventoryAssets),
  JSON.stringify(nextInventoryAssets),
  'inventory shared format assets',
)

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Chart-Route-Scope', 'v571') /* customer-chart-route-scope-v571 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Admin-Shared-Page-Format', 'v572') /* ${marker} */`,
  'readiness header',
)
server += `\n/* ${marker} */\n`

let salesClient = fs.readFileSync(salesClientPath, 'utf8')
if (salesClient.includes(`/* ${marker} */`)) throw new Error(`${marker}: sales client already patched`)

salesClient = replaceOnce(
  salesClient,
  `.sl-ledger-portal{position:fixed;z-index:25;overflow:auto;background:var(--lien-bg,#fffaf6);overscroll-behavior:auto;scrollbar-gutter:stable;-webkit-overflow-scrolling:touch}`,
  `.sl-ledger-portal{display:contents}`,
  'fixed sales ledger portal',
)
salesClient = replaceOnce(
  salesClient,
  `.sl-ledger-portal-inner{min-height:100%;padding:20px 16px 32px}@media(min-width:640px){.sl-ledger-portal-inner{padding-left:24px;padding-right:24px}}@media(min-width:1024px){.sl-ledger-portal-inner{padding-left:32px;padding-right:32px}}`,
  `.sl-ledger-portal-inner{display:contents}`,
  'sales ledger portal inner',
)
salesClient = replaceOnce(
  salesClient,
  `.sl-page{--sl-rose:var(--lien-primary,#c94f72);--sl-rose-soft:var(--lien-primary-soft,#fff0f5);--sl-ink:var(--lien-ink,#241d1a);--sl-muted:var(--lien-muted,#80726b);--sl-line:var(--lien-line,#eadbd4);--sl-card:var(--lien-paper,#fffdfb);display:grid;max-width:80rem;margin:0 auto;gap:24px;color:var(--sl-ink)}`,
  `.sl-page{--sl-rose:var(--lien-primary,#c94f72);--sl-rose-soft:var(--lien-primary-soft,#fff0f5);--sl-ink:var(--lien-ink,#241d1a);--sl-muted:var(--lien-muted,#80726b);--sl-line:var(--lien-line,#eadbd4);--sl-card:var(--lien-paper,#fffdfb);display:contents;color:var(--sl-ink)}`,
  'sales ledger page foundation',
)

const generatedLedgerTabs = `<nav class="sl-tabs" aria-label="経営ページ切替"><a href="/admin/owner-analytics">経営分析</a><a aria-current="page" class="active" href="/admin/owner-analytics?salesLedger=1">会計データ管理</a><a href="/admin/owner-analytics?section=billing">システム利用料</a></nav>\n      `
salesClient = replaceOnce(salesClient, generatedLedgerTabs, '', 'duplicated sales ledger navigation')

const cleanupLedger = `  function cleanupLedgerPortal() {
    document.querySelectorAll('[data-sl-ledger-portal]').forEach(node => {
      node.dispatchEvent(new Event('sl:cleanup'))
      node.remove()
    })
    window.__orimiaAdminWorkspaceV572?.unmount('sales-ledger')
    rendering = false
  }

  `
salesClient = replaceBlock(
  salesClient,
  `  function cleanupLedgerPortal() {`,
  `  async function renderLedger() {`,
  cleanupLedger,
  'sales ledger cleanup and fixed-position synchronizer',
)

const renderLedgerPrelude = `  async function renderLedger() {
    if (rendering) return
    rendering = true
    installStyles()
    cleanupLedgerPortal()
    rendering = true
    const workspace = window.__orimiaAdminWorkspaceV572
    if (!workspace) {
      rendering = false
      window.setTimeout(() => {
        if (location.pathname === '/admin/owner-analytics' && new URLSearchParams(location.search).get('salesLedger') === '1') renderLedger()
      }, 50)
      return
    }
    const mounted = workspace.mount({
      key:'sales-ledger',
      preserveSelectors:['nav[aria-label="経営ページ切替"]'],
      activeHref:'/admin/owner-analytics?salesLedger=1',
      headerTitle:'会計データ管理',
      documentTitle:'会計データ管理 | ORIMIA',
    })
    if (!mounted) {
      rendering = false
      window.setTimeout(() => {
        if (location.pathname === '/admin/owner-analytics' && new URLSearchParams(location.search).get('salesLedger') === '1') renderLedger()
      }, 50)
      return
    }
    const portal = document.createElement('div')
    portal.className = 'sl-ledger-portal'
    portal.dataset.slLedgerPortal = '1'
    portal.innerHTML = \`<div class="sl-ledger-portal-inner">\${ledgerMarkup()}</div>\`
    mounted.host.appendChild(portal)
    const main = mounted.main
    const syncLedgerTheme = () => {
      const sourceStyle = getComputedStyle(main)
      const propertyNames = [
        '--lien-bg', '--lien-surface', '--lien-surface-soft', '--lien-surface-rose',
        '--lien-ink', '--lien-muted', '--lien-muted-2', '--lien-primary',
        '--lien-primary-dark', '--lien-primary-soft', '--lien-border',
        '--lien-shadow', '--lien-shadow-sm', '--font-noto-sans-jp',
      ]
      for (const propertyName of propertyNames) {
        const value = sourceStyle.getPropertyValue(propertyName).trim()
        if (value) portal.style.setProperty(propertyName, value)
      }
      portal.dataset.caTheme = document.documentElement.dataset.caTheme || 'pink'
      portal.style.fontFamily = sourceStyle.fontFamily
    }
    syncLedgerTheme()
    addEventListener('salon-lien:theme-change', syncLedgerTheme)
    portal.addEventListener('sl:cleanup', () => {
      removeEventListener('salon-lien:theme-change', syncLedgerTheme)
    }, { once:true })
    `
salesClient = replaceBlock(
  salesClient,
  `  async function renderLedger() {`,
  `const root = portal.querySelector('.sl-page')`,
  renderLedgerPrelude,
  'sales ledger native workspace mount',
)

salesClient += `\n/* ${marker} */\n`

fs.writeFileSync(serverPath, server)
fs.writeFileSync(salesClientPath, salesClient)

console.log(JSON.stringify({
  release:marker,
  sharedWorkspace:true,
  inventoryNativeRoot:true,
  salesLedgerNativeRoot:true,
  fixedPortalRemoved:true,
  duplicateNavigationRemoved:true,
}))
