import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const release = 'style-admin-local-pagination-v650'
const changes = []

function target(file) { return path.join(root, file) }
function read(file) { return fs.readFileSync(target(file), 'utf8') }

function replaceExact(file, before, after) {
  const source = read(file)
  if (source.split(before).length !== 2) throw new Error(`Unexpected v649 parent anchor: ${file} / ${before.slice(0, 160)}`)
  fs.writeFileSync(target(file), source.replace(before, after))
  changes.push({ file, before, after })
}

replaceExact(
  'public/style-admin-controls-v618.js',
  `  window.__orimiaStyleAdminScrollStabilityV649 = true
`,
  `  window.__orimiaStyleAdminScrollStabilityV649 = true
  window.__orimiaStyleAdminLocalPaginationV650 = true
`,
)

replaceExact(
  'public/style-admin-controls-v618.js',
  `      button.blur()
      writeListFilters(next)
      loadList({ paginationViewportV649 })
`,
  `      button.blur()
      loadList({ paginationViewportV649, requestedPageV650: next.page })
`,
)

replaceExact(
  'public/style-admin-controls-v618.js',
  `    const filters = readListFilters()
    listRoot.classList.add('is-loading-v618')
`,
  `    const filters = readListFilters()
    if (Number.isInteger(options.requestedPageV650) && options.requestedPageV650 > 0) {
      filters.page = options.requestedPageV650
    }
    listRoot.classList.add('is-loading-v618')
`,
)

replaceExact(
  'public/style-admin-controls-v618.js',
  `      writeListFilters(canonical, false)
      if (options.paginationViewportV649) {
`,
  `      if (!options.requestedPageV650) writeListFilters(canonical, false)
      if (options.paginationViewportV649) {
`,
)

replaceExact(
  'server.js',
  '/style-admin-controls-v618.js?v=649-scroll1',
  '/style-admin-controls-v618.js?v=650-local1',
)

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Admin-Scroll-Stability', 'v649') /* style-admin-scroll-stability-v649-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  readinessAnchor + "\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Admin-Local-Pagination', 'v650') /* style-admin-local-pagination-v650-ready */",
)

fs.writeFileSync('/tmp/style-admin-local-pagination-v650-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release, changedFiles: [...new Set(changes.map(change => change.file))], changes: changes.length }))
