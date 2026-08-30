import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const pagePath = `${root}/.next/server/app/admin/customers/messages/page.js`
const source = fs.readFileSync(pagePath, 'utf8')
const detailsIndex = source.indexOf('"data-lien-broadcast-history": "v486"')
const summaryIndex = source.indexOf('(0, r.jsxs)("summary"', detailsIndex)
const contentIndex = source.indexOf('"data-lien-broadcast-history-content": "1"', summaryIndex)

const assertions = [
  [(source.match(/data-lien-broadcast-history": "v486/g) || []).length === 1, 'one v486 disclosure exists'],
  [detailsIndex >= 0 && summaryIndex > detailsIndex && contentIndex > summaryIndex, 'history remains nested in details'],
  [source.includes(':not([open]) > [data-lien-broadcast-history-content] { display: none !important; }'), 'closed history is explicitly hidden'],
  [source.includes('[open] > [data-lien-broadcast-history-content] { display: block !important; }'), 'open history is explicitly shown'],
  [source.includes('"data-lien-history-open-label": "1"'), 'closed-state label remains'],
  [source.includes('"data-lien-history-close-label": "1"'), 'open-state label remains'],
  [source.includes('children: b.map((e) => {'), 'all existing history rows remain'],
  [!source.includes('v485'), 'obsolete disclosure references are removed'],
  [!source.slice(detailsIndex, summaryIndex).includes('open:'), 'history remains closed by default'],
]

for (const [condition, label] of assertions) {
  if (!condition) throw new Error(`runtime verification failed: ${label}`)
}

const syntax = spawnSync(process.execPath, ['--check', pagePath], { encoding: 'utf8' })
if (syntax.status !== 0) throw new Error(syntax.stderr || syntax.stdout)

console.log(`broadcast history collapse v486 verified (${assertions.length} assertions)`)
