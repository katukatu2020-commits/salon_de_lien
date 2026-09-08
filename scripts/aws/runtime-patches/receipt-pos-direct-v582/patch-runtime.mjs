import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const publicRoot = path.join(root, 'public')
const serverPath = path.join(root, 'server.js')
const marker = 'receipt-pos-direct-v582'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${marker}: ${label} expected one match, found ${count}`)
  return source.replace(before, after)
}

fs.copyFileSync(
  path.join(patchRoot, 'receipt-pos-direct-v582.js'),
  path.join(publicRoot, 'receipt-pos-direct-v582.js'),
)

const previousHead = '<link id="orimia-receipt-physical-roll-style-v579" rel="stylesheet" href="/receipt-physical-roll-v579.css?v=579-release1"><script id="orimia-receipt-physical-roll-script-v579" src="/receipt-physical-roll-v579.js?v=579-release1" defer></script>'
const receiptHead = '<link id="orimia-receipt-physical-roll-style-v579" rel="stylesheet" href="/receipt-physical-roll-v579.css?v=579-release1"><script id="orimia-receipt-pos-direct-script-v582" src="/receipt-pos-direct-v582.js?v=582-release1" defer></script>'

let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes(`/* ${marker} */`)) throw new Error(`${marker}: patch already applied`)
server = replaceOnce(
  server,
  "'orimia-receipt-physical-roll-script-v579'",
  "'orimia-receipt-pos-direct-script-v582'",
  'receipt asset guard',
)
server = replaceOnce(
  server,
  JSON.stringify(previousHead),
  JSON.stringify(receiptHead),
  'receipt route assets',
)

const settingsAnchor = `      if (url.pathname === '/admin/settings' && url.searchParams.get('embedded') === '1') {`
const bridgeCsp = `      if (/^\\/admin\\/appointments\\/[^/]+\\/receipt\\/?$/.test(url.pathname)) {
        const receiptSetHeaderV582 = res.setHeader.bind(res)
        res.setHeader = (name, value) => {
          if (String(name || '').toLowerCase() === 'content-security-policy' && typeof value === 'string') {
            value = value.replace(/connect-src\\s+([^;]*)/i, (directive, sources) => {
              const bridgeSource = 'http://127.0.0.1:17615'
              return sources.includes(bridgeSource) ? directive : 'connect-src ' + sources.trim() + ' ' + bridgeSource
            })
          }
          return receiptSetHeaderV582(name, value)
        }
      } /* ${marker}-csp */
`
server = replaceOnce(server, settingsAnchor, bridgeCsp + settingsAnchor, 'receipt bridge CSP')

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Contract-Pricing', 'v581') /* dealer-contract-pricing-v581 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Receipt-Pos-Direct', 'v582') /* ${marker} */`,
  'readiness header',
)
server += `\n/* ${marker} */\n`
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release:marker, client:true, routeScopedCsp:true, readiness:true }))
