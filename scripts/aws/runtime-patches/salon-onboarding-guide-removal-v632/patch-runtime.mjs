import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const here = path.dirname(fileURLToPath(import.meta.url))
const marker = 'salon-onboarding-guide-removal-v632'
const changes = []

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ file, label, count })
}

function replaceBetween(file, start, end, replacement, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const startCount = source.split(start).length - 1
  const endCount = source.split(end).length - 1
  if (startCount !== 1 || endCount !== 1) throw new Error(`${label}: expected unique boundaries, found ${startCount}/${endCount}`)
  const from = source.indexOf(start)
  const to = source.indexOf(end, from + start.length)
  if (to < 0) throw new Error(`${label}: end boundary precedes start boundary`)
  fs.writeFileSync(target, source.slice(0, from) + replacement + source.slice(to))
  changes.push({ file, label, count: 1 })
}

replaceExact(
  'tenant-setup-client.js',
  "    if (state.setup) addLauncher(state.setup)\n",
  "    document.querySelectorAll('.ts-launcher').forEach(node => node.remove()) /* salon-onboarding-guide-removal-v632 */\n",
  1,
  'remove persistent setup launcher',
)

replaceExact(
  'tenant-setup-client.js',
  `      const query = new URLSearchParams(location.search)
      const incomplete = state.setup.staffCount === 0 || state.setup.menuCount === 0 || !state.setup.inbound?.address
      const lastSeen = Number(localStorage.getItem(\`lien-setup-seen:\${state.setup.organizationId}\`) || 0)
      const shouldOpen = !state.setup.legacy && (query.has('setup') || (incomplete && Date.now() - lastSeen > 12 * 60 * 60 * 1000))
      if (shouldOpen && !window.__lienProductTourActive && !document.querySelector('.ts-overlay')) showSetupWizard(state.setup)
`,
  `      document.querySelectorAll('.ts-launcher').forEach(node => node.remove())
`,
  1,
  'remove automatic setup wizard',
)

const cleanupFragment = fs.readFileSync(path.join(here, 'salon-onboarding-cleanup-v632.fragment.js'), 'utf8').trimEnd()
replaceBetween(
  'tenant-setup-client.js',
  `;(() => {
  'use strict'

  if (window.__lienFirstStoreProductTourV405) return
`,
  '\n\n/* business-hours-consistency-v514 */',
  cleanupFragment,
  'replace first-store product tour with cleanup',
)

replaceBetween(
  'commercial-admin-v101.js',
  '      section.innerHTML = `<header class="ca-setup-hero">',
  '        <div class="ca-profile-grid">',
  `      section.innerHTML = \`<header class="ca-setup-hero"><div><span class="ca-eyebrow">Store profile</span><h2>\u5e97\u8217\u57fa\u672c\u8a2d\u5b9a</h2><p>\u5e97\u8217\u540d\u3001\u30aa\u30fc\u30ca\u30fc\u306e\u9023\u7d61\u5148\u3001\u55b6\u696d\u6642\u9593\u306a\u3069\u306e\u57fa\u672c\u60c5\u5831\u3092\u7ba1\u7406\u3057\u307e\u3059\u3002\u3053\u3053\u3067\u5909\u66f4\u3057\u305f\u5e97\u8217\u540d\u306f\u3001\u30b9\u30bf\u30c3\u30d5\u753b\u9762\u306e\u53f3\u4e0a\u3078\u5171\u901a\u8868\u793a\u3055\u308c\u307e\u3059\u3002</p></div></header>
`,
  'remove settings onboarding progress and guide button',
)

replaceExact(
  'commercial-admin-v101.js',
  `      section.querySelector('[data-ca-open-setup]').addEventListener('click', () => {
        const launcher = document.querySelector('.ts-launcher'); if (launcher) launcher.click(); else location.assign('/admin/settings?setup=1')
      })
`,
  '',
  1,
  'remove settings guide handler',
)

replaceExact(
  'commercial-admin-v101.js',
  `    const steps = Array.from(store.querySelectorAll('.ca-setup-step'))
    const guide = store.querySelector('[data-ca-open-setup]')
    if (guide && steps.length && steps.every(step => step.classList.contains('done'))) guide.hidden = true

`,
  '',
  1,
  'remove completed setup guide visibility logic',
)

replaceExact(
  'commercial-admin-v101.js',
  `  style.textContent = 'form[data-settings-panel="business"].lien-settings-force-visible-v448{display:grid!important}[data-ca-open-setup][hidden]{display:none!important}'
`,
  `  style.textContent = 'form[data-settings-panel="business"].lien-settings-force-visible-v448{display:grid!important}'
`,
  1,
  'remove setup guide visibility selector',
)

replaceExact(
  'commercial-admin-v101.js',
  `    const store = main?.querySelector('#store-profile')
    const steps = Array.from(store?.querySelectorAll('.ca-setup-step') || [])
    const guide = store?.querySelector('[data-ca-open-setup]')
    if (guide && steps.length && steps.every(step => step.classList.contains('done'))) guide.hidden = true
`,
  '',
  1,
  'remove fallback setup guide visibility logic',
)

replaceExact(
  'commercial-admin-v101.js',
  `  function setupStep(iconName, label, done, detail) {
    return \`<div class="ca-setup-step\${done ? ' done' : ''}"><span class="symbol">\${icon(done ? 'check' : iconName)}</span><span>\${esc(label)}<small style="display:block;margin-top:2px;font-weight:500">\${esc(detail)}</small></span></div>\`
  }

`,
  '',
  1,
  'remove setup progress renderer',
)

replaceExact(
  'commercial-admin-v101.js',
  `      const setup = profile.setup || {}
`,
  '',
  1,
  'remove unused setup progress state',
)

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Pricing-Pagination', 'v631') /* dealer-pricing-pagination-v631-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  `${readinessAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Salon-Onboarding-Guides', 'removed-v632') /* ${marker}-ready */`,
  1,
  'salon onboarding removal readiness marker',
)

fs.writeFileSync('/tmp/salon-onboarding-guide-removal-v632-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: marker, modified: [...new Set(changes.map(change => change.file))] }))
