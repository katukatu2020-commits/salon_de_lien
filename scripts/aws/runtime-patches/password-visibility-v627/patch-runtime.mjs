import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'password-visibility-v627'
const changes = []

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ file, label, count })
}

const customerStampRoute = `  const customerStampRouteV603 = pathname === '/u/stamps'`
replaceExact(
  'server.js',
  customerStampRoute,
  `${customerStampRoute}\n  const passwordLoginRouteV627 = pathname === '/u/login' || pathname === '/admin/login' /* ${marker}-route */`,
  1,
  'declare customer and store login route scope',
)

const registrationGuard = `  if (pathname === '/admin/register') return output /* store-registration-layout-v592: standalone shared auth layout */`
replaceExact(
  'server.js',
  registrationGuard,
  `${registrationGuard}\n  if (passwordLoginRouteV627 && !output.includes('orimia-password-visibility-v627')) {\n    output = output.replace('</head>', '<link id="orimia-password-visibility-v627-style" rel="stylesheet" href="/password-visibility-v627.css?v=627-release1"><script id="orimia-password-visibility-v627" src="/password-visibility-v627.js?v=627-release1" defer></script></head>')\n  } /* ${marker}-assets */`,
  1,
  'inject customer and store login assets',
)

const readinessAnchor = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Detail-Cleanup', 'v626') /* style-detail-management-removal-v626-ready */`
replaceExact(
  'server.js',
  readinessAnchor,
  `${readinessAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Password-Visibility', 'v627') /* ${marker}-ready */`,
  1,
  'password visibility readiness marker',
)

const dealerHead = `${'${'}sharedHead('ディーラーログイン')}`
const dealerAssets = `<link id="orimia-password-visibility-v627-style" rel="stylesheet" href="/password-visibility-v627.css?v=627-release1"><script id="orimia-password-visibility-v627" src="/password-visibility-v627.js?v=627-release1" defer></script></head>`
replaceExact(
  'wholesale-ordering-v543.js',
  dealerHead,
  `${'${'}sharedHead('ディーラーログイン').replace('</head>', ${JSON.stringify(dealerAssets)})}`,
  1,
  'inject dealer login assets',
)

fs.writeFileSync('/tmp/password-visibility-v627-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: marker, modified: [...new Set(changes.map(change => change.file))] }))
