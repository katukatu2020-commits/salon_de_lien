import fs from 'node:fs'

const ledger = fs.readFileSync('/app/sales-ledger-client-v318.js', 'utf8')
const tenantClient = fs.readFileSync('/app/tenant-setup-client.js', 'utf8')

const requiredLedgerMarkers = [
  "const VERSION = 'sales-ledger-layout-v406'",
  'sales-ledger-ui-parity-v406',
  'grid-template-columns: repeat(3, minmax(0, 1fr))',
  'background: var(--lien-primary, #8f4f42)',
  'font-family: var(--font-noto-sans-jp)',
  '.sl-hero-mark {',
  'display: none;',
]

for (const marker of requiredLedgerMarkers) {
  if (!ledger.includes(marker)) throw new Error(`ledger parity marker is missing: ${marker}`)
}

const forbiddenLedgerMarkers = [
  "const VERSION = 'sales-ledger-layout-v388'",
  '@media(max-width:700px){.sl-tabs{grid-template-columns:1fr}',
]

for (const marker of forbiddenLedgerMarkers) {
  if (ledger.includes(marker)) throw new Error(`legacy ledger layout remains: ${marker}`)
}

if (!tenantClient.includes("script.src='/sales-ledger-v318.js?v=406'")) {
  throw new Error('sales-ledger cache version was not updated')
}
if (!tenantClient.includes('first-store-product-tour-v405')) {
  throw new Error('the current production product tour was not preserved')
}

new Function(ledger)
new Function(tenantClient)
console.log('sales-ledger UI parity v406 runtime verified')

