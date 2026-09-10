import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'style-community-rerender-v611'
const changes = []

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(label + ': expected ' + expected + ' matches, found ' + count)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ kind: 'replace', file, before, after, count: expected })
}

const legacyMountBefore = `  function legacyFilterSection() {
    return [...document.querySelectorAll('section')].find(section => (
      section.querySelectorAll('select').length >= 3
      && section.textContent.includes('絞り込み・並び順')
    )) || null
  }

  function mountList() {
    if (normalizedPath() !== LIST_PATH || (listRoot && listRoot.isConnected)) return
    const legacyFilter = legacyFilterSection()
    if (!legacyFilter || !legacyFilter.nextElementSibling) return
    const legacyGrid = legacyFilter.nextElementSibling
    legacyFilter.classList.add('orimia-style-list-legacy-hidden-v610')
    legacyGrid.classList.add('orimia-style-list-legacy-hidden-v610')
`
const legacyMountAfter = `  function legacyFilterSections() {
    return [...document.querySelectorAll('section')].filter(section => (
      !section.classList.contains('orimia-style-community-v610')
      && section.querySelectorAll('select').length >= 3
      && section.textContent.includes('絞り込み・並び順')
    ))
  }

  function suppressLegacyLists() {
    const filters = legacyFilterSections()
    for (const filter of filters) {
      filter.classList.add('orimia-style-list-legacy-hidden-v610')
      const grid = filter.nextElementSibling
      if (grid && grid !== listRoot) grid.classList.add('orimia-style-list-legacy-hidden-v610')
    }
    return filters[0] || null
  }

  function mountList() {
    if (normalizedPath() !== LIST_PATH) return
    const legacyFilter = suppressLegacyLists()
    if (listRoot && listRoot.isConnected) return
    if (!legacyFilter || !legacyFilter.nextElementSibling) return
`

replaceExact(
  'public/style-community-controls-v610.js',
  legacyMountBefore,
  legacyMountAfter,
  1,
  'legacy style list rerender suppression',
)
replaceExact(
  'server.js',
  'style-community-controls-v610.js?v=610-controls1',
  'style-community-controls-v610.js?v=611-rerender1',
  1,
  'style controls cache key',
)

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Community-Controls', 'v610') /* style-community-controls-v610-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  readinessAnchor + "\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Community-Rerender', 'v611') /* " + marker + '-ready */',
  1,
  'style community rerender readiness',
)

fs.writeFileSync('/tmp/style-community-rerender-v611-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: marker, modified: [...new Set(changes.map(change => change.file))] }))
