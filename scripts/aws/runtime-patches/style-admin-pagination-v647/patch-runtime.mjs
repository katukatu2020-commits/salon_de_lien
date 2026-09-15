import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const release = 'style-admin-pagination-v647'
const changes = []

function target(file) { return path.join(root, file) }
function read(file) { return fs.readFileSync(target(file), 'utf8') }

function replaceExact(file, before, after) {
  const source = read(file)
  if (source.split(before).length !== 2) {
    throw new Error(`Unexpected v646 parent anchor: ${file} / ${before.slice(0, 160)}`)
  }
  fs.writeFileSync(target(file), source.replace(before, after))
  changes.push({ file, before, after })
}

replaceExact(
  'style-admin-controls-v618.js',
  'const PAGE_SIZE = 12 /* style-list-performance-v640 */',
  'const PAGE_SIZE = 15 /* style-admin-pagination-v647 */',
)

replaceExact(
  'public/style-admin-controls-v618.js',
  `  window.__orimiaStyleAdminControlsV618 = true
`,
  `  window.__orimiaStyleAdminControlsV618 = true
  window.__orimiaStyleAdminPaginationV647 = true
`,
)

replaceExact(
  'public/style-admin-controls-v618.js',
  `      writeListFilters(next)
      loadList()
      listRoot.scrollIntoView({
        block: 'start',
        behavior: 'auto',
      })
`,
  `      writeListFilters(next)
      loadList({ preserveViewport: true })
`,
)

replaceExact(
  'public/style-admin-controls-v618.js',
  `  async function loadList() {
`,
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

  async function loadList(options = {}) {
`,
)

replaceExact(
  'public/style-admin-controls-v618.js',
  `      writeListFilters(canonical, false)
      renderList(payload)
`,
  `      writeListFilters(canonical, false)
      const preservedScrollYV647 = options.preserveViewport ? window.scrollY : null
      renderList(payload)
      if (preservedScrollYV647 !== null) restorePaginationViewportV647(preservedScrollYV647)
`,
)

replaceExact(
  'server.js',
  '/style-admin-controls-v618.js?v=640-performance1',
  '/style-admin-controls-v618.js?v=647-pagination1',
)

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Password-Change', 'v646') /* dealer-password-change-v646-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  readinessAnchor + "\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Admin-Pagination', 'v647') /* style-admin-pagination-v647-ready */",
)

fs.writeFileSync('/tmp/style-admin-pagination-v647-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release, changedFiles: [...new Set(changes.map(change => change.file))], changes: changes.length }))
