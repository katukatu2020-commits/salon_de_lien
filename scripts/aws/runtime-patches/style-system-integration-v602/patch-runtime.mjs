import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const marker = 'style-system-integration-v602'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function copy(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive:true })
  fs.copyFileSync(source, target)
}

copy(
  path.join(patchRoot, 'style-system-integration-v602.js'),
  path.join(root, 'style-system-integration-v602.js'),
)
copy(
  path.join(patchRoot, 'style-system-integration-client-v602.js'),
  path.join(root, 'public', 'style-system-integration-v602.js'),
)
copy(
  path.join(patchRoot, 'style-system-integration-v602.css'),
  path.join(root, 'public', 'style-system-integration-v602.css'),
)

const serverPath = path.join(root, 'server.js')
let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes(`/* ${marker} */`)) throw new Error(`${marker}: patch already applied`)

const serviceAnchor = `const contentManagement = createContentManagementService({
  prisma,
  staffSessionProvider: req => chatSession(req, 'staff'),
  customerSessionProvider: req => chatSession(req, 'customer'),
  canAccessThread,
}) /* content-edit-delete-v465-service */`
server = replaceOnce(
  server,
  serviceAnchor,
  `${serviceAnchor}
const styleSystemV602 = require('./style-system-integration-v602').createStyleSystemIntegrationService({
  prisma,
  staffSessionProvider: req => chatSession(req, 'staff'),
  customerSessionProvider: req => chatSession(req, 'customer'),
}) /* ${marker} */`,
  'style system service',
)

server = replaceOnce(
  server,
  `  await hotpepperStyles.ensureSchema()`,
  `  await hotpepperStyles.ensureSchema()
  await styleSystemV602.ensureSchema() /* ${marker}-schema */`,
  'style system schema',
)

server = replaceOnce(
  server,
  `  const adminRoute = pathname === '/admin' || pathname.startsWith('/admin/')`,
  `  const adminRoute = pathname === '/admin' || pathname.startsWith('/admin/')
  const styleCommunityRouteV602 = /^\\/(?:admin|u)\\/community(?:\\/[^/]+)?\\/?$/.test(pathname)`,
  'community route detection',
)

server = replaceOnce(
  server,
  `  if (!customerRoute) return output`,
  `  if (styleCommunityRouteV602 && !output.includes('orimia-style-system-v602')) {
    output = output.replace('</head>', '<link id="orimia-style-system-v602-style" rel="stylesheet" href="/style-system-integration-v602.css?v=602"><script id="orimia-style-system-v602" src="/style-system-integration-v602.js?v=602" defer></script></head>')
  }
  if (!customerRoute) return output`,
  'style system assets',
)

const readyAnchor = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Journey', 'v601'); res.setHeader('X-Lien-Hotpepper-Style-Import', 'v600')`
server = replaceOnce(
  server,
  readyAnchor,
  `${readyAnchor}
      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-System-Integration', 'v602') /* ${marker}-ready */`,
  'readiness header',
)

server = replaceOnce(
  server,
  `      if (await customerFavoritesV601.handle(req,res,url)) return`,
  `      if (await styleSystemV602.handle(req,res,url)) return /* ${marker}-route */
      if (await customerFavoritesV601.handle(req,res,url)) return`,
  'style system route',
)

server += `\n/* ${marker} */\n`
fs.writeFileSync(serverPath, server)

const publishingPath = path.join(root, 'community-publishing-v566.js')
let publishing = fs.readFileSync(publishingPath, 'utf8')
publishing = replaceOnce(
  publishing,
  `      return {
        ok: true,
        postId,`,
  `      await require('./style-system-integration-v602').syncPostStyle({
        prisma:db,
        organizationId:session.organizationId,
        postId,
        metadata,
        links:input.styleLinks,
      })
      return {
        ok: true,
        postId,`,
  'new post structured links',
)
publishing += `\n/* ${marker} */\n`
fs.writeFileSync(publishingPath, publishing)

const publisherPath = path.join(root, 'community-publishing-client-v566.js')
let publisher = fs.readFileSync(publisherPath, 'utf8')
const publisherAddon = fs.readFileSync(path.join(patchRoot, 'publisher-linking-addon-v602.js'), 'utf8').trimEnd()
publisher = replaceOnce(
  publisher,
  `  function configureHotpepper(modal) {`,
  `${publisherAddon}\n\n  function configureHotpepper(modal) {`,
  'publisher linking helper',
)
publisher = replaceOnce(
  publisher,
  `            metadata:modal.__styleMetadata?.(),
            caption:modal.querySelector`,
  `            metadata:modal.__styleMetadata?.(),
            styleLinks:modal.__styleLinks?.(),
            caption:modal.querySelector`,
  'publisher link payload',
)
publisher = replaceOnce(
  publisher,
  `    configureHotpepper(modal)
    syncSubmit()`,
  `    configureHotpepper(modal)
    configureStyleLinksV602(modal)
    syncSubmit()`,
  'publisher link mount',
)
publisher += `\n/* ${marker} */\n`
fs.writeFileSync(publisherPath, publisher)

const commercialPath = path.join(root, 'commercial-admin-v101.js')
let commercial = fs.readFileSync(commercialPath, 'utf8')
commercial = replaceOnce(
  commercial,
  `  script.src = '/admin-community-publishing-v600.js?v=600'`,
  `  script.src = '/admin-community-publishing-v600.js?v=602'`,
  'publisher cache key',
)
commercial += `\n/* ${marker} */\n`
fs.writeFileSync(commercialPath, commercial)

const customerCommunityMobilePath = path.join(root, 'public', 'customer-community-mobile-v383.js')
let customerCommunityMobile = fs.readFileSync(customerCommunityMobilePath, 'utf8')
customerCommunityMobile = replaceOnce(
  customerCommunityMobile,
  `        if (mediaBlock) {
          Array.from(mediaBlock.children).forEach((photo) => {`,
  `        if (mediaBlock && !mediaBlock.classList.contains('orimia-style-gallery-v602')) {
          Array.from(mediaBlock.children).forEach((photo) => {`,
  'customer style gallery compatibility',
)
customerCommunityMobile = replaceOnce(
  customerCommunityMobile,
  `          const meta = contentBlock.firstElementChild;
          set(meta, {`,
  `          const meta = contentBlock.firstElementChild;
          if (!article.classList.contains('orimia-style-detail-v602')) set(meta, {`,
  'customer style metadata compatibility',
)
customerCommunityMobile += `\n/* ${marker}-customer-gallery-and-meta */\n`
fs.writeFileSync(customerCommunityMobilePath, customerCommunityMobile)

console.log(JSON.stringify({ release:marker, server:true, publishing:true, publisher:true, assets:true }))
