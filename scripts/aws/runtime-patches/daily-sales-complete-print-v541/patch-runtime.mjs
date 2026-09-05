import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const publicRoot = path.join(root, 'public')
const serverPath = path.join(root, 'server.js')
const marker = 'daily-sales-complete-print-v541'

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${label}: target was not found`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: target was not unique`)
  return source.slice(0, first) + after + source.slice(first + before.length)
}

for (const asset of ['daily-sales-complete-print-v541.css', 'daily-sales-complete-print-v541.js']) {
  fs.copyFileSync(path.join(patchRoot, asset), path.join(publicRoot, asset))
}

const printHead = '<link id="orimia-daily-sales-print-style-v541" rel="stylesheet" href="/daily-sales-complete-print-v541.css?v=541-release1"><script id="orimia-daily-sales-print-script-v541" src="/daily-sales-complete-print-v541.js?v=541-release1" defer></script>'

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceOnce(
  server,
  `  const receiptRoute = /^\\/admin\\/appointments\\/[^/]+\\/receipt\\/?$/.test(pathname)
  if (!customerRoute && !adminRoute) return output`,
  `  const receiptRoute = /^\\/admin\\/appointments\\/[^/]+\\/receipt\\/?$/.test(pathname)
  const dailySalesRoute = pathname === '/admin/owner-analytics'
  if (!customerRoute && !adminRoute) return output`,
  'daily sales route detection',
)
server = replaceOnce(
  server,
  `  if (!output.includes('orimia-shell-consistency-script-v518')) {`,
  `  if (dailySalesRoute && !output.includes('orimia-daily-sales-print-script-v541')) {
    output = output.replace('<head>', '<head>' + ${JSON.stringify(printHead)})
  }
  if (!output.includes('orimia-shell-consistency-script-v518')) {`,
  'daily sales print assets',
)

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Receipt-Thermal-Print', 'v540') /* receipt-thermal-print-v540 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Daily-Sales-Complete-Print', 'v541') /* ${marker} */`,
  'daily sales print readiness marker',
)
server += `\n/* ${marker} */\n`
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release:marker, patched:true }))
