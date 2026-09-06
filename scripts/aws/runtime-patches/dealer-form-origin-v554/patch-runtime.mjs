import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const servicePath = path.join(root, 'wholesale-ordering-v543.js')
const serverPath = path.join(root, 'server.js')
const marker = 'dealer-form-origin-v554'

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
  path.join(patchRoot, 'dealer-origin-policy-v554.js'),
  path.join(root, 'dealer-origin-policy-v554.js'),
)

service = replaceExactly(
  service,
  `const path = require('node:path')`,
  `const path = require('node:path')\nconst { validDealerRequestOrigin } = require('./dealer-origin-policy-v554') /* ${marker} */`,
  'dealer origin policy import',
)

service = replaceExactly(
  service,
  `function validSameOrigin(req) {\n  const source = String(req.headers.origin || req.headers.referer || '').trim()\n  if (!source) return false\n  const allowed = new Set(['https://salon-de-lien.com', 'https://www.salon-de-lien.com'])\n  for (const key of ['APP_URL', 'NEXT_PUBLIC_APP_URL', 'APP_BASE_URL', 'AUTH_BASE_URL', 'NEXTAUTH_URL']) {\n    try { if (process.env[key]) allowed.add(new URL(process.env[key]).origin) } catch {}\n  }\n  try { return allowed.has(new URL(source).origin) } catch { return false }\n}`,
  `function validSameOrigin(req) {\n  return validDealerRequestOrigin(req)\n}`,
  'same-origin request validation',
)
service += `\n/* ${marker} */\n`

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Shared-Account-Identity', 'v553') /* shared-account-available-login-v553 */`
server = replaceExactly(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Form-Origin', 'v554') /* ${marker} */`,
  'readiness marker',
)
server += `\n/* ${marker} */\n`

fs.writeFileSync(servicePath, service)
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release: marker, patched: true }))
