import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const publicRoot = path.join(root, 'public')
const serverPath = path.join(root, 'server.js')
const commercialPath = path.join(root, 'commercial-admin-v101.js')
const wholesaleModulePath = path.join(root, 'wholesale-ordering-v543.js')
const wholesaleStylePath = path.join(root, 'wholesale-ordering-v543.css')
const marker = 'inventory-orders-common-layout-v570'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

for (const asset of ['inventory-orders-common-layout-v570.js', 'inventory-orders-common-layout-v570.css']) {
  fs.copyFileSync(path.join(patchRoot, asset), path.join(publicRoot, asset))
}

let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes(`/* ${marker} */`)) throw new Error(`${marker}: patch already applied`)

server = replaceOnce(
  server,
  `  const dailySalesRoute = pathname === '/admin/owner-analytics'`,
  `  const dailySalesRoute = pathname === '/admin/owner-analytics'\n  const inventoryOrdersShellRoute = pathname === '/admin/products' && String(requestUrl || '').includes('orimiaWholesaleShell=v570') /* ${marker} */`,
  'inventory shell route detection',
)

const inventoryAssets = '<script id="orimia-inventory-orders-first-paint-v570">document.documentElement.classList.add("orimia-inventory-orders-pending-v570");window.setTimeout(function(){document.documentElement.classList.remove("orimia-inventory-orders-pending-v570")},10000)</script><link id="orimia-inventory-orders-workspace-style-v543" rel="stylesheet" href="/wholesale-ordering-v543.css?v=570-common-layout1"><link id="orimia-inventory-orders-common-style-v570" rel="stylesheet" href="/inventory-orders-common-layout-v570.css?v=570-release1"><script id="orimia-inventory-orders-common-script-v570" src="/inventory-orders-common-layout-v570.js?v=570-release1" defer></script>'
server = replaceOnce(
  server,
  `  if (!customerRoute) return output`,
  `  if (inventoryOrdersShellRoute && !output.includes('orimia-inventory-orders-common-script-v570')) {\n    output = output.replace('</head>', ${JSON.stringify(inventoryAssets)} + '</head>')\n  }\n  if (!customerRoute) return output`,
  'inventory shell assets',
)

const wholesaleHandler = `      if (await wholesaleOrdering.handle(req, res, url)) return /* wholesale-ordering-v543 */`
server = replaceOnce(
  server,
  wholesaleHandler,
  `${wholesaleHandler}\n      if (req.method === 'GET' && url.pathname === '/admin/products/orders') {\n        const shellSearch = new URLSearchParams({ section: 'products', orimiaWholesaleShell: 'v570' })\n        const requestedView = url.searchParams.get('view')\n        if (['order', 'inventory', 'history'].includes(requestedView)) shellSearch.set('view', requestedView)\n        req.url = '/admin/products?' + shellSearch.toString()\n        url.pathname = '/admin/products'\n        url.search = '?' + shellSearch.toString()\n      } /* ${marker}-route */`,
  'inventory route rewrite',
)

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Receipt-Roll-Print', 'v569') /* receipt-roll-print-v569 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Inventory-Orders-Common-Layout', 'v570') /* ${marker} */`,
  'readiness header',
)
server += `\n/* ${marker} */\n`

let commercial = fs.readFileSync(commercialPath, 'utf8')
commercial = replaceOnce(
  commercial,
  `    link.href = '/admin/products/orders'\n    link.setAttribute(marker, '')`,
  `    link.href = '/admin/products/orders'\n    link.addEventListener('click', event => {\n      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return\n      event.preventDefault()\n      location.assign(link.href)\n    }) /* ${marker}-hard-navigation */\n    link.setAttribute(marker, '')`,
  'inventory entry hard navigation',
)

let wholesaleModule = fs.readFileSync(wholesaleModulePath, 'utf8')
wholesaleModule = replaceOnce(
  wholesaleModule,
  `      html(res, 200, adminOrderingPage(session)); return true`,
  `      return false /* ${marker}-authenticated-shared-shell */`,
  'authenticated inventory route handoff',
)

let wholesaleStyle = fs.readFileSync(wholesaleStylePath, 'utf8')
const globalFoundation = `  --wo-sidebar: 324px;\n  font-family: "Noto Sans JP", "Yu Gothic UI", "Yu Gothic", Meiryo, sans-serif;\n  color: var(--wo-ink);\n  background: var(--wo-wash);\n  font-synthesis: none;\n}\n\n* { box-sizing: border-box; }\nhtml { min-height: 100%; background: var(--wo-wash); }\nbody { margin: 0; min-width: 320px; color: var(--wo-ink); background: var(--wo-wash); }\nbutton, input, select, textarea { font: inherit; letter-spacing: 0; }\nbutton, select { cursor: pointer; }\nbutton:disabled { cursor: not-allowed; opacity: .48; }\na { color: inherit; }\nsvg { width: 22px; height: 22px; flex: none; }\n.sr-only { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0, 0, 0, 0) !important; white-space: nowrap !important; border: 0 !important; }`
const scopedFoundation = `  --wo-sidebar: 324px;\n}\n\n:is(body.wo-body, body.wo-auth-body, body.wo-note-body),\n.wo-app-root {\n  color: var(--wo-ink);\n  font-family: "Noto Sans JP", "Yu Gothic UI", "Yu Gothic", Meiryo, sans-serif;\n  font-synthesis: none;\n}\n:is(body.wo-body, body.wo-auth-body, body.wo-note-body) { margin: 0; min-width: 320px; background: var(--wo-wash); }\n:is(body.wo-body, body.wo-auth-body, body.wo-note-body),\n:is(body.wo-body, body.wo-auth-body, body.wo-note-body) *,\n.wo-app-root,\n.wo-app-root * { box-sizing: border-box; }\n:is(body.wo-body, body.wo-auth-body, body.wo-note-body) :where(button, input, select, textarea),\n.wo-app-root :where(button, input, select, textarea) { font: inherit; letter-spacing: 0; }\n:is(body.wo-body, body.wo-auth-body, body.wo-note-body) :where(button, select),\n.wo-app-root :where(button, select) { cursor: pointer; }\n:is(body.wo-body, body.wo-auth-body, body.wo-note-body) :where(button:disabled),\n.wo-app-root :where(button:disabled) { cursor: not-allowed; opacity: .48; }\n:is(body.wo-body, body.wo-auth-body, body.wo-note-body) :where(a),\n.wo-app-root :where(a) { color: inherit; }\n:is(body.wo-body, body.wo-auth-body, body.wo-note-body) :where(svg),\n.wo-app-root :where(svg) { width: 22px; height: 22px; flex: none; }\n:is(body.wo-body, body.wo-auth-body, body.wo-note-body) .sr-only,\n.wo-app-root .sr-only { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0, 0, 0, 0) !important; white-space: nowrap !important; border: 0 !important; }`
wholesaleStyle = replaceOnce(wholesaleStyle, globalFoundation, scopedFoundation, 'wholesale global foundation scope')

fs.writeFileSync(serverPath, server)
fs.writeFileSync(commercialPath, commercial)
fs.writeFileSync(wholesaleModulePath, wholesaleModule)
fs.writeFileSync(wholesaleStylePath, wholesaleStyle)

console.log(JSON.stringify({ release: marker, server: true, commercial: true, authHandoff: true, stylesheetScoped: true, assets: true }))
