import fs from 'node:fs'

const target = '/app/sales-ledger-client-v318.js'
const source = fs.readFileSync(target, 'utf8')

const expected = [
  '<nav class="sl-tabs" aria-label="経営ページ切替">',
  '<a aria-current="page" class="active" href="/admin/owner-analytics?salesLedger=1">会計データ管理</a>',
  '.sl-tabs a.active{background:#fbe7ee;color:#a93659}',
]

for (const marker of expected) {
  if (!source.includes(marker)) {
    throw new Error(`Missing sales ledger theme marker: ${marker}`)
  }
}

const forbidden = [
  'aria-current="page" class="${segment} bg-[color:var(--lien-primary)] text-white shadow-sm"',
]

for (const marker of forbidden) {
  if (source.includes(marker)) {
    throw new Error(`Legacy dark active-tab style remains: ${marker}`)
  }
}

new Function(source)
console.log('sales ledger theme v390 verified')
