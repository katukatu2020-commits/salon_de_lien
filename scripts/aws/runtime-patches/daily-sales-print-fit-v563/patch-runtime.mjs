import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const publicRoot = path.join(root, 'public')
const serverPath = path.join(root, 'server.js')
const marker = 'daily-sales-print-fit-v563'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

for (const asset of ['daily-sales-print-fit-v563.css', 'daily-sales-print-fit-v563.js']) {
  fs.copyFileSync(path.join(patchRoot, asset), path.join(publicRoot, asset))
}

let server = fs.readFileSync(serverPath, 'utf8')
const previousAssets = '<link id="orimia-daily-sales-print-style-v541" rel="stylesheet" href="/daily-sales-complete-print-v541.css?v=541-release1"><script id="orimia-daily-sales-print-script-v541" src="/daily-sales-complete-print-v541.js?v=541-release1" defer></script>'
const nextAssets = '<link id="orimia-daily-sales-print-style-v563" rel="stylesheet" href="/daily-sales-print-fit-v563.css?v=563-release1"><script id="orimia-daily-sales-print-script-v563" src="/daily-sales-print-fit-v563.js?v=563-release1" defer></script>'
server = replaceOnce(server, JSON.stringify(previousAssets), JSON.stringify(nextAssets), 'daily sales print assets')

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Chart-UI', 'v562') /* customer-chart-ui-v562 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Daily-Sales-Print-Fit', 'v563') /* ${marker} */`,
  'readiness header',
)
server += `\n/* ${marker} */\n`

fs.writeFileSync(serverPath, server)
console.log(JSON.stringify({ release:marker, patched:true }))
