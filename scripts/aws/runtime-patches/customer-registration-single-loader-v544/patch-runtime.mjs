import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const serverPath = path.join(root, 'server.js')
const shellStylePath = path.join(root, 'public', 'shell-consistency-v518.css')
const marker = 'customer-registration-single-loader-v544'

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

let shellStyle = fs.readFileSync(shellStylePath, 'utf8')
if (shellStyle.includes(marker)) throw new Error(`${marker}: patch already applied`)
if (!shellStyle.includes('html[data-orimia-customer-booking-gate-v524]:not([data-orimia-ui-ready="v516"]) body::after')) {
  throw new Error('legacy customer booking loader was not found')
}
const addition = fs.readFileSync(path.join(patchRoot, `${marker}.css`), 'utf8')
shellStyle += `\n\n${addition.trim()}\n`

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceExact(
  server,
  '/shell-consistency-v518.css?v=524-booking-transition1',
  '/shell-consistency-v518.css?v=544-single-loader1',
  1,
  'customer shell stylesheet cache revision',
)
const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Wholesale-Ordering', 'v543') /* wholesale-ordering-v543 */`
server = replaceExact(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Registration-Single-Loader', 'v544') /* ${marker} */`,
  1,
  'single loader readiness marker',
)
server += `\n/* ${marker} */\n`

fs.writeFileSync(shellStylePath, shellStyle)
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release: marker, patched: true }))
