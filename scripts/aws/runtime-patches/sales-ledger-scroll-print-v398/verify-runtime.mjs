import fs from 'node:fs'

const target = '/app/sales-ledger-client-v318.js'
const source = fs.readFileSync(target, 'utf8')

const required = [
  '.sl-table-wrap{overflow-x:auto;overflow-y:visible;max-height:none}',
  'body>*:not(.sl-ledger-portal){display:none!important}',
  'body>.sl-ledger-portal{position:static!important',
  '@page{size:A4 landscape;margin:8mm}',
  '.sl-table tbody tr:not(.print-row){display:none!important}',
  'break-inside:avoid!important',
]

for (const marker of required) {
  if (!source.includes(marker)) throw new Error(`Missing ledger fix marker: ${marker}`)
}

const forbidden = [
  '.sl-table-wrap{overflow:auto;max-height:650px}',
  '.sl-page{position:absolute;inset:0;display:block;background:#fff}',
]

for (const marker of forbidden) {
  if (source.includes(marker)) throw new Error(`Legacy ledger layout remains: ${marker}`)
}

new Function(source)
console.log('sales ledger scroll and print v398 verified')

