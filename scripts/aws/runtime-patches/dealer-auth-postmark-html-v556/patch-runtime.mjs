import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const servicePath = path.join(root, 'wholesale-ordering-v543.js')
const serverPath = path.join(root, 'server.js')
const marker = 'dealer-auth-postmark-html-v556'

function replaceExactly(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  return source.replace(before, after)
}

let service = fs.readFileSync(servicePath, 'utf8')
let server = fs.readFileSync(serverPath, 'utf8')

if (service.includes(marker) || server.includes(marker)) {
  throw new Error(`${marker}: patch already applied`)
}

fs.copyFileSync(
  path.join(patchRoot, 'dealer-auth-mail-content-v556.js'),
  path.join(root, 'dealer-auth-mail-content-v556.js'),
)

const postmarkImport = `const { sendDealerAuthPostmark } = require('./dealer-auth-postmark-v555') /* dealer-auth-postmark-v555 */`
service = replaceExactly(
  service,
  postmarkImport,
  `${postmarkImport}\nconst { dealerAuthMailHtml } = require('./dealer-auth-mail-content-v556') /* ${marker} */`,
  'dealer authentication mail renderer import',
)
service += `\n/* ${marker} */\n`

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Auth-Mail', 'v555') /* dealer-auth-postmark-v555 */`
server = replaceExactly(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Auth-Mail-Content', 'v556') /* ${marker} */`,
  'readiness marker',
)
server += `\n/* ${marker} */\n`

fs.writeFileSync(servicePath, service)
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release: marker, patched: true }))
