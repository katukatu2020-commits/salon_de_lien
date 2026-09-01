import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const nextRoot = path.join(root, '.next')
const serverPath = path.join(root, 'server.js')
const commercialPath = path.join(root, 'commercial-admin-v101.js')
const customerPath = path.join(root, 'customer-experience-v508.js')
const customerStandalonePath = path.join(root, 'customer-experience-v503.js')
const productInsightsPath = path.join(root, 'public', 'product-insights-v515.js')
const publicRoot = path.join(root, 'public')

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

const transitionScript = fs.readFileSync(path.join(patchRoot, 'ui-transition-v516.js'), 'utf8')
const transitionStyle = fs.readFileSync(path.join(patchRoot, 'ui-transition-v516.css'), 'utf8')
const standaloneCustomerHead = `<style id="orimia-customer-transition-v516">${transitionStyle}</style><script src="/ui-transition-v516.js?v=516-release7" defer></script>`
fs.copyFileSync(path.join(patchRoot, 'ui-transition-v516.js'), path.join(publicRoot, 'ui-transition-v516.js'))
fs.copyFileSync(path.join(patchRoot, 'ui-transition-v516.css'), path.join(publicRoot, 'ui-transition-v516.css'))

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceExact(
  server,
  'return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
  'return `<!doctype html><html lang="ja" data-orimia-customer-standalone="v516"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
  1,
  'standalone customer root marker',
)
server = replaceExact(
  server,
  '<link rel="stylesheet" href="/customer-mobile-nav-v425.css?v=425-1"></head><body><div class="app">',
  `<link rel="stylesheet" href="/customer-mobile-nav-v425.css?v=425-1">${standaloneCustomerHead}</head><body><div class="app">`,
  1,
  'standalone customer critical transition assets',
)
server = replaceExact(
  server,
  `  if (audience === 'customer') return html.replace('</body>', '<script src="/customer-experience-v503.js?v=503" defer></script><script src="/customer-link-ui-v424.js?v=424-1" data-lien-customer-link-v293="1" defer></script></body>')`,
  `  if (audience === 'customer') return html
    .replace('<html lang="ja">', '<html lang="ja" data-orimia-customer-standalone="v516">')
    .replace('</head>', ${JSON.stringify(`${standaloneCustomerHead}</head>`)})
    .replace('</body>', '<script src="/customer-experience-v503.js?v=503" defer></script><script src="/customer-link-ui-v424.js?v=424-1" data-lien-customer-link-v293="1" defer></script></body>')`,
  1,
  'standalone customer chat transition assets',
)
server = replaceExact(
  server,
  '/customer-experience-v503.js?v=503',
  '/customer-experience-v503.js?v=516-release7',
  2,
  'standalone customer runtime cache key',
)
server = replaceExact(
  server,
  '/customer-experience-v508.js?v=508',
  '/customer-experience-v508.js?v=516-release3',
  1,
  'customer transition runtime cache key',
)
server = replaceExact(
  server,
  '/product-insights-v515.js?v=515',
  '/product-insights-v515.js?v=516-release3',
  1,
  'product insights transition cache key',
)
server = replaceExact(
  server,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Product-Insights', 'v515')`,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Product-Insights', 'v515')
      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Ui-Transition-Consistency', 'v516')`,
  1,
  'transition readiness marker',
)
server += '\n/* ui-transition-consistency-v516 */\n'
fs.writeFileSync(serverPath, server)

let commercial = fs.readFileSync(commercialPath, 'utf8')
commercial = replaceExact(
  commercial,
  `const start = () => window.setTimeout(boot, 1800) /* store-app-stability-v502: hydrate without waiting for images */`,
  `const start = () => window.setTimeout(boot, 1800) /* ui-transition-consistency-v516: first enhance signals readiness */`,
  1,
  'admin runtime startup marker',
)
commercial = replaceExact(
  commercial,
  `enhanceManualAppointmentMenu(); enhanceStoreOperationsDetails()
  }

  function schedule()`,
  `enhanceManualAppointmentMenu(); enhanceStoreOperationsDetails()
    window.dispatchEvent(new CustomEvent('orimia:ui-runtime-ready', { detail: { source: 'admin-commercial-v516' } }))
  }

  function schedule()`,
  1,
  'admin enhance completion signal',
)
commercial += '\n/* ui-transition-consistency-v516 */\n'
fs.writeFileSync(commercialPath, commercial)

let customer = fs.readFileSync(customerPath, 'utf8')
customer = replaceExact(
  customer,
  `    refreshBookingSlots()
    document.documentElement.dataset.customerExperience = 'v508'
  }`,
  `    refreshBookingSlots()
    document.documentElement.dataset.customerExperience = 'v508'
    window.dispatchEvent(new CustomEvent('orimia:ui-runtime-ready', { detail: { source: 'customer-experience-v516' } }))
  }`,
  1,
  'customer runtime completion signal',
)
customer += '\n/* ui-transition-consistency-v516 */\n'
fs.writeFileSync(customerPath, customer)

