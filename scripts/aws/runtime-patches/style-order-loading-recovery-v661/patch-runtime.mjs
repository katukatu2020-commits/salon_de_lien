import fs from 'node:fs'
import path from 'node:path'
import { globalLoadingRecoveryScriptV661 } from './loading-recovery-source.mjs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const nextRoot = path.join(root, '.next')
const publicRoot = path.join(root, 'public')
const marker = 'style-order-loading-recovery-v661'
const changes = []

function replaceOne(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  changes.push({ label, count })
  return source.replace(before, after)
}

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  changes.push({ label, count })
  return source.split(before).join(after)
}

function collectFiles(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
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
  if (!references) throw new Error(`${label}: no active references were updated`)
  changes.push({ label, files, references })
}

const styleClientPath = path.join(publicRoot, 'style-admin-controls-v618.js')
let styleClient = fs.readFileSync(styleClientPath, 'utf8')

styleClient = replaceOne(
  styleClient,
  `  window.__orimiaStyleAdminLocalPaginationV650 = true
`,
  `  window.__orimiaStyleAdminLocalPaginationV650 = true
  window.__orimiaStyleOrderLoadingRecoveryV661 = true
`,
  'style order release marker',
)

styleClient = replaceOne(
  styleClient,
  `    if (!listRoot || !listRoot.isConnected) return
    const filters = payload.filters`,
  `    if (!listRoot || !listRoot.isConnected) return
    listRoot.dataset.orimiaStylePageV661 = String(payload.page || 1)
    listRoot.dataset.orimiaStylePageSizeV661 = String(payload.pageSize || 12)
    listRoot.dataset.orimiaStyleTotalCountV661 = String(payload.totalCount || 0)
    const filters = payload.filters`,
  'publish list pagination state',
)

styleClient = replaceOne(
  styleClient,
  `      if (!options.requestedPageV650) writeListFilters(canonical, false)`,
  `      writeListFilters(canonical, false) /* style-order-loading-recovery-v661 */`,
  'keep requested page in the address state',
)

styleClient = replaceOne(
  styleClient,
  `      renderList(payload)
      restorePaginationViewportV649(options.paginationViewportV649)`,
  `      renderList(payload)
      restorePaginationViewportV649(options.paginationViewportV649)
      if (options.focusPostIdV661) {
        requestAnimationFrame(() => {
          const selector = '[data-orimia-style-post-id-v625="' + CSS.escape(String(options.focusPostIdV661)) + '"]'
          const movedCard = listRoot?.querySelector(selector)
          if (!movedCard) return
          movedCard.querySelector('input[name="displayOrder"]')?.focus({ preventScroll: true })
          if (!options.paginationViewportV649) movedCard.scrollIntoView({ block: 'nearest', behavior: 'auto' })
        })
      }`,
  'restore moved style in its destination page',
)

styleClient = replaceOne(
  styleClient,
  `  window.__orimiaReloadStyleAdminV625 = () => {
    if (normalizedPath() === LIST_PATH) loadList()
  }`,
  `  window.__orimiaReloadStyleAdminV625 = options => {
    if (normalizedPath() === LIST_PATH) return loadList(options || {})
    return Promise.resolve()
  }`,
  'expose awaited list refresh options',
)

styleClient = replaceOne(
  styleClient,
  `  async function requestJson(url, options) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...((options && options.body) ? { 'Content-Type': 'application/json' } : {}),
        ...((options && options.headers) || {}),
      },
      ...(options || {}),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || '操作を完了できませんでした。')
    return payload
  }`,
  `  async function requestJson(url, options = {}) {
    const controller = options.signal ? null : new AbortController()
    let timedOut = false
    const timeoutId = controller ? window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 10000) : 0
    try {
      const response = await fetch(url, {
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(options.headers || {}),
        },
        ...options,
        signal: options.signal || controller.signal,
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '操作を完了できませんでした。')
      return payload
    } catch (error) {
      if (timedOut) throw new Error('通信に時間がかかっています。もう一度お試しください。')
      throw error
    } finally {
      window.clearTimeout(timeoutId)
    }
  }`,
  'bound style mutation requests',
)

