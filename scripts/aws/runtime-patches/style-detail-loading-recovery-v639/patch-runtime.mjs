import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const nextRoot = path.join(root, '.next')
const publicRoot = path.join(root, 'public')
const marker = 'style-detail-loading-recovery-v639'
const changes = []

function replaceOne(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  changes.push({ label, count })
  return source.replace(before, after)
}

function replaceFile(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ file, label, count })
}

function recoverNavigationLoader(source) {
  let output = replaceOne(
    source,
    `  if (window.__orimiaUiTransitionV623) return
  window.__orimiaUiTransitionV623 = true
  window.__orimiaUiTransitionV536 = true
  document.documentElement.dataset.orimiaNavigationLoaderScope = 'v623'
  window.__orimiaUiTransitionV516 = true`,
    `  if (window.__orimiaUiTransitionV639) return
  window.__orimiaUiTransitionV639 = true
  window.__orimiaUiTransitionV623 = true
  window.__orimiaUiTransitionV536 = true
  document.documentElement.dataset.orimiaNavigationLoaderScope = 'v639'
  window.__orimiaUiTransitionV516 = true`,
    'navigation loader release guard',
  )

  output = replaceOne(
    output,
    `  const runtimeEvent = 'orimia:ui-runtime-ready'
  const finishedEvent = 'orimia:ui-transition-finished'
  const loaderId = 'orimia-ui-loader-v536'`,
    `  const runtimeEvent = 'orimia:ui-runtime-ready'
  const finishedEvent = 'orimia:ui-transition-finished'
  const styleDetailEvent = 'orimia:style-detail-state-v639'
  const loaderId = 'orimia-ui-loader-v536'`,
    'style detail readiness event',
  )

  output = replaceOne(
    output,
    `  const normalizePathname = pathname => pathname.length > 1 ? pathname.replace(/\\/+$/, '') : pathname
  const protectedUrl = value => {`,
    `  const normalizePathname = pathname => pathname.length > 1 ? pathname.replace(/\\/+$/, '') : pathname
  const isStyleDetailPath = pathname => /^\\/(?:admin|u)\\/community\\/[^/]+\\/?$/.test(pathname)
  const protectedUrl = value => {`,
    'style detail route detector',
  )

  output = replaceOne(
    output,
    `    hardTimer: 0,
    clickTimer: 0,
  }`,
    `    hardTimer: 0,
    clickTimer: 0,
    styleRevealTimer: 0,
    revealToken: 0,
  }`,
    'loader recovery state',
  )

  output = replaceOne(
    output,
    `    window.clearTimeout(state.hardTimer)
    window.clearTimeout(state.clickTimer)
    state.settleTimer = 0
    state.maxSettleTimer = 0
    state.hardTimer = 0
    state.clickTimer = 0`,
    `    window.clearTimeout(state.hardTimer)
    window.clearTimeout(state.clickTimer)
    window.clearTimeout(state.styleRevealTimer)
    state.settleTimer = 0
    state.maxSettleTimer = 0
    state.hardTimer = 0
    state.clickTimer = 0
    state.styleRevealTimer = 0`,
    'clear style recovery timer',
  )

  output = replaceOne(
    output,
    `  function setBusy(reason) {
    state.cycle += 1
    state.revealing = false`,
    `  function setBusy(reason) {
    state.cycle += 1
    state.revealToken += 1
    state.revealing = false`,
    'invalidate stale reveal callbacks',
  )

  output = replaceOne(
    output,
    `  function reveal(reason) {
    if (root.dataset.orimiaUiReady === 'v516' || state.revealing) return
    state.revealing = true
    const expectedCycle = state.cycle
    const completedMode = state.mode
    clearTimers()
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      if (expectedCycle !== state.cycle) return
      delete root.dataset.orimiaUiTransition
      root.dataset.orimiaUiReady = 'v516'
      root.removeAttribute('aria-busy')
      state.currentUrl = location.href
      state.mode = 'idle'
      state.committed = false
      state.readySources.clear()
      state.revealing = false
      window.dispatchEvent(new CustomEvent(finishedEvent, {
        detail: { mode: completedMode, reason, cycle: state.cycle },
      }))
    }))
  }

  function armHardFallback(delay) {
    window.clearTimeout(state.hardTimer)
    state.hardTimer = window.setTimeout(() => reveal('safety-timeout'), delay)
  }`,
    `  function finishReveal(reason, expectedCycle, completedMode, token) {
    if (expectedCycle !== state.cycle || (token && token !== state.revealToken)) return false
    delete root.dataset.orimiaUiTransition
    root.dataset.orimiaUiReady = 'v516'
    root.removeAttribute('aria-busy')
    state.currentUrl = location.href
    state.mode = 'idle'
    state.committed = false
    state.readySources.clear()
    state.revealing = false
    window.dispatchEvent(new CustomEvent(finishedEvent, {
      detail: { mode: completedMode, reason, cycle: state.cycle },
    }))
    return true
  }

  function reveal(reason) {
    if (root.dataset.orimiaUiReady === 'v516' || state.revealing) return
    state.revealing = true
    const expectedCycle = state.cycle
    const completedMode = state.mode
    const token = ++state.revealToken
    clearTimers()
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      if (!finishReveal(reason, expectedCycle, completedMode, token) && token === state.revealToken) {
        state.revealing = false
      }
    }))
  }

  function forceReveal(reason) {
    if (root.dataset.orimiaUiReady === 'v516') return
    const expectedCycle = state.cycle
    const completedMode = state.mode
    state.revealToken += 1
    state.revealing = false
    clearTimers()
    finishReveal(reason, expectedCycle, completedMode, 0)
  }

  function armHardFallback(delay) {
    window.clearTimeout(state.hardTimer)
    state.hardTimer = window.setTimeout(() => forceReveal('safety-timeout'), delay)
  }`,
    'unconditional loader safety recovery',
  )

  output = replaceOne(
    output,
    `    scheduleNavigationReveal()
  }

  function requiredRuntimeSources() {`,
    `    scheduleNavigationReveal()
    scheduleStyleDetailReveal('style-detail-route')
  }

  function requiredRuntimeSources() {`,
    'schedule detail recovery after route commit',
  )

  output = replaceOne(
    output,
    `  if (document.body) ensureLoader()
  else document.addEventListener('DOMContentLoaded', ensureLoader, { once: true })`,
    `  function hasStyleDetailShell() {
    if (!isStyleDetailPath(location.pathname)) return false
    return Boolean(document.querySelector('.community-detail-page article, .ts-community-detail article, main article'))
  }

  function scheduleStyleDetailReveal(reason) {
    if (root.dataset.orimiaUiReady === 'v516' || state.styleRevealTimer) return
    if (!hasStyleDetailShell() || (state.mode === 'navigation' && !state.committed)) return
    state.styleRevealTimer = window.setTimeout(() => {
      state.styleRevealTimer = 0
      if (hasStyleDetailShell()) reveal(reason)
    }, 240)
  }

  if (document.body) {
    ensureLoader()
    scheduleStyleDetailReveal('style-detail-shell')
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      ensureLoader()
      scheduleStyleDetailReveal('style-detail-dom-ready')
    }, { once: true })
  }`,
    'reveal rendered style detail shell',
  )

  output = replaceOne(
    output,
    `    state.mode = 'initial'
    updateLoaderCopy()
    armHardFallback(4800)`,
    `    state.mode = 'initial'
    updateLoaderCopy()
    armHardFallback(isStyleDetailPath(location.pathname) ? 3600 : 4800)
    scheduleStyleDetailReveal('style-detail-initial')`,
    'shorter style detail safety window',
  )

  output = replaceOne(
    output,
    `  window.addEventListener(runtimeEvent, event => {`,
    `  window.addEventListener(styleDetailEvent, () => {
    if (!isStyleDetailPath(location.pathname)) return
    if (state.mode === 'navigation' && !state.committed) return
    reveal('style-detail-ready')
  })

  window.addEventListener(runtimeEvent, event => {`,
    'consume style detail readiness',
  )

  output = replaceOne(
    output,
    `    beginNavigation('bfcache')
    commitNavigation('bfcache')
  })`,
    `    beginNavigation('bfcache')
    commitNavigation('bfcache')
    scheduleStyleDetailReveal('style-detail-bfcache')
  })`,
    'recover style detail from bfcache',
  )

  output = replaceOne(
    output,
    `    if (root.dataset.orimiaUiReady !== 'v516') ensureLoader()
    scheduleNavigationReveal()`,
    `    if (root.dataset.orimiaUiReady !== 'v516') ensureLoader()
    scheduleNavigationReveal()
    scheduleStyleDetailReveal('style-detail-mutation')`,
    'observe the rendered detail shell',
  )

  return output
}

