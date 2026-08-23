import fs from 'node:fs'

const ledger = fs.readFileSync('/app/sales-ledger-client-v318.js', 'utf8')
const tenantClient = fs.readFileSync('/app/tenant-setup-client.js', 'utf8')
const automatedCoupon = fs.readFileSync('/app/public/automated-coupon-fields-v412.js', 'utf8')

const requiredLedgerMarkers = [
  "const VERSION = 'sales-ledger-layout-v413'",
  'sales-ledger-visual-parity-v413',
  'class="sl-hero-eyebrow">${icon(\'receipt\')}',
  'background: #fbe7ee;',
  'color: #a93659;',
  'font-family: "Yu Mincho", "Hiragino Mincho ProN"',
  'linear-gradient(135deg, rgba(255, 253, 249, 0.94), rgba(246, 239, 230, 0.86))',
  "addEventListener('salon-lien:theme-change', syncLedgerTheme)",
  "removeEventListener('salon-lien:theme-change', syncLedgerTheme)",
  "portal.dataset.caTheme = document.documentElement.dataset.caTheme || 'pink'",
]

for (const marker of requiredLedgerMarkers) {
  if (!ledger.includes(marker)) throw new Error(`ledger visual parity marker is missing: ${marker}`)
}

if (ledger.includes("const VERSION = 'sales-ledger-layout-v406'")) {
  throw new Error('the stale ledger style version remains')
}
if (!tenantClient.includes("script.src='/sales-ledger-v318.js?v=413'")) {
  throw new Error('sales-ledger cache version was not updated')
}
if (!tenantClient.includes('first-store-product-tour-v405')) {
  throw new Error('the current production product tour was not preserved')
}
if (!automatedCoupon.includes('form.dataset.conditionalFieldsBound = "v412"')) {
  throw new Error('the current automated coupon stylist selector was not preserved')
}

new Function(ledger)
new Function(tenantClient)
new Function(automatedCoupon)
console.log('sales-ledger visual parity v413 runtime verified')
