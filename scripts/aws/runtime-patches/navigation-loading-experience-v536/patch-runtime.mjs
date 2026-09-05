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

const oldScriptPath = path.join(publicRoot, 'ui-transition-v516.js')
const oldStylePath = path.join(publicRoot, 'ui-transition-v516.css')
const oldScript = fs.readFileSync(oldScriptPath, 'utf8')
const oldStyle = fs.readFileSync(oldStylePath, 'utf8')
const newScript = fs.readFileSync(path.join(patchRoot, 'ui-transition-v536.js'), 'utf8')
const newStyle = fs.readFileSync(path.join(patchRoot, 'ui-transition-v536.css'), 'utf8')

fs.copyFileSync(path.join(patchRoot, 'ui-transition-v536.js'), path.join(publicRoot, 'ui-transition-v536.js'))
fs.copyFileSync(path.join(patchRoot, 'ui-transition-v536.css'), path.join(publicRoot, 'ui-transition-v536.css'))

const oldStandaloneHead = `<style id="orimia-customer-transition-v516">${oldStyle}</style><script src="/ui-transition-v516.js?v=516-release7" defer></script>`
const newStandaloneHead = `<style id="orimia-customer-transition-v536">${newStyle}</style><script src="/ui-transition-v536.js?v=536-release1" defer></script>`

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceExact(
  server,
  oldStandaloneHead,
  newStandaloneHead,
  1,
  'standalone customer transition head',
)
server = replaceExact(
  server,
  JSON.stringify(`${oldStandaloneHead}</head>`),
  JSON.stringify(`${newStandaloneHead}</head>`),
  1,
  'standalone customer chat transition head',
)
server = replaceExact(
  server,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Manual-Booking-Break-Interaction', 'v535') /* manual-booking-break-interaction-v535 */`,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Manual-Booking-Break-Interaction', 'v535') /* manual-booking-break-interaction-v535 */
      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Navigation-Loading-Experience', 'v536') /* navigation-loading-experience-v536 */`,
  1,
  'loading experience readiness marker',
)
server += '\n/* navigation-loading-experience-v536 */\n'
fs.writeFileSync(serverPath, server)

const oldAdminLayoutName = 'layout-runtime-v518-release1.js'
const newAdminLayoutName = 'layout-runtime-v518-release1.navigation-loading-v536-release1.js'
const oldAdminLayoutPath = path.join(nextRoot, 'static', 'chunks', 'app', oldAdminLayoutName)
const newAdminLayoutPath = path.join(nextRoot, 'static', 'chunks', 'app', newAdminLayoutName)
const adminLayout = replaceExact(
  fs.readFileSync(oldAdminLayoutPath, 'utf8'),
  oldScript,
  newScript,
  1,
  'admin transition runtime',
)
fs.writeFileSync(newAdminLayoutPath, `${adminLayout}\n/* navigation-loading-experience-v536 */\n`)
const adminLayoutReferences = replaceNextReferences(oldAdminLayoutName, newAdminLayoutName, 'admin loading asset activation')

const oldCustomerLayoutName = 'layout-d1470003e928b0b1.customertabs-v503.ui-transition-v516-release5.js'
const newCustomerLayoutName = 'layout-d1470003e928b0b1.customertabs-v503.ui-transition-v516-release5.navigation-loading-v536-release1.js'
const oldCustomerLayoutPath = path.join(nextRoot, 'static', 'chunks', 'app', oldCustomerLayoutName)
const newCustomerLayoutPath = path.join(nextRoot, 'static', 'chunks', 'app', newCustomerLayoutName)
const customerLayout = replaceExact(
  fs.readFileSync(oldCustomerLayoutPath, 'utf8'),
  oldScript,
  newScript,
  1,
  'customer transition runtime',
)
fs.writeFileSync(newCustomerLayoutPath, `${customerLayout}\n/* navigation-loading-experience-v536 */\n`)
const customerLayoutReferences = replaceNextReferences(oldCustomerLayoutName, newCustomerLayoutName, 'customer loading asset activation')

const oldCssName = '51ded9af5ca8c344.customer-native-v82.customer-shell-v88.customer-layout-v92.navigation-v84.sidebar-shift-v87.admin-theme-first-paint-v153.ui-transition-v516-release6.css'
const newCssName = '51ded9af5ca8c344.customer-native-v82.customer-shell-v88.customer-layout-v92.navigation-v84.sidebar-shift-v87.admin-theme-first-paint-v153.ui-transition-v516-release6.navigation-loading-v536-release1.css'
const oldCssPath = path.join(nextRoot, 'static', 'css', oldCssName)
const newCssPath = path.join(nextRoot, 'static', 'css', newCssName)
const globalCss = replaceExact(
  fs.readFileSync(oldCssPath, 'utf8'),
  oldStyle,
  newStyle,
  1,
  'critical transition style',
)
fs.writeFileSync(newCssPath, `${globalCss}\n/* navigation-loading-experience-v536 */\n`)
const cssReferences = replaceNextReferences(oldCssName, newCssName, 'loading style activation')

console.log(JSON.stringify({
  release: 'navigation-loading-experience-v536',
  adminLayoutReferences,
  customerLayoutReferences,
  cssReferences,
}))
