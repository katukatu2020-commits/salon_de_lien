import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const releaseRoot = path.dirname(fileURLToPath(import.meta.url))
const changes = []

function target(file) { return path.join(root, file) }
function read(file) { return fs.readFileSync(target(file), 'utf8') }

function replaceExact(file, before, after) {
  const source = read(file)
  if (source.split(before).length !== 2) throw new Error(`Unexpected v652 parent anchor: ${file} / ${before.slice(0, 140)}`)
  fs.writeFileSync(target(file), source.replace(before, after))
  changes.push(file)
}

function insertBefore(file, anchor, content) {
  replaceExact(file, anchor, content.trimEnd() + '\n\n' + anchor)
}

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Booking-Points', 'v652') /* customer-booking-points-v652-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  readinessAnchor + "\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Password-Common-Layout', 'v653') /* dealer-password-common-layout-v653-ready */",
)

const serviceFile = 'business-account-approvals-v643.js'
replaceExact(
  serviceFile,
  `  res.setHeader('Content-Security-Policy', allowInlineScript
    ? "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
    : "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'")`,
  `  res.setHeader('Content-Security-Policy', allowInlineScript
    ? "default-src 'none'; style-src 'self' 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
    : "default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'")`,
)

const fragment = fs.readFileSync(path.join(releaseRoot, 'dealer-password-layout-v653.fragment.js'), 'utf8')
insertBefore(serviceFile, 'function passwordPage(access, kind, options = {}) {', fragment)
replaceExact(
  serviceFile,
  `function passwordPage(access, kind, options = {}) {
  const initial = Boolean(access.mustChangePassword)`,
  `function passwordPage(access, kind, options = {}) {
  if (kind === 'dealer') return dealerPasswordPortalPageV653(access, options)
  const initial = Boolean(access.mustChangePassword)`,
)

const stylesheet = 'wholesale-ordering-v543.css'
const css = fs.readFileSync(path.join(releaseRoot, 'dealer-password-layout-v653.css'), 'utf8').trimEnd()
const currentCss = read(stylesheet)
if (currentCss.includes('/* dealer-password-common-layout-v653 */')) throw new Error('v653 stylesheet already exists in parent')
fs.writeFileSync(target(stylesheet), currentCss.trimEnd() + '\n\n' + css + '\n')
changes.push(stylesheet)

fs.writeFileSync('/tmp/dealer-password-common-layout-v653-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: 'dealer-password-common-layout-v653', changedFiles: [...new Set(changes)], changes: changes.length }))
