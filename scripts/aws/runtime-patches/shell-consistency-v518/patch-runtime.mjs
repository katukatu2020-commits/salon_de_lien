import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const nextRoot = path.join(root, '.next')
const publicRoot = path.join(root, 'public')
const serverPath = path.join(root, 'server.js')

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

function collectFiles(directory, predicate, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) collectFiles(fullPath, predicate, output)
    else if (predicate(fullPath, entry.name)) output.push(fullPath)
  }
  return output
}

function replaceNextReferences(oldValue, newValue, label) {
  let files = 0
  let references = 0
  for (const file of collectFiles(nextRoot, (_fullPath, name) => name.endsWith('.js') || name.endsWith('.json'))) {
    const source = fs.readFileSync(file, 'utf8')
    const count = source.split(oldValue).length - 1
    if (!count) continue
    fs.writeFileSync(file, source.split(oldValue).join(newValue))
    files += 1
    references += count
  }
  if (!files || !references) throw new Error(`${label}: no manifest references were updated`)
  return { files, references }
}

fs.copyFileSync(path.join(patchRoot, 'shell-consistency-v518.js'), path.join(publicRoot, 'shell-consistency-v518.js'))
fs.copyFileSync(path.join(patchRoot, 'shell-consistency-v518.css'), path.join(publicRoot, 'shell-consistency-v518.css'))

const shellHead = '<script>window.__orimiaBrandV503=true;window.__orimiaBrandV501=true</script><link id="orimia-shell-consistency-style-v518" rel="stylesheet" href="/shell-consistency-v518.css?v=518-release1"><script id="orimia-shell-consistency-script-v518" src="/shell-consistency-v518.js?v=518-release1" defer></script>'

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceExact(
  server,
  `  if (!pathname.startsWith('/u/')) return output
  if (!output.includes('__orimiaCustomerLoaderV508') && output.includes(CUSTOMER_EXPERIENCE_BOOTSTRAP_V508)) {`,
  `  const customerRoute = pathname === '/u' || pathname.startsWith('/u/')
  const adminRoute = pathname === '/admin' || pathname.startsWith('/admin/')
  if (!customerRoute && !adminRoute) return output
  if (!output.includes('orimia-shell-consistency-script-v518')) {
    output = output.replace('<head>', '<head>' + ${JSON.stringify(shellHead)})
  }
  if (!customerRoute) return output
  if (!output.includes('__orimiaCustomerLoaderV508') && output.includes(CUSTOMER_EXPERIENCE_BOOTSTRAP_V508)) {`,
  1,
  'protected route shell assets',
)
server = replaceExact(
  server,
  `const CUSTOMER_LAYOUT_REFRESHED_CHUNK_V508 = 'static/chunks/app/u/(account)/layout-customer-mobile-nav-v425.orimia-v508.js'`,
  `const CUSTOMER_LAYOUT_REFRESHED_CHUNK_V508 = 'static/chunks/app/u/(account)/layout-customer-mobile-nav-v425.orimia-v518.js'`,
  1,
  'customer shell chunk cache key',
)
server = replaceExact(
  server,
  '/customer-experience-v508.js?v=516-release3',
  '/customer-experience-v508.js?v=518-release1',
  1,
  'customer experience cache key',
)
server = replaceExact(
  server,
  '/customer-experience-v503.js?v=516-release7',
  '/customer-experience-v503.js?v=518-release1',
  2,
  'standalone customer cache keys',
)
server = replaceExact(
  server,
  '<span class="brand-script">ORIMIA</span><span class="brand-sub">Beauty Membership</span>',
  '<span class="brand-script">ORIMIA for Salon</span><span class="brand-sub">Beauty Membership</span>',
  1,
  'standalone customer header brand',
)
server = replaceExact(
  server,
  '<title>${htmlEscape(title)} | ORIMIA</title>',
  '<title>${htmlEscape(title)} | ORIMIA for Salon</title>',
  1,
  'standalone customer title brand',
)
server = replaceExact(
  server,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Route-Scoped-Settings', 'v517')`,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Route-Scoped-Settings', 'v517')
      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Shell-Consistency', 'v518')`,
  1,
  'shell readiness marker',
)
server += '\n/* shell-consistency-v518 */\n'
fs.writeFileSync(serverPath, server)