styleClient = replaceOne(
  styleClient,
  `    orderForm.addEventListener('submit', async event => {
      event.preventDefault()
      const requestedOrder = Number(orderInput.value)
      if (!Number.isInteger(requestedOrder) || requestedOrder < 1) {
        orderInput.setCustomValidity('1以上の整数を入力してください。')
        orderInput.reportValidity()
        return
      }
      orderInput.setCustomValidity('')
      orderInput.disabled = true
      orderSubmit.disabled = true
      try {
        const moved = await requestJson(ORDER_API, {
          method: 'PATCH',
          body: JSON.stringify({ postId, displayOrder: requestedOrder }),
        })
        orderInput.value = String(moved.displayOrder)
        card.dataset.orimiaStyleDisplayOrderV634 = String(moved.displayOrder)
        const badge = card.querySelector('.orimia-admin-style-order-badge-v634')
        if (badge) badge.textContent = 'No.' + moved.displayOrder
        const url = new URL(location.href)
        url.searchParams.delete('sort')
        url.searchParams.delete('page')
        history.replaceState({}, '', url)
        showToast('No.' + moved.displayOrder + 'へ移動しました。')
        if (typeof window.__orimiaReloadStyleAdminV625 === 'function') window.__orimiaReloadStyleAdminV625()
      } catch (error) {
        showToast(error instanceof Error ? error.message : '表示順を変更できませんでした。')
      } finally {
        orderInput.disabled = false
        orderSubmit.disabled = false
      }
    })`,
  `    orderForm.addEventListener('submit', async event => {
      event.preventDefault()
      const requestedOrder = Number(orderInput.value)
      if (!Number.isInteger(requestedOrder) || requestedOrder < 1) {
        orderInput.setCustomValidity('1以上の整数を入力してください。')
        orderInput.reportValidity()
        return
      }
      orderInput.setCustomValidity('')
      const originalButtonText = orderSubmit.textContent
      orderForm.setAttribute('aria-busy', 'true')
      orderInput.disabled = true
      orderSubmit.disabled = true
      orderSubmit.textContent = '保存中'
      try {
        const moved = await requestJson(ORDER_API, {
          method: 'PATCH',
          body: JSON.stringify({ postId, displayOrder: requestedOrder }),
        })
        const movedOrder = Number(moved.displayOrder)
        if (!Number.isInteger(movedOrder) || movedOrder < 1) throw new Error('保存結果を確認できませんでした。')
        orderInput.value = String(movedOrder)
        card.dataset.orimiaStyleDisplayOrderV634 = String(movedOrder)
        const badge = card.querySelector('.orimia-admin-style-order-badge-v634')
        if (badge) badge.textContent = 'No.' + movedOrder

        const root = document.querySelector('.orimia-style-admin-v618')
        const pageSize = Math.max(1, Number(root?.dataset.orimiaStylePageSizeV661 || 12))
        const currentPage = Math.max(1, Number(root?.dataset.orimiaStylePageV661 || 1))
        const url = new URL(location.href)
        const filtered = ['staff', 'course', 'gender'].some(name => Boolean(url.searchParams.get(name)))
        const destinationPage = filtered ? currentPage : Math.max(1, Math.ceil(movedOrder / pageSize))
        const viewport = destinationPage === currentPage && root ? {
          top: window.scrollY,
          left: window.scrollX,
          listHeight: root.getBoundingClientRect().height,
        } : undefined
        url.searchParams.delete('sort')
        if (destinationPage > 1) url.searchParams.set('page', String(destinationPage))
        else url.searchParams.delete('page')
        history.replaceState(history.state, '', url)
        if (typeof window.__orimiaReloadStyleAdminV625 === 'function') {
          await window.__orimiaReloadStyleAdminV625({
            requestedPageV650: destinationPage,
            paginationViewportV649: viewport,
            focusPostIdV661: postId,
          })
        }
        showToast('No.' + movedOrder + 'へ移動しました。')
      } catch (error) {
        showToast(error instanceof Error ? error.message : '表示順を変更できませんでした。')
      } finally {
        orderForm.removeAttribute('aria-busy')
        orderInput.disabled = false
        orderSubmit.disabled = false
        orderSubmit.textContent = originalButtonText
      }
    })`,
  'persist and reveal moved style order',
)

styleClient += `\n/* ${marker} */\n`
fs.writeFileSync(styleClientPath, styleClient)

