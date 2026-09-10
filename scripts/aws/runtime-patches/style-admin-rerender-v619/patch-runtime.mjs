import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'style-admin-rerender-v619'
const changes = []

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(label + ': expected ' + expected + ' matches, found ' + count)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ kind: 'replace', file, before, after, count: expected })
}

replaceExact(
  'public/style-admin-controls-v618.js',
  '  let editorOpening = false\n',
  '  let editorOpening = false\n  let listSnapshot = null\n  let listHydrationReady = false\n',
  1,
  'list snapshot state',
)

replaceExact(
  'public/style-admin-controls-v618.js',
  '  function mountList() {\n',
  `  function listContentIsCurrent() {
    return Boolean(listRoot && listRoot.isConnected &&
      listRoot.firstElementChild && listRoot.firstElementChild.hasAttribute('data-orimia-style-content-v619'))
  }

  function restoreListContent() {
    if (!listRoot || !listRoot.isConnected || listContentIsCurrent()) return
    listRoot.className = 'orimia-style-admin-v618'
    listRoot.setAttribute('aria-label', 'スタイル一覧')
    if (listSnapshot) {
      renderList(listSnapshot)
      return
    }
    listRoot.innerHTML = (
      '<div class="orimia-admin-style-loading-v618" data-orimia-style-content-v619 role="status">スタイルを読み込んでいます。</div>'
    )
    loadList()
  }

  function mountList() {
`,
  1,
  'rerender recovery helpers',
)

replaceExact(
  'public/style-admin-controls-v618.js',
  `    const legacyFilter = suppressLegacyLists()
    if (listRoot && listRoot.isConnected) return
    if (!legacyFilter || !legacyFilter.nextElementSibling) return
    listRoot = document.createElement('section')
`,
  `    const legacyFilter = suppressLegacyLists()
    if (!listRoot || !listRoot.isConnected) {
      const existingRoot = document.querySelector('.orimia-style-admin-v618')
      if (existingRoot) listRoot = existingRoot
    }
    if (listRoot && listRoot.isConnected) {
      restoreListContent()
      return
    }
    if (!legacyFilter) return
    listRoot = document.createElement('section')
`,
  1,
  'list root recovery',
)

replaceExact(
  'public/style-admin-controls-v618.js',
  `    if (normalizedPath() === LIST_PATH) mountList()
`,
  `    if (normalizedPath() === LIST_PATH && listHydrationReady) mountList()
`,
  1,
  'defer list mount until hydration settles',
)

replaceExact(
  'public/style-admin-controls-v618.js',
  `  scan()
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleScan, { once: true })
`,
  `  bindEditorButton()
  const activateList = () => {
    listHydrationReady = true
    scheduleScan()
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(activateList, 3000), { once: true })
  } else {
    setTimeout(activateList, 3000)
  }
`,
  1,
  'post-hydration list activation',
)

replaceExact(
  'public/style-admin-controls-v618.js',
  `listRoot.innerHTML = '<div class="orimia-admin-style-loading-v618"`,
  `listRoot.innerHTML = '<div data-orimia-style-content-v619 class="orimia-admin-style-loading-v618"`,
  1,
  'initial content marker',
)

replaceExact(
  'public/style-admin-controls-v618.js',
  `  function renderList(payload) {
    if (!listRoot || !listRoot.isConnected) return
`,
  `  function renderList(payload) {
    listSnapshot = payload
    if (!listRoot || !listRoot.isConnected) return
`,
  1,
  'retain rendered payload',
)

replaceExact(
  'public/style-admin-controls-v618.js',
  `      '<div class="orimia-admin-style-toolbar-v618">' +`,
  `      '<div data-orimia-style-content-v619 class="orimia-admin-style-toolbar-v618">' +`,
  1,
  'rendered content marker',
)

replaceExact(
  'public/style-admin-controls-v618.js',
  `listRoot.innerHTML = '<div class="orimia-admin-style-error-v618"`,
  `listRoot.innerHTML = '<div data-orimia-style-content-v619 class="orimia-admin-style-error-v618"`,
  1,
  'error content marker',
)

replaceExact(
  'server.js',
  'style-admin-controls-v618.js?v=618-release1',
  'style-admin-controls-v618.js?v=619-rerender1',
  1,
  'style admin client cache key',
)

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Admin-Controls', 'v618') /* style-admin-controls-v618-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  readinessAnchor + "\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Admin-Rerender', 'v619') /* " + marker + '-ready */',
  1,
  'style admin rerender readiness',
)

fs.writeFileSync('/tmp/style-admin-rerender-v619-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: marker, modified: [...new Set(changes.map(change => change.file))] }))
