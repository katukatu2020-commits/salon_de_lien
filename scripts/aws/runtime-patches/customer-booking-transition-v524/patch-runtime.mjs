import fs from 'node:fs'
import path from 'node:path'

const root = process.env.APP_ROOT || '/app'
const serverPath = path.join(root, 'server.js')
const shellCssPath = path.join(root, 'public', 'shell-consistency-v518.css')
const addonPath = new URL('customer-booking-transition-v524.css', import.meta.url)
const clientPath = new URL('customer-booking-transition-v524.js', import.meta.url)
const publicClientPath = path.join(root, 'public', 'customer-booking-transition-v524.js')
const marker = 'customer-booking-transition-v524'

const gateScript = '<script id="orimia-customer-booking-gate-v524" src="/customer-booking-transition-v524.js?v=524"></script>'

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceExact(
  server,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Sidebar-Boundary', 'v523')`,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Sidebar-Boundary', 'v523')
      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Booking-Transition', 'v524')`,
  1,
  'customer booking transition readiness marker',
)
server = replaceExact(
  server,
  '/shell-consistency-v518.css?v=523-boundary1',
  '/shell-consistency-v518.css?v=524-booking-transition1',
  1,
  'shell stylesheet cache revision',
)
server = replaceExact(
  server,
  'function transformOrimiaHtmlV500(html, requestUrl) { /* customer-experience-v508 */',
  `const CUSTOMER_BOOKING_GATE_V524 = ${JSON.stringify(gateScript)}

function transformOrimiaHtmlV500(html, requestUrl) { /* customer-experience-v508 */`,
  1,
  'customer booking gate constant',
)
server = replaceExact(
  server,
  `  if (!customerRoute) return output
  if (!output.includes('__orimiaCustomerLoaderV508') && output.includes(CUSTOMER_EXPERIENCE_BOOTSTRAP_V508)) {`,
  `  if (!customerRoute) return output
  if (!output.includes('orimia-customer-booking-gate-v524')) {
    output = output.replace('<head>', '<head>' + CUSTOMER_BOOKING_GATE_V524)
  }
  if (!output.includes('__orimiaCustomerLoaderV508') && output.includes(CUSTOMER_EXPERIENCE_BOOTSTRAP_V508)) {`,
  1,
  'customer booking gate injection',
)
fs.writeFileSync(serverPath, server)

let shellCss = fs.readFileSync(shellCssPath, 'utf8')
if (shellCss.includes(marker)) throw new Error(`${marker}: patch already applied`)
const addon = fs.readFileSync(addonPath, 'utf8')
shellCss += `\n\n${addon}\n`
fs.writeFileSync(shellCssPath, shellCss)
fs.copyFileSync(clientPath, publicClientPath)

console.log(JSON.stringify({ release: marker, patched: true }))
