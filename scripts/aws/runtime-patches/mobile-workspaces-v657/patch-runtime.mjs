import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const release = 'mobile-workspaces-v657'
const patchDirectory = path.dirname(fileURLToPath(import.meta.url))
const serverPath = path.join(root, 'server.js')
const dealerServicePath = path.join(root, 'wholesale-ordering-v543.js')
const publicCssPath = path.join(root, 'public', 'mobile-workspaces-v657.css')
const publicJsPath = path.join(root, 'public', 'mobile-workspaces-v657.js')

let server = fs.readFileSync(serverPath, 'utf8')
let dealerService = fs.readFileSync(dealerServicePath, 'utf8')

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${label}: target was not found`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: target was not unique`)
  return source.slice(0, first) + after + source.slice(first + before.length)
}

server = replaceOnce(
  server,
  `  if (!customerRoute) return output`,
  `  if (adminRoute && !output.includes('orimia-mobile-workspaces-v657')) {
    output = output.replace('</head>', '<link id="orimia-mobile-workspaces-v657" rel="stylesheet" href="/mobile-workspaces-v657.css?v=657-release1"></head>')
  } /* ${release}-admin-assets */
  if (!customerRoute) return output`,
  'salon mobile stylesheet injection',
)

dealerService = replaceOnce(
  dealerService,
  `<link rel="stylesheet" href="/wholesale-ordering-v543.css?v=656-order-documents1"></head>`,
  `<link rel="stylesheet" href="/wholesale-ordering-v543.css?v=656-order-documents1"><link id="orimia-mobile-workspaces-v657" rel="stylesheet" href="/mobile-workspaces-v657.css?v=657-release1"><script id="orimia-mobile-workspaces-v657-script" src="/mobile-workspaces-v657.js?v=657-release1" defer></script></head>`,
  'dealer mobile stylesheet injection',
)

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Order-Documents', 'v656') /* dealer-order-documents-v656-ready */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Mobile-Workspaces', 'v657') /* ${release}-ready */`,
  'mobile workspaces readiness marker',
)

server += `\n/* ${release} */\n`
dealerService += `\n/* ${release} */\n`

fs.copyFileSync(path.join(patchDirectory, 'mobile-workspaces-v657.css'), publicCssPath)
fs.copyFileSync(path.join(patchDirectory, 'mobile-workspaces-v657.js'), publicJsPath)
fs.writeFileSync(serverPath, server)
fs.writeFileSync(dealerServicePath, dealerService)

console.log(JSON.stringify({ release, patched: true, stylesheet: '/mobile-workspaces-v657.css', script: '/mobile-workspaces-v657.js' }))
