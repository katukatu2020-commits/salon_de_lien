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

if (ledger.includes('sales-ledger-visual-parity-v413')) {
  throw new Error('sales-ledger visual parity v413 is already installed')
}

ledger = replaceOnce(
  ledger,
  "const VERSION = 'sales-ledger-layout-v406'",
  "const VERSION = 'sales-ledger-layout-v413'",
  'ledger style version',
)

ledger = replaceOnce(
  ledger,
  '<div class="mb-2 inline-flex rounded-full border border-[color:var(--lien-primary-soft)] bg-white/70 px-3 py-1 text-xs font-semibold text-[color:var(--lien-primary-dark)]"><span>Sales ledger</span></div>',
  '<div class="sl-hero-eyebrow">${icon(\'receipt\')}<span>Sales ledger</span></div>',
  'ledger hero eyebrow',
)

ledger = replaceOnce(
  ledger,
  "    document.body.appendChild(portal)\n    const sync = () => syncLedgerPortal(portal, main)",
  `    document.body.appendChild(portal)
    const syncLedgerTheme = () => {
      const sourceStyle = getComputedStyle(main)
      const propertyNames = [
        '--lien-bg', '--lien-surface', '--lien-surface-soft', '--lien-surface-rose',
        '--lien-ink', '--lien-muted', '--lien-muted-2', '--lien-primary',
        '--lien-primary-dark', '--lien-primary-soft', '--lien-border',
        '--lien-shadow', '--lien-shadow-sm', '--font-noto-sans-jp',
      ]
      for (const propertyName of propertyNames) {
        const value = sourceStyle.getPropertyValue(propertyName).trim()
        if (value) portal.style.setProperty(propertyName, value)
      }
      portal.dataset.caTheme = document.documentElement.dataset.caTheme || 'pink'
      portal.style.fontFamily = sourceStyle.fontFamily
    }
    syncLedgerTheme()
    addEventListener('salon-lien:theme-change', syncLedgerTheme)
    const sync = () => syncLedgerPortal(portal, main)`,
  'ledger portal theme synchronization',
)

ledger = replaceOnce(
  ledger,
  "    portal.addEventListener('sl:cleanup', () => { observer.disconnect(); removeEventListener('resize', sync) }, { once:true })",
  "    portal.addEventListener('sl:cleanup', () => { observer.disconnect(); removeEventListener('resize', sync); removeEventListener('salon-lien:theme-change', syncLedgerTheme) }, { once:true })",
  'ledger portal theme cleanup',
)

const visualCss = fs.readFileSync('/tmp/sales-ledger-visual-parity-v413.css', 'utf8').trim()
ledger = replaceOnce(
  ledger,
  '      @media print{\n',
  `      ${visualCss}\n      /* sales-ledger-visual-parity-v413 */\n      @media print{\n`,
  'ledger visual parity stylesheet insertion',
)

tenantClient = replaceOnce(
  tenantClient,
  "script.src='/sales-ledger-v318.js?v=406'",
  "script.src='/sales-ledger-v318.js?v=413'",
  'sales-ledger cache version',
)

fs.writeFileSync(ledgerPath, ledger)
fs.writeFileSync(tenantClientPath, tenantClient)
console.log('sales-ledger visual parity v413 runtime patched')
