import fs from 'node:fs'

const target = '/app/sales-ledger-client-v318.js'
let source = fs.readFileSync(target, 'utf8')

function replaceOnce(search, replacement, label) {
  const first = source.indexOf(search)
  if (first < 0 || source.indexOf(search, first + search.length) >= 0) {
    throw new Error(`${label}: expected exactly one match`)
  }
  source = source.slice(0, first) + replacement + source.slice(first + search.length)
}

replaceOnce(
  '.sl-ledger-portal{position:fixed;z-index:25;overflow:auto;background:var(--lien-bg,#fffaf6);overscroll-behavior:contain}',
  '.sl-ledger-portal{position:fixed;z-index:25;overflow:auto;background:var(--lien-bg,#fffaf6);overscroll-behavior:auto;scrollbar-gutter:stable;-webkit-overflow-scrolling:touch}',
  'ledger portal scrolling',
)

replaceOnce(
  '.sl-table-wrap{overflow:auto;max-height:650px}',
  '.sl-table-wrap{overflow-x:auto;overflow-y:visible;max-height:none}',
  'nested table scrolling',
)

const printStart = source.indexOf('@media print{')
const styleEnd = source.indexOf('\n    `', printStart)
if (printStart < 0 || styleEnd < 0) throw new Error('print stylesheet boundary was not found')

const printCss = `@media print{
        @page{size:A4 landscape;margin:8mm}
        html,body{width:auto!important;height:auto!important;overflow:visible!important;background:#fff!important}
        body>*:not(.sl-ledger-portal){display:none!important}
        body>.sl-ledger-portal{position:static!important;inset:auto!important;width:auto!important;height:auto!important;overflow:visible!important;background:#fff!important;scrollbar-gutter:auto!important}
        .sl-ledger-portal-inner{min-height:0!important;padding:0!important}
        .sl-page{position:static!important;inset:auto!important;display:block!important;max-width:none!important;margin:0!important;background:#fff!important;color:#000!important}
        .sl-tabs,.sl-hero,.sl-card:not(.sl-table-card),.sl-table-head .sl-action-group,.sl-table th:first-child,.sl-table td:first-child,.sl-table th:last-child,.sl-table td:last-child{display:none!important}
        .sl-table-card{overflow:visible!important;border:0!important;border-radius:0!important;background:#fff!important;padding:0!important;box-shadow:none!important}
        .sl-table-head{display:block!important;padding:0 0 4mm!important;border:0!important}
        .sl-section-title h2{font-size:15pt!important;text-align:center!important}
        .sl-section-title h2:after{content:"（会計データ）"}
        .sl-table-wrap{overflow:visible!important;max-height:none!important}
        .sl-table{width:100%!important;min-width:0!important;table-layout:fixed!important;border-collapse:collapse!important;font-size:7.5pt!important}
        .sl-table thead{display:table-header-group!important}
        .sl-table tbody{display:table-row-group!important}
        .sl-table tbody tr:not(.print-row){display:none!important}
        .sl-table tr{break-inside:avoid!important;page-break-inside:avoid!important}
        .sl-table th{position:static!important;background:#f2f2f2!important;color:#000!important;font-size:7pt!important}
        .sl-table td,.sl-table th{overflow-wrap:anywhere!important;padding:2.2mm 1.5mm!important;border:1px solid #aaa!important}
        .sl-table th:nth-child(2),.sl-table td:nth-child(2){width:13%}
        .sl-table th:nth-child(3),.sl-table td:nth-child(3){width:11%}
        .sl-table th:nth-child(4),.sl-table td:nth-child(4){width:9%}
        .sl-table th:nth-child(5),.sl-table td:nth-child(5){width:25%}
        .sl-table th:nth-child(6),.sl-table td:nth-child(6){width:10%}
        .sl-table th:nth-child(7),.sl-table td:nth-child(7){width:9%}
        .sl-table th:nth-child(8),.sl-table td:nth-child(8){width:8%}
        .sl-table th:nth-child(9),.sl-table td:nth-child(9){width:8%}
        .sl-table th:nth-child(10),.sl-table td:nth-child(10){width:7%}
      }`

source = source.slice(0, printStart) + printCss + source.slice(styleEnd)
fs.writeFileSync(target, source)