for (const relative of ['customer-experience-v503.js', 'public/orimia-brand-v503.js']) {
  const file = path.join(root, relative)
  let source = fs.readFileSync(file, 'utf8')
  source = replaceExact(
    source,
    `const CUSTOMER_BRAND = 'Powered by ORIMIA'`,
    `const CUSTOMER_BRAND = 'ORIMIA for Salon'`,
    1,
    `${relative} customer brand`,
  )
  source += '\n/* shell-consistency-v518 */\n'
  fs.writeFileSync(file, source)
}

const customerExperiencePath = path.join(root, 'customer-experience-v508.js')
let customerExperience = fs.readFileSync(customerExperiencePath, 'utf8')
customerExperience = replaceExact(
  customerExperience,
  'Powered by ORIMIA',
  'ORIMIA for Salon',
  4,
  'customer experience brand copy',
)
customerExperience += '\n/* shell-consistency-v518 */\n'
fs.writeFileSync(customerExperiencePath, customerExperience)

const oldLayoutName = 'layout-runtime-v517-release1.js'
const newLayoutName = 'layout-runtime-v518-release1.js'
const oldLayoutPath = path.join(nextRoot, 'static', 'chunks', 'app', oldLayoutName)
const newLayoutPath = path.join(nextRoot, 'static', 'chunks', 'app', newLayoutName)
let layout = fs.readFileSync(oldLayoutPath, 'utf8')
layout = replaceExact(
  layout,
  `const CUSTOMER_BRAND = 'Powered by ORIMIA'`,
  `const CUSTOMER_BRAND = 'ORIMIA for Salon'`,
  1,
  'inline customer brand',
)
layout += '\n/* shell-consistency-v518 */\n'
fs.writeFileSync(newLayoutPath, layout)
const layoutReferences = replaceNextReferences(oldLayoutName, newLayoutName, 'shell layout activation')

const oldCustomerChunkName = 'layout-customer-mobile-nav-v425.orimia-v508.js'
const newCustomerChunkName = 'layout-customer-mobile-nav-v425.orimia-v518.js'
const oldCustomerChunkPath = path.join(nextRoot, 'static', 'chunks', 'app', 'u', '(account)', oldCustomerChunkName)
const newCustomerChunkPath = path.join(nextRoot, 'static', 'chunks', 'app', 'u', '(account)', newCustomerChunkName)
let customerChunk = fs.readFileSync(oldCustomerChunkPath, 'utf8')
customerChunk = replaceExact(
  customerChunk,
  'className:"customer-premium-brand-script",children:"ORIMIA"',
  'className:"customer-premium-brand-script",children:"ORIMIA for Salon"',
  1,
  'customer client header brand',
)
customerChunk += '\n/* shell-consistency-v518 */\n'
fs.writeFileSync(newCustomerChunkPath, customerChunk)

const customerServerChunkPath = path.join(nextRoot, 'server', 'chunks', '1597.js')
let customerServerChunk = fs.readFileSync(customerServerChunkPath, 'utf8')
customerServerChunk = replaceExact(
  customerServerChunk,
  'className:"customer-premium-brand-script",children:"ORIMIA"',
  'className:"customer-premium-brand-script",children:"ORIMIA for Salon"',
  1,
  'customer server header brand',
)
customerServerChunk += '\n/* shell-consistency-v518 */\n'
fs.writeFileSync(customerServerChunkPath, customerServerChunk)

for (const name of ['powered-by-orimia.webmanifest', 'orimia-for-salon.webmanifest']) {
  const manifestPath = path.join(publicRoot, name)
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  manifest.name = 'ORIMIA for Salon'
  manifest.short_name = 'ORIMIA'
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
}

console.log(JSON.stringify({
  release: 'shell-consistency-v518',
  layoutReferences,
  customerChunk: newCustomerChunkName,
}))
