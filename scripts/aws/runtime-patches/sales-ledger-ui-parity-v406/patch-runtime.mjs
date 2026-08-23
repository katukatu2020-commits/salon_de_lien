import fs from 'node:fs'

function replaceOnce(source, oldValue, newValue, label) {
  const count = source.split(oldValue).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  return source.replace(oldValue, newValue)
}

const ledgerPath = '/app/sales-ledger-client-v318.js'
const tenantClientPath = '/app/tenant-setup-client.js'
let ledger = fs.readFileSync(ledgerPath, 'utf8')
let tenantClient = fs.readFileSync(tenantClientPath, 'utf8')

if (ledger.includes('sales-ledger-ui-parity-v406')) {
  throw new Error('sales-ledger UI parity v406 is already installed')
}

ledger = replaceOnce(
  ledger,
  "const VERSION = 'sales-ledger-layout-v388'",
  "const VERSION = 'sales-ledger-layout-v406'",
  'ledger style version',
)

ledger = replaceOnce(
  ledger,
  '@media(max-width:700px){.sl-tabs{grid-template-columns:1fr}',
  '@media(max-width:700px){.sl-tabs{grid-template-columns:repeat(3,minmax(0,1fr))}',
  'legacy stacked mobile tabs',
)

const parityCss = fs.readFileSync('/tmp/sales-ledger-ui-parity-v406.css', 'utf8').trim()
ledger = replaceOnce(
  ledger,
  '      @media print{\n',
  `      ${parityCss}\n      /* sales-ledger-ui-parity-v406 */\n      @media print{\n`,
  'ledger parity stylesheet insertion',
)

tenantClient = replaceOnce(
  tenantClient,
  "script.src='/sales-ledger-v318.js?v=318'",
  "script.src='/sales-ledger-v318.js?v=406'",
  'sales-ledger cache version',
)

fs.writeFileSync(ledgerPath, ledger)
fs.writeFileSync(tenantClientPath, tenantClient)
console.log('sales-ledger UI parity v406 runtime patched')