function recoverStyleClient(source) {
  let output = replaceOne(
    source,
    `  let scheduled = false
  const rootElementV606 = document.documentElement`,
    `  let scheduled = false
  const rootElementV606 = document.documentElement
  const styleDetailStateEventV639 = 'orimia:style-detail-state-v639'`,
    'style client recovery event',
  )

  output = replaceOne(
    output,
    `  function revealStyleV606(state) {
    document.getElementById('orimia-style-first-paint-v606-guard')?.remove()
    rootElementV606.classList.remove('orimia-style-pending-v606')
    rootElementV606.dataset.orimiaStyleStateV606 = state
  }`,
    `  function revealStyleV606(state) {
    document.getElementById('orimia-style-first-paint-v606-guard')?.remove()
    rootElementV606.classList.remove('orimia-style-pending-v606')
    rootElementV606.dataset.orimiaStyleStateV606 = state
    window.dispatchEvent(new CustomEvent(styleDetailStateEventV639, {
      detail:{ state, audience, postId },
    }))
  }`,
    'announce style detail completion',
  )

  output = replaceOne(
    output,
    `  async function load() {
    if (loading || payload) return`,
    `  async function loadStylePayloadV639() {
    const controller = typeof AbortController === 'function' ? new AbortController() : null
    let timeoutId = 0
    const timeout = new Promise((resolve, reject) => {
      timeoutId = window.setTimeout(() => {
        controller?.abort()
        reject(new Error('Style detail request timed out'))
      }, 7000)
    })
    try {
      return await Promise.race([
        request(\`/api/lien-style-system?audience=\${audience}&postId=\${encodeURIComponent(postId)}\`, controller ? { signal:controller.signal } : undefined),
        timeout,
      ])
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  async function load() {
    if (loading || payload) return`,
    'bound style detail request duration',
  )

  output = replaceOne(
    output,
    `      payload = await request(\`/api/lien-style-system?audience=\${audience}&postId=\${encodeURIComponent(postId)}\`)`,
    `      payload = await loadStylePayloadV639()`,
    'use bounded style detail request',
  )

  return `${output}\n/* ${marker} */\n`
}

