import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const pagePath = `${root}/.next/server/app/admin/customers/messages/page.js`
const source = fs.readFileSync(pagePath, 'utf8')

const detailsIndex = source.indexOf('"data-lien-broadcast-history": "v485"')
const summaryIndex = source.indexOf('(0, r.jsxs)("summary"', detailsIndex)
const contentIndex = source.indexOf('"data-lien-broadcast-history-content": "1"', summaryIndex)
const historyIndex = source.indexOf('children: "配信履歴はまだありません。"', contentIndex)

const assertions = [
  [(source.match(/data-lien-broadcast-history": "v485/g) || []).length === 1, 'one versioned history disclosure exists'],
  [source.includes('let HISTORY_CHEVRON = (0, l.Z)("chevron-down"'), 'Lucide disclosure icon exists'],
  [detailsIndex >= 0 && summaryIndex > detailsIndex, 'history uses a native details and summary control'],
  [contentIndex > summaryIndex && historyIndex > contentIndex, 'history content is nested inside the disclosure'],
  [source.includes('"data-lien-history-open-label": "1"'), 'closed-state label exists'],
  [source.includes('"data-lien-history-close-label": "1"'), 'open-state label exists'],
  [source.includes('[open] [data-lien-history-chevron] { transform: rotate(180deg); }'), 'open-state icon feedback exists'],
  [source.includes('children: ["履歴を表示（", b.length, "件）"]'), 'history count remains visible while closed'],
  [source.includes('children: b.map((e) => {'), 'all existing broadcast rows remain rendered'],
  [!source.slice(detailsIndex, summaryIndex).includes('open:'), 'history is closed by default'],
]

for (const [condition, label] of assertions) {
  if (!condition) throw new Error(`runtime verification failed: ${label}`)
}

const syntax = spawnSync(process.execPath, ['--check', pagePath], { encoding: 'utf8' })
if (syntax.status !== 0) throw new Error(syntax.stderr || syntax.stdout)

console.log(`broadcast history collapse v485 verified (${assertions.length} assertions)`)
