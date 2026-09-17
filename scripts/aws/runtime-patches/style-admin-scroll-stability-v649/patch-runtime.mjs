import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const release = 'style-admin-scroll-stability-v649'
const changes = []

function target(file) { return path.join(root, file) }
function read(file) { return fs.readFileSync(target(file), 'utf8') }

function replaceExact(file, before, after) {
  const source = read(file)
  if (source.split(before).length !== 2) throw new Error(`Unexpected v648 parent anchor: ${file} / ${before.slice(0, 160)}`)
  fs.writeFileSync(target(file), source.replace(before, after))
  changes.push({ file, before, after })
}

replaceExact(
  'public/style-admin-controls-v618.js',
  `  window.__orimiaStyleAdminPaginationV647 = true
`,
  `  window.__orimiaStyleAdminPaginationV647 = true
  window.__orimiaStyleAdminScrollStabilityV649 = true
`,
)

replaceExact(
  'public/style-admin-controls-v618.js',
  `  const LIST_PATH = '/admin/community'
  const SORT_OPTIONS = [
`,
  `  const LIST_PATH = '/admin/community'
  const nativeHistoryPushStateV649 = History.prototype.pushState
  const nativeHistoryReplaceStateV649 = History.prototype.replaceState
  const SORT_OPTIONS = [
`,
)

replaceExact(
  'public/style-admin-controls-v618.js',
  `    history[push === false ? 'replaceState' : 'pushState']({}, '', url)
`,
  `    const write = push === false ? nativeHistoryReplaceStateV649 : nativeHistoryPushStateV649
    write.call(history, history.state, '', url)
`,
)

replaceExact(
  'public/style-admin-controls-v618.js',
  `      const next = readListFilters()
      next.page = Number(button.dataset.pageV618 || 1)
      writeListFilters(next)
      loadList({ preserveViewport: true })
`,
  `      const next = readListFilters()
      next.page = Number(button.dataset.pageV618 || 1)
      const paginationViewportV649 = {
        top: window.scrollY,
        left: window.scrollX,
        listHeight: listRoot.getBoundingClientRect().height,
      }
      button.blur()
      writeListFilters(next)
      loadList({ paginationViewportV649 })
`,
)

replaceExact(
  'public/style-admin-controls-v618.js',
  `  function restorePaginationViewportV647(top) {
    const restore = () => window.scrollTo({
      top: Math.min(top, Math.max(0, document.documentElement.scrollHeight - window.innerHeight)),
      left: window.scrollX,
      behavior: 'auto',
    })
    window.requestAnimationFrame(() => {
      restore()
      window.requestAnimationFrame(restore)
    })
  }
`,
  `  function restorePaginationViewportV649(viewport) {
    if (!viewport) return
    const top = Math.min(viewport.top, Math.max(0, document.documentElement.scrollHeight - window.innerHeight))
    const left = Math.min(viewport.left, Math.max(0, document.documentElement.scrollWidth - window.innerWidth))
    if (Math.abs(window.scrollY - top) <= 1 && Math.abs(window.scrollX - left) <= 1) return
    window.scrollTo({ top, left, behavior: 'auto' })
  }
`,
)

replaceExact(
  'public/style-admin-controls-v618.js',
  `      writeListFilters(canonical, false)
      const preservedScrollYV647 = options.preserveViewport ? window.scrollY : null
      renderList(payload)
      if (preservedScrollYV647 !== null) restorePaginationViewportV647(preservedScrollYV647)
`,
  `      writeListFilters(canonical, false)
      if (options.paginationViewportV649) {
        listRoot.style.minHeight = Math.ceil(options.paginationViewportV649.listHeight) + 'px'
      } else {
        listRoot.style.removeProperty('min-height')
      }
      renderList(payload)
      restorePaginationViewportV649(options.paginationViewportV649)
`,
)

replaceExact(
  'public/style-admin-controls-v618.css',
  `  gap: 16px;
  scroll-margin-top: 24px;
`,
  `  gap: 16px;
  scroll-margin-top: 24px;
  overflow-anchor: none;
`,
)

replaceExact(
  'server.js',
  '/style-admin-controls-v618.css?v=634-order1',
  '/style-admin-controls-v618.css?v=649-scroll1',
)

replaceExact(
  'server.js',
  '/style-admin-controls-v618.js?v=647-pagination1',
  '/style-admin-controls-v618.js?v=649-scroll1',
)

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Business-Application-Rejection', 'v648') /* business-application-rejection-v648-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  readinessAnchor + "\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Admin-Scroll-Stability', 'v649') /* style-admin-scroll-stability-v649-ready */",
)

fs.writeFileSync('/tmp/style-admin-scroll-stability-v649-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release, changedFiles: [...new Set(changes.map(change => change.file))], changes: changes.length }))