let customerStandalone = fs.readFileSync(customerStandalonePath, 'utf8')
customerStandalone = replaceExact(
  customerStandalone,
  `  function schedule() {
    window.clearTimeout(routeTimer)
    routeTimer = window.setTimeout(enhance, 180)
  }`,
  `  function schedule() {
    if (routeTimer) return
    routeTimer = window.setTimeout(() => {
      routeTimer = 0
      enhance()
    }, 120)
  }`,
  1,
  'standalone customer non-starving scheduler',
)
customerStandalone = replaceExact(
  customerStandalone,
  `    enhanceProductDemographics()
    renderLottery()
  }`,
  `    enhanceProductDemographics()
    renderLottery()
    window.dispatchEvent(new CustomEvent('orimia:ui-runtime-ready', { detail: { source: 'customer-standalone-v516' } }))
  }`,
  1,
  'standalone customer completion signal',
)
customerStandalone = replaceExact(
  customerStandalone,
  `  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => window.setTimeout(start, 950), { once: true })
  else window.setTimeout(start, 950)`,
  `  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => window.setTimeout(start, 40), { once: true })
  else window.setTimeout(start, 40)`,
  1,
  'standalone customer startup delay',
)
customerStandalone += '\n/* ui-transition-consistency-v516 */\n'
fs.writeFileSync(customerStandalonePath, customerStandalone)

const productScheduleBefore = `  function schedule() {
    window.clearTimeout(timer)
    timer = window.setTimeout(enhance, 90)
  }`
const productScheduleAfter = `  function schedule() {
    if (timer) return
    timer = window.setTimeout(() => {
      timer = 0
      Promise.resolve()
        .then(enhance)
        .catch(error => console.warn('[product-insights-v516] refresh failed', error))
        .finally(() => window.dispatchEvent(new CustomEvent('orimia:ui-runtime-ready', { detail: { source: 'admin-product-insights-v516' } })))
    }, 90)
  }`
let productInsights = fs.readFileSync(productInsightsPath, 'utf8')
productInsights = replaceExact(
  productInsights,
  productScheduleBefore,
  productScheduleAfter,
  1,
  'product insights non-starving scheduler',
)
productInsights += '\n/* ui-transition-consistency-v516 */\n'
fs.writeFileSync(productInsightsPath, productInsights)

const oldLayoutName = 'layout-runtime-v515.js'
const newLayoutName = 'layout-runtime-v516-release5.js'
const oldLayoutPath = path.join(nextRoot, 'static', 'chunks', 'app', oldLayoutName)
const newLayoutPath = path.join(nextRoot, 'static', 'chunks', 'app', newLayoutName)
let layout = fs.readFileSync(oldLayoutPath, 'utf8')
layout = replaceExact(
  layout,
  productScheduleBefore,
  productScheduleAfter,
  1,
  'inline product insights non-starving scheduler',
)
layout = replaceExact(
  layout,
  '/commercial-admin-v136.js?v=20260829-449',
  '/commercial-admin-v136.js?v=20260901-516-release3',
  1,
  'admin commercial runtime cache key',
)
layout += `\n/* ui-transition-consistency-v516 */\n${transitionScript}\n`
fs.writeFileSync(newLayoutPath, layout)
const layoutReferences = replaceNextReferences(oldLayoutName, newLayoutName, 'transition layout cache activation')

const oldCustomerLayoutName = 'layout-d1470003e928b0b1.customertabs-v503.js'
const newCustomerLayoutName = 'layout-d1470003e928b0b1.customertabs-v503.ui-transition-v516-release5.js'
const oldCustomerLayoutPath = path.join(nextRoot, 'static', 'chunks', 'app', oldCustomerLayoutName)
const newCustomerLayoutPath = path.join(nextRoot, 'static', 'chunks', 'app', newCustomerLayoutName)
const customerLayout = fs.readFileSync(oldCustomerLayoutPath, 'utf8')
  + `\n/* ui-transition-consistency-v516 */\n${transitionScript}\n`
fs.writeFileSync(newCustomerLayoutPath, customerLayout)
const customerLayoutReferences = replaceNextReferences(
  oldCustomerLayoutName,
  newCustomerLayoutName,
  'customer transition layout cache activation',
)

const oldCssName = '51ded9af5ca8c344.customer-native-v82.customer-shell-v88.customer-layout-v92.navigation-v84.sidebar-shift-v87.admin-theme-first-paint-v153.css'
const newCssName = '51ded9af5ca8c344.customer-native-v82.customer-shell-v88.customer-layout-v92.navigation-v84.sidebar-shift-v87.admin-theme-first-paint-v153.ui-transition-v516-release6.css'
const oldCssPath = path.join(nextRoot, 'static', 'css', oldCssName)
const newCssPath = path.join(nextRoot, 'static', 'css', newCssName)
const globalCss = fs.readFileSync(oldCssPath, 'utf8') + `\n/* ui-transition-consistency-v516 */\n${transitionStyle}\n`
fs.writeFileSync(newCssPath, globalCss)
const cssReferences = replaceNextReferences(oldCssName, newCssName, 'critical transition CSS activation')

console.log(JSON.stringify({
  release: 'ui-transition-consistency-v516',
  layoutReferences,
  customerLayoutReferences,
  cssReferences,
}))
