import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const publicRoot = path.join(root, 'public')
const serverPath = path.join(root, 'server.js')
const shellPath = path.join(publicRoot, 'shell-consistency-v518.js')
const marker = 'receipt-thermal-print-v540'

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${label}: target was not found`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: target was not unique`)
  return source.slice(0, first) + after + source.slice(first + before.length)
}

for (const asset of ['receipt-thermal-print-v540.css', 'receipt-thermal-print-v540.js']) {
  fs.copyFileSync(path.join(patchRoot, asset), path.join(publicRoot, asset))
}

const receiptHead = '<link id="orimia-receipt-print-style-v540" rel="stylesheet" href="/receipt-thermal-print-v540.css?v=540-release1"><script id="orimia-receipt-print-script-v540" src="/receipt-thermal-print-v540.js?v=540-release1" defer></script>'

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceOnce(
  server,
  `  const adminRoute = pathname === '/admin' || pathname.startsWith('/admin/')
  if (!customerRoute && !adminRoute) return output`,
  `  const adminRoute = pathname === '/admin' || pathname.startsWith('/admin/')
  const receiptRoute = /^\\/admin\\/appointments\\/[^/]+\\/receipt\\/?$/.test(pathname)
  if (!customerRoute && !adminRoute) return output`,
  'receipt route detection',
)
server = replaceOnce(
  server,
  `  if (!output.includes('orimia-shell-consistency-script-v518')) {`,
  `  if (receiptRoute) {
    if (!output.includes('orimia-receipt-print-script-v540')) {
      output = output.replace('<head>', '<head>' + ${JSON.stringify(receiptHead)})
    }
    return output
  }
  if (!output.includes('orimia-shell-consistency-script-v518')) {`,
  'route-scoped receipt print assets',
)

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Sales-Ledger-Staff-Filter', 'v539') /* sales-ledger-staff-filter-v539 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Receipt-Thermal-Print', 'v540') /* ${marker} */`,
  'receipt print readiness marker',
)
server += `\n/* ${marker} */\n`
fs.writeFileSync(serverPath, server)

let shell = fs.readFileSync(shellPath, 'utf8')
shell = replaceOnce(
  shell,
  `    const active = location.pathname === '/admin' || location.pathname.startsWith('/admin/')
    root.classList.toggle('orimia-admin-shell-v518', active)
    if (!active || location.pathname === '/admin/login') {`,
  `    const active = location.pathname === '/admin' || location.pathname.startsWith('/admin/')
    const receiptRoute = /^\\/admin\\/appointments\\/[^/]+\\/receipt\\/?$/.test(location.pathname)
    root.classList.toggle('orimia-admin-shell-v518', active && !receiptRoute)
    if (!active || location.pathname === '/admin/login' || receiptRoute) {`,
  'receipt route shell exclusion',
)
shell += `\n/* ${marker} */\n`
fs.writeFileSync(shellPath, shell)

console.log(JSON.stringify({ release:marker, patched:true }))