function collectFiles(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes:true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) collectFiles(fullPath, output)
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.json')) output.push(fullPath)
  }
  return output
}

function replaceNextReferences(before, after, label) {
  let files = 0
  let references = 0
  for (const filePath of collectFiles(nextRoot)) {
    const source = fs.readFileSync(filePath, 'utf8')
    const count = source.split(before).length - 1
    if (!count) continue
    fs.writeFileSync(filePath, source.split(before).join(after))
    files += 1
    references += count
  }
  if (!files || !references) throw new Error(`${label}: no active references were updated`)
  changes.push({ label, files, references })
  return { files, references }
}

const oldPublicName = 'ui-transition-v623.js'
const newPublicName = 'ui-transition-v639.js'
const oldPublic = fs.readFileSync(path.join(publicRoot, oldPublicName), 'utf8')
const oldLoaderCore = oldPublic.replace(/\n\/\* navigation-loader-scope-v623 \*\/\s*$/, '')
const newLoaderCore = recoverNavigationLoader(oldLoaderCore)
fs.writeFileSync(path.join(publicRoot, newPublicName), `${newLoaderCore}\n\n/* ${marker} */\n`)

const oldAdminLayout = 'layout-runtime-v518-release1.navigation-loading-v536-release1.admin-sidebar-labels-v578.navigation-loader-scope-v623.js'
const oldCustomerLayout = 'layout-d1470003e928b0b1.customertabs-v503.ui-transition-v516-release5.navigation-loading-v536-release1.navigation-loader-scope-v623.js'

function writeLayout(oldName, label) {
  const newName = oldName.replace(/\.js$/, '.style-loader-v639.js')
  const source = fs.readFileSync(path.join(nextRoot, 'static', 'chunks', 'app', oldName), 'utf8')
  const patched = replaceOne(source, oldLoaderCore, newLoaderCore, `${label} embedded loader`)
  fs.writeFileSync(path.join(nextRoot, 'static', 'chunks', 'app', newName), `${patched}\n/* ${marker} */\n`)
  replaceNextReferences(oldName, newName, `${label} asset activation`)
  return newName
}

const newAdminLayout = writeLayout(oldAdminLayout, 'admin layout')
const newCustomerLayout = writeLayout(oldCustomerLayout, 'customer layout')

const styleClientPath = path.join(publicRoot, 'style-system-integration-v602.js')
fs.writeFileSync(styleClientPath, recoverStyleClient(fs.readFileSync(styleClientPath, 'utf8')))

replaceFile(
  'server.js',
  '/ui-transition-v623.js?v=623-release1',
  '/ui-transition-v639.js?v=639-style-detail-recovery1',
  2,
  'activate standalone loader recovery',
)
replaceFile(
  'server.js',
  '/style-system-integration-v602.js?v=610-controls1',
  '/style-system-integration-v602.js?v=639-loading-recovery1',
  1,
  'bust the style detail client cache',
)

const readyAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Pricing-Ime-Search', 'v638') /* dealer-pricing-ime-search-v638-ready */"
replaceFile(
  'server.js',
  readyAnchor,
  `${readyAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Detail-Loading-Recovery', 'v639') /* ${marker}-ready */`,
  1,
  'publish style detail loading recovery readiness',
)

fs.writeFileSync('/tmp/style-detail-loading-recovery-v639-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release:marker, newPublicName, newAdminLayout, newCustomerLayout, changes:changes.length }))