const oldLoaderPath = path.join(publicRoot, 'ui-transition-v640.js')
const oldLoader = fs.readFileSync(oldLoaderPath, 'utf8')
const oldLoaderCore = oldLoader.replace(/\n\/\* style-list-performance-v640 \*\/\s*$/, '')
let newLoaderCore = oldLoaderCore
newLoaderCore = replaceOne(
  newLoaderCore,
  `  window.__orimiaUiTransitionV640 = true
  window.__orimiaUiTransitionV639 = true`,
  `  window.__orimiaUiTransitionV640 = true
  window.__orimiaUiTransitionV661 = true
  window.__orimiaUiTransitionV639 = true`,
  'transition release marker',
)
newLoaderCore = replaceOne(
  newLoaderCore,
  `  if (!state.namespace) {
    const markPublicReady = () => reveal('public-document')
    if (document.readyState === 'complete') markPublicReady()
    else window.addEventListener('load', markPublicReady, { once: true })
  } else {`,
  `  if (!state.namespace) {
    const markPublicReady = () => reveal('public-document')
    const markPublicDomReady = () => window.setTimeout(() => reveal('public-dom-ready'), 180)
    armHardFallback(3600)
    if (document.readyState === 'complete') markPublicReady()
    else {
      window.addEventListener('load', markPublicReady, { once: true })
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', markPublicDomReady, { once: true })
      else markPublicDomReady()
    }
  } else {`,
  'bound public and dealer initial loader',
)

const newLoaderName = 'ui-transition-v661.js'
fs.writeFileSync(path.join(publicRoot, newLoaderName), `${newLoaderCore}\n\n/* ${marker} */\n`)

const layouts = [
  'layout-runtime-v518-release1.navigation-loading-v536-release1.admin-sidebar-labels-v578.navigation-loader-scope-v623.style-loader-v639.style-list-v640.js',
  'layout-d1470003e928b0b1.customertabs-v503.ui-transition-v516-release5.navigation-loading-v536-release1.navigation-loader-scope-v623.style-loader-v639.style-list-v640.js',
]
const activatedLayouts = []
for (const oldName of layouts) {
  const oldPath = path.join(nextRoot, 'static', 'chunks', 'app', oldName)
  const newName = oldName.replace(/\.js$/, '.loading-recovery-v661.js')
  const source = fs.readFileSync(oldPath, 'utf8')
  const patched = replaceOne(source, oldLoaderCore, newLoaderCore, `${oldName} embedded transition`)
  fs.writeFileSync(path.join(nextRoot, 'static', 'chunks', 'app', newName), `${patched}\n/* ${marker} */\n`)
  replaceNextReferences(oldName, newName, `${oldName} activation`)
  activatedLayouts.push(newName)
}

const layoutChunkPath = path.join(root, '.next', 'server', 'chunks', '1425.js')
let layoutChunk = fs.readFileSync(layoutChunkPath, 'utf8')
layoutChunk = replaceOne(
  layoutChunk,
  `                  }, "customer-registration-link-recovery-v660"),
                  a.jsx(s.V, {`,
  `                  }, "customer-registration-link-recovery-v660"),
                  a.jsx("script", {
                    id: "orimia-global-loading-recovery-v661",
                    dangerouslySetInnerHTML: { __html: ${JSON.stringify(globalLoadingRecoveryScriptV661)} },
                  }, "global-loading-recovery-v661"),
                  a.jsx(s.V, {`,
  'root layout loading watchdog',
)
layoutChunk += `\n/* ${marker} */\n`
fs.writeFileSync(layoutChunkPath, layoutChunk)

const serverPath = path.join(root, 'server.js')
let server = fs.readFileSync(serverPath, 'utf8')
server = replaceExact(
  server,
  '/style-admin-controls-v618.js?v=650-local1',
  '/style-admin-controls-v618.js?v=661-order-recovery1',
  1,
  'activate style order client',
)
server = replaceExact(
  server,
  '/ui-transition-v640.js?v=640-style-list-performance1',
  '/ui-transition-v661.js?v=661-loading-recovery1',
  2,
  'activate standalone loading recovery',
)
server = replaceOne(
  server,
  '<script src="/ui-transition-v661.js?v=661-loading-recovery1" defer></script>',
  '<script src="/ui-transition-v661.js?v=661-loading-recovery1" defer onerror="document.documentElement.dataset.orimiaUiReady=\'v516\';document.documentElement.removeAttribute(\'aria-busy\')"></script>',
  'standalone customer loader network fallback',
)
server = replaceOne(
  server,
  '<script src=\\"/ui-transition-v661.js?v=661-loading-recovery1\\" defer></script>',
  '<script src=\\"/ui-transition-v661.js?v=661-loading-recovery1\\" defer onerror=\\"document.documentElement.dataset.orimiaUiReady=\'v516\';document.documentElement.removeAttribute(\'aria-busy\')\\"></script>',
  'standalone chat loader network fallback',
)
const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Registration-Link-Recovery', 'v660') /* customer-registration-link-recovery-v660-ready */`
server = replaceOne(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Order-Loading-Recovery', 'v661') /* ${marker}-ready */`,
  'release readiness marker',
)
server += `\n/* ${marker} */\n`
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({
  release: marker,
  newLoaderName,
  activatedLayouts,
  changes: changes.length,
}))
